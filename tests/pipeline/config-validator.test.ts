/**
 * Tests for config-validator.ts (Story 4-6)
 *
 * Covers:
 * - validateDomainConfig: field presence, types, slug format, color format
 * - validateAllDomains: slug uniqueness, order duplication
 * - checkConfigConsistency: matched, missingSource, orphanSource
 */
import { describe, it, expect } from "vitest";
import {
  validateDomainConfig,
  validateAllDomains,
  checkConfigConsistency,
} from "../../scripts/pipeline/config-validator.ts";

/** 合法的领域配置样本 */
const validConfig = {
  slug: "ai-tech",
  name: "AI技术",
  icon: "🤖",
  order: 1,
  color: "#3B82F6",
  bgColor: "#EFF6FF",
  pillBg: "#F0F5FF",
  pillText: "#1677FF",
};

describe("validateDomainConfig", () => {
  it("returns valid for a correct config", () => {
    const result = validateDomainConfig(validConfig, 0);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns error for null config", () => {
    const result = validateDomainConfig(null, 0);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("不是有效对象");
  });

  it("returns error for missing required fields", () => {
    const result = validateDomainConfig({ slug: "test" }, 0);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some((e) => e.includes("name"))).toBe(true);
  });

  it("returns error for wrong field type", () => {
    const bad = { ...validConfig, order: "not-a-number" };
    const result = validateDomainConfig(bad, 0);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("order"))).toBe(true);
  });

  it("returns error for invalid slug format (uppercase)", () => {
    const bad = { ...validConfig, slug: "AI-Tech" };
    const result = validateDomainConfig(bad, 0);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("slug"))).toBe(true);
  });

  it("returns error for invalid slug format (spaces)", () => {
    const bad = { ...validConfig, slug: "ai tech" };
    const result = validateDomainConfig(bad, 0);
    expect(result.valid).toBe(false);
  });

  it("returns error for invalid hex color", () => {
    const bad = { ...validConfig, color: "red" };
    const result = validateDomainConfig(bad, 0);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("color"))).toBe(true);
  });

  it("returns error for short hex color (#RGB)", () => {
    const bad = { ...validConfig, bgColor: "#FFF" };
    const result = validateDomainConfig(bad, 0);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes("bgColor"))).toBe(true);
  });
});

describe("validateAllDomains", () => {
  it("returns valid for current domains.ts config", () => {
    const result = validateAllDomains();
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns no warnings for current config", () => {
    const result = validateAllDomains();
    expect(result.warnings).toHaveLength(0);
  });
});

describe("checkConfigConsistency", () => {
  it("returns all matched when slugs are identical", () => {
    const slugs = ["ai-tech", "web3"];
    const result = checkConfigConsistency(slugs, slugs);
    expect(result.matched).toEqual(["ai-tech", "web3"]);
    expect(result.missingSource).toHaveLength(0);
    expect(result.orphanSource).toHaveLength(0);
  });

  it("detects missing source files", () => {
    const d = ["ai-tech", "web3"];
    const s = ["ai-tech"];
    const result = checkConfigConsistency(d, s);
    expect(result.matched).toEqual(["ai-tech"]);
    expect(result.missingSource).toEqual(["web3"]);
  });

  it("detects orphan source files", () => {
    const d = ["ai-tech"];
    const s = ["ai-tech", "orphan"];
    const result = checkConfigConsistency(d, s);
    expect(result.matched).toEqual(["ai-tech"]);
    expect(result.orphanSource).toEqual(["orphan"]);
  });

  it("handles empty arrays", () => {
    const result = checkConfigConsistency([], []);
    expect(result.matched).toHaveLength(0);
    expect(result.missingSource).toHaveLength(0);
    expect(result.orphanSource).toHaveLength(0);
  });
});
