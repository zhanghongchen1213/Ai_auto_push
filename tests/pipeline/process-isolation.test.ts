/**
 * Tests for processDomain per-stage failure isolation (Story 5-1)
 *
 * Separated because vi.mock is hoisted and would interfere with
 * tests that import classifyError/extractMessage directly.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Suppress console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// Mock fetch/filter/format dependencies
vi.mock("../../scripts/pipeline/fetch.ts", () => ({
  fetchNews: vi.fn(),
}));
vi.mock("../../scripts/pipeline/filter.ts", () => ({
  filterAndSummarize: vi.fn(),
}));
vi.mock("../../scripts/pipeline/format.ts", () => ({
  formatAndWrite: vi.fn(),
}));

import { fetchNews } from "../../scripts/pipeline/fetch.ts";
import { filterAndSummarize } from "../../scripts/pipeline/filter.ts";
import { formatAndWrite } from "../../scripts/pipeline/format.ts";
import { processDomain } from "../../scripts/pipeline/process.ts";
import type { DomainConfig } from "../../scripts/pipeline/types.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const mockConfig: DomainConfig = {
  slug: "test-domain",
  name: "测试领域",
  icon: "🧪",
  order: 99,
  color: "#000",
  bgColor: "#fff",
  pillBg: "#eee",
  pillText: "#333",
};

const mockFetchNews = vi.mocked(fetchNews);
const mockFilter = vi.mocked(filterAndSummarize);
const mockFormat = vi.mocked(formatAndWrite);

beforeEach(() => {
  mockFetchNews.mockReset();
  mockFilter.mockReset();
  mockFormat.mockReset();
});

// ---------------------------------------------------------------------------
// processDomain - 阶段隔离
// ---------------------------------------------------------------------------

describe("processDomain - 阶段隔离", () => {
  it("fetch 阶段失败时返回 failedStage='fetch' 且不调用 filter/format", async () => {
    mockFetchNews.mockRejectedValueOnce(new Error("API timeout"));
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("fetch");
    expect(result.errorType).toBe("timeout");
    expect(result.error).toBe("API timeout");
    expect(mockFilter).not.toHaveBeenCalled();
    expect(mockFormat).not.toHaveBeenCalled();
  });

  it("filter 阶段失败时返回 failedStage='filter' 且不调用 format", async () => {
    mockFetchNews.mockResolvedValueOnce([]);
    mockFilter.mockRejectedValueOnce(new Error("LLM 响应 JSON 解析失败"));
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("filter");
    expect(result.errorType).toBe("parse_error");
    expect(mockFormat).not.toHaveBeenCalled();
  });

  it("format 阶段失败时返回 failedStage='format'", async () => {
    mockFetchNews.mockResolvedValueOnce([]);
    mockFilter.mockResolvedValueOnce([]);
    mockFormat.mockRejectedValueOnce(new Error("文件写入失败: ENOENT"));
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("format");
    expect(result.errorType).toBe("write_error");
  });

  it("全部阶段成功时无 failedStage 和 errorType", async () => {
    mockFetchNews.mockResolvedValueOnce([]);
    mockFilter.mockResolvedValueOnce([]);
    mockFormat.mockResolvedValueOnce({
      filePath: "",
      itemCount: 0,
      bytesWritten: 0,
    });
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.status).toBe("success");
    expect(result.failedStage).toBeUndefined();
    expect(result.errorType).toBeUndefined();
    expect(result.error).toBeUndefined();
  });

  it("fetch 阶段非 Error 异常也能正确处理", async () => {
    mockFetchNews.mockRejectedValueOnce("string error");
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("fetch");
    expect(result.errorType).toBe("unknown");
    expect(result.error).toBe("string error");
  });

  it("返回结果包含正确的 domain 和 name", async () => {
    mockFetchNews.mockRejectedValueOnce(new Error("fail"));
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.domain).toBe("test-domain");
    expect(result.name).toBe("测试领域");
  });

  it("返回结果包含正确的 duration", async () => {
    mockFetchNews.mockResolvedValueOnce([]);
    mockFilter.mockResolvedValueOnce([]);
    mockFormat.mockResolvedValueOnce({
      filePath: "",
      itemCount: 0,
      bytesWritten: 0,
    });
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.duration).toBeGreaterThanOrEqual(0);
  });
});
