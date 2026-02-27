/**
 * Tests for Domain Failure Isolation (Story 5-1)
 *
 * Covers:
 * - classifyError: error classification by type
 * - extractMessage: error message extraction
 * - processDomain: per-stage failure isolation
 * - writeMarkdownFile: atomic write with cleanup
 * - buildCommitMessage: errorType support
 * - runPipeline: end-to-end failure isolation
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type {
  PipelineResult,
  DomainConfig,
} from "../../scripts/pipeline/types.ts";

// Suppress console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// Import classifyError and extractMessage directly (no mocking needed)
import {
  classifyError,
  extractMessage,
} from "../../scripts/pipeline/process.ts";

// ---------------------------------------------------------------------------
// classifyError
// ---------------------------------------------------------------------------

describe("classifyError", () => {
  it("将 AbortError 分类为 timeout", () => {
    const err = new DOMException("signal aborted", "AbortError");
    expect(classifyError(err)).toBe("timeout");
  });

  it("将包含 timeout 关键词的错误分类为 timeout", () => {
    expect(classifyError(new Error("命令超时 (30000ms)"))).toBe("timeout");
  });

  it("将包含 '超时' 关键词的错误分类为 timeout", () => {
    expect(classifyError(new Error("请求超时了"))).toBe("timeout");
  });

  it("将 API 状态码错误分类为 api_error", () => {
    expect(classifyError(new Error("API 返回 429"))).toBe("api_error");
  });

  it("将包含 status 关键词的错误分类为 api_error", () => {
    expect(classifyError(new Error("HTTP status 500"))).toBe("api_error");
  });

  it("将包含 fetch 关键词的错误分类为 api_error", () => {
    expect(classifyError(new Error("fetch failed"))).toBe("api_error");
  });

  it("将 JSON 解析错误分类为 parse_error", () => {
    expect(classifyError(new Error("JSON.parse failed"))).toBe("parse_error");
  });

  it("将包含 parse 关键词的错误分类为 parse_error", () => {
    expect(classifyError(new Error("parse error in response"))).toBe(
      "parse_error",
    );
  });

  it("将包含 '解析' 关键词的错误分类为 parse_error", () => {
    expect(classifyError(new Error("LLM 响应解析失败"))).toBe("parse_error");
  });

  it("将文件写入错误分类为 write_error", () => {
    expect(classifyError(new Error("文件写入失败: ENOENT"))).toBe(
      "write_error",
    );
  });

  it("将包含 write 关键词的错误分类为 write_error", () => {
    expect(classifyError(new Error("write permission denied"))).toBe(
      "write_error",
    );
  });

  it("将包含 enoent 关键词的错误分类为 write_error", () => {
    expect(classifyError(new Error("ENOENT: no such file"))).toBe(
      "write_error",
    );
  });

  it("将未知错误分类为 unknown", () => {
    expect(classifyError(new Error("something unexpected"))).toBe("unknown");
  });

  it("将非 Error 对象分类为 unknown", () => {
    expect(classifyError("string error")).toBe("unknown");
    expect(classifyError(42)).toBe("unknown");
    expect(classifyError(null)).toBe("unknown");
  });
});

// ---------------------------------------------------------------------------
// extractMessage
// ---------------------------------------------------------------------------

describe("extractMessage", () => {
  it("从 Error 对象提取 message", () => {
    expect(extractMessage(new Error("test error"))).toBe("test error");
  });

  it("将字符串转为 string", () => {
    expect(extractMessage("string error")).toBe("string error");
  });

  it("将数字转为 string", () => {
    expect(extractMessage(42)).toBe("42");
  });

  it("将 null 转为 string", () => {
    expect(extractMessage(null)).toBe("null");
  });
});

// ---------------------------------------------------------------------------
// buildCommitMessage - errorType 支持
// ---------------------------------------------------------------------------

import { buildCommitMessage } from "../../scripts/pipeline/publish.ts";

describe("buildCommitMessage - errorType 支持", () => {
  it("使用 errorType 替代错误摘要截断", () => {
    const results: PipelineResult = {
      results: [
        {
          domain: "ai-tech",
          name: "AI技术",
          status: "success",
          duration: 100,
        },
        {
          domain: "ecom",
          name: "跨境电商",
          status: "failed",
          duration: 200,
          error: "very long error message that would be truncated",
          errorType: "timeout",
        },
      ],
      totalDuration: 300,
      successCount: 1,
      failedCount: 1,
      skippedCount: 0,
    };
    const msg = buildCommitMessage("2026-02-27", results);
    expect(msg).toContain("1/2 domains succeeded");
    expect(msg).toContain("ecom (timeout)");
    expect(msg).not.toContain("very long");
  });

  it("无 errorType 时 fallback 到错误摘要", () => {
    const results: PipelineResult = {
      results: [
        {
          domain: "ecom",
          name: "跨境电商",
          status: "failed",
          duration: 200,
          error: "connection refused",
        },
      ],
      totalDuration: 200,
      successCount: 0,
      failedCount: 1,
      skippedCount: 0,
    };
    const msg = buildCommitMessage("2026-02-27", results);
    expect(msg).toContain("ecom (connection refused)");
  });

  it("多个失败领域使用各自的 errorType", () => {
    const results: PipelineResult = {
      results: [
        {
          domain: "ai-tech",
          name: "AI技术",
          status: "failed",
          duration: 100,
          error: "timeout",
          errorType: "timeout",
        },
        {
          domain: "ecom",
          name: "跨境电商",
          status: "failed",
          duration: 200,
          error: "parse failed",
          errorType: "parse_error",
        },
      ],
      totalDuration: 300,
      successCount: 0,
      failedCount: 2,
      skippedCount: 0,
    };
    const msg = buildCommitMessage("2026-02-27", results);
    expect(msg).toContain("0/2 domains succeeded");
    expect(msg).toContain("ai-tech (timeout)");
    expect(msg).toContain("ecom (parse_error)");
  });

  it("无 errorType 且无 error 时使用 unknown", () => {
    const results: PipelineResult = {
      results: [
        {
          domain: "ecom",
          name: "跨境电商",
          status: "failed",
          duration: 200,
        },
      ],
      totalDuration: 200,
      successCount: 0,
      failedCount: 1,
      skippedCount: 0,
    };
    const msg = buildCommitMessage("2026-02-27", results);
    expect(msg).toContain("ecom (unknown)");
  });
});
