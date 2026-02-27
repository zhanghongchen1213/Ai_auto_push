// scripts/pipeline/process.ts
// 领域处理函数 - fetch/filter/format 阶段（publish 已移至 run.ts 统一调用）

import type { DomainConfig, DomainProcessResult } from "./types.ts";
import { fetchNews } from "./fetch.ts";
import { filterAndSummarize } from "./filter.ts";
import { formatAndWrite } from "./format.ts";

/**
 * 处理单个领域的完整管道流程
 * 阶段：fetch → filter → format
 * 注意：publish 阶段在 run.ts 中所有领域处理完成后统一调用
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

  console.log(`  [${config.name}] 开始处理领域: ${config.slug}`);

  try {
    // Stage 1: Fetch - 抓取资讯 (Story 4-2 已实现)
    const rawItems = await fetchNews(config, date);

    // Stage 2: Filter - AI 筛选与摘要 (Story 4-3 已实现)
    const filtered = await filterAndSummarize(rawItems, config, date);

    // Stage 3: Format - 格式化为 Markdown (Story 4-4 已实现)
    await formatAndWrite(filtered, config, date, dryRun);

    const duration = Date.now() - start;
    console.log(`  [${config.name}] 处理完成 (${duration}ms)`);

    return {
      domain: config.slug,
      name: config.name,
      status: "success",
      duration,
    };
  } catch (err) {
    const duration = Date.now() - start;
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  [${config.name}] 处理失败 (${duration}ms): ${msg}`);

    return {
      domain: config.slug,
      name: config.name,
      status: "failed",
      duration,
      error: msg,
    };
  }
}
