// scripts/pipeline/run.ts
// 管道入口脚本 - Pipeline entry point
// 从领域配置读取所有启用的领域，按顺序调度执行

import { parseArgs } from "node:util";
import { domains } from "../../src/config/domains.ts";
import {
  validateAllDomains,
  checkConfigConsistency,
} from "./config-validator.ts";
import { processDomain } from "./process.ts";
import { gitPublish } from "./publish.ts";
import { initSources } from "./sources/index.ts";
import { getAllRegisteredSlugs } from "./sources/registry.ts";
import type {
  DomainConfig,
  DomainProcessResult,
  PipelineContext,
  PipelineResult,
} from "./types.ts";

/** 日期格式正则：YYYY-MM-DD */
const DATE_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/** 获取今日日期 YYYY-MM-DD（使用 UTC 避免时区歧义） */
export function getTodayDate(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 校验日期字符串格式 YYYY-MM-DD，且为合法日期 */
export function isValidDate(dateStr: string): boolean {
  if (!DATE_PATTERN.test(dateStr)) return false;
  const parsed = new Date(dateStr + "T00:00:00Z");
  if (Number.isNaN(parsed.getTime())) return false;
  // 防止 2月30日 等非法日期被 Date 自动修正
  const [y, m, d] = dateStr.split("-").map(Number);
  return (
    parsed.getUTCFullYear() === y &&
    parsed.getUTCMonth() + 1 === m &&
    parsed.getUTCDate() === d
  );
}

/** 领域 slug 合法字符：仅允许小写字母、数字、连字符，不允许首尾连字符 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** 解析命令行参数 */
function parseCLIArgs(): PipelineContext {
  // 过滤掉 pnpm/npm 传入的 "--" 分隔符，确保 parseArgs 正确解析选项
  const rawArgs = process.argv.slice(2);
  const args = rawArgs.filter((arg) => arg !== "--");

  const { values } = parseArgs({
    args,
    options: {
      domain: { type: "string", short: "d" },
      "dry-run": { type: "boolean", default: false },
      date: { type: "string" },
    },
    strict: true,
  });

  // 校验 --date 参数
  const date = values.date ?? getTodayDate();
  if (!isValidDate(date)) {
    console.error(`错误: 无效的日期格式 "${date}"，要求 YYYY-MM-DD`);
    process.exit(1);
  }

  // 校验 --domain 参数格式
  const domain = values.domain;
  if (domain !== undefined && !SLUG_PATTERN.test(domain)) {
    console.error(
      `错误: 无效的领域 slug "${domain}"，仅允许小写字母、数字和连字符`,
    );
    process.exit(1);
  }

  return {
    date,
    targetDomain: domain,
    dryRun: values["dry-run"] ?? false,
  };
}

/** 获取要执行的领域列表（按 order 排序）。未找到指定领域时抛出错误而非直接 exit */
export function getTargetDomains(
  ctx: PipelineContext,
): readonly DomainConfig[] {
  const sorted = [...domains].sort((a, b) => a.order - b.order);

  if (!ctx.targetDomain) {
    return sorted;
  }

  const found = sorted.filter((d) => d.slug === ctx.targetDomain);
  if (found.length === 0) {
    const available = sorted.map((d) => d.slug).join(", ");
    throw new Error(`未找到领域 "${ctx.targetDomain}"。可用领域: ${available}`);
  }
  return found;
}

/**
 * 计算字符串的终端显示宽度（CJK 字符占 2 列）
 * 简易实现：CJK Unified Ideographs 及常见全角范围按 2 计算
 */
function displayWidth(str: string): number {
  let width = 0;
  for (const ch of str) {
    const code = ch.codePointAt(0) ?? 0;
    // CJK Unified Ideographs, CJK Compatibility, Fullwidth Forms, etc.
    if (
      (code >= 0x4e00 && code <= 0x9fff) || // CJK Unified Ideographs
      (code >= 0x3000 && code <= 0x303f) || // CJK Symbols and Punctuation
      (code >= 0xff00 && code <= 0xffef) || // Fullwidth Forms
      (code >= 0xac00 && code <= 0xd7af) // Hangul Syllables
    ) {
      width += 2;
    } else {
      width += 1;
    }
  }
  return width;
}

/** 按终端显示宽度填充字符串（兼容 CJK） */
function padEndDisplay(str: string, targetWidth: number): string {
  const currentWidth = displayWidth(str);
  const padding = Math.max(0, targetWidth - currentWidth);
  return str + " ".repeat(padding);
}

/** 输出汇总日志 */
export function printSummary(result: PipelineResult): void {
  console.log("\n" + "=".repeat(60));
  console.log("管道执行汇总");
  console.log("=".repeat(60));

  // 表头
  console.log(
    `${padEndDisplay("领域", 16)}${padEndDisplay("状态", 10)}${padEndDisplay("耗时", 12)}错误信息`,
  );
  console.log("-".repeat(60));

  // 每个领域的结果
  for (const r of result.results) {
    const statusLabel =
      r.status === "success" ? "成功" : r.status === "failed" ? "失败" : "跳过";
    const durationStr = `${r.duration}ms`;
    const errorStr = r.error ?? "-";
    console.log(
      `${padEndDisplay(r.name, 16)}${padEndDisplay(statusLabel, 10)}${padEndDisplay(durationStr, 12)}${errorStr}`,
    );
  }

  console.log("-".repeat(60));
  console.log(
    `总计: ${result.results.length} 个领域 | ` +
      `成功: ${result.successCount} | ` +
      `失败: ${result.failedCount} | ` +
      `跳过: ${result.skippedCount} | ` +
      `总耗时: ${result.totalDuration}ms`,
  );
  console.log("=".repeat(60));
}

/** 执行管道主流程 */
export async function runPipeline(
  ctx: PipelineContext,
): Promise<PipelineResult> {
  const pipelineStart = Date.now();
  const modeLabel = ctx.dryRun ? " [DRY-RUN]" : "";
  console.log(`\n管道启动${modeLabel}`);
  console.log(`执行日期: ${ctx.date}`);

  // Step 1: 校验领域配置
  const validation = validateAllDomains();
  console.log(`    [config] 已加载 ${domains.length} 个领域配置`);
  for (const w of validation.warnings) {
    console.warn(`    [config] 警告: ${w}`);
  }
  if (!validation.valid) {
    for (const e of validation.errors) {
      console.error(`    [config] 错误: ${e}`);
    }
    throw new Error("领域配置校验失败，管道终止");
  }

  // Step 2: 加载信息源配置
  await initSources();

  // Step 3: 一致性检查
  const domainSlugs = domains.map((d) => d.slug);
  const sourceSlugs = getAllRegisteredSlugs();
  const consistency = checkConfigConsistency(domainSlugs, sourceSlugs);

  for (const slug of consistency.missingSource) {
    console.warn(
      `    [config] 警告: 领域 "${slug}" 在 domains.ts 中配置但无信息源文件，将跳过`,
    );
  }
  for (const slug of consistency.orphanSource) {
    console.warn(
      `    [config] 警告: 信息源文件 "${slug}" 无对应的 domains.ts 配置，将忽略`,
    );
  }
  console.log(
    `    [config] 配置校验: ${consistency.matched.length}/${domainSlugs.length} 个领域配置匹配`,
  );

  // Step 4: 调度领域执行
  const targetDomains = getTargetDomains(ctx);
  const results: DomainProcessResult[] = [];

  console.log(`目标领域: ${targetDomains.map((d) => d.name).join(", ")}`);
  console.log("");

  // 串行调度每个领域，故障隔离
  for (const domain of targetDomains) {
    const domainStart = Date.now();
    try {
      const result = await processDomain(domain, ctx.date, ctx.dryRun);
      results.push(result);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error(`  [${domain.name}] 执行失败: ${errorMsg}`);
      results.push({
        domain: domain.slug,
        name: domain.name,
        status: "failed",
        duration: Date.now() - domainStart,
        error: errorMsg,
      });
    }
  }

  const totalDuration = Date.now() - pipelineStart;

  // 单次遍历统计各状态数量
  const counts = results.reduce(
    (acc, r) => {
      acc[r.status] += 1;
      return acc;
    },
    { success: 0, failed: 0, skipped: 0 },
  );

  const pipelineResult: PipelineResult = {
    results,
    totalDuration,
    successCount: counts.success,
    failedCount: counts.failed,
    skippedCount: counts.skipped,
  };

  // Publish: 所有领域处理完成后统一执行 git add/commit/push
  try {
    await gitPublish(ctx.date, pipelineResult, ctx.dryRun);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`    [publish] 发布失败: ${msg}`);
  }

  return pipelineResult;
}

// --- Main Entry Point ---
// Only execute when run directly, not when imported for testing
// Use import.meta.url for reliable ESM direct-run detection

const isDirectRun =
  import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/pipeline/run.ts") ||
  process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/pipeline/run.js");

if (isDirectRun) {
  main();
}

async function main(): Promise<void> {
  try {
    const ctx = parseCLIArgs();
    const result = await runPipeline(ctx);
    printSummary(result);

    // 退出码：全部失败 → 1，至少一个成功 → 0
    if (result.successCount === 0 && result.results.length > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("管道执行异常:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}
