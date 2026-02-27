/**
 * Tests for Git Auto Commit & Push Module (Story 4-5)
 *
 * Covers:
 * - buildCommitMessage: structured commit message generation
 * - gitAdd: staging files (mocked execGit)
 * - gitCommit: commit execution (mocked execGit)
 * - gitPush: push with retry logic (mocked execGit)
 * - gitPublish: main function end-to-end
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PipelineResult } from "../../scripts/pipeline/types.ts";

// Suppress console output during tests
vi.spyOn(console, "log").mockImplementation(() => {});
vi.spyOn(console, "warn").mockImplementation(() => {});
vi.spyOn(console, "error").mockImplementation(() => {});

// Mock child_process.execFile
vi.mock("node:child_process", () => ({
  execFile: vi.fn(),
}));

import { execFile } from "node:child_process";
import {
  buildCommitMessage,
  execGit,
  gitAdd,
  gitCommit,
  gitPush,
  gitPublish,
  sleep,
} from "../../scripts/pipeline/publish.ts";

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_DATE = "2026-02-27";

function makeResult(overrides?: Partial<PipelineResult>): PipelineResult {
  return {
    results: [
      { domain: "ai-tech", name: "AI技术", status: "success", duration: 100 },
      { domain: "fintech", name: "金融科技", status: "success", duration: 200 },
    ],
    totalDuration: 300,
    successCount: 2,
    failedCount: 0,
    skippedCount: 0,
    ...overrides,
  };
}

/** Helper: mock execFile to succeed with given stdout */
function mockExecFileSuccess(stdout: string) {
  vi.mocked(execFile).mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      (cb as Function)(null, stdout, "");
      return {} as ReturnType<typeof execFile>;
    },
  );
}

/** Helper: mock execFile to fail */
function mockExecFileFail(stderr: string, code = 1) {
  vi.mocked(execFile).mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      const err = new Error(stderr) as Error & { code: number };
      err.code = code;
      (cb as Function)(err, "", stderr);
      return {} as ReturnType<typeof execFile>;
    },
  );
}

// ---------------------------------------------------------------------------
// buildCommitMessage
// ---------------------------------------------------------------------------

describe("buildCommitMessage", () => {
  it("should format message for all success", () => {
    const result = makeResult();
    const msg = buildCommitMessage(TEST_DATE, result);
    expect(msg).toBe("chore: daily update 2026-02-27 (2/2 domains succeeded)");
  });

  it("should include failed domain summary", () => {
    const result = makeResult({
      results: [
        { domain: "ai-tech", name: "AI技术", status: "success", duration: 100 },
        {
          domain: "ecommerce",
          name: "电商",
          status: "failed",
          duration: 50,
          error: "timeout",
        },
      ],
      successCount: 1,
      failedCount: 1,
    });
    const msg = buildCommitMessage(TEST_DATE, result);
    expect(msg).toContain("1/2 domains succeeded");
    expect(msg).toContain("failed: ecommerce (timeout)");
  });

  it("should handle all domains failed", () => {
    const result = makeResult({
      results: [
        {
          domain: "ai-tech",
          name: "AI技术",
          status: "failed",
          duration: 100,
          error: "api_error",
        },
      ],
      successCount: 0,
      failedCount: 1,
    });
    const msg = buildCommitMessage(TEST_DATE, result);
    expect(msg).toContain("0/1 domains succeeded");
    expect(msg).toContain("failed: ai-tech (api_error)");
  });

  it("should truncate long error messages", () => {
    const longError = "a".repeat(50);
    const result = makeResult({
      results: [
        {
          domain: "ai-tech",
          name: "AI技术",
          status: "failed",
          duration: 100,
          error: longError,
        },
      ],
      successCount: 0,
      failedCount: 1,
    });
    const msg = buildCommitMessage(TEST_DATE, result);
    expect(msg).toContain("...");
    // Error summary should be at most 30 chars
    const failedPart = msg.split("failed: ")[1];
    const errorPart = failedPart.match(/\(([^)]+)\)/)?.[1] ?? "";
    expect(errorPart.length).toBeLessThanOrEqual(30);
  });

  it("should use 'unknown' when error is undefined", () => {
    const result = makeResult({
      results: [
        { domain: "ai-tech", name: "AI技术", status: "failed", duration: 100 },
      ],
      successCount: 0,
      failedCount: 1,
    });
    const msg = buildCommitMessage(TEST_DATE, result);
    expect(msg).toContain("failed: ai-tech (unknown)");
  });
});

// ---------------------------------------------------------------------------
// gitAdd (mocked execFile)
// ---------------------------------------------------------------------------

describe("gitAdd", () => {
  beforeEach(() => {
    vi.mocked(execFile).mockReset();
  });

  it("should return file count when files are staged", async () => {
    let callCount = 0;
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, args: unknown, _opts: unknown, cb: unknown) => {
        callCount++;
        if (callCount === 1) {
          // git add
          (cb as Function)(null, "", "");
        } else {
          // git diff --cached --name-only
          (cb as Function)(
            null,
            "src/content/daily/2026-02-27/ai-tech.md\nsrc/content/daily/2026-02-27/fintech.md\n",
            "",
          );
        }
        return {} as ReturnType<typeof execFile>;
      },
    );

    const count = await gitAdd(TEST_DATE);
    expect(count).toBe(2);
  });

  it("should return 0 when no changes", async () => {
    let callCount = 0;
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        callCount++;
        if (callCount === 1) {
          (cb as Function)(null, "", "");
        } else {
          (cb as Function)(null, "", "");
        }
        return {} as ReturnType<typeof execFile>;
      },
    );

    const count = await gitAdd(TEST_DATE);
    expect(count).toBe(0);
  });

  it("should throw on git add failure", async () => {
    mockExecFileFail("fatal: pathspec not found");
    await expect(gitAdd(TEST_DATE)).rejects.toThrow("git 命令失败");
  });

  it("should reject invalid date format to prevent path traversal", async () => {
    await expect(gitAdd("../../etc")).rejects.toThrow("无效的日期格式");
    await expect(gitAdd("2026-13-01")).rejects.toThrow("无效的日期格式");
    await expect(gitAdd("not-a-date")).rejects.toThrow("无效的日期格式");
  });
});

// ---------------------------------------------------------------------------
// gitCommit (mocked execFile)
// ---------------------------------------------------------------------------

describe("gitCommit", () => {
  beforeEach(() => {
    vi.mocked(execFile).mockReset();
  });

  it("should return 7-char commit hash from output", async () => {
    mockExecFileSuccess("[main abc1234] chore: daily update");
    const hash = await gitCommit("chore: daily update");
    expect(hash).toBe("abc1234");
    expect(hash).toHaveLength(7);
  });

  it("should fallback to rev-parse when output format differs", async () => {
    let callCount = 0;
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        callCount++;
        if (callCount === 1) {
          (cb as Function)(null, "committed something", "");
        } else {
          (cb as Function)(null, "def5678", "");
        }
        return {} as ReturnType<typeof execFile>;
      },
    );
    const hash = await gitCommit("test message");
    expect(hash).toBe("def5678");
  });

  it("should throw on commit failure", async () => {
    mockExecFileFail("nothing to commit");
    await expect(gitCommit("test")).rejects.toThrow("git 命令失败");
  });
});

// ---------------------------------------------------------------------------
// gitPush (mocked execFile)
// ---------------------------------------------------------------------------

describe("gitPush", () => {
  beforeEach(() => {
    vi.mocked(execFile).mockReset();
  });

  it("should succeed on first attempt", async () => {
    mockExecFileSuccess("Everything up-to-date");
    await expect(gitPush(3, 0)).resolves.toBeUndefined();
  });

  it("should retry and succeed on second attempt", async () => {
    let callCount = 0;
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        callCount++;
        if (callCount === 1) {
          const err = new Error("network error") as Error & { code: number };
          err.code = 1;
          (cb as Function)(err, "", "network error");
        } else {
          (cb as Function)(null, "ok", "");
        }
        return {} as ReturnType<typeof execFile>;
      },
    );
    await expect(gitPush(3, 0)).resolves.toBeUndefined();
    expect(callCount).toBe(2);
  });

  it("should throw after all retries exhausted", async () => {
    mockExecFileFail("remote rejected");
    await expect(gitPush(3, 0)).rejects.toThrow("git 命令失败");
  });
});

// ---------------------------------------------------------------------------
// gitPublish (main function, mocked execFile)
// ---------------------------------------------------------------------------

describe("gitPublish", () => {
  beforeEach(() => {
    vi.mocked(execFile).mockReset();
  });

  it("should skip git commands in dry-run mode", async () => {
    const result = await gitPublish(TEST_DATE, makeResult(), true);
    expect(result.commitHash).toBe("");
    expect(result.filesAdded).toBe(0);
    expect(result.commitMessage).toContain("2/2 domains succeeded");
    expect(execFile).not.toHaveBeenCalled();
  });

  it("should skip commit/push when no changes", async () => {
    let callCount = 0;
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        callCount++;
        // git add succeeds, git diff returns empty
        (cb as Function)(null, "", "");
        return {} as ReturnType<typeof execFile>;
      },
    );

    const result = await gitPublish(TEST_DATE, makeResult(), false);
    expect(result.commitHash).toBe("");
    expect(result.filesAdded).toBe(0);
    // Only git add + git diff should be called, no commit/push
    expect(callCount).toBe(2);
  });

  it("should execute full add/commit/push flow", async () => {
    let callCount = 0;
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        callCount++;
        switch (callCount) {
          case 1: // git add
            (cb as Function)(null, "", "");
            break;
          case 2: // git diff --cached --name-only
            (cb as Function)(
              null,
              "src/content/daily/2026-02-27/ai-tech.md\n",
              "",
            );
            break;
          case 3: // git commit
            (cb as Function)(null, "[main abc1234] chore: daily update", "");
            break;
          case 4: // git push
            (cb as Function)(null, "ok", "");
            break;
          default:
            (cb as Function)(null, "", "");
        }
        return {} as ReturnType<typeof execFile>;
      },
    );

    const result = await gitPublish(TEST_DATE, makeResult(), false);
    expect(result.commitHash).toBe("abc1234");
    expect(result.filesAdded).toBe(1);
    expect(result.commitMessage).toContain("2/2 domains succeeded");
    expect(callCount).toBe(4);
  });

  it("should throw when publish fails", async () => {
    let callCount = 0;
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        callCount++;
        switch (callCount) {
          case 1: // git add
            (cb as Function)(null, "", "");
            break;
          case 2: // git diff --cached --name-only
            (cb as Function)(
              null,
              "src/content/daily/2026-02-27/ai-tech.md\n",
              "",
            );
            break;
          default: {
            // git commit fails
            const err = new Error("fail") as Error & { code: number };
            err.code = 1;
            (cb as Function)(err, "", "commit failed");
          }
        }
        return {} as ReturnType<typeof execFile>;
      },
    );

    await expect(gitPublish(TEST_DATE, makeResult(), false)).rejects.toThrow(
      "git 命令失败",
    );
  });
});

// ---------------------------------------------------------------------------
// execGit - sensitive pattern sanitization
// ---------------------------------------------------------------------------

describe("execGit sanitization", () => {
  beforeEach(() => {
    vi.mocked(execFile).mockReset();
  });

  it("should redact API keys in error messages", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        const err = new Error("fail") as Error & { code: number };
        err.code = 1;
        (cb as Function)(err, "", "api_key= sk-abc123secret");
        return {} as ReturnType<typeof execFile>;
      },
    );
    await expect(execGit(["status"])).rejects.toThrow("[REDACTED]");
  });

  it("should redact GitHub tokens in error messages", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        const err = new Error("fail") as Error & { code: number };
        err.code = 1;
        (cb as Function)(err, "", "remote: ghp_abcDEF123456789xyz");
        return {} as ReturnType<typeof execFile>;
      },
    );
    await expect(execGit(["push"])).rejects.toThrow("[REDACTED]");
  });

  it("should redact bearer tokens in error messages", async () => {
    vi.mocked(execFile).mockImplementation(
      (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
        const err = new Error("fail") as Error & { code: number };
        err.code = 1;
        (cb as Function)(err, "", "bearer eyJhbGciOiJIUzI1NiJ9.token");
        return {} as ReturnType<typeof execFile>;
      },
    );
    await expect(execGit(["push"])).rejects.toThrow("[REDACTED]");
  });
});
