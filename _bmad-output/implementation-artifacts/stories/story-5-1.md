# Story 5-1: 单领域失败隔离机制

## Story ID
5-1

## Epic
Epic 5: 管道健壮性与可观测性

## 标题
单领域失败隔离机制

## 描述
作为系统运维者，
我想要单个领域的抓取或处理失败不影响其他领域的正常发布，
以便最大化每日资讯的覆盖完整度。

## 优先级
P0

## 复杂度
中

## 状态
ready

## 依赖
- Story 4-1: 管道入口与领域调度框架（已完成，提供 run.ts 调度循环与 process.ts 处理函数）
- Story 4-2: 资讯抓取模块（已完成，提供 fetch.ts 多源抓取与源级失败隔离）
- Story 4-3: AI 内容筛选与摘要（已完成，提供 filter.ts 筛选逻辑与 fallback 策略）
- Story 4-4: Markdown 格式化输出（已完成，提供 format.ts 文件生成逻辑）
- Story 4-5: Git 自动提交推送（已完成，提供 publish.ts 提交与推送逻辑）

---

## 现状分析

### 已有的隔离机制（Story 4-1 已实现）
当前 `run.ts` 中的调度循环已具备基础的 try-catch 隔离：

```typescript
// run.ts L224-L239 - 现有隔离逻辑
for (const domain of targetDomains) {
  const domainStart = Date.now();
  try {
    const result = await processDomain(domain, ctx.date, ctx.dryRun);
    results.push(result);
  } catch (err) {
    // ... 捕获异常，记录失败结果，继续下一个领域
  }
}
```

`process.ts` 内部也有 try-catch，返回 `status: "failed"` 而非抛出异常。

### 已有的 commit message 机制（Story 4-5 已实现）
`publish.ts` 的 `buildCommitMessage()` 已能生成包含失败信息的提交消息：
```
chore: daily update 2026-02-27 (3/4 domains succeeded), failed: cross-border-ecom (timeout...)
```

### 已有的前端跳过机制
`NewsList.astro` 在构建分组数据时已自动跳过缺失领域：
```typescript
// NewsList.astro L25-L32
const groups = domains
  .map((domainConfig) => {
    const entry = entries.find((e) => e.data.domain === domainConfig.slug);
    if (!entry) return null;  // 无对应文件 → 跳过
    const items = parseNewsItems(entry.body ?? '');
    return items.length > 0 ? { domain: domainConfig, items } : null;
  })
  .filter((g) => g !== null);
```

### 本 Story 需要补强的部分
1. **失败领域文件清理** — 确保失败领域不会残留空文件或损坏文件
2. **format 阶段的原子性写入** — 防止写入中途失败产生不完整文件
3. **错误分类与结构化日志** — 区分超时、API 错误、解析错误等类型
4. **端到端集成测试** — 验证完整的失败隔离链路
5. **前端防御性渲染** — 增强对损坏 frontmatter 的容错处理

---

## 验收标准 (Acceptance Criteria)

### AC-1: 单领域异常不中断管道
**Given** 管道正在执行多个领域的抓取任务
**When** 某个领域（如"跨境电商"）的抓取过程抛出异常
**Then** 该领域的错误被捕获并记录，不中断管道整体执行（FR21）
**And** 其余领域继续正常执行抓取-筛选-格式化-写入流程

### AC-2: 失败领域不生成空文件或损坏文件
**Given** 某个领域在 fetch/filter/format 任一阶段失败
**When** 管道继续执行后续领域
**Then** 失败领域不生成空文件或损坏文件
**And** 如果 format 阶段写入中途失败，已写入的不完整文件被清理

### AC-3: Git commit 包含失败信息
**Given** 管道执行完成，部分领域成功、部分失败
**When** 执行 git commit
**Then** 最终 Git commit 中仅包含成功领域的 Markdown 文件
**And** commit message 明确标注失败领域及错误摘要
**And** 格式如: `chore: daily update 2026-02-27 (3/4 domains succeeded), failed: cross-border-ecom (timeout)`

### AC-4: 前端渲染自动跳过缺失领域
**Given** 某日的内容目录中缺少某个领域的 Markdown 文件
**When** 前端渲染该日期的页面
**Then** 自动跳过缺失领域，不显示空分区
**And** 页面正常展示其余领域的资讯内容
**And** 总资讯条数统计不包含缺失领域

### AC-5: 结构化错误日志
**Given** 某个领域执行失败
**When** 查看管道执行日志
**Then** 日志包含错误分类（timeout / api_error / parse_error / write_error）
**And** 日志包含失败阶段（fetch / filter / format）
**And** 日志包含领域名称、耗时、错误详情

### AC-6: 全部领域失败时的优雅降级
**Given** 所有领域均执行失败
**When** 管道执行完成
**Then** 不执行 git commit（无文件变更）
**And** 管道以退出码 1 结束
**And** 汇总日志清晰列出所有失败领域及原因

---

## 技术任务列表 (Technical Tasks)

### Task 1: 扩展 DomainProcessResult 类型
**预估时间：** 5 分钟
**修改文件：** `scripts/pipeline/types.ts`

在 `DomainProcessResult` 接口中新增两个可选字段：

```typescript
export interface DomainProcessResult {
  domain: string;
  name: string;
  status: DomainStatus;
  duration: number;
  error?: string;
  /** 失败发生的阶段 */
  failedStage?: "fetch" | "filter" | "format";
  /** 错误分类 */
  errorType?: "timeout" | "api_error" | "parse_error" | "write_error" | "unknown";
}
```

这两个字段为可选，不影响现有代码的兼容性。

---

### Task 2: 重构 process.ts 逐阶段错误隔离
**预估时间：** 20 分钟
**修改文件：** `scripts/pipeline/process.ts`

#### 2.1 实现错误分类辅助函数

新增 `classifyError` 和 `extractMessage` 函数：

```typescript
/** 从错误对象提取消息 */
function extractMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/** 根据错误特征自动分类 */
function classifyError(err: unknown): DomainProcessResult["errorType"] {
  if (!(err instanceof Error)) return "unknown";
  const msg = err.message.toLowerCase();
  if (err.name === "AbortError" || msg.includes("timeout") || msg.includes("超时")) {
    return "timeout";
  }
  if (msg.includes("api") || msg.includes("status") || msg.includes("fetch")) {
    return "api_error";
  }
  if (msg.includes("json") || msg.includes("parse") || msg.includes("解析")) {
    return "parse_error";
  }
  if (msg.includes("write") || msg.includes("写入") || msg.includes("enoent")) {
    return "write_error";
  }
  return "unknown";
}
```

#### 2.2 重构 processDomain 为逐阶段 try-catch

将现有的单一 try-catch 拆分为三个独立的 try-catch 块，每个阶段失败时精确标记 `failedStage` 和 `errorType`：

```typescript
export async function processDomain(
  config: DomainConfig, date: string, dryRun: boolean,
): Promise<DomainProcessResult> {
  const start = Date.now();
  const base = { domain: config.slug, name: config.name };

  console.log(`  [${config.name}] 开始处理领域: ${config.slug}`);

  // Stage 1: Fetch
  let rawItems: RawNewsItem[];
  try {
    rawItems = await fetchNews(config, date);
  } catch (err) {
    const duration = Date.now() - start;
    const msg = extractMessage(err);
    console.error(`  [${config.name}] fetch 阶段失败 (${duration}ms): ${msg}`);
    return { ...base, status: "failed", duration, error: msg,
             failedStage: "fetch", errorType: classifyError(err) };
  }

  // Stage 2: Filter
  let filtered: FilteredNewsItem[];
  try {
    filtered = await filterAndSummarize(rawItems, config, date);
  } catch (err) {
    const duration = Date.now() - start;
    const msg = extractMessage(err);
    console.error(`  [${config.name}] filter 阶段失败 (${duration}ms): ${msg}`);
    return { ...base, status: "failed", duration, error: msg,
             failedStage: "filter", errorType: classifyError(err) };
  }

  // Stage 3: Format
  try {
    await formatAndWrite(filtered, config, date, dryRun);
  } catch (err) {
    const duration = Date.now() - start;
    const msg = extractMessage(err);
    console.error(`  [${config.name}] format 阶段失败 (${duration}ms): ${msg}`);
    return { ...base, status: "failed", duration, error: msg,
             failedStage: "format", errorType: classifyError(err) };
  }

  const duration = Date.now() - start;
  console.log(`  [${config.name}] 处理完成 (${duration}ms)`);
  return { ...base, status: "success", duration };
}
```

关键设计：fetch 失败时不调用 filter/format，filter 失败时不调用 format，避免无意义的后续执行。

---

### Task 3: format.ts 原子性写入与失败清理
**预估时间：** 15 分钟
**修改文件：** `scripts/pipeline/format.ts`

#### 3.1 实现写入-重命名原子模式

修改 `writeMarkdownFile` 函数，先写入临时文件再原子重命名，确保不会产生不完整文件：

```typescript
import { rename, unlink } from "node:fs/promises";

export async function writeMarkdownFile(
  content: string, filePath: string,
): Promise<number> {
  const tmpPath = filePath + ".tmp";
  try {
    await mkdir(dirname(filePath), { recursive: true });
    const buffer = Buffer.from(content, "utf-8");
    await writeFile(tmpPath, buffer);
    await rename(tmpPath, filePath);  // 原子重命名
    return buffer.byteLength;
  } catch (err) {
    // 清理临时文件（忽略不存在的情况）
    try { await unlink(tmpPath); } catch { /* ignore */ }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[format] 文件写入失败: ${filePath} - ${msg}`);
  }
}
```

#### 3.2 formatAndWrite 失败时清理残留文件

在 `formatAndWrite` 的写入逻辑外层增加 catch，确保失败时不残留损坏文件：

```typescript
// 在正常模式写入逻辑中增加 try-catch
try {
  const absolutePath = join(PROJECT_ROOT, relativePath);
  const bytesWritten = await writeMarkdownFile(markdown, absolutePath);
  return { filePath: relativePath, itemCount: validCount, bytesWritten };
} catch (err) {
  // 确保不残留损坏文件
  const absolutePath = join(PROJECT_ROOT, relativePath);
  try { await unlink(absolutePath); } catch { /* 文件可能不存在 */ }
  throw err;
}
```

---

### Task 4: 增强 publish.ts commit message 错误分类
**预估时间：** 10 分钟
**修改文件：** `scripts/pipeline/publish.ts`

优化 `buildCommitMessage` 函数，优先使用新增的 `errorType` 字段生成更精确的错误标签：

```typescript
export function buildCommitMessage(
  date: string, results: PipelineResult,
): string {
  const total = results.results.length;
  let msg = `chore: daily update ${date} (${results.successCount}/${total} domains succeeded)`;

  const failed = results.results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    const failedParts = failed.map((r) => {
      const errorLabel = r.errorType ?? extractErrorSummary(r.error ?? "unknown");
      return `${r.domain} (${errorLabel})`;
    });
    msg += `, failed: ${failedParts.join(", ")}`;
  }

  return msg;
}
```

示例输出：
- `chore: daily update 2026-02-27 (3/4 domains succeeded), failed: cross-border-ecom (timeout)`
- `chore: daily update 2026-02-27 (2/4 domains succeeded), failed: cross-border-ecom (api_error), github-trending (parse_error)`

---

### Task 5: 增强 run.ts 汇总日志输出
**预估时间：** 10 分钟
**修改文件：** `scripts/pipeline/run.ts`

扩展 `printSummary` 函数的汇总表格，增加"阶段"和"错误类型"列：

```typescript
export function printSummary(result: PipelineResult): void {
  console.log("\n" + "=".repeat(72));
  console.log("管道执行汇总");
  console.log("=".repeat(72));

  // 表头增加阶段和错误类型
  console.log(
    `${padEndDisplay("领域", 16)}` +
    `${padEndDisplay("状态", 10)}` +
    `${padEndDisplay("阶段", 10)}` +
    `${padEndDisplay("错误类型", 14)}` +
    `${padEndDisplay("耗时", 12)}` +
    `错误信息`
  );
  console.log("-".repeat(72));

  for (const r of result.results) {
    const statusLabel = r.status === "success" ? "成功"
      : r.status === "failed" ? "失败" : "跳过";
    const stageStr = r.failedStage ?? "-";
    const typeStr = r.errorType ?? "-";
    const durationStr = `${r.duration}ms`;
    const errorStr = r.error ?? "-";
    console.log(
      `${padEndDisplay(r.name, 16)}` +
      `${padEndDisplay(statusLabel, 10)}` +
      `${padEndDisplay(stageStr, 10)}` +
      `${padEndDisplay(typeStr, 14)}` +
      `${padEndDisplay(durationStr, 12)}` +
      `${errorStr}`
    );
  }

  console.log("-".repeat(72));
  console.log(
    `总计: ${result.results.length} 个领域 | ` +
    `成功: ${result.successCount} | ` +
    `失败: ${result.failedCount} | ` +
    `跳过: ${result.skippedCount} | ` +
    `总耗时: ${result.totalDuration}ms`
  );
  console.log("=".repeat(72));
}
```

---

### Task 6: 前端防御性渲染增强
**预估时间：** 15 分钟
**修改文件：** `src/components/news/NewsList.astro`

#### 6.1 增强 itemCount 容错

当前 `totalCount` 计算直接使用 `entry.data.itemCount`，需防御非数字值：

```typescript
const totalCount = entries.reduce((sum, entry) => {
  const count = typeof entry.data.itemCount === 'number' ? entry.data.itemCount : 0;
  return sum + count;
}, 0);
```

#### 6.2 增强 parseNewsItems 异常捕获

为 `parseNewsItems` 调用增加 try-catch，防止损坏的 Markdown 内容导致整页崩溃：

```typescript
const groups = domains
  .map((domainConfig) => {
    const entry = entries.find((e) => e.data.domain === domainConfig.slug);
    if (!entry) return null;
    try {
      const items = parseNewsItems(entry.body ?? '');
      return items.length > 0 ? { domain: domainConfig, items } : null;
    } catch {
      // 损坏的内容文件不应阻断整页渲染
      return null;
    }
  })
  .filter((g): g is DomainGroup => g !== null);
```

---

### Task 7: 编写单元测试 — 错误分类
**预估时间：** 10 分钟
**新建文件：** `tests/pipeline/domain-isolation.test.ts`

```typescript
describe("classifyError", () => {
  it("将 AbortError 分类为 timeout", () => {
    const err = new DOMException("signal aborted", "AbortError");
    expect(classifyError(err)).toBe("timeout");
  });

  it("将包含 timeout 关键词的错误分类为 timeout", () => {
    expect(classifyError(new Error("命令超时 (30000ms)"))).toBe("timeout");
  });

  it("将 API 状态码错误分类为 api_error", () => {
    expect(classifyError(new Error("openclaw API 返回 429"))).toBe("api_error");
  });

  it("将 JSON 解析错误分类为 parse_error", () => {
    expect(classifyError(new Error("LLM 响应 JSON 解析失败"))).toBe("parse_error");
  });

  it("将文件写入错误分类为 write_error", () => {
    expect(classifyError(new Error("文件写入失败: ENOENT"))).toBe("write_error");
  });

  it("将未知错误分类为 unknown", () => {
    expect(classifyError(new Error("something unexpected"))).toBe("unknown");
  });

  it("将非 Error 对象分类为 unknown", () => {
    expect(classifyError("string error")).toBe("unknown");
  });
});
```

---

### Task 8: 编写单元测试 — processDomain 阶段隔离
**预估时间：** 15 分钟
**修改文件：** `tests/pipeline/domain-isolation.test.ts`

```typescript
describe("processDomain - 阶段隔离", () => {
  const mockConfig = { slug: "test-domain", name: "测试领域",
    icon: "🧪", order: 99, color: "#000",
    bgColor: "#fff", pillBg: "#eee", pillText: "#333" } as const;

  it("fetch 阶段失败时返回 failedStage='fetch' 且不调用 filter/format", async () => {
    vi.mocked(fetchNews).mockRejectedValueOnce(new Error("API timeout"));
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("fetch");
    expect(result.errorType).toBe("timeout");
    expect(filterAndSummarize).not.toHaveBeenCalled();
    expect(formatAndWrite).not.toHaveBeenCalled();
  });

  it("filter 阶段失败时返回 failedStage='filter' 且不调用 format", async () => {
    vi.mocked(fetchNews).mockResolvedValueOnce([]);
    vi.mocked(filterAndSummarize).mockRejectedValueOnce(
      new Error("LLM 响应 JSON 解析失败")
    );
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("filter");
    expect(result.errorType).toBe("parse_error");
    expect(formatAndWrite).not.toHaveBeenCalled();
  });

  it("format 阶段失败时返回 failedStage='format'", async () => {
    vi.mocked(fetchNews).mockResolvedValueOnce([]);
    vi.mocked(filterAndSummarize).mockResolvedValueOnce([]);
    vi.mocked(formatAndWrite).mockRejectedValueOnce(
      new Error("文件写入失败: ENOENT")
    );
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.status).toBe("failed");
    expect(result.failedStage).toBe("format");
    expect(result.errorType).toBe("write_error");
  });

  it("全部阶段成功时无 failedStage 和 errorType", async () => {
    vi.mocked(fetchNews).mockResolvedValueOnce([]);
    vi.mocked(filterAndSummarize).mockResolvedValueOnce([]);
    vi.mocked(formatAndWrite).mockResolvedValueOnce(
      { filePath: "", itemCount: 0, bytesWritten: 0 }
    );
    const result = await processDomain(mockConfig, "2026-01-01", false);
    expect(result.status).toBe("success");
    expect(result.failedStage).toBeUndefined();
    expect(result.errorType).toBeUndefined();
  });
});
```

---

### Task 9: 编写单元测试 — format.ts 原子写入
**预估时间：** 10 分钟
**修改文件：** `tests/pipeline/domain-isolation.test.ts`

```typescript
describe("writeMarkdownFile - 原子写入", () => {
  it("正常写入后文件内容完整且无临时文件残留", async () => {
    const tmpDir = await mkdtemp(join(tmpdir(), "format-test-"));
    const filePath = join(tmpDir, "test.md");
    const content = "---\ntitle: test\n---\n\n# Hello";
    const bytes = await writeMarkdownFile(content, filePath);
    expect(bytes).toBeGreaterThan(0);
    const written = await readFile(filePath, "utf-8");
    expect(written).toBe(content);
    // 临时文件不应存在
    await expect(access(filePath + ".tmp")).rejects.toThrow();
  });

  it("写入失败时不残留临时文件和目标文件", async () => {
    // 模拟 rename 失败
    const tmpDir = await mkdtemp(join(tmpdir(), "format-test-"));
    const filePath = join(tmpDir, "readonly-dir", "sub", "test.md");
    // 制造一个会导致 rename 失败的场景
    // ... 具体实现依赖测试环境
  });
});
```

---

### Task 10: 编写单元测试 — buildCommitMessage 增强
**预估时间：** 10 分钟
**修改文件：** `tests/pipeline/domain-isolation.test.ts`

```typescript
describe("buildCommitMessage - errorType 支持", () => {
  it("使用 errorType 替代错误摘要截断", () => {
    const results: PipelineResult = {
      results: [
        { domain: "ai-tech", name: "AI技术", status: "success", duration: 100 },
        { domain: "ecom", name: "跨境电商", status: "failed", duration: 200,
          error: "very long error message...", errorType: "timeout" },
      ],
      totalDuration: 300, successCount: 1, failedCount: 1, skippedCount: 0,
    };
    const msg = buildCommitMessage("2026-02-27", results);
    expect(msg).toContain("1/2 domains succeeded");
    expect(msg).toContain("ecom (timeout)");
    expect(msg).not.toContain("very long");
  });

  it("无 errorType 时 fallback 到错误摘要", () => {
    const results: PipelineResult = {
      results: [
        { domain: "ecom", name: "跨境电商", status: "failed", duration: 200,
          error: "connection refused" },
      ],
      totalDuration: 200, successCount: 0, failedCount: 1, skippedCount: 0,
    };
    const msg = buildCommitMessage("2026-02-27", results);
    expect(msg).toContain("ecom (connection refused)");
  });
});
```

---

### Task 11: 编写集成测试 — 端到端失败隔离
**预估时间：** 15 分钟
**修改文件：** `tests/pipeline/domain-isolation.test.ts`

```typescript
describe("runPipeline - 端到端失败隔离", () => {
  it("单领域失败不影响其他领域执行和文件生成", async () => {
    // mock: ai-tech 成功, cross-border-ecom 失败
    // 验证: ai-tech 文件存在, cross-border-ecom 文件不存在
    // 验证: pipeline 退出码为 0
  });

  it("全部领域失败时不执行 git commit", async () => {
    // mock: 所有领域 fetch 抛出异常
    // 验证: gitPublish 中 filesAdded === 0, 跳过 commit
    // 验证: pipeline 退出码为 1
  });

  it("部分成功时 commit message 包含失败信息", async () => {
    // mock: 2 个成功, 2 个失败
    // 验证: commit message 格式正确
  });
});
```

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `scripts/pipeline/types.ts` | 修改 | 扩展 DomainProcessResult 增加 failedStage、errorType 字段 |
| `scripts/pipeline/process.ts` | 修改 | 逐阶段 try-catch、错误分类函数 classifyError |
| `scripts/pipeline/format.ts` | 修改 | 原子写入（tmp+rename）、失败清理 |
| `scripts/pipeline/publish.ts` | 修改 | buildCommitMessage 优先使用 errorType |
| `scripts/pipeline/run.ts` | 修改 | printSummary 增加阶段和错误类型列 |
| `src/components/news/NewsList.astro` | 修改 | 增强 itemCount 容错和 parseNewsItems 异常捕获 |
| `tests/pipeline/domain-isolation.test.ts` | 新建 | 失败隔离专项测试（错误分类、阶段隔离、原子写入、集成） |

---

## 测试策略

### 单元测试（覆盖率目标 ≥80%）
- `classifyError` 函数：覆盖所有 5 种错误类型分支 + 非 Error 对象
- `processDomain` 函数：mock fetch/filter/format，验证各阶段失败的返回值和调用链
- `writeMarkdownFile` 函数：使用临时目录验证原子写入和清理逻辑
- `buildCommitMessage` 函数：验证 errorType 优先级和 fallback 行为

### 集成测试
- 模拟多领域执行，其中一个领域的 fetch 抛出超时异常
- 验证失败领域返回正确的 status/failedStage/errorType
- 验证成功领域的文件正常生成
- 验证失败领域无残留文件

### 边界测试
- 所有领域均失败：验证退出码为 1，无 git commit
- 所有领域均成功：验证退出码为 0，commit message 无 failed 部分
- 仅一个领域成功：验证该领域文件正常生成并提交
- format 写入中途失败：验证临时文件被清理

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR6 | 每日自动发布成功率 ≥99% | 单领域失败不阻断整体发布，最大化成功率 |
| NFR7 | 单领域失败不影响其他领域 | 逐阶段 try-catch + 错误分类 + 文件清理 |
| NFR9 | 失败时保留完整错误日志 | 结构化日志含阶段、错误类型、耗时、详情 |
| FR21 | 领域级故障隔离 | process.ts 逐阶段隔离 + format.ts 原子写入 |

---

## 完成定义 (Definition of Done)

- [ ] `DomainProcessResult` 类型扩展了 `failedStage` 和 `errorType` 字段
- [ ] `process.ts` 实现逐阶段 try-catch 和错误分类函数 `classifyError`
- [ ] `format.ts` 实现原子写入（tmp + rename）和失败清理
- [ ] `publish.ts` 的 commit message 优先使用 errorType
- [ ] `run.ts` 汇总日志展示失败阶段和错误类型
- [ ] `NewsList.astro` 增强 frontmatter 容错和异常捕获
- [ ] 失败领域不生成空文件或损坏文件（通过测试验证）
- [ ] 前端渲染自动跳过缺失领域（通过测试验证）
- [ ] 单元测试覆盖核心逻辑，覆盖率 ≥80%
- [ ] 集成测试验证端到端失败隔离链路
- [ ] `pnpm run pipeline` 在模拟单领域失败时仍能正常完成

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节）
- PRD：_bmad-output/planning-artifacts/prd.md（FR21、NFR6、NFR7、NFR9）
- 领域配置：src/config/domains.ts
- Epic 分解：_bmad-output/planning-artifacts/epics-and-stories.md（Story 5.1）
- 已有隔离测试参考：tests/pipeline/pipeline-isolation.test.ts
