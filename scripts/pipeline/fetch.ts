// scripts/pipeline/fetch.ts
// 资讯抓取模块 - 从 openclaw API 获取各领域原始资讯
// Story 4-2 实现

import type {
  DomainConfig,
  RawNewsItem,
  FetchSource,
  SourceFetchResult,
} from "./types.ts";
import { getDomainFetchConfig } from "./sources/index.ts";

/** 单个信息源的超时时间（毫秒） */
const SOURCE_TIMEOUT_MS = 30_000;

/** 内容最大长度（字符），超出截断 */
const MAX_CONTENT_LENGTH = 5000;

/** 响应体最大字节数（5MB），防止 OOM */
const MAX_RESPONSE_BYTES = 5 * 1024 * 1024;

/** openclaw API 基础 URL */
const OPENCLAW_API_BASE = "https://api.openclaw.com/v1";

// ---------------------------------------------------------------------------
// 环境变量校验
// ---------------------------------------------------------------------------

/**
 * 获取 openclaw API 密钥，缺失时抛出明确错误
 */
export function getApiKey(): string {
  const key = process.env.OPENCLAW_API_KEY;
  if (!key || key.trim() === "") {
    throw new Error(
      "环境变量 OPENCLAW_API_KEY 未设置。" +
        "请在 .env 或环境中配置 openclaw API 密钥后重试。",
    );
  }
  return key.trim();
}

// ---------------------------------------------------------------------------
// openclaw API 客户端
// ---------------------------------------------------------------------------

/** openclaw API 响应中的单条结果 */
interface OpenclawResultItem {
  title?: string;
  content?: string;
  url?: string;
  published_at?: string;
  [key: string]: unknown;
}

/** openclaw API 响应体 */
interface OpenclawApiResponse {
  results?: OpenclawResultItem[];
  [key: string]: unknown;
}

/**
 * 调用 openclaw API 获取资讯
 * 支持超时控制（AbortController）
 */
export async function callOpenclawAPI(
  query: string,
  apiKey: string,
  timeoutMs: number = SOURCE_TIMEOUT_MS,
): Promise<RawNewsItem[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const url = `${OPENCLAW_API_BASE}/search`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ query, limit: 20 }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(
        `openclaw API 返回 ${response.status}: ${response.statusText}`,
      );
    }

    // 检查 Content-Length 防止超大响应体导致 OOM
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_RESPONSE_BYTES) {
      throw new Error(
        `openclaw API 响应体过大: ${contentLength} bytes (上限 ${MAX_RESPONSE_BYTES})`,
      );
    }

    // 读取文本后检查实际大小，再解析 JSON
    const text = await response.text();
    if (text.length > MAX_RESPONSE_BYTES) {
      throw new Error(
        `openclaw API 响应体过大: ${text.length} chars (上限 ${MAX_RESPONSE_BYTES})`,
      );
    }

    const data = JSON.parse(text) as OpenclawApiResponse;
    return parseOpenclawResponse(data);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * 解析 openclaw API 响应为标准化 RawNewsItem 数组
 */
export function parseOpenclawResponse(
  data: OpenclawApiResponse,
): RawNewsItem[] {
  if (!data.results || !Array.isArray(data.results)) {
    return [];
  }

  return data.results
    .map((item) => ({
      title: String(item.title ?? ""),
      content: String(item.content ?? ""),
      url: String(item.url ?? ""),
      publishedAt: String(item.published_at ?? ""),
    }))
    .filter((item) => item.title !== "" && item.url !== "");
}

// ---------------------------------------------------------------------------
// 结果去重与清洗
// ---------------------------------------------------------------------------

/** 常见 HTML 实体映射 */
const HTML_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** 去除 HTML 标签（含未闭合标签）并解码常见 HTML 实体 */
function stripHtmlTags(text: string): string {
  // 先移除完整标签，再移除残留的未闭合标签片段
  const noTags = text.replace(/<[^>]*>/g, "").replace(/<[^>]*$/g, "");
  // 解码命名实体
  const decoded = noTags.replace(
    /&(?:amp|lt|gt|quot|apos|nbsp|#39);/g,
    (match) => HTML_ENTITIES[match] ?? match,
  );
  // 解码数字实体 &#123; 和 &#x1a;
  return decoded
    .replace(/&#(\d+);/g, (_m, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, code) =>
      String.fromCharCode(parseInt(code, 16)),
    );
}

/** 去除多余空白（连续空格、换行等） */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 校验 URL 是否为合法的 HTTP/HTTPS 地址
 * 防止 javascript:、data: 等协议注入
 */
function isValidHttpUrl(urlStr: string): boolean {
  try {
    const parsed = new URL(urlStr);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * 清洗单条资讯
 * 返回 null 表示该条目无效应被过滤
 */
export function cleanNewsItem(item: RawNewsItem): RawNewsItem | null {
  const title = normalizeWhitespace(stripHtmlTags(item.title));
  const url = item.url.trim();

  if (title === "" || url === "" || !isValidHttpUrl(url)) {
    return null;
  }

  let content = normalizeWhitespace(stripHtmlTags(item.content));
  if (content.length > MAX_CONTENT_LENGTH) {
    content = content.slice(0, MAX_CONTENT_LENGTH);
  }

  return {
    title,
    content,
    url,
    publishedAt: item.publishedAt.trim(),
  };
}

/**
 * 规范化 URL 用于去重比较
 * 去除尾部斜杠、移除常见追踪参数（utm_*）、统一小写 host
 */
function normalizeUrlForDedup(urlStr: string): string {
  try {
    const parsed = new URL(urlStr);
    // host 统一小写
    parsed.hostname = parsed.hostname.toLowerCase();
    // 移除常见追踪参数
    const trackingPrefixes = ["utm_"];
    for (const key of [...parsed.searchParams.keys()]) {
      if (trackingPrefixes.some((p) => key.toLowerCase().startsWith(p))) {
        parsed.searchParams.delete(key);
      }
    }
    // 去除尾部斜杠
    let normalized = parsed.toString();
    if (normalized.endsWith("/") && parsed.pathname !== "/") {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    // URL 解析失败时回退到原始字符串
    return urlStr.trim().toLowerCase();
  }
}

/**
 * 基于 URL 去重，相同 URL 只保留第一条
 * URL 会经过规范化处理（去尾部斜杠、移除追踪参数）
 */
export function deduplicateByUrl(items: RawNewsItem[]): RawNewsItem[] {
  const seen = new Set<string>();
  const result: RawNewsItem[] = [];

  for (const item of items) {
    const normalized = normalizeUrlForDedup(item.url);
    if (!seen.has(normalized)) {
      seen.add(normalized);
      result.push(item);
    }
  }

  return result;
}

/**
 * 按 publishedAt 降序排列（最新在前）
 * 无效日期排到末尾
 */
export function sortByDate(items: RawNewsItem[]): RawNewsItem[] {
  return [...items].sort((a, b) => {
    const ta = new Date(a.publishedAt).getTime();
    const tb = new Date(b.publishedAt).getTime();
    const validA = !Number.isNaN(ta);
    const validB = !Number.isNaN(tb);

    if (validA && validB) return tb - ta;
    if (validA) return -1;
    if (validB) return 1;
    return 0;
  });
}

// ---------------------------------------------------------------------------
// 多源抓取与失败隔离
// ---------------------------------------------------------------------------

/**
 * 从单个信息源抓取资讯
 * 独立 try-catch，失败时返回空数组并记录错误
 */
async function fetchFromSource(
  source: FetchSource,
  apiKey: string,
  domainSlug: string,
): Promise<{ items: RawNewsItem[]; result: SourceFetchResult }> {
  const start = Date.now();
  try {
    const items = await callOpenclawAPI(source.query, apiKey);
    const duration = Date.now() - start;
    console.log(
      `    [fetch] ${domainSlug}/${source.name}: ` +
        `${items.length} 条 (${duration}ms)`,
    );
    return {
      items,
      result: {
        source: source.name,
        status: "success",
        itemCount: items.length,
      },
    };
  } catch (err) {
    const duration = Date.now() - start;
    const errorMsg = err instanceof Error ? err.message : String(err);
    // AbortError 表示超时
    const isTimeout = err instanceof Error && err.name === "AbortError";
    const errorType = isTimeout ? "超时" : "请求失败";

    console.warn(
      `    [fetch] 警告: ${domainSlug}/${source.name} ` +
        `${errorType}: ${errorMsg} (${duration}ms)`,
    );
    return {
      items: [],
      result: {
        source: source.name,
        status: "failed",
        itemCount: 0,
        error: errorMsg,
      },
    };
  }
}

/**
 * 抓取指定领域的资讯（主入口函数）
 *
 * 流程：查找信息源配置 → 逐源抓取 → 去重 → 清洗 → 排序
 * 单源失败不影响其他源，全部失败时抛出聚合错误
 */
export async function fetchNews(
  config: DomainConfig,
  date: string,
): Promise<RawNewsItem[]> {
  const fetchConfig = getDomainFetchConfig(config.slug);
  if (!fetchConfig || fetchConfig.sources.length === 0) {
    console.warn(`    [fetch] 领域 ${config.slug} 无信息源配置，跳过抓取`);
    return [];
  }

  const apiKey = getApiKey();
  const sources = fetchConfig.sources;
  console.log(`    [fetch] ${config.slug}: 共 ${sources.length} 个信息源`);

  const allItems: RawNewsItem[] = [];
  const sourceResults: SourceFetchResult[] = [];

  // 串行遍历各信息源
  for (const source of sources) {
    const { items, result } = await fetchFromSource(
      source,
      apiKey,
      config.slug,
    );
    allItems.push(...items);
    sourceResults.push(result);
  }

  // 检查是否全部失败
  const successCount = sourceResults.filter(
    (r) => r.status === "success",
  ).length;

  if (successCount === 0 && sources.length > 0) {
    const errorDetails = sourceResults
      .map((r) => `${r.source}: ${r.error ?? "未知错误"}`)
      .join("; ");
    throw new Error(
      `领域 ${config.slug} 所有信息源抓取失败 ` +
        `(${sources.length} 个源): ${errorDetails}`,
    );
  }

  // 去重 → 清洗 → 排序
  const deduped = deduplicateByUrl(allItems);
  const cleaned = deduped
    .map(cleanNewsItem)
    .filter((item): item is RawNewsItem => item !== null);
  const sorted = sortByDate(cleaned);

  console.log(
    `    [fetch] ${config.slug}: 抓取完成, ` +
      `原始 ${allItems.length} 条 → 去重清洗后 ${sorted.length} 条`,
  );

  return sorted;
}
