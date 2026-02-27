// scripts/pipeline/publish.ts
// Git 自动提交推送模块 - Git auto commit & push module
// 在所有领域处理完成后执行一次统一的 git add/commit/push

import { execFile } from "node:child_process";
import { getLogRelativePath } from "./error-logger.ts";
import type {
  PipelineResult,
  PublishResult,
  GitCommandError,
} from "./types.ts";

/** 日志前缀 */
const LOG_PREFIX = "    [publish]";

/** 敏感信息过滤正则 */
const SENSITIVE_PATTERNS: readonly RegExp[] = [
  /token[=:]\s*\S+/gi,
  /password[=:]\s*\S+/gi,
  /secret[=:]\s*\S+/gi,
  /authorization:\s*\S+/gi,
  /api[_-]?key[=:]\s*\S+/gi,
  /bearer\s+\S+/gi,
  /ghp_[A-Za-z0-9_]+/g,
  /gho_[A-Za-z0-9_]+/g,
  /github_pat_[A-Za-z0-9_]+/g,
];

/** 过滤敏感信息（immutable reduce） */
export function sanitize(text: string): string {
  return SENSITIVE_PATTERNS.reduce(
    (acc, pattern) => acc.replace(pattern, "[REDACTED]"),
    text,
  );
}

/** 延迟指定毫秒 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Git 命令执行超时（毫秒） */
const GIT_TIMEOUT = 30_000;

/**
 * 执行 git 命令并返回 stdout
 * 使用 execFile 而非 exec，更安全（无 shell 注入风险）
 */
export function execGit(args: readonly string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      "git",
      [...args],
      { timeout: GIT_TIMEOUT, maxBuffer: 10 * 1024 * 1024 },
      (error, stdout, stderr) => {
        if (error) {
          // error.killed 表示进程因超时被终止
          const isTimeout = error.killed === true;
          // error.status 是子进程退出码（number | null）
          // error.code 是 Node.js 错误码字符串（如 "ETIMEDOUT"），不可用作 exitCode
          const exitCode =
            typeof (error as { status?: number }).status === "number"
              ? (error as { status: number }).status
              : 1;
          const stderrMsg = isTimeout
            ? `命令超时 (${GIT_TIMEOUT}ms)`
            : stderr || error.message;
          const gitError: GitCommandError = {
            command: `git ${args.join(" ")}`,
            exitCode,
            stderr: sanitize(stderrMsg),
          };
          const err = new Error(
            `[publish] git 命令失败: ${gitError.command} (exit ${gitError.exitCode}): ${gitError.stderr}`,
          );
          (err as Error & { gitError: GitCommandError }).gitError = gitError;
          reject(err);
          return;
        }
        resolve(stdout.trim());
      },
    );
  });
}

/** 日期格式校验：仅允许 YYYY-MM-DD，防止路径遍历 */
const DATE_PATTERN = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/**
 * 暂存指定日期目录下的文件
 * @returns 暂存文件数量（0 表示无变更）
 */
export async function gitAdd(date: string): Promise<number> {
  if (!DATE_PATTERN.test(date)) {
    throw new Error(`[publish] 无效的日期格式: "${date}"，仅允许 YYYY-MM-DD`);
  }
  const targetPath = `src/content/daily/${date}/`;
  await execGit(["add", targetPath]);

  // 获取暂存区中的文件列表
  const output = await execGit(["diff", "--cached", "--name-only"]);
  if (!output) return 0;

  const files = output.split("\n").filter((f) => f.length > 0);
  return files.length;
}

/** 错误摘要最大长度 */
const MAX_ERROR_SUMMARY = 30;

/**
 * 从错误信息中提取简短摘要
 * 截断超长错误信息
 */
function extractErrorSummary(error: string): string {
  const trimmed = error.trim();
  if (trimmed.length <= MAX_ERROR_SUMMARY) return trimmed;
  return trimmed.slice(0, MAX_ERROR_SUMMARY - 3) + "...";
}

/**
 * 生成 commit message body，逐行列出每个领域的执行状态
 * 格式: - {domain}: {status} [(errorType)]
 */
function buildCommitBody(results: PipelineResult): string {
  const lines = results.results.map((r) => {
    if (r.status === "failed") {
      const errorLabel =
        r.errorType ?? (r.error ? extractErrorSummary(r.error) : "unknown");
      return `- ${r.domain}: failed (${errorLabel})`;
    }
    const statusLabel = r.status === "success" ? "success" : "skipped";
    return `- ${r.domain}: ${statusLabel}`;
  });
  return lines.join("\n");
}

/**
 * 生成结构化提交信息（含多行 body）
 * Subject: chore: daily update {date} ({n}/{total} domains succeeded)
 * 失败时追加: , failed: {slug} ({errorType})
 * Body: 逐领域状态明细
 */
export function buildCommitMessage(
  date: string,
  results: PipelineResult,
): string {
  const total = results.results.length;
  let subject = `chore: daily update ${date} (${results.successCount}/${total} domains succeeded)`;

  const failed = results.results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    const failedParts = failed.map((r) => {
      const errorLabel =
        r.errorType ?? (r.error ? extractErrorSummary(r.error) : "unknown");
      return `${r.domain} (${errorLabel})`;
    });
    subject += `, failed: ${failedParts.join(", ")}`;
  }

  const body = buildCommitBody(results);
  return body ? `${subject}\n\n${body}` : subject;
}

/**
 * 执行 git commit 并返回短格式 commit hash
 */
export async function gitCommit(message: string): Promise<string> {
  const output = await execGit(["commit", "-m", message]);
  // 从 commit 输出中解析短 hash，格式如: [main abc1234] message
  const match = output.match(/\[[\w-]+\s+([a-f0-9]{7,})\]/);
  if (match) return match[1].slice(0, 7);

  // 备选：通过 rev-parse 获取
  const hash = await execGit(["rev-parse", "--short=7", "HEAD"]);
  return hash.slice(0, 7);
}

/** 推送目标分支 */
const PUSH_BRANCH = "main";
/** 默认 push 重试次数 */
const DEFAULT_MAX_RETRIES = 3;
/** 默认重试间隔（毫秒） */
const DEFAULT_RETRY_DELAY = 2000;

/**
 * 推送至远程仓库，失败时重试
 */
export async function gitPush(
  maxRetries: number = DEFAULT_MAX_RETRIES,
  retryDelay: number = DEFAULT_RETRY_DELAY,
): Promise<void> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await execGit(["push", "origin", PUSH_BRANCH]);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        console.log(
          `${LOG_PREFIX} push 失败，重试 ${attempt}/${maxRetries}...`,
        );
        await sleep(retryDelay);
      }
    }
  }

  throw (
    lastError ?? new Error("[publish] push 失败: 无重试机会 (maxRetries ≤ 0)")
  );
}

/**
 * Git 自动提交推送主函数
 * 在所有领域处理完成后统一调用一次
 *
 * @param date - 执行日期 YYYY-MM-DD
 * @param results - 管道执行结果
 * @param dryRun - 是否 dry-run 模式
 * @returns 发布结果
 */
export async function gitPublish(
  date: string,
  results: PipelineResult,
  dryRun: boolean,
): Promise<PublishResult> {
  const commitMessage = buildCommitMessage(date, results);

  // dry-run 模式：仅预览，不执行 git 命令
  if (dryRun) {
    console.log(`${LOG_PREFIX} (dry-run) 将提交: ${commitMessage}`);
    return { commitHash: "", filesAdded: 0, commitMessage };
  }

  // Stage 1: git add (content files)
  let filesAdded = await gitAdd(date);

  // Stage 1.5: 暂存错误日志文件（如有）
  if (results.failedCount > 0) {
    const logPath = getLogRelativePath(date);
    try {
      await execGit(["add", logPath]);
      // 重新统计暂存区文件数，包含错误日志
      const output = await execGit(["diff", "--cached", "--name-only"]);
      if (output) {
        filesAdded = output.split("\n").filter((f) => f.length > 0).length;
      }
    } catch {
      // 日志文件可能不存在（writeErrorLog 失败时），忽略
    }
  }

  if (filesAdded === 0) {
    console.log(`${LOG_PREFIX} 无文件变更，跳过提交`);
    return { commitHash: "", filesAdded: 0, commitMessage };
  }

  console.log(`${LOG_PREFIX} 暂存文件数: ${filesAdded}`);

  // Stage 2: git commit
  const commitHash = await gitCommit(commitMessage);
  console.log(`${LOG_PREFIX} 提交完成: ${commitHash}`);
  console.log(`${LOG_PREFIX} 提交信息: ${commitMessage}`);

  // Stage 3: git push
  await gitPush();
  console.log(`${LOG_PREFIX} 推送成功: ${commitHash}`);

  return { commitHash, filesAdded, commitMessage };
}
