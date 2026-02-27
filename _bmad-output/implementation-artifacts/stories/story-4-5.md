# Story 4-5: Git 自动提交与推送模块（Git Auto Commit & Push）

## Story ID
4-5

## Epic
Epic 4: Skills 自动化内容管道

## 标题
Git 自动提交与推送模块

## 描述
作为系统运维者，
我想要系统能够将生成的 Markdown 文件自动提交并推送至 Git 仓库，
以便触发站点自动构建和部署流程。

## 优先级
P0

## 复杂度
低

## 状态
done

## 依赖
- Story 4-1: 管道入口与领域调度框架（已完成，提供 scripts/pipeline/ 基础框架和 PipelineResult 类型）
- Story 4-4: Markdown 格式化输出模块（已完成，生成 src/content/daily/{date}/*.md 文件）
- Story 1-2: Content Collections Schema 与领域配置（已完成，提供 src/config/domains.ts）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 发布模块接口与 process.ts 集成
**Given** scripts/pipeline/process.ts 中存在 stubPublish 占位函数
**When** 发布模块 scripts/pipeline/publish.ts 实现完成
**Then** process.ts 中的 stubPublish 被替换为对 gitPublish 的真实调用
**And** gitPublish 函数签名为 `gitPublish(date: string, results: PipelineResult, dryRun: boolean): Promise<PublishResult>`
**And** 返回的 PublishResult 包含 commitHash、filesAdded、commitMessage 字段
**And** dryRun 模式下生成 commit message 但不执行 git 命令，仅输出预览日志
**And** 发布阶段失败时抛出结构化错误，由 run.ts 的顶层逻辑捕获

### AC-2: Git Add 暂存新生成的 Markdown 文件
**Given** 格式化模块已生成当天所有领域的 Markdown 文件到 src/content/daily/{date}/
**When** gitPublish 被调用
**Then** 模块执行 `git add src/content/daily/{date}/` 将新生成的 Markdown 文件加入暂存区
**And** 仅暂存 src/content/daily/ 目录下的变更，不暂存其他文件
**And** 暂存区无变更时（无新文件或文件内容未变化），跳过 commit 和 push，返回空结果
**And** git add 失败时抛出包含命令输出和退出码的结构化错误

### AC-3: Git Commit 生成结构化提交信息
**Given** 暂存区包含新生成的 Markdown 文件
**When** 执行 git commit
**Then** commit message 格式为 `chore: daily update {date} ({successCount}/{totalCount} domains succeeded)`
**And** 当存在失败领域时，commit message 追加失败摘要：`, failed: {slug1} ({errorType1}), {slug2} ({errorType2})`
**And** commit message 示例（全部成功）：`chore: daily update 2026-02-26 (4/4 domains succeeded)`
**And** commit message 示例（部分失败）：`chore: daily update 2026-02-26 (3/4 domains succeeded, failed: ecommerce (timeout))`
**And** commit 成功后返回 commit hash（短格式，7 位）

### AC-4: Git Push 推送至远程仓库
**Given** commit 已成功创建
**When** 执行 git push
**Then** 变更推送至远程 main 分支（`git push origin main`）
**And** push 成功后输出确认日志：`[publish] 推送成功: {commitHash}`
**And** push 失败时重试最多 3 次，每次间隔 2 秒
**And** 3 次重试均失败后抛出包含最后一次错误信息的结构化错误
**And** 重试过程中输出日志：`[publish] push 失败，重试 {n}/3...`

### AC-5: Dry-Run 模式行为
**Given** 管道以 --dry-run 模式执行
**When** gitPublish 被调用且 dryRun 为 true
**Then** 生成 commit message 内容但不执行任何 git 命令
**And** 输出日志：`[publish] (dry-run) 将提交: {commitMessage}`
**And** 返回 PublishResult 中 commitHash 为空字符串，filesAdded 为 0

### AC-6: 无变更时的幂等处理
**Given** 管道重复执行同一天的任务，且文件内容未发生变化
**When** git add 后暂存区无变更
**Then** 跳过 commit 和 push 操作
**And** 输出日志：`[publish] 无文件变更，跳过提交`
**And** 返回 PublishResult 中 commitHash 为空字符串，filesAdded 为 0
**And** 不生成空 commit

### AC-7: 日志输出与可观测性
**Given** 发布模块正在执行
**When** 发布过程中发生各类事件
**Then** 正常执行时输出日志：暂存文件数、commit message、push 目标分支
**And** 日志格式与 pipeline 风格一致（使用 `    [publish]` 前缀）
**And** git 命令执行失败时日志包含命令名称、退出码和 stderr 输出
**And** 敏感信息（如 Git token）不出现在日志中

---

## 技术任务列表 (Technical Tasks)

### Task 1: 定义发布模块类型接口
**预估时间：** 5 分钟
- 在 scripts/pipeline/types.ts 中新增发布相关类型定义
- 定义 `PublishResult` 接口：commitHash(string)、filesAdded(number)、commitMessage(string)
- 定义 `GitCommandError` 接口：command(string)、exitCode(number)、stderr(string)

### Task 2: 实现 Git 命令执行工具函数
**预估时间：** 15 分钟
- 创建 scripts/pipeline/publish.ts 发布模块
- 实现 `execGit(args: string[]): Promise<string>` 封装 git 命令执行
  - 使用 Node.js child_process.execFile API
  - 捕获 stdout 和 stderr
  - 非零退出码时抛出 GitCommandError
  - 过滤 stderr 中的敏感信息（token、密码）
- 实现 `sleep(ms: number): Promise<void>` 用于重试间隔

### Task 3: 实现 Git Add 暂存函数
**预估时间：** 10 分钟
- 实现 `gitAdd(date: string): Promise<number>` 暂存指定日期目录的文件
  - 执行 `git add src/content/daily/{date}/`
  - 执行 `git diff --cached --name-only` 获取暂存文件列表
  - 返回暂存文件数量
  - 暂存文件数为 0 时表示无变更

### Task 4: 实现 Commit Message 生成函数
**预估时间：** 10 分钟
- 实现 `buildCommitMessage(date: string, results: PipelineResult): string` 生成提交信息
  - 基础格式：`chore: daily update {date} ({successCount}/{totalCount} domains succeeded)`
  - 存在失败领域时追加：`, failed: {slug} ({errorType})`
  - 错误类型从 DomainProcessResult.error 中提取关键词（timeout、api_error 等）
  - 截断过长的错误信息（单个错误摘要 <=30 字符）

### Task 5: 实现 Git Commit 和 Push 函数
**预估时间：** 15 分钟
- 实现 `gitCommit(message: string): Promise<string>` 执行提交
  - 执行 `git commit -m "{message}"`
  - 从输出中解析 commit hash（短格式 7 位）
  - 返回 commit hash
- 实现 `gitPush(maxRetries: number, retryDelay: number): Promise<void>` 推送至远程
  - 执行 `git push origin main`
  - 失败时重试，最多 maxRetries 次（默认 3），间隔 retryDelay ms（默认 2000）
  - 每次重试输出日志
  - 全部失败后抛出最后一次的错误

### Task 6: 实现发布主函数
**预估时间：** 10 分钟
- 实现 `gitPublish(date: string, results: PipelineResult, dryRun: boolean): Promise<PublishResult>` 主函数
  - 调用 gitAdd 暂存文件
  - 无变更时提前返回空结果
  - 调用 buildCommitMessage 生成提交信息
  - dryRun 模式：输出预览日志，不执行 git commit/push
  - 正常模式：调用 gitCommit + gitPush
  - 返回 PublishResult（commitHash、filesAdded、commitMessage）
  - 输出发布完成日志

### Task 7: 集成到管道流程
**预估时间：** 10 分钟
- 修改 scripts/pipeline/process.ts
  - 移除 stubPublish 函数定义
  - 注意：publish 阶段不在 processDomain 中逐领域调用，而是在 run.ts 中所有领域处理完成后统一调用一次
- 修改 scripts/pipeline/run.ts
  - 在 runPipeline 函数中，所有领域处理完成后调用 gitPublish
  - 传递 date、PipelineResult、dryRun 参数
  - publish 失败时记录错误但不改变已有的领域处理结果

### Task 8: 编写单元测试
**预估时间：** 25 分钟
- 测试文件：tests/pipeline/publish.test.ts
- 测试 buildCommitMessage
  - 全部成功：验证格式 `chore: daily update {date} (4/4 domains succeeded)`
  - 部分失败：验证包含失败领域摘要
  - 全部失败：验证格式正确
  - 错误信息截断：验证超长错误被截断
- 测试 gitAdd（mock execGit）
  - 有变更：返回暂存文件数 > 0
  - 无变更：返回 0
  - 命令失败：抛出 GitCommandError
- 测试 gitCommit（mock execGit）
  - 正常提交：返回 7 位 commit hash
  - 提交失败：抛出错误
- 测试 gitPush（mock execGit）
  - 正常推送：成功返回
  - 首次失败后重试成功：验证重试逻辑
  - 全部重试失败：验证抛出最后一次错误
- 测试 gitPublish 主函数
  - 正常流程：验证 add → commit → push 调用顺序
  - 无变更：验证跳过 commit 和 push
  - dryRun 模式：验证不调用 git 命令
  - publish 失败：验证抛出结构化错误
- 覆盖率目标 ≥80%

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR6 | 每日自动发布成功率 ≥99% | push 失败重试 3 次 + 无变更幂等跳过，最大化发布成功率 |
| NFR7 | 单领域失败不影响其他领域 | publish 在所有领域处理完成后统一执行，成功领域的文件正常提交 |
| NFR9 | 失败时保留完整错误日志 | git 命令失败时输出命令名称、退出码和 stderr，commit message 包含失败领域摘要 |

---

## 完成定义 (Definition of Done)

- [ ] scripts/pipeline/types.ts 新增 PublishResult 和 GitCommandError 类型定义
- [ ] scripts/pipeline/publish.ts 实现 gitPublish 主函数及辅助函数（execGit、gitAdd、gitCommit、gitPush、buildCommitMessage）
- [ ] commit message 格式：`chore: daily update {date} ({n}/{total} domains succeeded)`
- [ ] 失败领域信息包含在 commit message 中（FR22）
- [ ] push 失败重试最多 3 次，间隔 2 秒
- [ ] 无变更时不生成空 commit（幂等性）
- [ ] dryRun 模式不执行任何 git 命令
- [ ] process.ts 中 stubPublish 被移除
- [ ] run.ts 中所有领域处理完成后统一调用 gitPublish
- [ ] 单元测试覆盖核心逻辑，覆盖率 ≥80%
- [ ] 所有日志输出格式与 pipeline 风格一致（`    [publish]` 前缀）
- [ ] `pnpm run pipeline` 可成功执行，生成的 commit 包含正确的 message 格式

---

## 设计决策说明

### Publish 调用时机：统一调用 vs 逐领域调用

当前 process.ts 中 stubPublish 在每个领域的 processDomain 内调用。但实际实现中，Git commit + push 应在所有领域处理完成后统一执行一次，原因：

1. **原子性**：一次 commit 包含所有领域的 Markdown 文件，避免多次零碎提交
2. **可观测性**：单条 commit message 汇总所有领域状态（FR22），便于运维排查
3. **效率**：减少 git push 次数，降低网络失败概率
4. **一致性**：与 epics-and-stories.md 中 Story 4.5 的验收标准一致（"模块执行 git add 将新生成的 Markdown 文件加入暂存区"→ 统一暂存所有文件）

因此实现时需要：
- 从 process.ts 的 processDomain 中移除 stubPublish 调用
- 在 run.ts 的 runPipeline 中，所有领域循环结束后调用 gitPublish
- gitPublish 接收完整的 PipelineResult 以生成汇总 commit message

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节，publish.ts 模块定义，Git 自动推送规范）
- PRD：_bmad-output/planning-artifacts/prd.md（FR20 自动推送 Git 触发构建，FR22 Git commit 可观测性）
- Epic 分解：_bmad-output/planning-artifacts/epics-and-stories.md（Story 4.5）
- 管道入口：scripts/pipeline/run.ts（Story 4-1 实现，runPipeline 主流程）
- 管道类型：scripts/pipeline/types.ts（现有类型定义，PipelineResult 等）
- 格式化模块：scripts/pipeline/format.ts（Story 4-4 实现，生成 Markdown 文件）
- 占位函数：scripts/pipeline/process.ts（待移除的 stubPublish）
- 领域配置：src/config/domains.ts（领域 slug、name 等元数据）
