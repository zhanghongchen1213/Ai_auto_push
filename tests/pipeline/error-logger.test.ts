/**
 * Tests for Error Logger Module (Story 5-4)
 *
 * Covers:
 * - formatErrorEntry: error log entry formatting
 * - writeErrorLog: file writing with sanitization
 * - getLogRelativePath: relative path generation
 * - Integration: error log + git commit coordination
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import type {
  DomainProcessResult,
  PipelineResult,
} from "../../scripts/pipeline/types.ts";

// Suppress console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeFailedResult(
  overrides?: Partial<DomainProcessResult>,
): DomainProcessResult {
  return {
    domain: "cross-border-ecom",
    name: "跨境电商",
    status: "failed",
    duration: 5200,
    error: "API 返回 429 Too Many Requests",
    failedStage: "fetch",
    errorType: "api_error",
    ...overrides,
  };
}

function makeSuccessResult(
  overrides?: Partial<DomainProcessResult>,
): DomainProcessResult {
  return {
    domain: "ai-tech",
    name: "AI技术",
    status: "success",
    duration: 100,
    ...overrides,
  };
}

function makePipelineResult(
  overrides?: Partial<PipelineResult>,
): PipelineResult {
  return {
    results: [makeSuccessResult(), makeFailedResult()],
    totalDuration: 5300,
    successCount: 1,
    failedCount: 1,
    skippedCount: 0,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// formatErrorEntry
// ---------------------------------------------------------------------------

describe("formatErrorEntry", () => {
  let formatErrorEntry: typeof import("../../scripts/pipeline/error-logger.ts").formatErrorEntry;

  beforeEach(async () => {
    const mod = await import("../../scripts/pipeline/error-logger.ts");
    formatErrorEntry = mod.formatErrorEntry;
  });

  it("格式化包含完整字段的错误条目", () => {
    const result = makeFailedResult();
    const entry = formatErrorEntry(result, "2026-02-26T08:00:00.000Z");

    expect(entry).toContain("[2026-02-26T08:00:00.000Z]");
    expect(entry).toContain("domain=cross-border-ecom");
    expect(entry).toContain("name=跨境电商");
    expect(entry).toContain("stage=fetch");
    expect(entry).toContain("type=api_error");
    expect(entry).toContain("duration=5200ms");
    expect(entry).toContain("message: API 返回 429 Too Many Requests");
  });

  it("缺失可选字段时使用 unknown 占位", () => {
    const result = makeFailedResult({
      domain: "ai-tech",
      name: "AI技术",
      failedStage: undefined,
      errorType: undefined,
      error: undefined,
    });
    const entry = formatErrorEntry(result, "2026-02-26T08:00:00.000Z");

    expect(entry).toContain("stage=unknown");
    expect(entry).toContain("type=unknown");
    expect(entry).toContain("message: no error message");
  });

  it("返回的字符串以空行结尾（便于追加拼接）", () => {
    const result = makeFailedResult();
    const entry = formatErrorEntry(result, "2026-02-26T08:00:00.000Z");
    expect(entry.endsWith("\n")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// getLogRelativePath
// ---------------------------------------------------------------------------

describe("getLogRelativePath", () => {
  let getLogRelativePath: typeof import("../../scripts/pipeline/error-logger.ts").getLogRelativePath;

  beforeEach(async () => {
    const mod = await import("../../scripts/pipeline/error-logger.ts");
    getLogRelativePath = mod.getLogRelativePath;
  });

  it("返回 logs/{date}-errors.log 格式的路径", () => {
    expect(getLogRelativePath("2026-02-26")).toBe("logs/2026-02-26-errors.log");
  });

  it("不同日期返回不同路径", () => {
    const p1 = getLogRelativePath("2026-01-01");
    const p2 = getLogRelativePath("2026-12-31");
    expect(p1).not.toBe(p2);
    expect(p1).toBe("logs/2026-01-01-errors.log");
    expect(p2).toBe("logs/2026-12-31-errors.log");
  });

  it("拒绝路径遍历攻击字符串", () => {
    expect(() => getLogRelativePath("../../etc")).toThrow("无效的日期格式");
    expect(() => getLogRelativePath("../passwd")).toThrow("无效的日期格式");
  });

  it("拒绝非法日期格式", () => {
    expect(() => getLogRelativePath("not-a-date")).toThrow("无效的日期格式");
    expect(() => getLogRelativePath("2026-13-01")).toThrow("无效的日期格式");
    expect(() => getLogRelativePath("")).toThrow("无效的日期格式");
  });
});

// ---------------------------------------------------------------------------
// writeErrorLog
// ---------------------------------------------------------------------------

describe("writeErrorLog", () => {
  let writeErrorLog: typeof import("../../scripts/pipeline/error-logger.ts").writeErrorLog;
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), "error-logger-test-"));
    // Dynamic import with overridden LOGS_DIR via the factory
    const mod = await import("../../scripts/pipeline/error-logger.ts");
    writeErrorLog = (date, results, sanitizeFn) =>
      mod._writeErrorLogTo(join(tmpDir, "logs"), date, results, sanitizeFn);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it("有失败领域时写入日志文件并返回路径", async () => {
    const results = makePipelineResult();
    const identity = (s: string) => s;

    const logPath = await writeErrorLog("2026-02-26", results, identity);

    expect(logPath).not.toBeNull();
    expect(logPath!).toContain("2026-02-26-errors.log");

    const content = await readFile(logPath!, "utf-8");
    expect(content).toContain("domain=cross-border-ecom");
    expect(content).toContain("stage=fetch");
    expect(content).toContain("type=api_error");
    expect(content).toContain("duration=5200ms");
  });

  it("无失败领域时返回 null 且不创建文件", async () => {
    const results = makePipelineResult({
      results: [makeSuccessResult()],
      failedCount: 0,
      successCount: 1,
    });

    const logPath = await writeErrorLog("2026-02-26", results, (s) => s);
    expect(logPath).toBeNull();
  });

  it("调用 sanitizeFn 对日志内容脱敏", async () => {
    const results = makePipelineResult({
      results: [
        makeFailedResult({
          error: "api_key=sk-secret123 failed",
        }),
      ],
      failedCount: 1,
      successCount: 0,
    });

    const mockSanitize = (s: string) => s.replace(/sk-\w+/g, "[REDACTED]");
    const logPath = await writeErrorLog("2026-02-26", results, mockSanitize);

    const content = await readFile(logPath!, "utf-8");
    expect(content).toContain("[REDACTED]");
    expect(content).not.toContain("sk-secret123");
  });

  it("同一天多次写入追加而非覆盖", async () => {
    const makeRun = (domain: string): PipelineResult => ({
      results: [
        makeFailedResult({
          domain,
          name: domain,
          error: `${domain} error`,
        }),
      ],
      totalDuration: 100,
      successCount: 0,
      failedCount: 1,
      skippedCount: 0,
    });

    const identity = (s: string) => s;
    await writeErrorLog("2026-02-26", makeRun("run1"), identity);
    await writeErrorLog("2026-02-26", makeRun("run2"), identity);

    const logPath = join(tmpDir, "logs", "2026-02-26-errors.log");
    const content = await readFile(logPath, "utf-8");

    expect(content).toContain("domain=run1");
    expect(content).toContain("domain=run2");
    // Should have two pipeline run headers
    expect(content.match(/--- Pipeline run at/g)?.length).toBe(2);
  });

  it("日志包含 header 行（失败数/总数统计）", async () => {
    const results = makePipelineResult();
    const logPath = await writeErrorLog("2026-02-26", results, (s) => s);

    const content = await readFile(logPath!, "utf-8");
    expect(content).toContain("1 failed / 2 total");
  });

  it("多个失败领域全部记录", async () => {
    const results = makePipelineResult({
      results: [
        makeFailedResult({ domain: "ecom", name: "电商" }),
        makeFailedResult({
          domain: "ai-tech",
          name: "AI技术",
          failedStage: "format",
          errorType: "parse_error",
        }),
      ],
      failedCount: 2,
      successCount: 0,
    });

    const logPath = await writeErrorLog("2026-02-26", results, (s) => s);
    const content = await readFile(logPath!, "utf-8");

    expect(content).toContain("domain=ecom");
    expect(content).toContain("domain=ai-tech");
    expect(content).toContain("stage=format");
    expect(content).toContain("type=parse_error");
  });

  it("拒绝路径遍历攻击的日期参数", async () => {
    const results = makePipelineResult();
    const identity = (s: string) => s;
    await expect(writeErrorLog("../../etc", results, identity)).rejects.toThrow(
      "无效的日期格式",
    );
  });

  it("拒绝非法日期格式", async () => {
    const results = makePipelineResult();
    const identity = (s: string) => s;
    await expect(
      writeErrorLog("not-a-date", results, identity),
    ).rejects.toThrow("无效的日期格式");
  });
});

// ---------------------------------------------------------------------------
// Integration: error log write failure does not block pipeline
// ---------------------------------------------------------------------------

describe("错误日志写入失败不阻断管道", () => {
  it("writeErrorLog 写入失败时调用方可 catch 而不中断", async () => {
    const mod = await import("../../scripts/pipeline/error-logger.ts");
    // Use an invalid path to trigger write failure
    const badDir = "/nonexistent/path/that/should/fail";
    const results = makePipelineResult();

    let caught = false;
    try {
      await mod._writeErrorLogTo(badDir, "2026-02-26", results, (s) => s);
    } catch {
      caught = true;
    }
    // The function should throw, and the caller (run.ts) wraps it in try-catch
    expect(caught).toBe(true);
  });
});
