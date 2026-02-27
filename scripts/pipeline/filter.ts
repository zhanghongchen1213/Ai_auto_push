// scripts/pipeline/filter.ts
// AI 内容筛选与摘要生成模块
// Story 4-3 实现

import type { DomainConfig, FilteredNewsItem, RawNewsItem } from "./types.ts";
import { getLLMConfig, callLLMWithRetry, LLMApiError } from "./llm.ts";
import { buildFilterPrompt } from "./prompts.ts";

/** 摘要最小长度（字符，含 ±20% 容差） */
const MIN_SUMMARY_LENGTH = 120;

/** 摘要最大长度（字符，含 ±20% 容差） */
const MAX_SUMMARY_LENGTH = 240;

/** fallback 时保留的最大条数 */
const FALLBACK_MAX_ITEMS = 5;

/** fallback 摘要截取长度 */
const FALLBACK_SUMMARY_LENGTH = 180;

// ---------------------------------------------------------------------------
// 主函数
// ---------------------------------------------------------------------------

/**
 * AI 内容筛选与摘要生成主函数
 *
 * 流程：构建 Prompt → 调用 LLM → 解析响应 → 校验结果
 * LLM 不可用时自动降级为规则 fallback
 *
 * @param items - 原始资讯列表
 * @param config - 领域配置
 * @param _date - 执行日期（预留）
 * @returns 筛选后的资讯列表
 */
export async function filterAndSummarize(
  items: readonly RawNewsItem[],
  config: DomainConfig,
  _date: string,
): Promise<FilteredNewsItem[]> {
  const start = Date.now();
  const domainName = config.name;
  const slug = config.slug;

  console.log(`    [filter] ${slug}: 开始筛选, 输入 ${items.length} 条`);

  // 空输入直接返回
  if (items.length === 0) {
    console.log(`    [filter] ${slug}: 无输入资讯, 跳过筛选`);
    return [];
  }

  try {
    const llmConfig = getLLMConfig();
    const result = await filterWithLLM(items, domainName, llmConfig);
    const duration = Date.now() - start;

    console.log(
      `    [filter] ${slug}: 筛选完成, ` +
        `${items.length} → ${result.length} 条 (${duration}ms)`,
    );
    return result;
  } catch (err) {
    const duration = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);

    // LLM_API_KEY 缺失时使用 fallback
    if (msg.includes("LLM_API_KEY")) {
      console.warn(
        `    [filter] ${slug}: LLM 未配置, 使用 fallback (${duration}ms)`,
      );
      return fallbackFilter(items);
    }

    // LLM 调用失败时使用 fallback
    if (err instanceof LLMApiError) {
      console.warn(
        `    [filter] ${slug}: LLM 调用失败, 使用 fallback: ${msg} (${duration}ms)`,
      );
      return fallbackFilter(items);
    }

    // 其他错误向上抛出
    throw new Error(
      `[filter] ${slug} 筛选失败 (输入 ${items.length} 条, ${duration}ms): ${msg}`,
    );
  }
}

// ---------------------------------------------------------------------------
// LLM 筛选
// ---------------------------------------------------------------------------

/**
 * 通过 LLM 进行筛选和摘要生成
 */
async function filterWithLLM(
  items: readonly RawNewsItem[],
  domainName: string,
  llmConfig: import("./types.ts").LLMConfig,
): Promise<FilteredNewsItem[]> {
  const prompt = buildFilterPrompt(items, domainName);

  console.log(
    `    [filter] 调用 LLM (${llmConfig.provider}/${llmConfig.model}), ` +
      `prompt ~${Math.round(prompt.length / 4)} tokens`,
  );

  const rawResponse = await callLLMWithRetry(prompt, llmConfig);

  console.log(
    `    [filter] LLM 响应 ~${Math.round(rawResponse.length / 4)} tokens`,
  );

  return parseLLMResponse(rawResponse, items);
}

// ---------------------------------------------------------------------------
// 响应解析与校验
// ---------------------------------------------------------------------------

/**
 * 从 LLM 响应文本中提取 JSON
 * 支持纯 JSON 和 markdown code block 包裹的 JSON
 */
export function extractJSON(raw: string): string {
  const trimmed = raw.trim();

  // 尝试匹配 markdown code block
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?\s*```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // 尝试直接找到 JSON 数组
  const arrayStart = trimmed.indexOf("[");
  const arrayEnd = trimmed.lastIndexOf("]");
  if (arrayStart !== -1 && arrayEnd > arrayStart) {
    return trimmed.slice(arrayStart, arrayEnd + 1);
  }

  return trimmed;
}

/** LLM 返回的单条原始数据结构 */
interface RawLLMItem {
  title?: unknown;
  summary?: unknown;
  url?: unknown;
  publishedAt?: unknown;
  source?: unknown;
  score?: unknown;
}

/**
 * 解析 LLM 响应并校验
 *
 * @param raw - LLM 原始响应文本
 * @param originalItems - 原始输入（用于 URL 匹配校验）
 * @returns 校验通过的 FilteredNewsItem 数组
 */
export function parseLLMResponse(
  raw: string,
  originalItems: readonly RawNewsItem[],
): FilteredNewsItem[] {
  const jsonStr = extractJSON(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(
      `LLM 响应 JSON 解析失败。原始响应前 500 字符: ${raw.slice(0, 500)}`,
    );
  }

  if (!Array.isArray(parsed)) {
    throw new Error(
      `LLM 响应格式错误: 期望数组, 实际为 ${typeof parsed}。` +
        `原始响应前 500 字符: ${raw.slice(0, 500)}`,
    );
  }

  // 构建原始 URL 集合用于匹配校验
  const originalUrls = new Set(originalItems.map((item) => item.url));

  const validated: FilteredNewsItem[] = [];

  for (const item of parsed as RawLLMItem[]) {
    const result = validateItem(item, originalUrls);
    if (result) {
      validated.push(result);
    }
  }

  if (validated.length === 0) {
    throw new Error(
      `LLM 响应校验后无有效条目。原始响应前 500 字符: ${raw.slice(0, 500)}`,
    );
  }

  // 按 score 降序排列
  return validated.sort((a, b) => b.score - a.score);
}

// ---------------------------------------------------------------------------
// 单条校验
// ---------------------------------------------------------------------------

/**
 * 校验单条 LLM 返回的资讯
 * 返回 null 表示该条目不合格
 */
function validateItem(
  item: RawLLMItem,
  originalUrls: Set<string>,
): FilteredNewsItem | null {
  // 必填字段检查
  if (
    typeof item.title !== "string" ||
    typeof item.summary !== "string" ||
    typeof item.url !== "string"
  ) {
    console.warn("    [filter] 警告: 跳过缺少必填字段的条目");
    return null;
  }

  const title = item.title.trim();
  const summary = item.summary.trim();
  const url = item.url.trim();

  if (title === "" || summary === "" || url === "") {
    console.warn("    [filter] 警告: 跳过空字段条目");
    return null;
  }

  // URL 匹配校验（防幻觉）
  if (!originalUrls.has(url)) {
    console.warn(
      `    [filter] 警告: URL 不匹配原始数据, 跳过: ${url.slice(0, 80)}`,
    );
    return null;
  }

  // 摘要长度校验（±20% 容差: 120-240 字）
  if (summary.length < MIN_SUMMARY_LENGTH) {
    console.warn(
      `    [filter] 警告: 摘要过短 (${summary.length}字), 保留但标记`,
    );
  }
  if (summary.length > MAX_SUMMARY_LENGTH) {
    console.warn(
      `    [filter] 警告: 摘要过长 (${summary.length}字), 保留但标记`,
    );
  }

  const score =
    typeof item.score === "number"
      ? Math.max(0, Math.min(100, Math.round(item.score)))
      : 50;

  return {
    title,
    summary,
    url,
    publishedAt: typeof item.publishedAt === "string" ? item.publishedAt : "",
    source: typeof item.source === "string" ? item.source : "",
    score,
  };
}

// ---------------------------------------------------------------------------
// Fallback 策略
// ---------------------------------------------------------------------------

/**
 * 基于规则的 fallback 筛选
 * LLM 不可用时使用：取前 N 条，用原始内容截取作为摘要
 */
export function fallbackFilter(
  items: readonly RawNewsItem[],
): FilteredNewsItem[] {
  const selected = items.slice(0, FALLBACK_MAX_ITEMS);

  console.log(`    [filter] fallback: 保留前 ${selected.length} 条`);

  return selected.map((item, i) => {
    // 用原始内容截取作为摘要
    const content = item.content.trim();
    const summary =
      content.length > FALLBACK_SUMMARY_LENGTH
        ? content.slice(0, FALLBACK_SUMMARY_LENGTH) + "..."
        : content || item.title;

    return {
      title: item.title,
      summary,
      url: item.url,
      publishedAt: item.publishedAt,
      source: "",
      score: Math.max(0, 100 - i * 10), // 简单递减评分，确保不低于 0
    };
  });
}
