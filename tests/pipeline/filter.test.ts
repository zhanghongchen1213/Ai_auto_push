/**
 * Tests for AI Content Filter & Summary Module (Story 4-3)
 *
 * Covers:
 * - LLM config loading from env vars
 * - LLM API call and retry mechanism
 * - Prompt building
 * - Response parsing and validation
 * - URL matching (anti-hallucination)
 * - Summary length validation
 * - Fallback filter
 * - filterAndSummarize end-to-end
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { RawNewsItem } from "../../scripts/pipeline/types.ts";

// Suppress console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const SAMPLE_RAW_ITEMS: RawNewsItem[] = [
  {
    title: "OpenAI 发布新模型 GPT-5",
    content:
      "OpenAI 今日正式发布了新一代大语言模型 GPT-5，在推理和代码生成方面有显著提升。该模型采用了全新的架构设计，支持更长的上下文窗口。",
    url: "https://example.com/news/1",
    publishedAt: "2026-02-27T08:00:00Z",
  },
  {
    title: "Google DeepMind 推出 Gemini 3.0",
    content:
      "Google DeepMind 发布了 Gemini 3.0 多模态模型，在图像理解和视频分析方面取得突破性进展。新模型已集成到 Google 全线产品中。",
    url: "https://example.com/news/2",
    publishedAt: "2026-02-26T10:00:00Z",
  },
  {
    title: "Meta 开源 Llama 4 模型",
    content:
      "Meta 宣布开源其最新的 Llama 4 大语言模型，支持 128K 上下文窗口，在多项基准测试中表现优异。开发者可免费使用。",
    url: "https://example.com/news/3",
    publishedAt: "2026-02-25T14:00:00Z",
  },
];

/** 生成一个合格的 LLM mock 摘要（约 160 字） */
function makeSummary(topic: string): string {
  return `${topic}是人工智能领域的重要进展。该技术在多个关键指标上取得了显著突破，包括推理能力、多模态理解和代码生成等方面。业内专家认为这将对整个行业产生深远影响，推动更多创新应用的落地。开发者社区对此反响热烈，纷纷表示将积极探索新技术带来的可能性。这一发展标志着大模型技术进入了新的阶段，未来有望在更多场景中发挥重要作用。`;
}

/** 构建合格的 LLM JSON 响应 */
function buildMockLLMResponse(items: RawNewsItem[]): string {
  const result = items.map((item, i) => ({
    title: item.title,
    summary: makeSummary(item.title),
    url: item.url,
    publishedAt: item.publishedAt,
    source: "TechNews",
    score: 95 - i * 5,
  }));
  return JSON.stringify(result);
}

// ---------------------------------------------------------------------------
// LLM Config tests
// ---------------------------------------------------------------------------

describe("getLLMConfig", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("throws when LLM_API_KEY is missing", async () => {
    delete process.env.LLM_API_KEY;
    const { getLLMConfig } = await import("../../scripts/pipeline/llm.ts");
    expect(() => getLLMConfig()).toThrow("LLM_API_KEY");
  });

  it("throws when LLM_API_KEY is empty string", async () => {
    process.env.LLM_API_KEY = "  ";
    const { getLLMConfig } = await import("../../scripts/pipeline/llm.ts");
    expect(() => getLLMConfig()).toThrow("LLM_API_KEY");
  });

  it("returns default config with only API key set", async () => {
    process.env.LLM_API_KEY = "test-key-123";
    delete process.env.LLM_PROVIDER;
    delete process.env.LLM_MODEL;
    delete process.env.LLM_BASE_URL;
    const { getLLMConfig } = await import("../../scripts/pipeline/llm.ts");
    const config = getLLMConfig();
    expect(config.apiKey).toBe("test-key-123");
    expect(config.provider).toBe("openai");
    expect(config.model).toBe("gpt-4o-mini");
    expect(config.baseUrl).toBeUndefined();
  });

  it("reads all env vars correctly", async () => {
    process.env.LLM_API_KEY = "my-key";
    process.env.LLM_PROVIDER = "anthropic";
    process.env.LLM_MODEL = "claude-3-haiku";
    process.env.LLM_BASE_URL = "https://custom.api.com";
    process.env.LLM_MAX_TOKENS = "2048";
    const { getLLMConfig } = await import("../../scripts/pipeline/llm.ts");
    const config = getLLMConfig();
    expect(config.provider).toBe("anthropic");
    expect(config.model).toBe("claude-3-haiku");
    expect(config.baseUrl).toBe("https://custom.api.com");
    expect(config.maxTokens).toBe(2048);
  });
});

// ---------------------------------------------------------------------------
// Prompt building tests
// ---------------------------------------------------------------------------

describe("buildFilterPrompt", () => {
  it("includes domain name in prompt", async () => {
    const { buildFilterPrompt } =
      await import("../../scripts/pipeline/prompts.ts");
    const prompt = buildFilterPrompt(SAMPLE_RAW_ITEMS, "AI 技术");
    expect(prompt).toContain("AI 技术");
  });

  it("includes all item URLs in prompt", async () => {
    const { buildFilterPrompt } =
      await import("../../scripts/pipeline/prompts.ts");
    const prompt = buildFilterPrompt(SAMPLE_RAW_ITEMS, "AI 技术");
    for (const item of SAMPLE_RAW_ITEMS) {
      expect(prompt).toContain(item.url);
    }
  });

  it("includes output format requirements", async () => {
    const { buildFilterPrompt } =
      await import("../../scripts/pipeline/prompts.ts");
    const prompt = buildFilterPrompt(SAMPLE_RAW_ITEMS, "AI 技术");
    expect(prompt).toContain("JSON");
    expect(prompt).toContain("summary");
    expect(prompt).toContain("150-200");
  });

  it("includes filtering criteria", async () => {
    const { buildFilterPrompt } =
      await import("../../scripts/pipeline/prompts.ts");
    const prompt = buildFilterPrompt(SAMPLE_RAW_ITEMS, "AI 技术");
    expect(prompt).toContain("相关性");
    expect(prompt).toContain("时效性");
  });
});

// ---------------------------------------------------------------------------
// extractJSON tests
// ---------------------------------------------------------------------------

describe("extractJSON", () => {
  it("extracts plain JSON array", async () => {
    const { extractJSON } = await import("../../scripts/pipeline/filter.ts");
    const input = '[{"title":"test"}]';
    expect(extractJSON(input)).toBe('[{"title":"test"}]');
  });

  it("extracts JSON from markdown code block", async () => {
    const { extractJSON } = await import("../../scripts/pipeline/filter.ts");
    const input = '```json\n[{"title":"test"}]\n```';
    expect(extractJSON(input)).toBe('[{"title":"test"}]');
  });

  it("extracts JSON array from mixed text", async () => {
    const { extractJSON } = await import("../../scripts/pipeline/filter.ts");
    const input = 'Here is the result:\n[{"title":"test"}]\nDone.';
    expect(extractJSON(input)).toBe('[{"title":"test"}]');
  });
});

// ---------------------------------------------------------------------------
// parseLLMResponse tests
// ---------------------------------------------------------------------------

describe("parseLLMResponse", () => {
  it("parses valid JSON response", async () => {
    const { parseLLMResponse } =
      await import("../../scripts/pipeline/filter.ts");
    const raw = buildMockLLMResponse(SAMPLE_RAW_ITEMS);
    const result = parseLLMResponse(raw, SAMPLE_RAW_ITEMS);
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe("OpenAI 发布新模型 GPT-5");
    expect(result[0].url).toBe("https://example.com/news/1");
    expect(result[0].score).toBeGreaterThan(0);
  });

  it("parses JSON wrapped in markdown code block", async () => {
    const { parseLLMResponse } =
      await import("../../scripts/pipeline/filter.ts");
    const json = buildMockLLMResponse(SAMPLE_RAW_ITEMS);
    const raw = "```json\n" + json + "\n```";
    const result = parseLLMResponse(raw, SAMPLE_RAW_ITEMS);
    expect(result).toHaveLength(3);
  });

  it("filters out items with non-matching URLs (anti-hallucination)", async () => {
    const { parseLLMResponse } =
      await import("../../scripts/pipeline/filter.ts");
    const fakeItem = [
      {
        title: "Fake News",
        summary: makeSummary("Fake"),
        url: "https://fake.com/hallucinated",
        publishedAt: "2026-02-27T00:00:00Z",
        source: "Fake",
        score: 99,
      },
    ];
    const raw = JSON.stringify(fakeItem);
    expect(() => parseLLMResponse(raw, SAMPLE_RAW_ITEMS)).toThrow("无有效条目");
  });

  it("filters out items with missing required fields", async () => {
    const { parseLLMResponse } =
      await import("../../scripts/pipeline/filter.ts");
    const items = [
      {
        title: "Valid",
        summary: makeSummary("Valid"),
        url: "https://example.com/news/1",
        publishedAt: "2026-02-27",
        source: "X",
        score: 90,
      },
      { summary: makeSummary("No title"), url: "https://example.com/news/2" },
      { title: "No URL", summary: makeSummary("No URL") },
    ];
    const raw = JSON.stringify(items);
    const result = parseLLMResponse(raw, SAMPLE_RAW_ITEMS);
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Valid");
  });

  it("throws on invalid JSON", async () => {
    const { parseLLMResponse } =
      await import("../../scripts/pipeline/filter.ts");
    expect(() => parseLLMResponse("not json", SAMPLE_RAW_ITEMS)).toThrow(
      "JSON 解析失败",
    );
  });

  it("throws when response is not an array", async () => {
    const { parseLLMResponse } =
      await import("../../scripts/pipeline/filter.ts");
    expect(() =>
      parseLLMResponse('{"title":"test"}', SAMPLE_RAW_ITEMS),
    ).toThrow("期望数组");
  });

  it("sorts results by score descending", async () => {
    const { parseLLMResponse } =
      await import("../../scripts/pipeline/filter.ts");
    const raw = buildMockLLMResponse(SAMPLE_RAW_ITEMS);
    const result = parseLLMResponse(raw, SAMPLE_RAW_ITEMS);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThanOrEqual(result[i].score);
    }
  });

  it("clamps score to 0-100 range", async () => {
    const { parseLLMResponse } =
      await import("../../scripts/pipeline/filter.ts");
    const items = [
      {
        title: SAMPLE_RAW_ITEMS[0].title,
        summary: makeSummary("Test"),
        url: SAMPLE_RAW_ITEMS[0].url,
        publishedAt: "2026-02-27",
        source: "X",
        score: 150,
      },
    ];
    const result = parseLLMResponse(JSON.stringify(items), SAMPLE_RAW_ITEMS);
    expect(result[0].score).toBe(100);
  });
});

// ---------------------------------------------------------------------------
// fallbackFilter tests
// ---------------------------------------------------------------------------

describe("fallbackFilter", () => {
  it("returns up to 5 items from input", async () => {
    const { fallbackFilter } = await import("../../scripts/pipeline/filter.ts");
    const result = fallbackFilter(SAMPLE_RAW_ITEMS);
    expect(result).toHaveLength(3);
    expect(result[0].title).toBe(SAMPLE_RAW_ITEMS[0].title);
    expect(result[0].url).toBe(SAMPLE_RAW_ITEMS[0].url);
  });

  it("uses content as summary fallback", async () => {
    const { fallbackFilter } = await import("../../scripts/pipeline/filter.ts");
    const result = fallbackFilter(SAMPLE_RAW_ITEMS);
    // summary should contain content from original item
    expect(result[0].summary.length).toBeGreaterThan(0);
  });

  it("assigns decreasing scores", async () => {
    const { fallbackFilter } = await import("../../scripts/pipeline/filter.ts");
    const result = fallbackFilter(SAMPLE_RAW_ITEMS);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].score).toBeGreaterThan(result[i].score);
    }
  });

  it("uses title when content is empty", async () => {
    const { fallbackFilter } = await import("../../scripts/pipeline/filter.ts");
    const items: RawNewsItem[] = [
      {
        title: "Empty Content Item",
        content: "",
        url: "https://example.com/empty",
        publishedAt: "2026-02-27",
      },
    ];
    const result = fallbackFilter(items);
    expect(result[0].summary).toBe("Empty Content Item");
  });
});

// ---------------------------------------------------------------------------
// LLM API call tests (mocked fetch)
// ---------------------------------------------------------------------------

describe("callLLM", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("sends correct request format", async () => {
    const { callLLM } = await import("../../scripts/pipeline/llm.ts");
    let capturedBody: string | undefined;

    globalThis.fetch = vi.fn().mockImplementation(async (_url, init) => {
      capturedBody = init?.body as string;
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "test response" } }],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const config = {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "test-key",
    };
    await callLLM("test prompt", config);

    expect(capturedBody).toBeDefined();
    const body = JSON.parse(capturedBody!);
    expect(body.model).toBe("gpt-4o-mini");
    expect(body.messages[0].content).toBe("test prompt");
  });

  it("throws LLMApiError on 401", async () => {
    const { callLLM, LLMApiError } =
      await import("../../scripts/pipeline/llm.ts");

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("Unauthorized", { status: 401 }));

    const config = {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "bad-key",
    };

    await expect(callLLM("test", config)).rejects.toThrow(LLMApiError);
    await expect(callLLM("test", config)).rejects.toMatchObject({
      retryable: false,
    });
  });

  it("marks 500 errors as retryable", async () => {
    const { callLLM, LLMApiError } =
      await import("../../scripts/pipeline/llm.ts");

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("Server Error", { status: 500 }));

    const config = {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "key",
    };

    await expect(callLLM("test", config)).rejects.toMatchObject({
      retryable: true,
      statusCode: 500,
    });
  });

  it("throws on empty response content", async () => {
    const { callLLM } = await import("../../scripts/pipeline/llm.ts");

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(
        new Response(
          JSON.stringify({ choices: [{ message: { content: "" } }] }),
          { status: 200 },
        ),
      );

    const config = {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "key",
    };

    await expect(callLLM("test", config)).rejects.toThrow("空内容");
  });
});

// ---------------------------------------------------------------------------
// callLLMWithRetry tests
// ---------------------------------------------------------------------------

describe("callLLMWithRetry", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("does not retry on 401 (non-retryable)", async () => {
    const { callLLMWithRetry } = await import("../../scripts/pipeline/llm.ts");
    let callCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      return new Response("Unauthorized", { status: 401 });
    });

    const config = {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "bad-key",
    };

    await expect(callLLMWithRetry("test", config, 2)).rejects.toThrow();
    expect(callCount).toBe(1);
  });

  it("retries on 500 and succeeds on second attempt", async () => {
    const { callLLMWithRetry } = await import("../../scripts/pipeline/llm.ts");
    let callCount = 0;

    globalThis.fetch = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return new Response("Server Error", { status: 500 });
      }
      return new Response(
        JSON.stringify({
          choices: [{ message: { content: "success" } }],
        }),
        { status: 200 },
      );
    });

    const config = {
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "key",
    };

    const result = await callLLMWithRetry("test", config, 2);
    expect(result).toBe("success");
    expect(callCount).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// filterAndSummarize end-to-end tests
// ---------------------------------------------------------------------------

describe("filterAndSummarize", () => {
  const originalEnv = { ...process.env };
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    process.env = { ...originalEnv };
    globalThis.fetch = originalFetch;
  });

  it("returns empty array for empty input", async () => {
    const { filterAndSummarize } =
      await import("../../scripts/pipeline/filter.ts");
    const config = { name: "AI 技术", slug: "ai-tech" } as any;
    const result = await filterAndSummarize([], config, "2026-02-27");
    expect(result).toEqual([]);
  });

  it("uses fallback when LLM_API_KEY is missing", async () => {
    delete process.env.LLM_API_KEY;
    const { filterAndSummarize } =
      await import("../../scripts/pipeline/filter.ts");
    const config = { name: "AI 技术", slug: "ai-tech" } as any;
    const result = await filterAndSummarize(
      SAMPLE_RAW_ITEMS,
      config,
      "2026-02-27",
    );
    // fallback should return items
    expect(result.length).toBeGreaterThan(0);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("calls LLM and returns filtered items when API key is set", async () => {
    process.env.LLM_API_KEY = "test-key";
    const mockResponse = buildMockLLMResponse(SAMPLE_RAW_ITEMS.slice(0, 2));

    globalThis.fetch = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: mockResponse } }],
        }),
        { status: 200 },
      ),
    );

    const { filterAndSummarize } =
      await import("../../scripts/pipeline/filter.ts");
    const config = { name: "AI 技术", slug: "ai-tech" } as any;
    const result = await filterAndSummarize(
      SAMPLE_RAW_ITEMS,
      config,
      "2026-02-27",
    );
    expect(result).toHaveLength(2);
    expect(result[0].summary.length).toBeGreaterThan(0);
  });

  it("falls back when LLM returns error", async () => {
    process.env.LLM_API_KEY = "test-key";

    globalThis.fetch = vi
      .fn()
      .mockResolvedValue(new Response("Server Error", { status: 500 }));

    const { filterAndSummarize } =
      await import("../../scripts/pipeline/filter.ts");
    const config = { name: "AI 技术", slug: "ai-tech" } as any;
    const result = await filterAndSummarize(
      SAMPLE_RAW_ITEMS,
      config,
      "2026-02-27",
    );
    // Should fallback gracefully
    expect(result.length).toBeGreaterThan(0);
  });
});
