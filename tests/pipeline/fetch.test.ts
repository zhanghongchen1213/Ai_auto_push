/**
 * Tests for News Fetch Module (Story 4-2)
 *
 * Covers:
 * - Source config loading (all 4 domains)
 * - openclaw API response parsing
 * - Deduplication by URL
 * - Cleaning (empty title/url, HTML tags, whitespace)
 * - Sorting by publishedAt descending
 * - Multi-source fetch with failure isolation
 * - All-sources-fail aggregated error
 * - API key validation
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RawNewsItem } from "../../scripts/pipeline/types.ts";

// Suppress console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Source config tests
// ---------------------------------------------------------------------------

describe("domain source configs", () => {
  it("all 4 domains have fetch configs", async () => {
    const { initSources, getAllDomainFetchConfigs } =
      await import("../../scripts/pipeline/sources/index.ts");
    await initSources();
    const configs = getAllDomainFetchConfigs();
    expect(configs).toHaveLength(4);

    const slugs = configs.map((c) => c.domainSlug);
    expect(slugs).toContain("ai-tech");
    expect(slugs).toContain("cross-border-ecom");
    expect(slugs).toContain("product-startup");
    expect(slugs).toContain("github-trending");
  });

  it("each domain has at least 2 sources", async () => {
    const { initSources, getAllDomainFetchConfigs } =
      await import("../../scripts/pipeline/sources/index.ts");
    await initSources();
    for (const config of getAllDomainFetchConfigs()) {
      expect(config.sources.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("each source has name, query, and type", async () => {
    const { initSources, getAllDomainFetchConfigs } =
      await import("../../scripts/pipeline/sources/index.ts");
    await initSources();
    for (const config of getAllDomainFetchConfigs()) {
      for (const source of config.sources) {
        expect(source.name).toBeTruthy();
        expect(source.query).toBeTruthy();
        expect(source.type).toBeTruthy();
      }
    }
  });

  it("getDomainFetchConfig returns correct config", async () => {
    const { initSources, getDomainFetchConfig } =
      await import("../../scripts/pipeline/sources/index.ts");
    await initSources();
    const config = getDomainFetchConfig("ai-tech");
    expect(config).toBeDefined();
    expect(config!.domainSlug).toBe("ai-tech");
  });

  it("getDomainFetchConfig returns undefined for unknown slug", async () => {
    const { getDomainFetchConfig } =
      await import("../../scripts/pipeline/sources/index.ts");
    expect(getDomainFetchConfig("nonexistent")).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// parseOpenclawResponse tests
// ---------------------------------------------------------------------------

describe("parseOpenclawResponse", () => {
  it("parses valid response into RawNewsItem array", async () => {
    const { parseOpenclawResponse } =
      await import("../../scripts/pipeline/fetch.ts");
    const data = {
      results: [
        {
          title: "AI News",
          content: "Some content",
          url: "https://example.com/1",
          published_at: "2026-02-27T10:00:00Z",
        },
      ],
    };
    const items = parseOpenclawResponse(data);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("AI News");
    expect(items[0].url).toBe("https://example.com/1");
    expect(items[0].publishedAt).toBe("2026-02-27T10:00:00Z");
  });

  it("returns empty array for empty results", async () => {
    const { parseOpenclawResponse } =
      await import("../../scripts/pipeline/fetch.ts");
    expect(parseOpenclawResponse({ results: [] })).toEqual([]);
    expect(parseOpenclawResponse({})).toEqual([]);
    expect(parseOpenclawResponse({ results: null as any })).toEqual([]);
  });

  it("filters out items with empty title or url", async () => {
    const { parseOpenclawResponse } =
      await import("../../scripts/pipeline/fetch.ts");
    const data = {
      results: [
        { title: "", url: "https://example.com/1" },
        { title: "Valid", url: "" },
        { title: "Good", url: "https://example.com/2" },
      ],
    };
    const items = parseOpenclawResponse(data);
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Good");
  });
});

// ---------------------------------------------------------------------------
// deduplicateByUrl tests
// ---------------------------------------------------------------------------

describe("deduplicateByUrl", () => {
  it("removes duplicate URLs keeping first occurrence", async () => {
    const { deduplicateByUrl } =
      await import("../../scripts/pipeline/fetch.ts");
    const items: RawNewsItem[] = [
      { title: "First", content: "", url: "https://a.com", publishedAt: "" },
      { title: "Second", content: "", url: "https://a.com", publishedAt: "" },
      { title: "Third", content: "", url: "https://b.com", publishedAt: "" },
    ];
    const result = deduplicateByUrl(items);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe("First");
    expect(result[1].title).toBe("Third");
  });

  it("returns empty array for empty input", async () => {
    const { deduplicateByUrl } =
      await import("../../scripts/pipeline/fetch.ts");
    expect(deduplicateByUrl([])).toEqual([]);
  });

  it("normalizes trailing slashes for dedup", async () => {
    const { deduplicateByUrl } =
      await import("../../scripts/pipeline/fetch.ts");
    const items: RawNewsItem[] = [
      {
        title: "With slash",
        content: "",
        url: "https://a.com/path/",
        publishedAt: "",
      },
      {
        title: "No slash",
        content: "",
        url: "https://a.com/path",
        publishedAt: "",
      },
    ];
    const result = deduplicateByUrl(items);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("With slash");
  });

  it("normalizes utm tracking params for dedup", async () => {
    const { deduplicateByUrl } =
      await import("../../scripts/pipeline/fetch.ts");
    const items: RawNewsItem[] = [
      {
        title: "With UTM",
        content: "",
        url: "https://a.com/page?utm_source=twitter&utm_medium=social",
        publishedAt: "",
      },
      {
        title: "No UTM",
        content: "",
        url: "https://a.com/page",
        publishedAt: "",
      },
    ];
    const result = deduplicateByUrl(items);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("With UTM");
  });
});

// ---------------------------------------------------------------------------
// cleanNewsItem tests
// ---------------------------------------------------------------------------

describe("cleanNewsItem", () => {
  it("strips HTML tags from title and content", async () => {
    const { cleanNewsItem } = await import("../../scripts/pipeline/fetch.ts");
    const item: RawNewsItem = {
      title: "<b>Bold Title</b>",
      content: "<p>Paragraph</p> text",
      url: "https://example.com",
      publishedAt: "2026-01-01",
    };
    const cleaned = cleanNewsItem(item);
    expect(cleaned).not.toBeNull();
    expect(cleaned!.title).toBe("Bold Title");
    expect(cleaned!.content).toBe("Paragraph text");
  });

  it("normalizes whitespace", async () => {
    const { cleanNewsItem } = await import("../../scripts/pipeline/fetch.ts");
    const item: RawNewsItem = {
      title: "  Multiple   spaces  ",
      content: "Line1\n\nLine2\t\tTab",
      url: "https://example.com",
      publishedAt: "",
    };
    const cleaned = cleanNewsItem(item);
    expect(cleaned!.title).toBe("Multiple spaces");
    expect(cleaned!.content).toBe("Line1 Line2 Tab");
  });

  it("returns null for empty title", async () => {
    const { cleanNewsItem } = await import("../../scripts/pipeline/fetch.ts");
    const item: RawNewsItem = {
      title: "   ",
      content: "content",
      url: "https://example.com",
      publishedAt: "",
    };
    expect(cleanNewsItem(item)).toBeNull();
  });

  it("returns null for empty url", async () => {
    const { cleanNewsItem } = await import("../../scripts/pipeline/fetch.ts");
    const item: RawNewsItem = {
      title: "Title",
      content: "content",
      url: "  ",
      publishedAt: "",
    };
    expect(cleanNewsItem(item)).toBeNull();
  });

  it("truncates content exceeding 5000 chars", async () => {
    const { cleanNewsItem } = await import("../../scripts/pipeline/fetch.ts");
    const longContent = "a".repeat(6000);
    const item: RawNewsItem = {
      title: "Title",
      content: longContent,
      url: "https://example.com",
      publishedAt: "",
    };
    const cleaned = cleanNewsItem(item);
    expect(cleaned!.content.length).toBe(5000);
  });

  it("decodes HTML entities in title and content", async () => {
    const { cleanNewsItem } = await import("../../scripts/pipeline/fetch.ts");
    const item: RawNewsItem = {
      title: "Tom &amp; Jerry &lt;show&gt;",
      content: "Price: &quot;$10&quot; &amp; &#39;free&#39;",
      url: "https://example.com",
      publishedAt: "",
    };
    const cleaned = cleanNewsItem(item);
    expect(cleaned).not.toBeNull();
    expect(cleaned!.title).toBe("Tom & Jerry <show>");
    expect(cleaned!.content).toBe("Price: \"$10\" & 'free'");
  });

  it("returns null for javascript: protocol URL (XSS prevention)", async () => {
    const { cleanNewsItem } = await import("../../scripts/pipeline/fetch.ts");
    const item: RawNewsItem = {
      title: "Valid Title",
      content: "content",
      url: "javascript:alert(1)",
      publishedAt: "",
    };
    expect(cleanNewsItem(item)).toBeNull();
  });

  it("returns null for data: protocol URL", async () => {
    const { cleanNewsItem } = await import("../../scripts/pipeline/fetch.ts");
    const item: RawNewsItem = {
      title: "Valid Title",
      content: "content",
      url: "data:text/html,<script>alert(1)</script>",
      publishedAt: "",
    };
    expect(cleanNewsItem(item)).toBeNull();
  });

  it("returns null for malformed URL", async () => {
    const { cleanNewsItem } = await import("../../scripts/pipeline/fetch.ts");
    const item: RawNewsItem = {
      title: "Valid Title",
      content: "content",
      url: "not-a-valid-url",
      publishedAt: "",
    };
    expect(cleanNewsItem(item)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// sortByDate tests
// ---------------------------------------------------------------------------

describe("sortByDate", () => {
  it("sorts by publishedAt descending (newest first)", async () => {
    const { sortByDate } = await import("../../scripts/pipeline/fetch.ts");
    const items: RawNewsItem[] = [
      {
        title: "Old",
        content: "",
        url: "https://a.com",
        publishedAt: "2026-01-01T00:00:00Z",
      },
      {
        title: "New",
        content: "",
        url: "https://b.com",
        publishedAt: "2026-02-27T00:00:00Z",
      },
      {
        title: "Mid",
        content: "",
        url: "https://c.com",
        publishedAt: "2026-01-15T00:00:00Z",
      },
    ];
    const sorted = sortByDate(items);
    expect(sorted[0].title).toBe("New");
    expect(sorted[1].title).toBe("Mid");
    expect(sorted[2].title).toBe("Old");
  });

  it("puts invalid dates at the end", async () => {
    const { sortByDate } = await import("../../scripts/pipeline/fetch.ts");
    const items: RawNewsItem[] = [
      { title: "NoDate", content: "", url: "https://a.com", publishedAt: "" },
      {
        title: "Valid",
        content: "",
        url: "https://b.com",
        publishedAt: "2026-02-27T00:00:00Z",
      },
    ];
    const sorted = sortByDate(items);
    expect(sorted[0].title).toBe("Valid");
    expect(sorted[1].title).toBe("NoDate");
  });

  it("does not mutate original array", async () => {
    const { sortByDate } = await import("../../scripts/pipeline/fetch.ts");
    const items: RawNewsItem[] = [
      {
        title: "B",
        content: "",
        url: "https://b.com",
        publishedAt: "2026-02-01",
      },
      {
        title: "A",
        content: "",
        url: "https://a.com",
        publishedAt: "2026-01-01",
      },
    ];
    const sorted = sortByDate(items);
    expect(items[0].title).toBe("B");
    expect(sorted[0].title).toBe("B");
  });
});

// ---------------------------------------------------------------------------
// getApiKey tests
// ---------------------------------------------------------------------------

describe("getApiKey", () => {
  const originalEnv = process.env.OPENCLAW_API_KEY;

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.OPENCLAW_API_KEY = originalEnv;
    } else {
      delete process.env.OPENCLAW_API_KEY;
    }
  });

  it("returns trimmed API key when set", async () => {
    process.env.OPENCLAW_API_KEY = "  test-key-123  ";
    const { getApiKey } = await import("../../scripts/pipeline/fetch.ts");
    expect(getApiKey()).toBe("test-key-123");
  });

  it("throws when API key is not set", async () => {
    delete process.env.OPENCLAW_API_KEY;
    const { getApiKey } = await import("../../scripts/pipeline/fetch.ts");
    expect(() => getApiKey()).toThrow(/OPENCLAW_API_KEY/);
  });

  it("throws when API key is empty string", async () => {
    process.env.OPENCLAW_API_KEY = "   ";
    const { getApiKey } = await import("../../scripts/pipeline/fetch.ts");
    expect(() => getApiKey()).toThrow(/OPENCLAW_API_KEY/);
  });
});

// ---------------------------------------------------------------------------
// callOpenclawAPI tests (mocked fetch)
// ---------------------------------------------------------------------------

describe("callOpenclawAPI", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  /** 创建标准 mock response（含 text + headers） */
  function makeMockResponse(body: unknown, ok = true, status = 200) {
    const text = JSON.stringify(body);
    return {
      ok,
      status,
      statusText: ok ? "OK" : "Error",
      headers: new Headers({ "content-length": String(text.length) }),
      text: async () => text,
    };
  }

  it("parses successful API response", async () => {
    const body = {
      results: [
        {
          title: "Test",
          content: "Body",
          url: "https://test.com",
          published_at: "2026-02-27",
        },
      ],
    };
    globalThis.fetch = vi.fn().mockResolvedValue(makeMockResponse(body));

    const { callOpenclawAPI } = await import("../../scripts/pipeline/fetch.ts");
    const items = await callOpenclawAPI("test query", "key123");
    expect(items).toHaveLength(1);
    expect(items[0].title).toBe("Test");
  });

  it("throws on non-ok response", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      headers: new Headers(),
      text: async () => "error",
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const { callOpenclawAPI } = await import("../../scripts/pipeline/fetch.ts");
    await expect(callOpenclawAPI("test", "key123")).rejects.toThrow(/500/);
  });

  it("throws on network error", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));

    const { callOpenclawAPI } = await import("../../scripts/pipeline/fetch.ts");
    await expect(callOpenclawAPI("test", "key123")).rejects.toThrow(
      "Network error",
    );
  });

  it("aborts on timeout", async () => {
    globalThis.fetch = vi.fn().mockImplementation(
      (_url: string, opts: { signal: AbortSignal }) =>
        new Promise((_resolve, reject) => {
          opts.signal.addEventListener("abort", () => {
            const err = new DOMException("Aborted", "AbortError");
            reject(err);
          });
        }),
    );

    const { callOpenclawAPI } = await import("../../scripts/pipeline/fetch.ts");
    await expect(callOpenclawAPI("test", "key123", 50)).rejects.toThrow();
  });

  it("throws on response body exceeding size limit", async () => {
    const hugeBody = "x".repeat(6 * 1024 * 1024);
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers(),
      text: async () => hugeBody,
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const { callOpenclawAPI } = await import("../../scripts/pipeline/fetch.ts");
    await expect(callOpenclawAPI("test", "key123")).rejects.toThrow(
      /响应体过大/,
    );
  });

  it("throws when Content-Length header exceeds limit", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-length": "10000000" }),
      text: async () => "{}",
    };
    globalThis.fetch = vi.fn().mockResolvedValue(mockResponse);

    const { callOpenclawAPI } = await import("../../scripts/pipeline/fetch.ts");
    await expect(callOpenclawAPI("test", "key123")).rejects.toThrow(
      /响应体过大/,
    );
  });
});

// ---------------------------------------------------------------------------
// fetchNews integration tests (mocked fetch + env)
// ---------------------------------------------------------------------------

describe("fetchNews", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.OPENCLAW_API_KEY;

  beforeEach(async () => {
    process.env.OPENCLAW_API_KEY = "test-key";
    const { initSources } =
      await import("../../scripts/pipeline/sources/index.ts");
    await initSources();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.OPENCLAW_API_KEY = originalEnv;
    } else {
      delete process.env.OPENCLAW_API_KEY;
    }
  });

  const aiTechConfig = {
    slug: "ai-tech",
    name: "AI技术",
    icon: "🤖",
    order: 1,
    color: "#3B82F6",
    bgColor: "#EFF6FF",
    pillBg: "#F0F5FF",
    pillText: "#1677FF",
  } as const;

  function mockFetchSuccess(items: unknown[]) {
    const body = JSON.stringify({ results: items });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-length": String(body.length) }),
      text: async () => body,
    });
  }

  it("returns deduplicated and sorted items on success", async () => {
    mockFetchSuccess([
      {
        title: "Old News",
        content: "c1",
        url: "https://a.com/1",
        published_at: "2026-01-01T00:00:00Z",
      },
      {
        title: "New News",
        content: "c2",
        url: "https://a.com/2",
        published_at: "2026-02-27T00:00:00Z",
      },
    ]);

    const { fetchNews } = await import("../../scripts/pipeline/fetch.ts");
    const items = await fetchNews(aiTechConfig, "2026-02-27");
    expect(items.length).toBeGreaterThan(0);
    // Should be sorted newest first
    if (items.length >= 2) {
      const t0 = new Date(items[0].publishedAt).getTime();
      const t1 = new Date(items[1].publishedAt).getTime();
      expect(t0).toBeGreaterThanOrEqual(t1);
    }
  });

  it("continues when some sources fail (partial success)", async () => {
    let callCount = 0;
    globalThis.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("Source 1 failed"));
      }
      const body = JSON.stringify({
        results: [
          {
            title: "From source 2",
            content: "ok",
            url: "https://s2.com/1",
            published_at: "2026-02-27",
          },
        ],
      });
      return Promise.resolve({
        ok: true,
        status: 200,
        statusText: "OK",
        headers: new Headers({ "content-length": String(body.length) }),
        text: async () => body,
      });
    });

    const { fetchNews } = await import("../../scripts/pipeline/fetch.ts");
    const items = await fetchNews(aiTechConfig, "2026-02-27");
    expect(items.length).toBeGreaterThanOrEqual(1);
  });

  it("throws aggregated error when all sources fail", async () => {
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("All failed"));

    const { fetchNews } = await import("../../scripts/pipeline/fetch.ts");
    await expect(fetchNews(aiTechConfig, "2026-02-27")).rejects.toThrow(
      /所有信息源抓取失败/,
    );
  });

  it("returns empty array for unknown domain slug", async () => {
    const unknownConfig = {
      ...aiTechConfig,
      slug: "unknown-domain" as any,
    };

    const { fetchNews } = await import("../../scripts/pipeline/fetch.ts");
    const items = await fetchNews(unknownConfig, "2026-02-27");
    expect(items).toEqual([]);
  });
});
