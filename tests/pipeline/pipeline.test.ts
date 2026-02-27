/**
 * Tests for Pipeline Entry & Domain Scheduler (Story 4-1)
 *
 * Covers:
 * - Domain config reading and sorting by order
 * - --domain parameter filtering logic
 * - processDomain stub returns success
 * - Summary log output
 * - getTodayDate format
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { domains } from "../../src/config/domains.ts";
import {
  getTargetDomains,
  getTodayDate,
  isValidDate,
} from "../../scripts/pipeline/run.ts";
import { processDomain } from "../../scripts/pipeline/process.ts";
import type { PipelineContext } from "../../scripts/pipeline/types.ts";

// Suppress console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

describe("getTodayDate", () => {
  it("returns date in YYYY-MM-DD format", () => {
    const date = getTodayDate();
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns today's UTC date", () => {
    const date = getTodayDate();
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = String(now.getUTCMonth() + 1).padStart(2, "0");
    const d = String(now.getUTCDate()).padStart(2, "0");
    expect(date).toBe(`${y}-${m}-${d}`);
  });
});

describe("getTargetDomains", () => {
  it("returns all domains sorted by order when no targetDomain", () => {
    const ctx: PipelineContext = { date: "2026-02-27", dryRun: false };
    const result = getTargetDomains(ctx);
    expect(result).toHaveLength(domains.length);
    for (let i = 1; i < result.length; i++) {
      expect(result[i].order).toBeGreaterThanOrEqual(result[i - 1].order);
    }
  });

  it("first domain is ai-tech (order=1)", () => {
    const ctx: PipelineContext = { date: "2026-02-27", dryRun: false };
    const result = getTargetDomains(ctx);
    expect(result[0].slug).toBe("ai-tech");
    expect(result[0].order).toBe(1);
  });

  it("returns only the specified domain when targetDomain is set", () => {
    const ctx: PipelineContext = {
      date: "2026-02-27",
      targetDomain: "ai-tech",
      dryRun: false,
    };
    const result = getTargetDomains(ctx);
    expect(result).toHaveLength(1);
    expect(result[0].slug).toBe("ai-tech");
  });

  it("can filter each domain by slug", () => {
    for (const domain of domains) {
      const ctx: PipelineContext = {
        date: "2026-02-27",
        targetDomain: domain.slug,
        dryRun: false,
      };
      const result = getTargetDomains(ctx);
      expect(result).toHaveLength(1);
      expect(result[0].slug).toBe(domain.slug);
    }
  });

  it("throws error for unknown domain slug", () => {
    const ctx: PipelineContext = {
      date: "2026-02-27",
      targetDomain: "nonexistent",
      dryRun: false,
    };
    expect(() => getTargetDomains(ctx)).toThrow(/未找到领域/);
  });
});

describe("processDomain", () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = process.env.OPENCLAW_API_KEY;

  beforeEach(() => {
    process.env.OPENCLAW_API_KEY = "test-key";
    const body = JSON.stringify({ results: [] });
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: "OK",
      headers: new Headers({ "content-length": String(body.length) }),
      text: async () => body,
    });
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (originalEnv !== undefined) {
      process.env.OPENCLAW_API_KEY = originalEnv;
    } else {
      delete process.env.OPENCLAW_API_KEY;
    }
  });

  it("returns success status for a valid domain", async () => {
    const domain = domains[0];
    const result = await processDomain(domain, "2026-02-27", false);
    expect(result.status).toBe("success");
    expect(result.domain).toBe(domain.slug);
    expect(result.name).toBe(domain.name);
  });

  it("returns non-negative duration", async () => {
    const domain = domains[0];
    const result = await processDomain(domain, "2026-02-27", false);
    expect(result.duration).toBeGreaterThanOrEqual(0);
    expect(result.error).toBeUndefined();
  });

  it("works with dry-run flag", async () => {
    const domain = domains[1];
    const result = await processDomain(domain, "2026-02-27", true);
    expect(result.status).toBe("success");
    expect(result.domain).toBe(domain.slug);
  });
});

describe("isValidDate", () => {
  it("accepts valid YYYY-MM-DD dates", () => {
    expect(isValidDate("2026-02-27")).toBe(true);
    expect(isValidDate("2024-01-01")).toBe(true);
    expect(isValidDate("2024-12-31")).toBe(true);
    expect(isValidDate("2024-02-29")).toBe(true); // leap year
  });

  it("rejects invalid format strings", () => {
    expect(isValidDate("not-a-date")).toBe(false);
    expect(isValidDate("2026/02/27")).toBe(false);
    expect(isValidDate("27-02-2026")).toBe(false);
    expect(isValidDate("2026-2-7")).toBe(false);
    expect(isValidDate("")).toBe(false);
  });

  it("rejects impossible calendar dates", () => {
    expect(isValidDate("2026-02-29")).toBe(false); // not a leap year
    expect(isValidDate("2026-04-31")).toBe(false); // April has 30 days
    expect(isValidDate("2026-13-01")).toBe(false); // month 13
    expect(isValidDate("2026-00-01")).toBe(false); // month 0
    expect(isValidDate("2026-01-00")).toBe(false); // day 0
  });
});
