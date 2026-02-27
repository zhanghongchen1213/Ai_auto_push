// scripts/pipeline/error-logger.ts
// 错误日志持久化模块 - Error log persistence module
// 将失败领域的详细错误信息写入 logs/ 目录的日志文件

import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import type { DomainProcessResult, PipelineResult } from "./types.ts";

/** 日期格式正则：仅允许 YYYY-MM-DD，防止路径遍历 */
const DATE_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/** 项目根目录 */
const PROJECT_ROOT = new URL("../../", import.meta.url).pathname;

/** 默认日志目录 */
const DEFAULT_LOGS_DIR = join(PROJECT_ROOT, "logs");

/**
 * 格式化单条错误日志
 *
 * 格式:
 *   [ISO时间戳] domain={slug} name={name} stage={stage} type={errorType} duration={ms}ms
 *     message: {error}
 *
 * 末尾包含空行，便于多条拼接。
 */
export function formatErrorEntry(
  result: DomainProcessResult,
  timestamp: string,
): string {
  const stage = result.failedStage ?? "unknown";
  const errorType = result.errorType ?? "unknown";
  const message = result.error ?? "no error message";

  const lines = [
    `[${timestamp}] domain=${result.domain} name=${result.name} stage=${stage} type=${errorType} duration=${result.duration}ms`,
    `  message: ${message}`,
    "",
  ];
  return lines.join("\n");
}

/**
 * 将失败领域的错误日志写入指定目录（内部实现，支持测试注入目录）
 *
 * - 使用 appendFile 追加写入，同一天多次执行不覆盖
 * - 写入前调用 sanitizeFn 脱敏
 * - 无失败领域时返回 null，不创建文件
 */
export async function _writeErrorLogTo(
  logsDir: string,
  date: string,
  results: PipelineResult,
  sanitizeFn: (text: string) => string,
): Promise<string | null> {
  if (!DATE_PATTERN.test(date)) {
    throw new Error(
      `[error-logger] 无效的日期格式: "${date}"，仅允许 YYYY-MM-DD`,
    );
  }

  const failed = results.results.filter((r) => r.status === "failed");
  if (failed.length === 0) return null;

  await mkdir(logsDir, { recursive: true });

  const logFileName = `${date}-errors.log`;
  const logFilePath = join(logsDir, logFileName);
  const timestamp = new Date().toISOString();

  const header = `--- Pipeline run at ${timestamp} | ${results.failedCount} failed / ${results.results.length} total ---\n`;
  const entries = failed.map((r) => formatErrorEntry(r, timestamp)).join("\n");
  const content = sanitizeFn(header + entries + "\n");

  await appendFile(logFilePath, content, "utf-8");

  return logFilePath;
}

/**
 * 将失败领域的错误日志写入默认 logs/ 目录
 *
 * 文件路径: logs/{date}-errors.log
 * 追加模式，同一天多次执行不覆盖
 */
export async function writeErrorLog(
  date: string,
  results: PipelineResult,
  sanitizeFn: (text: string) => string,
): Promise<string | null> {
  return _writeErrorLogTo(DEFAULT_LOGS_DIR, date, results, sanitizeFn);
}

/**
 * 获取日志文件的相对路径（用于 git add）
 */
export function getLogRelativePath(date: string): string {
  if (!DATE_PATTERN.test(date)) {
    throw new Error(
      `[error-logger] 无效的日期格式: "${date}"，仅允许 YYYY-MM-DD`,
    );
  }
  return `logs/${date}-errors.log`;
}
