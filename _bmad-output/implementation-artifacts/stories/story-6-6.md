# Story 6-6: 首页"商业机会日报"板块渲染与历史回看

## Story ID
6-6

## Epic
Epic 6: 商业机会日报全自主链路

## 标题
首页"商业机会日报"板块渲染与历史回看

## 描述
作为用户，
我想要在首页和历史日期页查看商业机会日报，
以便可以把资讯与机会一起评估。

## 优先级
P0

## 复杂度
中

## 状态
ready-for-dev

## 依赖
- Story 6-5 已完成：`commercial-opportunity.md` 文档已可落盘
- Story 1-3 已完成：首页资讯流渲染逻辑已实现
- 关联需求：FR35, FR27

---

## 现状分析

### 内容 Schema 现状
`src/content.config.ts` 中 `daily` collection 的 `domain` 字段为 `z.enum(domainSlugs)`，仅包含资讯领域（ai-tech, cross-border-ecom, product-startup, github-trending）。`commercial-opportunity` 不在枚举中，无法通过现有 schema 校验。

### 首页渲染现状
- `index.astro` 和 `daily/[date].astro` 仅使用 `NewsList` 组件
- `NewsList` 按 `domains` 配置过滤 entries 并调用 `parseNewsItems` 解析资讯卡片
- 商业机会日报的 Markdown 结构（四部分正文）与资讯格式不同，不能复用 `parseNewsItems`

### 需要新增的能力
1. 扩展 content schema 支持 `commercial-opportunity` domain
2. 新建商业机会板块组件（独立于资讯卡片）
3. 在首页和日期页集成该板块

---

## 实现方案

### Task 1: 扩展 Content Schema 支持商业机会日报

**修改文件：** `src/content.config.ts`

将 `domain` 枚举扩展为包含 `commercial-opportunity`。商业机会日报的 frontmatter 字段（finalStatus, retrievedCount 等）与资讯不同，需要使用 `z.discriminatedUnion` 按 domain 区分：
- 资讯类型：domain 为现有四个 slug，保留 itemCount 字段
- 商业机会类型：domain 为 `commercial-opportunity`，包含 finalStatus, retrievedCount, scoredCount, eliminatedCount 字段

### Task 2: 新建 OpportunitySection 组件

**新建文件：** `src/components/opportunity/OpportunitySection.astro`

渲染商业机会日报板块：
- 板块标题带专属颜色编码（与资讯领域视觉一致）
- 展示 finalStatus 状态标签（可商业化 / 无可用方案）
- 渲染 Markdown 正文四部分（今日概况、检索领域、无价值方案、最终方案）
- 响应式：桌面端与移动端均可完整浏览
- 语义化 HTML，支持屏幕阅读器

### Task 3: 新增 content-utils 查询函数

**修改文件：** `src/lib/content-utils.ts`

新增 `getOpportunityByDate(date: string)` 函数，查询指定日期的 `commercial-opportunity` entry。返回 `CollectionEntry<'daily'> | undefined`。

### Task 4: 集成到首页和日期页

**修改文件：**
- `src/pages/index.astro`
- `src/pages/daily/[date].astro`

在 `NewsList` 下方插入 `OpportunitySection`，传入当前日期的商业机会 entry。无数据时不渲染（静默降级）。

### Task 5: 确保搜索可索引商业机会内容

**验证：** Pagefind 构建时索引覆盖 `commercial-opportunity.md` 内容。由于 Pagefind 基于构建产物自动索引，只需确认渲染后的 HTML 包含可索引文本即可。

---

## 验收标准 (Acceptance Criteria)

### AC-1: 商业机会板块在首页正确渲染
**Given** 最新日期存在 `commercial-opportunity.md`
**When** 用户访问首页
**Then** 页面在资讯列表下方展示商业机会日报板块

### AC-2: 历史日期页正确渲染
**Given** 指定历史日期存在 `commercial-opportunity.md`
**When** 用户访问 `/daily/YYYY-MM-DD/`
**Then** 页面展示该日期的商业机会日报板块，与资讯内容同日期同步

### AC-3: 无数据时静默降级
**Given** 指定日期不存在 `commercial-opportunity.md`
**When** 用户访问该日期页面
**Then** 不展示商业机会板块，不影响资讯内容正常渲染

### AC-4: 响应式布局
**Given** 商业机会板块已渲染
**When** 用户在桌面端（>=1440px）和移动端（<768px）访问
**Then** 桌面端和移动端均可完整浏览板块内容

### AC-5: 搜索可达
**Given** 商业机会日报已渲染为 HTML
**When** 用户在搜索入口输入日报中的关键词
**Then** 搜索结果包含匹配的商业机会内容

### AC-6: Schema 校验通过
**Given** `commercial-opportunity.md` 已写入 content 目录
**When** 执行 `pnpm build`
**Then** Content Collections schema 校验通过，构建成功

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `src/content.config.ts` | 修改 | 扩展 schema 支持 commercial-opportunity domain |
| `src/lib/content-utils.ts` | 修改 | 新增 getOpportunityByDate 查询函数 |
| `src/components/opportunity/OpportunitySection.astro` | 新建 | 商业机会日报板块组件 |
| `src/pages/index.astro` | 修改 | 集成 OpportunitySection |
| `src/pages/daily/[date].astro` | 修改 | 集成 OpportunitySection |

---

## 完成定义 (Definition of Done)

- [ ] content schema 扩展支持 commercial-opportunity domain
- [ ] OpportunitySection 组件实现并渲染四部分正文
- [ ] 首页和日期页集成商业机会板块
- [ ] 无数据时静默降级，不影响资讯渲染
- [ ] 桌面端和移动端均可完整浏览
- [ ] Pagefind 搜索可索引商业机会内容
- [ ] `pnpm build` 构建成功

---

## 参考文档

- 主编排 Skill：`.claude/skills/commercial-opportunity/SKILL.md`
- Story 6-5：`_bmad-output/implementation-artifacts/stories/story-6-5.md`
- 首页实现：`src/pages/index.astro`
- 日期页实现：`src/pages/daily/[date].astro`
- 内容 Schema：`src/content.config.ts`
- 领域配置：`src/config/domains.ts`
- Sprint 状态：`_bmad-output/implementation-artifacts/sprint-status.yaml`
