// scripts/pipeline/process.ts
// 领域处理函数 - fetch/filter/format 阶段（publish 已移至 run.ts 统一调用）

import type {
  DomainConfig,
  DomainProcessResult,
  ErrorType,
  RawNewsItem,
  FilteredNewsItem,
} from "./types.ts";
import { fetchNews } from "./fetch.ts";
import { filterAndSummarize } from "./filter.ts";
import { formatAndWrite } from "./format.ts";

/** 从错误对象提取消息 */
export function extractMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** 根据错误特征自动分类 */
export function classifyError(err: unknown): ErrorType {
  if (!(err instanceof Error)) return "unknown";
  const msg = err.message.toLowerCase();
  if (
    err.name === "AbortError" ||
    msg.includes("timeout") ||
    msg.includes("超时")
  ) {
    return "timeout";
  }
  if (
    msg.includes("api") ||
    msg.includes("status") ||
    msg.includes("fetch")
  ) {
    return "api_error";
  }
  if (
    msg.includes("json") ||
    msg.includes("parse") ||
    msg.includes("解析")
  ) {
    return "parse_error";
  }
  if (
    msg.includes("write") ||
    msg.includes("写入") ||
    msg.includes("enoent")
  ) {
    return "write_error";
  }
  return "unknown";
}

/**
 * 处理单个领域的完整管道流程
 * 阶段：fetch → filter → format
 * 每个阶段独立 try-catch，失败时精确标记 failedStage 和 errorType
 *
 * @param config - 领域配置
 * @param date - 执行日期 YYYY-MM-DD
 * @param dryRun - 是否 dry-run 模式
 * @returns 领域处理结果
 */
export async function processDomain(
  config: DomainConfig,
  date: string,
  dryRun: boolean,
): Promise<DomainProcessResult> {
  const start = Date.now();
  const base = { domain: config.slug, name: config.name };

  console.log(`  [${config.name}] 开始处理领域: ${config.slug}`);

  // Stage 1: Fetch - 抓取资讯
  let rawItems: RawNewsItem[];
  try {
    rawItems = await fetchNews(config, date);
  } catch (err) {
    const duration = Date.now() - start;
    const msg = extractMessage(err);
    console.error(`  [${config.name}] fetch 阶段失败 (${duration}ms): ${msg}`);
    return {
      ...base,
      status: "failed",
      duration,
      error: msg,
      failedStage: "fetch",
      errorType: classifyError(err),
    };
  }

  // Stage 2: Filter - AI 筛选与摘要
  let filtered: FilteredNewsItem[];
  try {
    filtered = await filterAndSummarize(rawItems, config, date);
  } catch (err) {
    const duration = Date.now() - start;
    const msg = extractMessage(err);
    console.error(
      `  [${config.name}] filter 阶段失败 (${duration}ms): ${msg}`,
    );
    return {
      ...base,
      status: "failed",
      duration,
      error: msg,
      failedStage: "filter",
      errorType: classifyError(err),
    };
  }

  // Stage 3: Format - 格式化为 Markdown
  try {
    await formatAndWrite(filtered, config, date, dryRun);
  } catch (err) {
    const duration = Date.now() - start;
    const msg = extractMessage(err);
    console.error(
      `  [${config.name}] format 阶段失败 (${duration}ms): ${msg}`,
    );
    return {
      ...base,
      status: "failed",
      duration,
      error: msg,
      failedStage: "format",
      errorType: classifyError(err),
    };
  }

  const duration = Date.now() - start;
  console.log(`  [${config.name}] 处理完成 (${duration}ms)`);
  return { ...base, status: "success", duration };
}
