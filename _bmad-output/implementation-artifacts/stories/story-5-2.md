# Story 5-2: Git Commit 运行状态可观测性

## Story ID
5-2

## Epic
Epic 5: 管道健壮性与可观测性

## 标题
Git Commit 运行状态可观测性

## 描述
作为系统运维者，
我想要通过 Git commit 记录了解每日管道的运行状态，
以便无需额外监控工具即可判断系统是否正常运行。

## 优先级
P1

## 复杂度
低

## 状态
ready

## 依赖
- Story 4-5: Git 自动提交推送（已完成，提供 publish.ts 的 buildCommitMessage / gitPublish 基础逻辑）
- Story 5-1: 单领域失败隔离机制（已完成，types.ts 已有 errorType/failedStage 字段，process.ts 已有逐阶段错误隔离和 classifyError）

---

## 现状分析

### 已实现的部分（Story 4-5 + 5-1 已覆盖）

#### 1. buildCommitMessage 已支持基础格式（publish.ts L124-L142）
当前 `buildCommitMessage` 已能生成包含日期、成功数/总数、失败领域及 errorType 的提交信息：

```typescript
export function buildCommitMessage(date: string, results: PipelineResult): string {
  const total = results.results.length;
  let msg = `chore: daily update ${date} (${results.successCount}/${total} domains succeeded)`;

  const failed = results.results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    const failedParts = failed.map((r) => {
      const errorLabel = r.errorType ?? (r.error ? extractErrorSummary(r.error) : "unknown");
      return `${r.domain} (${errorLabel})`;
    });
    msg += `, failed: ${failedParts.join(", ")}`;
  }
  return msg;
}
```

示例输出：
```
chore: daily update 2026-02-27 (3/4 domains succeeded), failed: cross-border-ecom (timeout)
```

**已满足验收标准：**
- commit message 包含执行日期 ✅
- commit message 包含成功领域数/总领域数 ✅
- 失败领域的 commit message 包含错误类型摘要 ✅

#### 2. gitPublish 已实现空 commit 跳过（publish.ts L215-L219）

```typescript
const filesAdded = await gitAdd(date);
if (filesAdded === 0) {
  console.log(`${LOG_PREFIX} 无文件变更，跳过提交`);
  return { commitHash: "", filesAdded: 0, commitMessage };
}
```

**已满足验收标准：**
- 无新内容时不生成空 commit ✅

#### 3. errorType 字段已在 types.ts 中定义并在 process.ts 中填充

`DomainProcessResult` 已有 `errorType` 和 `failedStage` 字段（Story 5-1 实现），`classifyError` 函数已能区分 timeout / api_error / parse_error / write_error / unknown。

### 本 Story 需要补强的部分

经过对验收标准的逐条比对，以下是现有实现的差距：

| 验收标准 | 现状 | 差距 |
|---------|------|------|
| commit message 包含每个领域的执行状态（成功/失败/跳过） | 仅列出失败领域，成功和跳过领域未在 commit message 中体现 | 需增加每个领域的状态明细 |
| commit 时间戳准确反映管道执行时间 | 依赖 git commit 的默认时间戳，未显式设置 | 需验证或显式设置 commit 时间戳 |
| 现有测试未覆盖 5-2 特定场景 | publish.test.ts 有基础测试，但缺少 skipped 状态、多失败领域混合、时间戳等场景 | 需补充针对性测试 |

---

## 验收标准 (Acceptance Criteria)

### AC-1: 每次管道执行生成一条 commit 记录
**Given** 管道执行完成（无论成功或部分失败）
**When** 查看 Git 仓库的 commit 历史
**Then** 每次管道执行最多生成一条 commit 记录（FR22）
**And** 无新内容时不生成空 commit

### AC-2: commit message 包含执行日期和成功率
**Given** 管道执行完成
**When** 查看 commit message
**Then** 格式为 `chore: daily update {YYYY-MM-DD} ({n}/{total} domains succeeded)`
**And** n 为成功领域数，total 为总领域数

### AC-3: commit message 包含每个领域的执行状态
**Given** 管道执行完成，存在成功、失败、跳过的领域
**When** 查看 commit message body
**Then** commit message body 逐行列出每个领域的状态
**And** 格式如:
```
- ai-tech: success
- cross-border-ecom: failed (timeout)
- github-trending: skipped
```

### AC-4: 失败领域包含错误类型摘要
**Given** 某个领域执行失败
**When** 查看 commit message
**Then** 该领域的状态行包含错误类型（timeout / api_error / parse_error / write_error / unknown）

### AC-5: commit 时间戳准确反映管道执行时间
**Given** 管道在某个时间点执行完成
**When** 执行 git commit
**Then** commit 的时间戳与管道实际执行时间一致（使用 git 默认行为即可，不需要人为设置）

### AC-6: 无新内容时不生成空 commit
**Given** 管道执行完成但所有领域均失败或无新内容
**When** git add 后暂存区为空
**Then** 跳过 git commit，不生成空 commit
**And** 日志输出 "无文件变更，跳过提交"

---

## 技术任务列表 (Technical Tasks)

### Task 1: 增强 buildCommitMessage 支持多行 body 和逐领域状态
**预估时间：** 15 分钟
**修改文件：** `scripts/pipeline/publish.ts`

当前 commit message 仅有一行 subject，缺少逐领域状态明细。需增加 commit body 部分，列出每个领域的执行状态。

#### 1.1 新增 buildCommitBody 辅助函数

```typescript
/**
 * 生成 commit message body，逐行列出每个领域的执行状态
 * 格式: - {domain}: {status} [(errorType)]
 */
function buildCommitBody(results: PipelineResult): string {
  const lines = results.results.map((r) => {
    const statusLabel = r.status === "success" ? "success"
      : r.status === "failed" ? "failed"
      : "skipped";
    if (r.status === "failed" && r.errorType) {
      return `- ${r.domain}: ${statusLabel} (${r.errorType})`;
    }
    return `- ${r.domain}: ${statusLabel}`;
  });
  return lines.join("\n");
}
```

#### 1.2 修改 buildCommitMessage 拼接 body

```typescript
export function buildCommitMessage(
  date: string, results: PipelineResult,
): string {
  const total = results.results.length;
  let subject = `chore: daily update ${date} (${results.successCount}/${total} domains succeeded)`;

  // subject 行追加失败领域摘要（保持向后兼容）
  const failed = results.results.filter((r) => r.status === "failed");
  if (failed.length > 0) {
    const failedParts = failed.map((r) => {
      const errorLabel = r.errorType ?? (r.error ? extractErrorSummary(r.error) : "unknown");
      return `${r.domain} (${errorLabel})`;
    });
    subject += `, failed: ${failedParts.join(", ")}`;
  }

  // body: 逐领域状态明细
  const body = buildCommitBody(results);
  return `${subject}\n\n${body}`;
}
```

示例输出：
```
chore: daily update 2026-02-27 (3/4 domains succeeded), failed: cross-border-ecom (timeout)

- ai-tech: success
- product-startup: success
- github-trending: success
- cross-border-ecom: failed (timeout)
```

---

### Task 2: 确保 gitCommit 正确处理多行 commit message
**预估时间：** 5 分钟
**修改文件：** `scripts/pipeline/publish.ts`

当前 `gitCommit` 使用 `git commit -m message`，需确认多行 message 能正确传递。`execFile` 以数组形式传参，不经过 shell 解析，因此多行字符串（含 `\n`）可以直接作为 `-m` 参数传递给 git，无需额外处理。

验证点：编写测试确认多行 message 被完整传递给 `execFile`。

---

### Task 3: 补充 buildCommitMessage 针对 5-2 场景的单元测试
**预估时间：** 15 分钟
**修改文件：** `tests/pipeline/publish.test.ts`

在现有 `buildCommitMessage` describe 块中补充以下测试用例：

```typescript
it("should include per-domain status in commit body", () => {
  const result = makeResult({
    results: [
      { domain: "ai-tech", name: "AI技术", status: "success", duration: 100 },
      { domain: "ecom", name: "电商", status: "failed", duration: 50,
        error: "API timeout", errorType: "timeout" },
    ],
    successCount: 1,
    failedCount: 1,
  });
  const msg = buildCommitMessage(TEST_DATE, result);
  expect(msg).toContain("- ai-tech: success");
  expect(msg).toContain("- ecom: failed (timeout)");
});

it("should include skipped domains in commit body", () => {
  const result = makeResult({
    results: [
      { domain: "ai-tech", name: "AI技术", status: "success", duration: 100 },
      { domain: "ecom", name: "电商", status: "skipped", duration: 0 },
    ],
    successCount: 1,
    failedCount: 0,
    skippedCount: 1,
  });
  const msg = buildCommitMessage(TEST_DATE, result);
  expect(msg).toContain("- ai-tech: success");
  expect(msg).toContain("- ecom: skipped");
});
```

```typescript
it("should list all domains with mixed statuses", () => {
  const result = makeResult({
    results: [
      { domain: "ai-tech", name: "AI技术", status: "success", duration: 100 },
      { domain: "ecom", name: "电商", status: "failed", duration: 50,
        error: "timeout", errorType: "timeout" },
      { domain: "github", name: "GitHub", status: "skipped", duration: 0 },
      { domain: "startup", name: "创业", status: "failed", duration: 30,
        error: "parse error", errorType: "parse_error" },
    ],
    successCount: 1,
    failedCount: 2,
    skippedCount: 1,
  });
  const msg = buildCommitMessage(TEST_DATE, result);
  // subject line
  expect(msg).toContain("1/4 domains succeeded");
  expect(msg).toContain("failed: ecom (timeout), startup (parse_error)");
  // body lines
  expect(msg).toContain("- ai-tech: success");
  expect(msg).toContain("- ecom: failed (timeout)");
  expect(msg).toContain("- github: skipped");
  expect(msg).toContain("- startup: failed (parse_error)");
});

it("should have subject and body separated by blank line", () => {
  const result = makeResult();
  const msg = buildCommitMessage(TEST_DATE, result);
  const parts = msg.split("\n\n");
  expect(parts.length).toBeGreaterThanOrEqual(2);
  expect(parts[0]).toContain("chore: daily update");
});
```

---

### Task 4: 补充 gitCommit 多行 message 传递测试
**预估时间：** 5 分钟
**修改文件：** `tests/pipeline/publish.test.ts`

```typescript
it("should pass multiline message to git commit -m", async () => {
  mockExecFileSuccess("[main abc1234] chore: daily update");
  const multilineMsg = "chore: daily update 2026-02-27\n\n- ai-tech: success\n- ecom: failed (timeout)";
  await gitCommit(multilineMsg);
  expect(execFile).toHaveBeenCalledWith(
    "git",
    ["commit", "-m", multilineMsg],
    expect.any(Object),
    expect.any(Function),
  );
});
```

---

### Task 5: 补充 gitPublish 全失败跳过场景测试
**预估时间：** 5 分钟
**修改文件：** `tests/pipeline/publish.test.ts`

现有测试已覆盖 "no changes" 场景，但需补充全部领域失败时的行为验证：

```typescript
it("should skip commit when all domains failed and no files generated", async () => {
  let callCount = 0;
  vi.mocked(execFile).mockImplementation(
    (_cmd: unknown, _args: unknown, _opts: unknown, cb: unknown) => {
      callCount++;
      (cb as Function)(null, "", "");
      return {} as ReturnType<typeof execFile>;
    },
  );

  const allFailedResult = makeResult({
    results: [
      { domain: "ai-tech", name: "AI技术", status: "failed", duration: 100,
        error: "timeout", errorType: "timeout" },
      { domain: "ecom", name: "电商", status: "failed", duration: 50,
        error: "api error", errorType: "api_error" },
    ],
    successCount: 0,
    failedCount: 2,
  });

  const result = await gitPublish(TEST_DATE, allFailedResult, false);
  expect(result.filesAdded).toBe(0);
  expect(result.commitHash).toBe("");
  // 只调用了 git add + git diff，未调用 commit/push
  expect(callCount).toBe(2);
});
```

---

### Task 6: 更新现有 buildCommitMessage 测试以适配新的多行格式
**预估时间：** 10 分钟
**修改文件：** `tests/pipeline/publish.test.ts`

由于 `buildCommitMessage` 返回值从单行变为多行，现有测试中直接比较完整字符串的断言需要调整。主要影响：

- `it("should format message for all success")` — 需改为检查 subject 行而非完整字符串相等
- 其他使用 `toContain` 的测试不受影响

```typescript
// 修改前
expect(msg).toBe("chore: daily update 2026-02-27 (2/2 domains succeeded)");

// 修改后（检查 subject 行）
const subject = msg.split("\n")[0];
expect(subject).toBe("chore: daily update 2026-02-27 (2/2 domains succeeded)");
```

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `scripts/pipeline/publish.ts` | 修改 | 新增 buildCommitBody 函数，修改 buildCommitMessage 拼接多行 body |
| `tests/pipeline/publish.test.ts` | 修改 | 补充逐领域状态、skipped 状态、多行 message、全失败跳过等测试用例；调整现有断言适配多行格式 |

---

## 测试策略

### 单元测试（覆盖率目标 ≥80%）

#### buildCommitMessage 测试矩阵

| 场景 | subject 行 | body 内容 | 现有/新增 |
|------|-----------|----------|----------|
| 全部成功 | `(4/4 domains succeeded)` | 4 行 success | 现有（需调整） |
| 部分失败 | `(2/4 ...), failed: x (timeout)` | 2 success + 2 failed | 新增 |
| 全部失败 | `(0/4 ...), failed: ...` | 4 行 failed | 现有（需调整） |
| 含 skipped | `(1/3 ...)` | 1 success + 1 skipped + 1 failed | 新增 |
| 长错误信息截断 | subject 中截断 | body 中使用 errorType | 现有 |
| 无 errorType fallback | subject 中使用摘要 | body 中显示 "failed" | 现有 |

#### gitCommit 测试
- 多行 message 正确传递给 `execFile`

#### gitPublish 测试
- 全部失败 + 无文件变更 → 跳过 commit
- dry-run 模式 → commit message 包含 body 但不执行 git

### 边界测试
- 空 results 数组：`(0/0 domains succeeded)`，body 为空
- 单领域成功：subject 和 body 均只有一条记录
- errorType 为 undefined 时 body 中仅显示 "failed" 不带括号

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| FR22 | 每次管道执行生成一条 commit 记录 | gitPublish 统一执行一次 commit，无变更时跳过 |
| NFR9 | 失败时保留完整错误日志 | commit body 逐领域记录状态和错误类型 |
| NFR6 | 每日自动发布成功率 ≥99% | commit 历史可追溯每日执行状态，便于运维排查 |

---

## 完成定义 (Definition of Done)

- [ ] `buildCommitMessage` 生成多行 commit message，body 包含逐领域状态明细
- [ ] 失败领域的 body 行包含 errorType（如 `failed (timeout)`）
- [ ] 跳过领域的 body 行显示 `skipped`
- [ ] subject 行保持现有格式不变（向后兼容）
- [ ] 多行 commit message 能正确通过 `git commit -m` 传递
- [ ] 无文件变更时跳过 commit（不生成空 commit）
- [ ] 现有 publish.test.ts 测试调整后全部通过
- [ ] 新增测试覆盖逐领域状态、skipped、多行 message、全失败跳过等场景
- [ ] `pnpm test` 全部通过，覆盖率 ≥80%

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节）
- PRD：_bmad-output/planning-artifacts/prd.md（FR22、NFR6、NFR9）
- Story 5-1：_bmad-output/implementation-artifacts/stories/story-5-1.md（errorType/failedStage 基础）
- 现有发布模块：scripts/pipeline/publish.ts
- 现有发布测试：tests/pipeline/publish.test.ts
