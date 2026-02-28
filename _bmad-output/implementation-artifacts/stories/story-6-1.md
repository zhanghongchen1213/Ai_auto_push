# Story 6-1: 商业机会主编排 Skill 与执行边界

## Story ID
6-1

## Epic
Epic 6: 商业机会日报全自主链路

## 标题
商业机会主编排 Skill 与执行边界

## 描述
作为用户，
我想要只触发一次目标 Skill，
以便系统全自主完成当日商业机会日报（检索、筛选、生成、落盘、推送五阶段），无需二次人工输入。

## 优先级
P0

## 复杂度
高

## 状态
ready

## 依赖
- Epic 4 全部完成：资讯管道架构（run.ts 调度、process.ts 处理、format.ts 输出、publish.ts 推送）
- Epic 5 全部完成：失败隔离、可观测日志、手动恢复机制
- 现有 SKILL.md（`.claude/skills/ai-auto-push/SKILL.md`）：资讯管道 Skill 模板与执行流程参考

---

## 现状分析

### 已有的资讯管道 Skill 架构
当前 `.claude/skills/ai-auto-push/SKILL.md` 实现了资讯日报的全自主管道：
- 五步流程：初始化 → 抓取 → 筛选摘要 → 格式化输出 → 发布
- 支持 4 个领域并行子 agent 执行
- Git 自动 commit + push，禁止人工确认
- 错误处理表覆盖各类失败场景

### 商业机会日报与资讯日报的差异

| 维度 | 资讯日报 | 商业机会日报 |
|------|---------|-------------|
| 数据源 | 专业站点 + RSS + GitHub + Brave + WebSearch | 社交平台 + 社区论坛 + 应用商店 + 交易求购 + 投诉平台 |
| 处理逻辑 | 抓取 → 日期过滤 → 去重评分 → 摘要 | 检索 → 归一化 → 语义识别 → 多维评分 → 决策 |
| 输出 | 多领域多文件 | 单文件 `commercial-opportunity.md` |
| 阶段数 | 5 阶段（fetch/filter/format/write/publish） | 5 阶段（检索/筛选/生成/落盘/推送） |
| 人工交互 | 触发后零交互 | 触发后零交互（FR36, NFR22） |

### 本 Story 的范围
本 Story 聚焦于**主编排 Skill 文件的创建与五阶段执行框架的定义**，不实现各阶段的具体业务逻辑（由 Story 6-2 ~ 6-7 分别实现）。具体包括：
1. 创建商业机会主编排 Skill 文件
2. 定义五阶段串行执行框架与阶段完成标记
3. 定义子 Skill 接口契约（输入/输出类型）
4. 实现阶段日志与完成标记机制
5. 确保单次触发后全流程零人工交互

---

## 验收标准 (Acceptance Criteria)

### AC-1: 单次触发全自主执行
**Given** 主编排 Skill 文件已创建并配置
**When** 用户执行一次触发命令（如 `/commercial-opportunity` 或 `运行商业机会管道`）
**Then** 系统自动依次执行检索、筛选、生成、落盘、推送五个阶段
**And** 全程无需用户二次输入或确认（NFR22）

### AC-2: 五阶段串行执行与日志标记
**Given** 管道开始执行
**When** 每个阶段完成时
**Then** 在运行日志中输出阶段完成标记，格式为 `[STAGE_COMPLETE] {阶段名} | duration={耗时}ms | status={success|failed}`
**And** 五个阶段依次为：retrieve（检索）、screen（筛选）、generate（生成）、persist（落盘）、publish（推送）

### AC-3: 子 Skill 接口契约定义
**Given** 主编排 Skill 定义了阶段接口
**When** 后续 Story（6-2 ~ 6-7）实现各阶段
**Then** 每个阶段的输入/输出类型已在 Skill 文件中明确定义
**And** 阶段间数据通过约定的中间变量传递

### AC-4: 阶段失败不静默吞没
**Given** 某个阶段执行失败
**When** 错误被捕获
**Then** 日志输出 `[STAGE_FAILED] {阶段名} | error={错误摘要}`
**And** 后续阶段不执行（串行依赖，非独立领域）
**And** 管道以失败状态结束并输出汇总

### AC-5: Skill 文件可被 Claude Code 正确识别和触发
**Given** Skill 文件位于 `.claude/skills/commercial-opportunity/SKILL.md`
**When** 用户输入触发关键词
**Then** Claude Code 能正确匹配并加载该 Skill
**And** Skill 的 description 包含足够的触发词

---

## 技术任务列表 (Technical Tasks)

### Task 1: 创建商业机会 Skill 目录与元数据
**预估时间：** 5 分钟
**新建文件：** `.claude/skills/commercial-opportunity/SKILL.md`

创建 Skill 文件的 frontmatter 元数据：

```yaml
---
name: commercial-opportunity
description: "商业机会日报全自主管道：单次触发后自动完成多源检索、双阶段筛选、日报生成、文件落盘、Git推送五阶段。当用户说"运行商业机会管道"、"商业机会日报"、"commercial opportunity"、"/commercial-opportunity"时触发。"
---
```

触发词设计需覆盖中英文场景，确保 Claude Code 能正确匹配。

---

### Task 2: 定义五阶段执行框架
**预估时间：** 20 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

在 Skill 文件中定义完整的五阶段串行执行流程：

```markdown
## 执行流程

<steps CRITICAL="TRUE">

### Step 0: 初始化
1. 设置 `PROJECT_ROOT=/Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push`
2. 获取今天日期（UTC+8），格式 `YYYY-MM-DD`，记为 `{date}`
3. 用 TodoWrite 创建任务清单（5 个阶段各一个任务）
4. 用 Bash 确认输出目录存在：`mkdir -p {PROJECT_ROOT}/src/content/daily/{date}`
5. 输出 `[PIPELINE_START] commercial-opportunity | date={date}`

### Step 1: 检索（Retrieve）
- 阶段标识：`retrieve`
- 输入：`{date}`、数据源配置
- 输出：`rawCandidates[]` — 原始候选线索数组
- 完成标记：`[STAGE_COMPLETE] retrieve | duration={ms} | candidates={数量}`
- 具体实现：由 Story 6-2 填充

### Step 2: 筛选（Screen）
- 阶段标识：`screen`
- 输入：`rawCandidates[]`
- 输出：`scoredCandidates[]`、`finalProposal`
- 完成标记：`[STAGE_COMPLETE] screen | duration={ms} | scored={数量} | final={有/无}`
- 具体实现：由 Story 6-3 + 6-4 填充

### Step 3: 生成（Generate）
- 阶段标识：`generate`
- 输入：`scoredCandidates[]`、`finalProposal`
- 输出：`markdownContent` — 完整 Markdown 文档字符串
- 完成标记：`[STAGE_COMPLETE] generate | duration={ms} | bytes={字节数}`
- 具体实现：由 Story 6-5 填充

### Step 4: 落盘（Persist）
- 阶段标识：`persist`
- 输入：`markdownContent`、`{date}`
- 输出：文件写入 `src/content/daily/{date}/commercial-opportunity.md`
- 完成标记：`[STAGE_COMPLETE] persist | duration={ms} | path={文件路径}`
- 具体实现：由 Story 6-5 填充

### Step 5: 推送（Publish）
- 阶段标识：`publish`
- 输入：`{date}`、落盘文件路径
- 输出：Git commit + push 完成
- 完成标记：`[STAGE_COMPLETE] publish | duration={ms} | commit={hash}`
- 具体实现：由 Story 6-7 填充

</steps>
```

关键设计：阶段间严格串行，前一阶段失败则终止后续阶段。

---

### Task 3: 定义阶段间数据契约
**预估时间：** 15 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

在 Skill 文件中定义各阶段的输入/输出数据结构：

```markdown
## 数据契约

### RawCandidate（检索阶段输出）
- `title`: string — 痛点标题
- `sourceUrl`: string — 来源 URL
- `sourceCategory`: "social" | "forum" | "appstore" | "marketplace" | "complaint"
- `rawText`: string — 原文片段（≤500 字）
- `timestamp`: string — 发现时间 ISO8601
- `platform`: string — 具体平台名称

### ScoredCandidate（筛选阶段输出）
在 RawCandidate 基础上增加：
- `scores.blankness`: number (0-20) — 空白度
- `scores.rigidity`: number (0-20) — 刚需程度
- `scores.bigCorpAvoidance`: number (0-20) — 大厂回避度
- `scores.aiSolvability`: number (0-20) — AI 可解度
- `scores.monetization`: number (0-20) — 变现可行度
- `scores.total`: number (0-100) — 综合评分
- `eliminationReason`: string | null — 淘汰理由

### FinalProposal（决策阶段输出）
- `candidate`: ScoredCandidate — 最终选中候选（total ≥ 80）
- `evidenceChain.sourceUrls`: string[] — 来源 URL 列表
- `evidenceChain.quotes`: string[] — 关键引文
- `evidenceChain.scoringBasis`: string — 评分依据
- `status`: "commercializable" | "no_viable_proposal"

### DailyReport（生成阶段输出）
- `markdownContent`: string — 完整 Markdown 文档
- `metadata.date`: string
- `metadata.retrievedCount`: number
- `metadata.scoredCount`: number
- `metadata.eliminatedCount`: number
- `metadata.finalStatus`: "commercializable" | "no_viable_proposal"
```

---

### Task 4: 实现阶段日志与完成标记机制
**预估时间：** 10 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

定义统一的日志格式规范：

**阶段生命周期：**
```
[STAGE_START] {阶段名} | time={ISO8601}
[STAGE_COMPLETE] {阶段名} | duration={ms} | status=success | {阶段特定指标}
[STAGE_FAILED] {阶段名} | duration={ms} | error={错误摘要}
```

**管道生命周期：**
```
[PIPELINE_START] commercial-opportunity | date={date} | time={ISO8601}
[PIPELINE_COMPLETE] commercial-opportunity | date={date} | duration={ms} | stages_completed={N}/5
[PIPELINE_FAILED] commercial-opportunity | date={date} | duration={ms} | failed_stage={阶段名} | error={摘要}
```

---

### Task 5: 定义错误处理与失败策略
**预估时间：** 10 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

| 阶段 | 失败场景 | 处理方式 |
|------|---------|---------|
| retrieve | 数据源全部不可达 | 输出 `[STAGE_FAILED]`，管道终止，不生成文件 |
| retrieve | 部分数据源失败 | 记录失败源，继续用已获取数据进入下一阶段 |
| screen | AI 评分调用失败 | 重试 1 次，仍失败则管道终止 |
| generate | Markdown 生成异常 | 管道终止，不落盘 |
| persist | 文件写入失败 | 检查目录，重试 1 次，仍失败则管道终止 |
| publish | Git push 失败 | 最多重试 2 次，记录错误码 |

**核心原则：** 商业机会管道为单文件串行流程（非多领域并行），任一关键阶段失败即终止，避免产出不完整日报。

---

### Task 6: 定义 Git 发布规范
**预估时间：** 5 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

**Commit Message 格式：**
```
chore: commercial opportunity daily {date} ({status})
```

其中 `{status}` 为 `commercializable` 或 `no_viable_proposal`。

**Git 操作（自动执行，禁止人工确认）：**
```bash
cd {PROJECT_ROOT} && \
git add src/content/daily/{date}/commercial-opportunity.md && \
git commit -m "chore: commercial opportunity daily {date} ({status})" && \
git push
```

push 失败时最多重试 2 次。

---

### Task 7: 定义汇总报告模板
**预估时间：** 5 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

管道执行完成后，向用户输出汇总：

| 阶段 | 状态 | 耗时 | 关键指标 |
|------|------|------|---------|
| 检索 | 成功/失败 | Nms | 候选数: X，来源类别: Y |
| 筛选 | 成功/失败 | Nms | 评分数: X，淘汰数: Y |
| 生成 | 成功/失败 | Nms | 文档大小: X bytes |
| 落盘 | 成功/失败 | Nms | 路径: src/content/daily/{date}/commercial-opportunity.md |
| 推送 | 成功/失败 | Nms | commit: {hash} |

**最终结论：** {可商业化方案标题} 或 "今日无可用方案"

---

### Task 8: 编写 Skill 触发与识别测试
**预估时间：** 10 分钟
**验证方式：** 手动测试

验证以下触发词均能正确匹配 Skill：
1. `/commercial-opportunity`
2. `运行商业机会管道`
3. `商业机会日报`
4. `commercial opportunity`
5. `执行商业机会检索`

验证方法：在 Claude Code 中输入上述关键词，确认加载了 `commercial-opportunity` Skill 而非 `ai-auto-push` Skill。

---

### Task 9: 编写阶段占位实现（Stub）
**预估时间：** 15 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

为每个阶段编写最小占位实现，使主编排框架可以端到端运行：

- **Step 1 占位：** 输出空 `rawCandidates = []`，日志标记 `candidates=0`
- **Step 2 占位：** 输出 `finalProposal = null`（无可用方案），日志标记 `final=无`
- **Step 3 占位：** 生成包含"今日暂无商业机会数据（管道框架验证中）"的最小 Markdown
- **Step 4 占位：** 写入占位 Markdown 到目标路径
- **Step 5 占位：** 执行 Git add + commit + push

占位 Markdown 模板：

```markdown
---
title: "商业机会日报"
domain: "commercial-opportunity"
date: "{YYYY-MM-DD}"
finalStatus: "no_viable_proposal"
retrievedCount: 0
scoredCount: 0
eliminatedCount: 0
generatedAt: "{ISO8601}"
---

## 今日概况

今日暂无商业机会数据（管道框架验证中）。

## 检索领域

暂无（占位）

## 无价值方案

暂无

## 最终方案

今日无可用方案。
```

这确保 Story 6-1 完成后，管道框架可以端到端运行并验证五阶段日志标记。

---

### Task 10: 端到端框架验证测试
**预估时间：** 10 分钟
**验证方式：** 手动执行

1. 触发商业机会管道
2. 验证五个 `[STAGE_COMPLETE]` 日志标记依次输出
3. 验证 `[PIPELINE_COMPLETE]` 日志标记输出且 `stages_completed=5/5`
4. 验证 `src/content/daily/{date}/commercial-opportunity.md` 文件已生成
5. 验证 Git commit 已推送且 commit message 格式正确
6. 验证全程无人工交互提示

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `.claude/skills/commercial-opportunity/SKILL.md` | 新建 | 商业机会主编排 Skill 文件，含五阶段框架、数据契约、日志规范、错误处理、占位实现 |

---

## 测试策略

### 框架验证测试（手动）
- 触发 Skill 后五阶段依次执行，每阶段输出 `[STAGE_START]` 和 `[STAGE_COMPLETE]`
- 管道完成后输出 `[PIPELINE_COMPLETE]` 且 `stages_completed=5/5`
- 占位 Markdown 文件成功写入目标路径
- Git commit + push 自动完成

### 失败路径测试（手动）
- 模拟 persist 阶段写入失败（如目标目录不存在且 mkdir 失败）
- 验证输出 `[STAGE_FAILED]` 且后续阶段不执行
- 验证 `[PIPELINE_FAILED]` 包含失败阶段名称

### 触发识别测试（手动）
- 验证 5 个触发词均能正确加载 Skill
- 验证不会与 `ai-auto-push` Skill 冲突

### 零交互验证
- 从触发到完成，计数所有人工交互提示
- 预期结果：人工交互步骤数 = 0（NFR22）

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| FR36 | 单次触发全自主执行五阶段 | 主编排 Skill 串行执行框架 + Git 自动推送 |
| NFR22 | 自治流程人工交互步骤数 = 0 | 所有阶段自动执行，Git push 禁止人工确认 |
| FR28 | 主编排 Skill 与子 Skill 配置 | Skill 文件结构与阶段接口定义 |
| FR33 | 日报文档生成 | 占位实现验证文件生成路径 |
| FR34 | 日报落盘路径 | 定义输出路径 `src/content/daily/{date}/commercial-opportunity.md` |
| FR37 | 自动推送 Git | 发布阶段自动 commit + push |

---

## 完成定义 (Definition of Done)

- [ ] `.claude/skills/commercial-opportunity/SKILL.md` 文件已创建
- [ ] Skill frontmatter 包含 name、description 和触发词
- [ ] 五阶段串行执行框架已定义（retrieve → screen → generate → persist → publish）
- [ ] 阶段间数据契约已定义（RawCandidate、ScoredCandidate、FinalProposal、DailyReport）
- [ ] 阶段日志标记格式已定义（`[STAGE_START]`、`[STAGE_COMPLETE]`、`[STAGE_FAILED]`）
- [ ] 管道日志标记格式已定义（`[PIPELINE_START]`、`[PIPELINE_COMPLETE]`、`[PIPELINE_FAILED]`）
- [ ] 错误处理策略已定义（串行依赖，关键阶段失败即终止）
- [ ] Git 发布规范已定义（commit message 格式、自动 push、重试策略）
- [ ] 占位实现使管道可端到端运行
- [ ] 手动触发后五阶段日志标记依次输出
- [ ] 生成的占位文件写入正确路径
- [ ] Git commit + push 自动完成，无人工交互
- [ ] 触发词不与 `ai-auto-push` Skill 冲突

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节）
- PRD：_bmad-output/planning-artifacts/prd.md（FR28-FR37、NFR16-NFR22）
- Epic 分解：_bmad-output/planning-artifacts/epics.md（Epic 6 全部 Story）
- 现有资讯 Skill：.claude/skills/ai-auto-push/SKILL.md（架构参考）
- Sprint 状态：_bmad-output/implementation-artifacts/sprint-status.yaml
