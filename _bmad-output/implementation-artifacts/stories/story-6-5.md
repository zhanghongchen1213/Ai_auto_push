# Story 6-5: 商业机会日报文档生成与落盘

## Story ID
6-5

## Epic
Epic 6: 商业机会日报全自主链路

## 标题
商业机会日报文档生成与落盘

## 描述
作为系统，
我想要生成标准化 commercial-opportunity.md，
以便网站可以按日期稳定渲染该板块。

## 优先级
P0

## 复杂度
中

## 状态
ready-for-dev

## 依赖
- Story 6-4 已完成：finalProposal 决策逻辑已实现
- SKILL.md 数据契约已定义：DailyReport 结构
- 关联需求：FR33, FR34, NFR17

---

## 现状分析

### Step 3 当前 Stub
SKILL.md 中 Step 3（generate）当前为占位实现，生成固定的空 Markdown 模板，不使用 scoredCandidates 和 finalProposal 数据。

### Step 4 当前 Stub
SKILL.md 中 Step 4（persist）当前为基础 Write 实现，缺少写入后校验。

### 目标数据契约（来自 SKILL.md）

**输入：** `scoredCandidates[]`、`finalProposal`

**输出：** `DailyReport`
```
DailyReport:
  markdownContent: string
  metadata.date: string
  metadata.retrievedCount: number
  metadata.scoredCount: number
  metadata.eliminatedCount: number
  metadata.finalStatus: "commercializable" | "no_viable_proposal"
```

---

## Markdown 文档模板

### Frontmatter 字段定义

| 字段 | 类型 | 说明 |
|------|------|------|
| title | string | 固定 "商业机会日报" |
| domain | string | 固定 "commercial-opportunity" |
| date | string | YYYY-MM-DD 格式日期 |
| finalStatus | string | "commercializable" 或 "no_viable_proposal" |
| retrievedCount | number | 检索阶段获取的原始候选数 |
| scoredCount | number | 通过规则引擎进入评分的候选数 |
| eliminatedCount | number | 被淘汰的候选总数 |
| generatedAt | string | ISO8601 生成时间戳 |

### 正文四部分

1. **今日概况** — 统计摘要
2. **检索领域** — 数据源类别及命中数
3. **无价值方案** — 淘汰候选（标题+平台+理由）
4. **最终方案** — commercializable 时展示证据链，否则说明无可用方案

---

## 实现方案

### Task 1: 替换 SKILL.md Step 3 (generate) stub
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

替换为真实 Markdown 生成逻辑：生成 frontmatter + 四部分正文，无候选时也生成完整文档。

### Task 2: 完善 SKILL.md Step 4 (persist) stub
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

完善为：mkdir -p + Write + 失败重试 + wc -c 校验。

---

## 验收标准 (Acceptance Criteria)

### AC-1: frontmatter 包含所有约定字段
**Given** 决策阶段已完成
**When** 执行文档生成阶段
**Then** frontmatter 包含 title, domain, date, finalStatus, retrievedCount, scoredCount, eliminatedCount, generatedAt

### AC-2: 正文包含四部分
**Given** 生成阶段执行
**When** 输出 Markdown
**Then** 文档包含四个二级标题

### AC-3: 无候选时生成完整文档
**Given** scoredCandidates 为空
**When** 执行生成阶段
**Then** 仍生成完整四部分文档，finalStatus 为 "no_viable_proposal"

### AC-4: 文件正确落盘
**Given** markdownContent 已生成
**When** 执行落盘阶段
**Then** 文件写入 `src/content/daily/{date}/commercial-opportunity.md` 且字节数 > 0

### AC-5: 落盘失败重试
**Given** 首次写入失败
**When** 重试机制触发
**Then** mkdir -p 后重试 1 次

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `.claude/skills/commercial-opportunity/SKILL.md` | 修改 | 替换 Step 3 和 Step 4 stub |

---

## 完成定义 (Definition of Done)

- [ ] Step 3 stub 已替换为真实 Markdown 生成逻辑
- [ ] frontmatter 包含所有约定字段
- [ ] 正文包含四部分
- [ ] 无候选时也生成完整文档
- [ ] Step 4 已完善（含重试和校验）
- [ ] DailyReport 输出符合 SKILL.md 数据契约

---

## 参考文档

- 主编排 Skill：`.claude/skills/commercial-opportunity/SKILL.md`
- Story 6-4：`_bmad-output/implementation-artifacts/stories/story-6-4.md`
- Sprint 状态：`_bmad-output/implementation-artifacts/sprint-status.yaml`
