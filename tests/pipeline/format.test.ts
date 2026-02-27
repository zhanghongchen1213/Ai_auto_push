/**
 * Tests for Markdown Format Output Module (Story 4-4)
 *
 * Covers:
 * - buildFrontmatter: YAML frontmatter generation
 * - buildMarkdownBody: news item body formatting
 * - buildMarkdown: full markdown assembly
 * - getOutputPath: file path calculation
 * - writeMarkdownFile: file system writing (mocked)
 * - formatAndWrite: main function end-to-end
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { FilteredNewsItem } from "../../scripts/pipeline/types.ts";

// Suppress console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// Mock fs module
vi.mock("node:fs/promises", () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
  writeFile: vi.fn().mockResolvedValue(undefined),
  rename: vi.fn().mockResolvedValue(undefined),
  unlink: vi.fn().mockResolvedValue(undefined),
}));

import { mkdir, writeFile, rename, unlink } from "node:fs/promises";
import {
  buildFrontmatter,
  buildMarkdownBody,
  buildMarkdown,
  getOutputPath,
  writeMarkdownFile,
  formatAndWrite,
} from "../../scripts/pipeline/format.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const MOCK_CONFIG = {
  slug: "ai-tech" as const,
  name: "AI技术" as const,
  icon: "🤖" as const,
  order: 1 as const,
  color: "#3B82F6" as const,
  bgColor: "#EFF6FF" as const,
  pillBg: "#F0F5FF" as const,
  pillText: "#1677FF" as const,
};

const SAMPLE_ITEMS: FilteredNewsItem[] = [
  {
    title: "OpenAI 发布 GPT-5",
    summary:
      "OpenAI 今日发布了新一代大语言模型 GPT-5，在推理能力方面有显著提升。",
    url: "https://example.com/news/1",
    publishedAt: "2026-02-27T08:00:00Z",
    source: "OpenAI Blog",
    score: 95,
  },
  {
    title: "Google 推出 Gemini 3.0",
    summary: "Google DeepMind 发布 Gemini 3.0 多模态模型，图像理解取得突破。",
    url: "https://example.com/news/2",
    publishedAt: "2026-02-26T10:00:00Z",
    source: "Google Blog",
    score: 88,
  },
];

const TEST_DATE = "2026-02-27";

// ---------------------------------------------------------------------------
// buildFrontmatter
// ---------------------------------------------------------------------------

describe("buildFrontmatter", () => {
  it("should contain all 5 required fields", () => {
    const fm = buildFrontmatter(MOCK_CONFIG, TEST_DATE, 3);
    expect(fm).toContain('title: "AI技术日报"');
    expect(fm).toContain('domain: "ai-tech"');
    expect(fm).toContain(`date: "${TEST_DATE}"`);
    expect(fm).toContain("itemCount: 3");
    expect(fm).toMatch(/generatedAt: "\d{4}-\d{2}-\d{2}T/);
  });

  it("should wrap with --- delimiters", () => {
    const fm = buildFrontmatter(MOCK_CONFIG, TEST_DATE, 1);
    expect(fm.startsWith("---")).toBe(true);
    expect(fm.endsWith("---")).toBe(true);
  });

  it("should have ISO 8601 generatedAt", () => {
    const fm = buildFrontmatter(MOCK_CONFIG, TEST_DATE, 0);
    const match = fm.match(/generatedAt: "([^"]+)"/);
    expect(match).not.toBeNull();
    const parsed = new Date(match![1]);
    expect(parsed.getTime()).not.toBeNaN();
  });
});

// ---------------------------------------------------------------------------
// buildMarkdownBody
// ---------------------------------------------------------------------------

describe("buildMarkdownBody", () => {
  it("should format each item with ## title, summary, and source link", () => {
    const body = buildMarkdownBody(SAMPLE_ITEMS);
    expect(body).toContain("## OpenAI 发布 GPT-5");
    expect(body).toContain("在推理能力方面有显著提升。");
    expect(body).toContain(
      "**来源：** [OpenAI Blog](https://example.com/news/1)",
    );
    expect(body).toContain("## Google 推出 Gemini 3.0");
    expect(body).toContain(
      "**来源：** [Google Blog](https://example.com/news/2)",
    );
  });

  it("should return empty string for empty array", () => {
    const body = buildMarkdownBody([]);
    expect(body).toBe("");
  });

  it("should skip items with empty title", () => {
    const items: FilteredNewsItem[] = [
      { ...SAMPLE_ITEMS[0], title: "" },
      SAMPLE_ITEMS[1],
    ];
    const body = buildMarkdownBody(items);
    expect(body).not.toContain("## \n");
    expect(body).toContain("## Google 推出 Gemini 3.0");
  });

  it("should skip items with empty url", () => {
    const items: FilteredNewsItem[] = [
      { ...SAMPLE_ITEMS[0], url: "" },
      SAMPLE_ITEMS[1],
    ];
    const body = buildMarkdownBody(items);
    expect(body).not.toContain("OpenAI 发布 GPT-5");
    expect(body).toContain("## Google 推出 Gemini 3.0");
  });

  it("should use hostname when source is empty", () => {
    const items: FilteredNewsItem[] = [{ ...SAMPLE_ITEMS[0], source: "" }];
    const body = buildMarkdownBody(items);
    expect(body).toContain("[example.com]");
  });

  it("should fallback to raw url when source is empty and url is not parseable", () => {
    const items: FilteredNewsItem[] = [
      { ...SAMPLE_ITEMS[0], source: "", url: "not-a-valid-url" },
    ];
    const body = buildMarkdownBody(items);
    expect(body).toContain("[not-a-valid-url]");
  });
});

// ---------------------------------------------------------------------------
// buildMarkdown
// ---------------------------------------------------------------------------

describe("buildMarkdown", () => {
  it("should combine frontmatter and body", () => {
    const md = buildMarkdown(SAMPLE_ITEMS, MOCK_CONFIG, TEST_DATE);
    expect(md).toMatch(/^---\n/);
    expect(md).toContain("## OpenAI 发布 GPT-5");
    expect(md).toContain("## Google 推出 Gemini 3.0");
  });

  it("should end with a single newline", () => {
    const md = buildMarkdown(SAMPLE_ITEMS, MOCK_CONFIG, TEST_DATE);
    expect(md.endsWith("\n")).toBe(true);
    expect(md.endsWith("\n\n")).toBe(false);
  });

  it("should set correct itemCount excluding invalid items", () => {
    const items: FilteredNewsItem[] = [
      SAMPLE_ITEMS[0],
      { ...SAMPLE_ITEMS[1], title: "" },
    ];
    const md = buildMarkdown(items, MOCK_CONFIG, TEST_DATE);
    expect(md).toContain("itemCount: 1");
  });
});

// ---------------------------------------------------------------------------
// getOutputPath
// ---------------------------------------------------------------------------

describe("getOutputPath", () => {
  it("should return correct path format", () => {
    const p = getOutputPath("2026-02-27", "ai-tech");
    expect(p).toBe("src/content/daily/2026-02-27/ai-tech.md");
  });

  it("should handle different slugs", () => {
    const p = getOutputPath("2026-01-01", "cross-border-ecom");
    expect(p).toBe("src/content/daily/2026-01-01/cross-border-ecom.md");
  });

  it("should reject path traversal in date parameter", () => {
    expect(() => getOutputPath("../../etc", "ai-tech")).toThrow("非法日期格式");
  });

  it("should reject path traversal in slug parameter", () => {
    expect(() => getOutputPath("2026-02-27", "../../../etc/passwd")).toThrow(
      "非法领域 slug",
    );
  });

  it("should reject invalid date formats", () => {
    expect(() => getOutputPath("2026/02/27", "ai-tech")).toThrow(
      "非法日期格式",
    );
    expect(() => getOutputPath("not-a-date", "ai-tech")).toThrow(
      "非法日期格式",
    );
  });

  it("should reject slugs with uppercase or special chars", () => {
    expect(() => getOutputPath("2026-02-27", "AI_Tech")).toThrow(
      "非法领域 slug",
    );
  });
});

// ---------------------------------------------------------------------------
// writeMarkdownFile
// ---------------------------------------------------------------------------

describe("writeMarkdownFile", () => {
  beforeEach(() => {
    vi.mocked(mkdir).mockClear();
    vi.mocked(writeFile).mockClear();
    vi.mocked(rename).mockClear();
    vi.mocked(unlink).mockClear();
  });

  it("should call mkdir, writeFile to tmp, and rename", async () => {
    const bytes = await writeMarkdownFile("hello", "/tmp/test/file.md");
    expect(mkdir).toHaveBeenCalledWith("/tmp/test", { recursive: true });
    expect(writeFile).toHaveBeenCalledWith(
      "/tmp/test/file.md.tmp",
      expect.any(Buffer),
    );
    expect(rename).toHaveBeenCalledWith(
      "/tmp/test/file.md.tmp",
      "/tmp/test/file.md",
    );
    expect(bytes).toBe(Buffer.byteLength("hello", "utf-8"));
  });

  it("should throw structured error on write failure and clean up tmp", async () => {
    vi.mocked(writeFile).mockRejectedValueOnce(new Error("EACCES"));
    await expect(writeMarkdownFile("content", "/bad/path.md")).rejects.toThrow(
      "[format] 文件写入失败: /bad/path.md",
    );
    // Should attempt to clean up tmp file
    expect(unlink).toHaveBeenCalledWith("/bad/path.md.tmp");
  });

  it("should clean up tmp file when rename fails", async () => {
    vi.mocked(rename).mockRejectedValueOnce(new Error("rename failed"));
    await expect(
      writeMarkdownFile("content", "/tmp/test/file.md"),
    ).rejects.toThrow("[format] 文件写入失败");
    expect(unlink).toHaveBeenCalledWith("/tmp/test/file.md.tmp");
  });
});

// ---------------------------------------------------------------------------
// formatAndWrite
// ---------------------------------------------------------------------------

describe("formatAndWrite", () => {
  beforeEach(() => {
    vi.mocked(mkdir).mockClear();
    vi.mocked(writeFile).mockClear();
    vi.mocked(rename).mockClear();
    vi.mocked(unlink).mockClear();
  });

  it("should return skipped result for empty input", async () => {
    const result = await formatAndWrite([], MOCK_CONFIG, TEST_DATE, false);
    expect(result.filePath).toBe("");
    expect(result.itemCount).toBe(0);
    expect(result.bytesWritten).toBe(0);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("should generate file and return correct result", async () => {
    const result = await formatAndWrite(
      SAMPLE_ITEMS,
      MOCK_CONFIG,
      TEST_DATE,
      false,
    );
    expect(result.filePath).toContain("ai-tech.md");
    expect(result.itemCount).toBe(2);
    expect(result.bytesWritten).toBeGreaterThan(0);
    expect(writeFile).toHaveBeenCalledTimes(1);
  });

  it("should not write file in dryRun mode", async () => {
    const result = await formatAndWrite(
      SAMPLE_ITEMS,
      MOCK_CONFIG,
      TEST_DATE,
      true,
    );
    expect(result.filePath).toBe("");
    expect(result.itemCount).toBe(2);
    expect(result.bytesWritten).toBe(0);
    expect(writeFile).not.toHaveBeenCalled();
  });

  it("should filter out invalid items", async () => {
    const items: FilteredNewsItem[] = [
      SAMPLE_ITEMS[0],
      { ...SAMPLE_ITEMS[1], title: "" },
    ];
    const result = await formatAndWrite(items, MOCK_CONFIG, TEST_DATE, false);
    expect(result.itemCount).toBe(1);
  });
});
