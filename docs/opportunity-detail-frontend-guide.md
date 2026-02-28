# Opportunity Detail Frontend Guide

## 1. 路由与页面

- 新增路由文件：`src/pages/daily/[date]/opportunity.astro`
- URL 规则：`/daily/YYYY-MM-DD/opportunity`
- 页面职责：
  - 读取 `date` 参数
  - 加载对应日期的 `commercial-opportunity.md`
  - 有数据时渲染详情组件
  - 无数据时渲染空状态并提供返回入口

## 2. 入口跳转

- 桌面端入口：`XqEim/finalCardEntry`（设计节点 `kIH3Z`）
- 移动端入口：`OSbpZ/finalCardEntryMobile`（设计节点 `RKjc6`）
- 目标链接：
  - 当天首页：`/daily/${currentDate}/opportunity`
  - 历史日期页：`/daily/${selectedDate}/opportunity`

## 3. 组件拆分建议

- `src/components/opportunity/OpportunityDetail.astro`
  - `OpportunityOverview`
  - `SearchDomainsSection`
  - `AttemptsSection`
  - `DiscardedSection`
  - `FinalOpportunitySection`
  - `EvidenceSection`
  - `ValidationPlanSection`

## 4. 数据映射建议

建议在 `src/lib/opportunity-utils.ts` 中统一解析：

- `title`, `date`, `generatedAt`
- `searchDomains[]`
- `attemptCount`, `discardedCount`
- `finalOpportunity`
- `evidences[]`（url/quote/timestamp）
- `validationPlan[]`

当正文为自由文本时，先做“区块标题 + 列表正文”的最小解析；缺失字段回退为空状态文案。

## 5. 视觉对齐（按设计稿）

- 桌面详情页画板：`OpportunityDetail-Desktop`（`aMadG`）
- 移动详情页画板：`OpportunityDetail-Mobile`（`rPOiv`）
- 关键视觉：
  - 概览指标卡（评分/置信度/结论）
  - 证据链区块
  - 2 周验证计划区块
  - 返回入口始终可见

## 6. 可访问性与安全

- 语义结构：`main > section > h1/h2/h3`
- 所有外链：`target="_blank" rel="noopener noreferrer"`
- 键盘可达：返回链接、证据链接、顶部导航

## 7. 测试建议

- 单元测试：
  - `getOpportunityByDate`（有数据 / 无数据 / 字段缺失）
- 页面测试：
  - 详情页渲染
  - 空状态渲染
  - 首页入口跳转 URL 正确
