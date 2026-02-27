# Story 5-4: 错误日志持久化

## Story ID
5-4

## Epic
Epic 5: 管道健壮性与可观测性

## 标题
错误日志持久化

## 描述
作为系统运维者，
我想要管道执行失败时保留详细的错误日志，
以便快速定位和排查问题根因。

## 优先级
P1

## 复杂度
低

## 状态
ready

## 依赖
- Story 4-1: 管道入口与领域调度框架（已完成，提供 run.ts 调度循环与 printSummary 汇总）
- Story 4-5: Git 自动提交推送（已完成，提供 publish.ts 的 sanitize 脱敏函数与 gitAdd/gitCommit）
- Story 5-1: 单领域失败隔离机制（已完成，提供 process.ts 的 classifyError/extractMessage 与 types.ts 的 errorType/failedStage 字段）

---

## 现状分析

### 已有的错误处理机制

#### process.ts — 错误分类与阶段标记
`classifyError` 已能将错误分为 5 类（timeout / api_error / parse_error / write_error / unknown），`processDomain` 逐阶段 try-catch 返回包含 `failedStage`、`errorType`、`error` 的结构化结果。

#### publish.ts — 敏感信息过滤
`sanitize` 函数已实现对 token、password、secret、API key、GitHub PAT 等敏感信息的正则脱敏，替换为 `[REDACTED]`。

#### run.ts — 控制台汇总输出
`printSummary` 已输出包含领域、状态、阶段、错误类型、耗时、错误信息的表格到 stdout，GitHub Actions 会自动捕获 stdout/stderr。

### 本 Story 需要新增的部分
1. **错误日志文件写入** — 将失败领域的详细错误信息写入 `logs/` 目录的日志文件
2. **日志格式规范** — 每条日志包含时间戳、领域标识、错误阶段、完整错误堆栈
3. **日志文件按日期命名** — 格式 `logs/YYYY-MM-DD-errors.log`
4. **日志脱敏** — 复用 publish.ts 的 sanitize 函数，确保日志不含敏感信息
5. **GitHub Actions 同步输出** — 失败时通过 console.error 输出详情，Actions 自动捕获

---

## 验收标准 (Acceptance Criteria)

### AC-1: 错误日志包含完整上下文
**Given** 某个领域在管道执行中失败
**When** 管道完成执行后写入错误日志
**Then** 日志条目包含 ISO 时间戳、领域 slug、领域名称、错误阶段（fetch/filter/format）和完整错误消息
**And** 日志条目包含错误分类（timeout/api_error/parse_error/write_error/unknown）
**And** 日志条目包含执行耗时

### AC-2: 错误日志写入 Git 仓库 logs/ 目录
**Given** 管道执行中存在失败领域
**When** 管道完成后写入日志
**Then** 日志文件写入项目根目录的 `logs/` 目录
**And** 日志文件随 git commit 一起版本化提交

### AC-3: 日志文件按日期命名
**Given** 管道在 2026-02-26 执行
**When** 存在失败领域需要记录日志
**Then** 日志写入 `logs/2026-02-26-errors.log`
**And** 同一天多次执行时追加写入同一文件（不覆盖）

### AC-4: GitHub Actions 同步输出错误详情
**Given** 管道在 GitHub Actions 中执行
**When** 某个领域失败
**Then** 错误详情通过 console.error 输出到 Actions 运行日志
**And** 汇总表格中展示失败阶段和错误类型（已由 printSummary 实现）

### AC-5: 日志内容不包含敏感信息
**Given** 错误信息中可能包含 API 密钥、token 等敏感数据
**When** 写入日志文件前
**Then** 所有敏感信息被替换为 `[REDACTED]`
**And** 复用 publish.ts 的 sanitize 函数确保一致的脱敏规则

### AC-6: 无失败时不生成日志文件
**Given** 所有领域均执行成功
**When** 管道完成执行
**Then** 不创建错误日志文件
**And** 不向 git 暂存区添加 logs/ 目录的文件

---

## 技术任务列表 (Technical Tasks)

### Task 1: 新建 error-logger.ts 模块
**预估时间：** 15 分钟
**新建文件：** `scripts/pipeline/error-logger.ts`

实现错误日志的格式化与文件写入逻辑：

```typescript
import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import type { DomainProcessResult, PipelineResult } from "./types.ts";

/** 项目根目录 */
const PROJECT_ROOT = new URL("../../", import.meta.url).pathname;

/** 日志目录 */
const LOGS_DIR = join(PROJECT_ROOT, "logs");

/**
 * 格式化单条错误日志
 * 格式: [ISO时间戳] domain={slug} stage={stage} type={errorType} duration={ms}ms
 *       message: {error}
 */
export function formatErrorEntry(
  result: DomainProcessResult,
  timestamp: string,
): string {
  const stage = result.failedStage ?? "unknown";
  const errorType = result.errorType ?? "unknown";
  const lines = [
    `[${timestamp}] domain=${result.domain} name=${result.name} stage=${stage} type=${errorType} duration=${result.duration}ms`,
    `  message: ${result.error ?? "no error message"}`,
    "",
  ];
  return lines.join("\n");
}

/**
 * 将失败领域的错误日志写入文件
 * 文件路径: logs/{date}-errors.log
 * 追加模式，同一天多次执行不覆盖
 */
export async function writeErrorLog(
  date: string,
  results: PipelineResult,
  sanitizeFn: (text: string) => string,
): Promise<string | null> {
  const failed = results.results.filter((r) => r.status === "failed");
  if (failed.length === 0) return null;

  await mkdir(LOGS_DIR, { recursive: true });

  const logFileName = `${date}-errors.log`;
  const logFilePath = join(LOGS_DIR, logFileName);
  const timestamp = new Date().toISOString();

  const header = `--- Pipeline run at ${timestamp} | ${results.failedCount} failed / ${results.results.length} total ---\n`;
  const entries = failed.map((r) => formatErrorEntry(r, timestamp)).join("\n");
  const content = sanitizeFn(header + entries + "\n");

  await appendFile(logFilePath, content, "utf-8");

  return logFilePath;
}

/**
 * 获取日志文件的相对路径（用于 git add）
 */
export function getLogRelativePath(date: string): string {
  return `logs/${date}-errors.log`;
}
```

关键设计：
- 使用 `appendFile` 追加写入，同一天多次执行不覆盖
- 写入前调用 `sanitizeFn` 脱敏，函数由调用方注入（解耦）
- 无失败领域时返回 `null`，不创建文件

---

### Task 2: 从 publish.ts 导出 sanitize 函数
**预估时间：** 5 分钟
**修改文件：** `scripts/pipeline/publish.ts`

将 `sanitize` 函数从模块私有改为导出，供 error-logger.ts 复用：

```typescript
// 修改前
function sanitize(text: string): string {

// 修改后
export function sanitize(text: string): string {
```

模块内部调用不受影响，仅增加 `export` 关键字。

---

### Task 3: 在 run.ts 中集成错误日志写入
**预估时间：** 10 分钟
**修改文件：** `scripts/pipeline/run.ts`

在 `runPipeline` 函数的 publish 阶段之前，调用 `writeErrorLog` 写入错误日志：

```typescript
import { writeErrorLog, getLogRelativePath } from "./error-logger.ts";
import { sanitize } from "./publish.ts";

// 在 runPipeline 中，publish 之前插入：
if (!ctx.dryRun && counts.failed > 0) {
  try {
    const logPath = await writeErrorLog(ctx.date, pipelineResult, sanitize);
    if (logPath) {
      console.log(`    [error-log] 错误日志已写入: ${logPath}`);
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`    [error-log] 日志写入失败: ${msg}`);
    // 日志写入失败不阻断管道
  }
}
```

关键设计：日志写入失败时仅打印警告，不阻断后续 publish 流程。

---

### Task 4: 在 publish.ts 中将日志文件纳入 git 提交
**预估时间：** 10 分钟
**修改文件：** `scripts/pipeline/publish.ts`

修改 `gitPublish` 函数，在 git add 阶段同时暂存 logs/ 目录：

```typescript
import { getLogRelativePath } from "./error-logger.ts";

// 在 gitPublish 中，gitAdd 之后追加：
if (results.failedCount > 0) {
  const logPath = getLogRelativePath(date);
  try {
    await execGit(["add", logPath]);
  } catch {
    // 日志文件可能不存在（writeErrorLog 失败时），忽略
  }
}
```

---

### Task 5: 添加 logs/ 目录的 .gitkeep
**预估时间：** 2 分钟
**新建文件：** `logs/.gitkeep`

确保 `logs/` 目录被 Git 跟踪，即使当前无日志文件。

---

### Task 6: 编写单元测试 — formatErrorEntry
**预估时间：** 10 分钟
**新建文件：** `tests/pipeline/error-logger.test.ts`

```typescript
import { describe, it, expect } from "vitest";
import { formatErrorEntry } from "../../scripts/pipeline/error-logger.ts";
import type { DomainProcessResult } from "../../scripts/pipeline/types.ts";

describe("formatErrorEntry", () => {
  it("格式化包含完整字段的错误条目", () => {
    const result: DomainProcessResult = {
      domain: "cross-border-ecom",
      name: "跨境电商",
      status: "failed",
      duration: 5200,
      error: "API 返回 429 Too Many Requests",
      failedStage: "fetch",
      errorType: "api_error",
    };
    const entry = formatErrorEntry(result, "2026-02-26T08:00:00.000Z");
    expect(entry).toContain("[2026-02-26T08:00:00.000Z]");
    expect(entry).toContain("domain=cross-border-ecom");
    expect(entry).toContain("name=跨境电商");
    expect(entry).toContain("stage=fetch");
    expect(entry).toContain("type=api_error");
    expect(entry).toContain("duration=5200ms");
    expect(entry).toContain("message: API 返回 429 Too Many Requests");
  });

  it("缺失可选字段时使用 unknown 占位", () => {
    const result: DomainProcessResult = {
      domain: "ai-tech",
      name: "AI技术",
      status: "failed",
      duration: 100,
    };
    const entry = formatErrorEntry(result, "2026-02-26T08:00:00.000Z");
    expect(entry).toContain("stage=unknown");
    expect(entry).toContain("type=unknown");
    expect(entry).toContain("message: no error message");
  });
});
```

---

### Task 7: 编写单元测试 — writeErrorLog
**预估时间：** 15 分钟
**修改文件：** `tests/pipeline/error-logger.test.ts`

```typescript
describe("writeErrorLog", () => {
  it("有失败领域时写入日志文件", async () => {
    const results: PipelineResult = {
      results: [
        { domain: "ai-tech", name: "AI技术", status: "success", duration: 100 },
        {
          domain: "ecom", name: "跨境电商", status: "failed", duration: 200,
          error: "timeout after 30s", failedStage: "fetch", errorType: "timeout",
        },
      ],
      totalDuration: 300, successCount: 1, failedCount: 1, skippedCount: 0,
    };
    const identity = (s: string) => s;
    const logPath = await writeErrorLog("2026-02-26", results, identity);
    expect(logPath).not.toBeNull();
    const content = await readFile(logPath!, "utf-8");
    expect(content).toContain("domain=ecom");
    expect(content).toContain("stage=fetch");
    expect(content).toContain("type=timeout");
  });

  it("无失败领域时返回 null 且不创建文件", async () => {
    const results: PipelineResult = {
      results: [
        { domain: "ai-tech", name: "AI技术", status: "success", duration: 100 },
      ],
      totalDuration: 100, successCount: 1, failedCount: 0, skippedCount: 0,
    };
    const logPath = await writeErrorLog("2026-02-26", results, (s) => s);
    expect(logPath).toBeNull();
  });

  it("调用 sanitizeFn 对日志内容脱敏", async () => {
    const results: PipelineResult = {
      results: [
        {
          domain: "ecom", name: "跨境电商", status: "failed", duration: 200,
          error: "api_key=sk-secret123 failed", failedStage: "fetch", errorType: "api_error",
        },
      ],
      totalDuration: 200, successCount: 0, failedCount: 1, skippedCount: 0,
    };
    const mockSanitize = (s: string) => s.replace(/sk-\w+/g, "[REDACTED]");
    const logPath = await writeErrorLog("2026-02-26", results, mockSanitize);
    const content = await readFile(logPath!, "utf-8");
    expect(content).toContain("[REDACTED]");
    expect(content).not.toContain("sk-secret123");
  });

  it("同一天多次写入追加而非覆盖", async () => {
    const makeResult = (domain: string): PipelineResult => ({
      results: [
        { domain, name: domain, status: "failed", duration: 100,
          error: `${domain} error`, failedStage: "fetch", errorType: "timeout" },
      ],
      totalDuration: 100, successCount: 0, failedCount: 1, skippedCount: 0,
    });
    const identity = (s: string) => s;
    await writeErrorLog("2026-02-26", makeResult("run1"), identity);
    await writeErrorLog("2026-02-26", makeResult("run2"), identity);
    // 验证两次写入的内容都存在
  });
});
```

---

### Task 8: 编写集成测试 — 日志与 git 提交联动
**预估时间：** 10 分钟
**修改文件：** `tests/pipeline/error-logger.test.ts`

```typescript
describe("错误日志与 git 提交联动", () => {
  it("失败领域的日志文件被纳入 git 暂存区", async () => {
    // mock gitPublish 流程
    // 验证 execGit 被调用时包含 logs/{date}-errors.log 路径
  });

  it("全部成功时不暂存日志文件", async () => {
    // mock 全部成功的 PipelineResult
    // 验证 execGit 未被调用 add logs/ 路径
  });
});
```

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `scripts/pipeline/error-logger.ts` | 新建 | 错误日志格式化与文件写入模块 |
| `scripts/pipeline/publish.ts` | 修改 | 导出 sanitize 函数；gitPublish 中暂存日志文件 |
| `scripts/pipeline/run.ts` | 修改 | 在 publish 前调用 writeErrorLog 写入错误日志 |
| `logs/.gitkeep` | 新建 | 确保 logs/ 目录被 Git 跟踪 |
| `tests/pipeline/error-logger.test.ts` | 新建 | 错误日志模块的单元测试与集成测试 |

---

## 测试策略

### 单元测试（覆盖率目标 ≥80%）
- `formatErrorEntry`：验证完整字段格式化、缺失字段的 fallback 值
- `writeErrorLog`：验证有失败时写入文件、无失败时返回 null、脱敏函数被调用、追加写入行为
- `getLogRelativePath`：验证路径格式正确

### 集成测试
- 模拟管道执行含失败领域，验证日志文件被创建且内容完整
- 验证日志文件路径被纳入 git add 暂存区
- 验证全部成功时不创建日志文件

### 边界测试
- 日志写入失败（如权限不足）不阻断管道执行
- 错误信息包含敏感数据时被正确脱敏
- 同一天多次执行时日志追加而非覆盖
- 空错误信息的处理

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR9 | 失败时保留完整错误日志 | 错误日志写入 logs/ 目录，包含时间戳、阶段、错误类型、完整消息 |
| NFR7 | 单领域失败不影响其他领域 | 日志写入失败不阻断管道（try-catch 保护） |
| NFR10 | 不泄露敏感信息 | 复用 sanitize 函数对日志内容脱敏 |

---

## 完成定义 (Definition of Done)

- [ ] 新建 `scripts/pipeline/error-logger.ts`，实现 formatErrorEntry 和 writeErrorLog
- [ ] `publish.ts` 导出 sanitize 函数，gitPublish 中暂存日志文件
- [ ] `run.ts` 在 publish 前调用 writeErrorLog，写入失败时不阻断管道
- [ ] 日志文件格式包含时间戳、领域标识、错误阶段、错误分类、完整错误消息
- [ ] 日志文件按日期命名（`logs/YYYY-MM-DD-errors.log`），追加写入
- [ ] 日志内容经 sanitize 脱敏，不包含 API 密钥等敏感信息
- [ ] 日志文件随 git commit 一起版本化
- [ ] GitHub Actions 运行日志中同步输出错误详情（console.error，已有）
- [ ] 无失败领域时不创建日志文件
- [ ] 单元测试覆盖核心逻辑，覆盖率 ≥80%
- [ ] 集成测试验证日志写入与 git 提交联动

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节）
- PRD：_bmad-output/planning-artifacts/prd.md（NFR9、NFR10）
- 已有脱敏实现：scripts/pipeline/publish.ts（sanitize 函数）
- 已有错误分类：scripts/pipeline/process.ts（classifyError / extractMessage）
- 已有类型定义：scripts/pipeline/types.ts（errorType / failedStage 字段）
- Story 5-1 模板参考：_bmad-output/implementation-artifacts/stories/story-5-1.md
