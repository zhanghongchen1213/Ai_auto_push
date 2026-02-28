# Story 6-4: 最终方案确认与淘汰记录

## Story ID
6-4

## Epic
Epic 6: 商业机会日报全自主链路

## 标题
最终方案确认与淘汰记录

## 描述
作为用户，
我想要每天得到一个可执行的最终方案并看到淘汰依据，
以便可以快速决策是否投入开发。

## 优先级
P0

## 复杂度
中

## 状态
ready-for-dev

## 依赖
- Story 6-3 已完成：双阶段筛选与评分已实现，scoredCandidates 数组可用
- SKILL.md 数据契约已定义：FinalProposal 结构
- 关联需求：FR31, FR32, NFR18, NFR19

---

## 现状分析

### Story 6-3 留下的 Stub
SKILL.md 中 Step 2（筛选阶段）2.4 节当前 finalProposal 为占位实现：

```
finalProposal = { status: "no_viable_proposal", candidate: null, evidenceChain: null }
```

本 Story 需要将此 stub 替换为真实的决策逻辑。

### 目标数据契约（来自 SKILL.md）

**输入：** `scoredCandidates[]`（ScoredCandidate 数组，来自 2.1-2.3）

**输出：** `finalProposal`（FinalProposal）

```
FinalProposal:
  candidate: ScoredCandidate — 最终选中候选（total >= 80）
  evidenceChain.sourceUrls: string[] — 来源 URL 列表
  evidenceChain.quotes: string[] — 关键引文
  evidenceChain.scoringBasis: string — 评分依据
  status: "commercializable" | "no_viable_proposal"
```

### FR31/FR32/NFR18/NFR19 要求
- FR31: 仅当综合评分 >=80/100 且证据链完整时输出"可商业化"最终方案
- FR32: 所有未入选候选都带淘汰理由并保留在日报内容中
- NFR18: 无候选达标时输出"无可用方案"
- NFR19: 决策过程可追溯（证据链完整）

---

## 决策逻辑

### 达标判定
1. 从 `scoredCandidates` 中筛选 `scores.total >= 80` 的候选
2. 验证证据链完整性：`sourceUrl` 非空、`rawText` 非空、`scores` 各维度非零
3. 选最高分候选作为 finalProposal

### 证据链构建
- `sourceUrls`: 从选中候选的 `sourceUrl` 构建
- `quotes`: 从选中候选的 `rawText` 提取关键片段
- `scoringBasis`: 基于五维评分生成文字描述

### 淘汰记录
- total >= 80 但非最高分：`eliminationReason = "非最高分候选(N/100)"`
- total >= 80 但证据链不完整：`eliminationReason = "证据链不完整"`

### 无达标候选
- 无候选 total >= 80 时：`status = "no_viable_proposal"`

---

## 实现方案：替换 SKILL.md Step 2.4 中 finalProposal Stub

### 替换位置
SKILL.md 中 `#### 2.4 合并结果与输出` 下的 finalProposal stub 区块。

### 替换后的伪代码

```
// === 最终方案决策（替换 stub） ===
qualifiedCandidates = passedCandidates.filter(c => c.scores.total >= 80)

validCandidates = qualifiedCandidates.filter(c =>
  c.sourceUrl 非空 AND c.rawText 非空 AND
  c.scores.blankness > 0 AND c.scores.rigidity > 0 AND
  c.scores.bigCorpAvoidance > 0 AND c.scores.aiSolvability > 0 AND
  c.scores.monetization > 0
)

if validCandidates.length > 0:
  best = validCandidates.sort(c => c.scores.total, desc)[0]
  finalProposal = {
    status: "commercializable",
    candidate: best,
    evidenceChain: {
      sourceUrls: [best.sourceUrl],
      quotes: [best.rawText.substring(0, 200)],
      scoringBasis: "空白度:{blankness}/20 刚需:{rigidity}/20 ..."
    }
  }
  // 标记未入选候选
  for each c in passedCandidates where c != best:
    if c.scores.total >= 80:
      c.eliminationReason = "非最高分候选(" + c.scores.total + "/100)"
  for each c in qualifiedCandidates where c not in validCandidates:
    c.eliminationReason = "证据链不完整"
else:
  finalProposal = { status: "no_viable_proposal", candidate: null, evidenceChain: null }
```

---

## 验收标准 (Acceptance Criteria)

### AC-1: 达标候选输出可商业化方案
**Given** scoredCandidates 中存在 total >= 80 且证据链完整的候选
**When** 执行决策阶段
**Then** finalProposal.status = "commercializable"
**And** finalProposal.candidate 为最高分候选

### AC-2: 证据链完整性验证
**Given** 候选 total >= 80
**When** 验证证据链
**Then** sourceUrls 非空、quotes 非空、scoringBasis 非空

### AC-3: 淘汰记录完整
**Given** 存在未入选候选
**When** 决策完成
**Then** 所有未入选候选都有 eliminationReason

### AC-4: 无达标候选处理
**Given** 无候选 total >= 80 或证据链均不完整
**When** 执行决策阶段
**Then** finalProposal.status = "no_viable_proposal"

### AC-5: 日志标记更新
**Given** 决策完成
**When** 输出阶段完成标记
**Then** `[STAGE_COMPLETE] screen` 中 `final=有` 或 `final=无` 正确反映结果

---

## 技术任务列表 (Technical Tasks)

### Task 1: 替换 SKILL.md Step 2.4 中 finalProposal stub
**预估时间：** 20 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

1. 在 2.4 节中将 finalProposal stub 替换为决策逻辑
2. 实现达标筛选、证据链验证、最高分选择
3. 实现淘汰记录补充
4. 更新完成标记中 final 字段

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `.claude/skills/commercial-opportunity/SKILL.md` | 修改 | 替换 Step 2.4 中 finalProposal stub 为决策逻辑 |

---

## 完成定义 (Definition of Done)

- [ ] finalProposal stub 已替换为真实决策逻辑
- [ ] 综合评分 >= 80 且证据链完整时输出 commercializable
- [ ] 证据链包含 sourceUrls、quotes、scoringBasis
- [ ] 所有未入选候选记录 eliminationReason
- [ ] 无达标候选时输出 no_viable_proposal
- [ ] `[STAGE_COMPLETE] screen` 日志中 final 字段正确
- [ ] FinalProposal 输出严格符合 SKILL.md 数据契约

---

## 参考文档

- 主编排 Skill：`.claude/skills/commercial-opportunity/SKILL.md`
- Story 6-3：`_bmad-output/implementation-artifacts/stories/story-6-3.md`
- PRD：`_bmad-output/planning-artifacts/prd.md`（FR31, FR32, NFR18, NFR19）
- Sprint 状态：`_bmad-output/implementation-artifacts/sprint-status.yaml`
