# Story 6-3: 双阶段筛选与评分模型执行

## Story ID
6-3

## Epic
Epic 6: 商业机会日报全自主链路

## 标题
双阶段筛选与评分模型执行

## 描述
作为系统，
我想要对候选执行语义识别与多维评分，
以便每日可筛出最高价值机会。

## 优先级
P0

## 复杂度
高

## 状态
ready-for-dev

## 依赖
- Story 6-2 已完成：多源检索与归一化已实现，rawCandidates 数组可用
- SKILL.md 数据契约已定义：ScoredCandidate 结构
- 关联需求：FR30

---

## 现状分析

### Story 6-1/6-2 留下的 Stub
SKILL.md 中 Step 2（筛选阶段）当前为占位实现：

```
scoredCandidates = []
finalProposal = { status: "no_viable_proposal", candidate: null, evidenceChain: null }
```

本 Story 需要将此 stub 替换为真实的双阶段筛选与评分逻辑，输出 `scoredCandidates[]`。

注意：`finalProposal` 的确认逻辑由 Story 6-4 负责，本 Story 仅负责评分产出。

### 目标数据契约（来自 SKILL.md）

**输入：** `rawCandidates[]`（RawCandidate 数组，来自 Step 1）

**输出：** `scoredCandidates[]`（ScoredCandidate 数组）

```
ScoredCandidate（在 RawCandidate 基础上增加）:
  scores.blankness: number (0-20) — 空白度
  scores.rigidity: number (0-20) — 刚需程度
  scores.bigCorpAvoidance: number (0-20) — 大厂回避度
  scores.aiSolvability: number (0-20) — AI 可解度
  scores.monetization: number (0-20) — 变现可行度
  scores.total: number (0-100) — 综合评分
  eliminationReason: string | null — 淘汰理由
```

### FR30 要求
系统可以执行双阶段筛选（语义模式识别 → 多维评分），并保存评分明细（空白度、刚需程度、大厂回避度、AI 可解度、变现可行度）。

---

## 双阶段筛选架构

### 第一阶段：语义模式识别（快速过滤）

**目标：** 从 rawCandidates 中快速淘汰明显不符合"小众痛点"模式的候选，减少第二阶段评分负担。

**语义模式定义：**

| 模式 | 描述 | 匹配信号 |
|------|------|---------|
| pain-signal | 用户明确表达痛点 | "太难用"、"求推荐"、"有没有替代"、"为什么没有" |
| unmet-demand | 需求未被满足 | "求购"、"定制"、"有没有人做"、"功能缺失" |
| price-complaint | 价格不满 | "太贵了"、"有没有免费的"、"求破解" |
| quality-complaint | 质量投诉 | "差评"、"不好用"、"踩坑"、"吐槽" |

**淘汰规则：**
- 候选的 `rawText` 未匹配任何语义模式 → 淘汰，`eliminationReason = "无痛点语义信号"`
- 候选的 `rawText` 为纯广告/营销内容（含"优惠"、"限时"、"点击购买"等营销关键词且无痛点信号） → 淘汰，`eliminationReason = "营销内容，非真实痛点"`
- 候选的 `rawText` 长度 < 20 字（信息量不足） → 淘汰，`eliminationReason = "信息量不足"`

**输出：** 通过第一阶段的候选进入第二阶段；被淘汰的候选直接标记 `scores.total = 0` 并记录 `eliminationReason`。

### 第二阶段：五维评分模型

**目标：** 对通过第一阶段的候选进行精细化多维评分。

**评分维度定义：**

#### 1. 空白度（blankness, 0-20）
评估该痛点领域是否缺乏现有解决方案。

| 分值 | 标准 |
|------|------|
| 16-20 | 搜索不到任何现有工具/产品解决此痛点 |
| 11-15 | 仅有 1-2 个不成熟的解决方案 |
| 6-10 | 有解决方案但用户普遍不满意 |
| 0-5 | 已有成熟产品覆盖 |

#### 2. 刚需程度（rigidity, 0-20）
评估用户对该痛点的迫切程度。

| 分值 | 标准 |
|------|------|
| 16-20 | 用户反复提及、多平台出现、影响核心工作流 |
| 11-15 | 用户主动求助、愿意付费解决 |
| 6-10 | 用户抱怨但可忍受 |
| 0-5 | 偶尔提及、非核心需求 |

#### 3. 大厂回避度（bigCorpAvoidance, 0-20）
评估大厂进入该领域的可能性。

| 分值 | 标准 |
|------|------|
| 16-20 | 极度垂直/小众，大厂无商业动力进入 |
| 11-15 | 细分领域，大厂短期不会关注 |
| 6-10 | 大厂可能作为附属功能覆盖 |
| 0-5 | 大厂核心赛道或已有布局 |

#### 4. AI 可解度（aiSolvability, 0-20）
评估该痛点能否通过 AI 技术有效解决。

| 分值 | 标准 |
|------|------|
| 16-20 | AI 可直接解决核心痛点（如文本处理、数据分析、自动化） |
| 11-15 | AI 可显著提升效率或降低门槛 |
| 6-10 | AI 可辅助但非核心解决手段 |
| 0-5 | 痛点本质非技术问题，AI 难以介入 |

#### 5. 变现可行度（monetization, 0-20）
评估该痛点对应产品的商业化潜力。

| 分值 | 标准 |
|------|------|
| 16-20 | 用户已表达付费意愿，客单价可观 |
| 11-15 | 可通过 SaaS 订阅或按次付费变现 |
| 6-10 | 可通过增值服务或广告变现 |
| 0-5 | 变现路径不清晰 |

**综合评分：** `scores.total = blankness + rigidity + bigCorpAvoidance + aiSolvability + monetization`（满分 100）

**评分后淘汰：** `scores.total < 40` 的候选标记 `eliminationReason = "综合评分过低({total}/100)"`

---

## 实现方案：替换 SKILL.md Step 2 Stub

### 替换位置
SKILL.md 中 `### Step 2: 筛选（Screen）` 下的 `**TODO — Stub 实现（待 Story 6-3 + 6-4 填充）：**` 区块。

### 替换后的伪代码

```
输出 [STAGE_START] screen | time={ISO8601}
记录 stageStartTime

// === 第一阶段：语义模式识别 ===

painPatterns = ["太难用", "求推荐", "有没有替代", "为什么没有",
                "求购", "定制", "有没有人做", "功能缺失",
                "太贵了", "有没有免费的", "求破解",
                "差评", "不好用", "踩坑", "吐槽", "求助", "求替代"]
adPatterns = ["优惠", "限时", "点击购买", "折扣", "促销", "领券"]

passedCandidates = []
eliminatedCandidates = []

for each candidate in rawCandidates:
    scored = { ...candidate, scores: {}, eliminationReason: null }

    // 信息量检查
    if candidate.rawText.length < 20:
        scored.scores = { blankness:0, rigidity:0, bigCorpAvoidance:0, aiSolvability:0, monetization:0, total:0 }
        scored.eliminationReason = "信息量不足"
        eliminatedCandidates.push(scored)
        continue

    // 营销内容检查
    hasAdSignal = adPatterns.any(p => candidate.rawText.contains(p))
    hasPainSignal = painPatterns.any(p => candidate.rawText.contains(p))
    if hasAdSignal AND NOT hasPainSignal:
        scored.scores = { blankness:0, rigidity:0, bigCorpAvoidance:0, aiSolvability:0, monetization:0, total:0 }
        scored.eliminationReason = "营销内容，非真实痛点"
        eliminatedCandidates.push(scored)
        continue

    // 痛点信号检查
    if NOT hasPainSignal:
        scored.scores = { blankness:0, rigidity:0, bigCorpAvoidance:0, aiSolvability:0, monetization:0, total:0 }
        scored.eliminationReason = "无痛点语义信号"
        eliminatedCandidates.push(scored)
        continue

    passedCandidates.push(scored)

// === 第二阶段：五维评分 ===

对 passedCandidates 整体调用 Claude 内置推理能力进行评分：

对每个 passedCandidate，基于其 title、rawText、platform、sourceCategory，
按五维评分标准（见上方评分维度定义）给出 0-20 分评分。

评分输出格式：
{
  blankness: N,
  rigidity: N,
  bigCorpAvoidance: N,
  aiSolvability: N,
  monetization: N,
  total: blankness + rigidity + bigCorpAvoidance + aiSolvability + monetization
}

// 评分后淘汰
for each scored in passedCandidates:
    if scored.scores.total < 40:
        scored.eliminationReason = "综合评分过低(" + scored.scores.total + "/100)"

// 合并结果
scoredCandidates = [...passedCandidates, ...eliminatedCandidates]

// === 输出（finalProposal 由 Story 6-4 填充，此处保持 stub） ===
finalProposal = { status: "no_viable_proposal", candidate: null, evidenceChain: null }

计算耗时 duration = now - stageStartTime
输出 [STAGE_COMPLETE] screen | duration={duration}ms | status=success | scored={passedCandidates.length} | eliminated={eliminatedCandidates.length} | final=无

更新 TodoWrite 标记筛选阶段完成
```

### 错误处理
- AI 评分失败（第二阶段）：重试 1 次，仍失败则输出 `[STAGE_FAILED] screen | error=scoring failed after retry` 并终止管道
- 第一阶段为纯规则匹配，不涉及外部调用，无失败风险

---

## 验收标准 (Acceptance Criteria)

### AC-1: 双阶段筛选执行
**Given** rawCandidates 数组非空
**When** 执行筛选阶段
**Then** 第一阶段完成语义模式识别，淘汰无痛点信号的候选
**And** 第二阶段对通过候选执行五维评分

### AC-2: 评分明细完整
**Given** 候选通过第一阶段筛选
**When** 五维评分完成
**Then** 每个 ScoredCandidate 包含 blankness、rigidity、bigCorpAvoidance、aiSolvability、monetization 五项评分
**And** 每项评分范围为 0-20
**And** total = 五项之和（0-100）

### AC-3: 淘汰理由记录
**Given** 候选被淘汰（第一阶段或评分过低）
**When** 筛选完成
**Then** `eliminationReason` 非空且描述淘汰原因
**And** 未淘汰候选的 `eliminationReason` 为 null

### AC-4: ScoredCandidate 契约对齐
**Given** 筛选阶段输出
**When** 检查每个 scoredCandidates 元素
**Then** 严格符合 SKILL.md 中 ScoredCandidate 数据契约
**And** 包含 RawCandidate 全部原始字段

### AC-5: 日志标记正确
**Given** 筛选阶段执行完成
**When** 输出阶段完成标记
**Then** 格式为 `[STAGE_COMPLETE] screen | duration={ms} | status=success | scored={数量} | eliminated={数量} | final=无`

### AC-6: 错误处理
**Given** AI 评分调用失败
**When** 重试 1 次仍失败
**Then** 输出 `[STAGE_FAILED] screen | error=scoring failed after retry` 并终止管道

---

## 技术任务列表 (Technical Tasks)

### Task 1: 实现第一阶段语义模式识别
**预估时间：** 15 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

在 Step 2 区域实现规则引擎：
1. 定义痛点关键词列表（painPatterns）和营销关键词列表（adPatterns）
2. 遍历 rawCandidates，按三条淘汰规则过滤
3. 被淘汰候选设置 `scores.total = 0` 和 `eliminationReason`
4. 通过候选进入 passedCandidates 数组

### Task 2: 实现第二阶段五维评分模型
**预估时间：** 30 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

对 passedCandidates 执行 AI 推理评分：
1. 构造评分 prompt，包含五维评分标准定义
2. 对每个候选基于 title、rawText、platform、sourceCategory 评分
3. 解析评分结果，填充 scores 对象
4. total < 40 的候选标记 eliminationReason

### Task 3: 替换 SKILL.md Step 2 Stub
**预估时间：** 20 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

将 Step 2 中 `TODO — Stub 实现（待 Story 6-3 + 6-4 填充）` 区块替换为完整实现：
1. 保留阶段标识、输入输出定义、日志标记格式
2. 插入第一阶段 + 第二阶段逻辑
3. `finalProposal` 保持 stub（待 Story 6-4）
4. 更新完成标记包含 scored 和 eliminated 计数

### Task 4: 验证与回归测试
**预估时间：** 15 分钟
**验证方式：** 手动执行

1. 触发商业机会管道，验证 Step 2 不再输出 `scored=0`
2. 验证每个 ScoredCandidate 包含完整五维评分
3. 验证被淘汰候选有 eliminationReason
4. 验证 `[STAGE_COMPLETE] screen` 日志格式正确
5. 验证后续阶段 stub 能正确接收 scoredCandidates

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `.claude/skills/commercial-opportunity/SKILL.md` | 修改 | 替换 Step 2 stub 为双阶段筛选与评分实现 |

---

## 测试策略

### 功能测试（手动）
- 触发管道后 Step 2 输出非空 scoredCandidates
- 每个 ScoredCandidate 五维评分均在 0-20 范围内
- total = 五项之和
- 被淘汰候选有明确 eliminationReason

### 容错测试（手动）
- 验证 AI 评分失败时重试 1 次
- 验证重试仍失败时输出 `[STAGE_FAILED]` 并终止

### 回归测试（手动）
- 验证 Step 1 输出的 rawCandidates 能正确传入 Step 2
- 验证 Step 3-5 的 stub 实现仍能正常接收 Step 2 输出
- 验证管道端到端仍可完成 5/5 阶段

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| FR30 | 双阶段筛选 + 五维评分明细 | 语义模式识别 + 五维评分模型 |
| NFR22 | 自治流程人工交互步骤数 = 0 | 筛选阶段全自动，无人工确认 |

---

## 完成定义 (Definition of Done)

- [ ] 第一阶段语义模式识别已实现（痛点信号匹配、营销内容过滤、信息量检查）
- [ ] 第二阶段五维评分模型已实现（blankness, rigidity, bigCorpAvoidance, aiSolvability, monetization）
- [ ] 每项评分范围 0-20，total = 五项之和（0-100）
- [ ] 被淘汰候选记录 eliminationReason
- [ ] ScoredCandidate 输出严格符合 SKILL.md 数据契约
- [ ] Step 2 stub 已替换为完整实现
- [ ] finalProposal 保持 stub（待 Story 6-4）
- [ ] AI 评分失败时重试 1 次，仍失败则终止管道
- [ ] `[STAGE_COMPLETE] screen` 日志格式正确
- [ ] 后续阶段 stub 能正确接收 scoredCandidates 输入

---

## 参考文档

- 主编排 Skill：`.claude/skills/commercial-opportunity/SKILL.md`
- Story 6-2：`_bmad-output/implementation-artifacts/stories/story-6-2.md`
- PRD：`_bmad-output/planning-artifacts/prd.md`（FR30）
- Sprint 状态：`_bmad-output/implementation-artifacts/sprint-status.yaml`
