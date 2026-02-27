// scripts/pipeline/llm.ts
// LLM API 客户端抽象层 - 支持 OpenAI Chat Completions API 格式
// Story 4-3 实现

import type { LLMConfig } from "./types.ts";

/** 请求超时时间（毫秒） */
const REQUEST_TIMEOUT_MS = 60_000;

/** 默认最大输出 token */
const DEFAULT_MAX_TOKENS = 4096;

/** 响应体最大字节数（2MB） */
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;

/** 默认重试次数 */
const DEFAULT_MAX_RETRIES = 2;

/** 不可重试的 HTTP 状态码 */
const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404]);

// ---------------------------------------------------------------------------
// 配置加载
// ---------------------------------------------------------------------------

/**
 * 从环境变量读取 LLM 配置
 * 必填：LLM_API_KEY
 * 可选：LLM_PROVIDER, LLM_MODEL, LLM_BASE_URL, LLM_MAX_TOKENS
 */
export function getLLMConfig(): LLMConfig {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey || apiKey.trim() === "") {
    throw new Error(
      "环境变量 LLM_API_KEY 未设置。" +
        "请在 .env 或环境中配置大模型 API 密钥后重试。" +
        "支持 OpenAI / Claude 等兼容 Chat Completions API 的服务。",
    );
  }

  return {
    provider: process.env.LLM_PROVIDER?.trim() || "openai",
    model: process.env.LLM_MODEL?.trim() || "gpt-4o-mini",
    apiKey: apiKey.trim(),
    baseUrl: process.env.LLM_BASE_URL?.trim() || undefined,
    maxTokens: process.env.LLM_MAX_TOKENS
      ? (() => {
          const parsed = parseInt(process.env.LLM_MAX_TOKENS!, 10);
          if (Number.isNaN(parsed) || parsed <= 0) {
            throw new Error(
              `环境变量 LLM_MAX_TOKENS 值无效: "${process.env.LLM_MAX_TOKENS}"，需为正整数。`,
            );
          }
          return parsed;
        })()
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// API 端点解析
// ---------------------------------------------------------------------------

/**
 * 根据 provider 和 baseUrl 构建 Chat Completions API 端点
 */
function getApiEndpoint(config: LLMConfig): string {
  if (config.baseUrl) {
    // 自定义端点：确保以 /chat/completions 结尾
    const base = config.baseUrl.replace(/\/+$/, "");
    if (base.endsWith("/chat/completions")) return base;
    if (base.endsWith("/v1")) return `${base}/chat/completions`;
    return `${base}/v1/chat/completions`;
  }

  // 默认端点
  const endpoints: Record<string, string> = {
    openai: "https://api.openai.com/v1/chat/completions",
    anthropic: "https://api.anthropic.com/v1/chat/completions",
  };
  return endpoints[config.provider] ?? endpoints.openai;
}

// ---------------------------------------------------------------------------
// LLM API 调用
// ---------------------------------------------------------------------------

/** LLM API 错误，包含 HTTP 状态码 */
export class LLMApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly retryable: boolean,
    public readonly retryAfterMs?: number,
  ) {
    super(message);
    this.name = "LLMApiError";
  }
}

/**
 * 调用 LLM Chat Completions API（单次，不含重试）
 *
 * @param prompt - 用户 prompt 文本
 * @param config - LLM 配置
 * @returns 模型响应文本
 */
export async function callLLM(
  prompt: string,
  config: LLMConfig,
): Promise<string> {
  const endpoint = getApiEndpoint(config);
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: maxTokens,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.3,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const statusCode = response.status;
      const retryable = !NON_RETRYABLE_STATUS.has(statusCode);
      let retryAfterMs: number | undefined;

      if (statusCode === 429) {
        const retryAfter = response.headers.get("retry-after");
        if (retryAfter) {
          const seconds = parseInt(retryAfter, 10);
          retryAfterMs =
            !Number.isNaN(seconds) && seconds > 0 ? seconds * 1000 : 5000;
        } else {
          retryAfterMs = 5000;
        }
      }

      const body = await response.text().catch(() => "");
      // 过滤可能包含敏感信息的响应体内容
      const safeBody = body.replace(
        /(?:Bearer\s+|api[_-]?key[=:]\s*)[^\s"',}]+/gi,
        "[REDACTED]",
      );
      throw new LLMApiError(
        `LLM API 返回 ${statusCode}: ${safeBody.slice(0, 200)}`,
        statusCode,
        retryable,
        retryAfterMs,
      );
    }

    return await parseLLMResponseBody(response);
  } catch (err) {
    if (err instanceof LLMApiError) throw err;
    if (err instanceof Error && err.name === "AbortError") {
      throw new LLMApiError(
        `LLM API 请求超时 (${REQUEST_TIMEOUT_MS}ms)`,
        0,
        true,
      );
    }
    throw new LLMApiError(
      `LLM API 网络错误: ${err instanceof Error ? err.message : String(err)}`,
      0,
      true,
    );
  } finally {
    clearTimeout(timer);
  }
}

// ---------------------------------------------------------------------------
// 响应解析
// ---------------------------------------------------------------------------

/** OpenAI Chat Completions API 响应结构 */
interface ChatCompletionResponse {
  choices?: Array<{
    message?: { content?: string };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

/**
 * 解析 Chat Completions API 响应体
 * 校验响应大小、JSON 结构，提取文本内容
 */
async function parseLLMResponseBody(response: Response): Promise<string> {
  const contentLength = response.headers.get("content-length");
  if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
    throw new LLMApiError(
      `LLM API 响应体过大: ${contentLength} bytes`,
      0,
      false,
    );
  }

  const text = await response.text();
  if (text.length > MAX_RESPONSE_BYTES) {
    throw new LLMApiError(`LLM API 响应体过大: ${text.length} chars`, 0, false);
  }

  let data: ChatCompletionResponse;
  try {
    data = JSON.parse(text) as ChatCompletionResponse;
  } catch {
    throw new LLMApiError(
      `LLM API 响应 JSON 解析失败。原始内容前 200 字符: ${text.slice(0, 200)}`,
      0,
      false,
    );
  }
  const content = data.choices?.[0]?.message?.content;

  if (!content || content.trim() === "") {
    throw new LLMApiError("LLM API 返回空内容", 0, false);
  }

  return content;
}

// ---------------------------------------------------------------------------
// 重试机制
// ---------------------------------------------------------------------------

/**
 * 等待指定毫秒数
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 带重试的 LLM API 调用
 * 指数退避：1s、2s；429 错误延长等待
 * 不可重试错误（401 等）立即抛出
 *
 * @param prompt - 用户 prompt 文本
 * @param config - LLM 配置
 * @param maxRetries - 最大重试次数（默认 2，共 3 次尝试）
 * @returns 模型响应文本
 */
export async function callLLMWithRetry(
  prompt: string,
  config: LLMConfig,
  maxRetries: number = DEFAULT_MAX_RETRIES,
): Promise<string> {
  const errors: string[] = [];

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await callLLM(prompt, config);
    } catch (err) {
      const isLLMError = err instanceof LLMApiError;
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`尝试 ${attempt + 1}: ${message}`);

      // 不可重试错误立即抛出
      if (isLLMError && !err.retryable) {
        throw err;
      }

      // 已达最大重试次数
      if (attempt >= maxRetries) {
        break;
      }

      // 计算等待时间
      let waitMs = 1000 * Math.pow(2, attempt); // 1s, 2s
      if (isLLMError && err.retryAfterMs) {
        waitMs = Math.max(waitMs, err.retryAfterMs);
      }

      console.warn(
        `    [filter] LLM 调用失败 (尝试 ${attempt + 1}/${maxRetries + 1}), ` +
          `${waitMs}ms 后重试: ${message}`,
      );

      await sleep(waitMs);
    }
  }

  throw new LLMApiError(
    `LLM API 调用失败，已重试 ${maxRetries} 次: ${errors.join("; ")}`,
    0,
    false,
  );
}
