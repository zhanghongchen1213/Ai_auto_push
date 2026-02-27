/**
 * Tests for Pipeline failure isolation (Story 4-1, AC-3)
 *
 * Separated from main pipeline tests because vi.mock is hoisted
 * and would interfere with tests that use the real processDomain.
 */
import { describe, it, expect, vi } from "vitest";
import { domains } from "../../src/config/domains.ts";
import { runPipeline } from "../../scripts/pipeline/run.ts";
import type { PipelineContext } from "../../scripts/pipeline/types.ts";

// Mock processDomain to simulate failures
vi.mock("../../scripts/pipeline/process.ts", () => ({
  processDomain: vi.fn(),
}));

import { processDomain } from "../../scripts/pipeline/process.ts";
const mockProcess = vi.mocked(processDomain);

// Suppress console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

describe("Failure isolation (AC-3)", () => {
  it("continues executing after a domain throws an error", async () => {
    mockProcess.mockImplementation(async (config) => {
      if (config.slug === "ai-tech") {
        throw new Error("Simulated fetch failure");
      }
      return {
        domain: config.slug,
        name: config.name,
        status: "success" as const,
        duration: 1,
      };
    });

    const ctx: PipelineContext = { date: "2026-02-27", dryRun: false };
    const result = await runPipeline(ctx);

    expect(result.results).toHaveLength(domains.length);
    expect(result.failedCount).toBe(1);
    expect(result.successCount).toBe(domains.length - 1);

    const failed = result.results.find((r) => r.domain === "ai-tech");
    expect(failed?.status).toBe("failed");
    expect(failed?.error).toBe("Simulated fetch failure");
  });

  it("all domains fail → counts reflect total failure", async () => {
    mockProcess.mockImplementation(async (config) => {
      throw new Error(`${config.slug} failed`);
    });

    const ctx: PipelineContext = { date: "2026-02-27", dryRun: false };
    const result = await runPipeline(ctx);

    expect(result.successCount).toBe(0);
    expect(result.failedCount).toBe(domains.length);
  });

  it("all domains succeed → counts reflect total success", async () => {
    mockProcess.mockImplementation(async (config) => ({
      domain: config.slug,
      name: config.name,
      status: "success" as const,
      duration: 1,
    }));

    const ctx: PipelineContext = { date: "2026-02-27", dryRun: false };
    const result = await runPipeline(ctx);

    expect(result.successCount).toBe(domains.length);
    expect(result.failedCount).toBe(0);
    expect(result.totalDuration).toBeGreaterThanOrEqual(0);
  });
});
