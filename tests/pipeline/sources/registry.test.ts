/**
 * Tests for sources/registry.ts (Story 4-6)
 *
 * Covers:
 * - registerDomainSources: register and query
 * - getRegisteredSources: lookup by slug
 * - getAllRegisteredSlugs: list all registered slugs
 * - clearRegistry: reset state for test isolation
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  registerDomainSources,
  getRegisteredSources,
  getAllRegisteredSlugs,
  clearRegistry,
} from "../../../scripts/pipeline/sources/registry.ts";
import type { FetchSource } from "../../../scripts/pipeline/types.ts";

const sampleSources: readonly FetchSource[] = [
  { name: "Test Source", query: "test query", type: "openclaw" },
];

beforeEach(() => {
  clearRegistry();
});

describe("registerDomainSources", () => {
  it("registers sources and retrieves them by slug", () => {
    registerDomainSources("test-domain", sampleSources);
    const result = getRegisteredSources("test-domain");
    expect(result).toEqual(sampleSources);
  });

  it("throws on duplicate slug registration", () => {
    registerDomainSources("test-domain", sampleSources);
    expect(() => registerDomainSources("test-domain", sampleSources)).toThrow(
      "信息源注册冲突",
    );
  });

  it("throws on invalid slug format (uppercase)", () => {
    expect(() => registerDomainSources("Invalid-Slug", sampleSources)).toThrow(
      "格式非法",
    );
  });

  it("throws on invalid slug format (leading hyphen)", () => {
    expect(() => registerDomainSources("-bad-slug", sampleSources)).toThrow(
      "格式非法",
    );
  });

  it("throws on invalid slug format (spaces)", () => {
    expect(() => registerDomainSources("bad slug", sampleSources)).toThrow(
      "格式非法",
    );
  });
});

describe("getRegisteredSources", () => {
  it("returns undefined for unregistered slug", () => {
    expect(getRegisteredSources("nonexistent")).toBeUndefined();
  });
});

describe("getAllRegisteredSlugs", () => {
  it("returns empty array when nothing registered", () => {
    expect(getAllRegisteredSlugs()).toEqual([]);
  });

  it("returns all registered slugs", () => {
    registerDomainSources("alpha", sampleSources);
    registerDomainSources("beta", sampleSources);
    const slugs = getAllRegisteredSlugs();
    expect(slugs).toContain("alpha");
    expect(slugs).toContain("beta");
    expect(slugs).toHaveLength(2);
  });
});

describe("clearRegistry", () => {
  it("removes all registered entries", () => {
    registerDomainSources("test", sampleSources);
    expect(getAllRegisteredSlugs()).toHaveLength(1);
    clearRegistry();
    expect(getAllRegisteredSlugs()).toHaveLength(0);
  });
});
