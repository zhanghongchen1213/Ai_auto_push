---
description: "自动化开发流程：识别 backlog 状态的 story，依次执行 create-story → dev-story → code-review，完成整个 epic 后通知用户"
---

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS:

<steps CRITICAL="TRUE">

## 1. 解析 Sprint Status

读取 `@_bmad-output/implementation-artifacts/sprint-status.yaml` 文件，解析 `development_status` 部分：

- Epic 状态: `backlog` | `in-progress` | `done`
- Story 状态: `backlog` | `ready-for-dev` | `in-progress` | `review` | `done`

## 2. 查找下一个待处理 Story

按优先级查找：

1. 优先处理 `in-progress` epic 中状态为 `backlog` 或 `ready-for-dev` 的 story
2. 若无 in-progress epic，将第一个 `backlog` epic 标记为 `in-progress` 并处理其首个 story
3. 若所有 epic 都是 `done`，通知用户所有开发任务已完成并结束

## 3. 执行 Story 开发流程（使用 Task 工具）

对每个待处理 story，使用 Task 工具启动独立子代理依次执行以下流程：

### 3.1 创建 Story 详情

```
Task(
  subagent_type="general-purpose",
  prompt="执行 /bmad_bmm_create-story 为 story [story-id]，从 epic 文件提取详情并创建完整 story 文件"
)
```

完成后 story 状态变为 `ready-for-dev`

### 3.2 开发 Story

```
Task(
  subagent_type="general-purpose",
  prompt="执行 /bmad_bmm_dev-story 为 story [story-id]，实现任务/子任务，编写测试，验证验收标准"
)
```

完成后 story 状态变为 `review`

### 3.3 代码审查

```
Task(
  subagent_type="general-purpose",
  prompt="执行 /bmad_bmm_code-review 为 story [story-id]，进行对抗性审查，发现 3-10 个问题，自动修复（需用户批准）"
)
```

完成后 story 状态变为 `done`

## 4. 循环与通知

1. 完成一个 story 后，返回步骤 2 查找下一个 story
2. 当 epic 所有 story 完成时：
   - 更新 epic 状态为 `done`
   - **通知用户：Epic [名称] 已完成！**
   - 询问用户是否继续下一个 epic

## 5. 状态同步

每完成一个步骤后，立即更新 `sprint-status.yaml` 中对应项的状态

</steps>
