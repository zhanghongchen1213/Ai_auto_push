# Story 6-8: 商业机会详情页与卡片跳转

## Story ID
6-8

## Epic
Epic 6: 商业机会日报全自主链路

## 标题
商业机会详情页与卡片跳转

## 描述
作为决策者，  
我想要从首页“最终确认方案”卡片进入独立详情页，  
以便查看完整证据链、淘汰理由和验证计划后再决定是否投入开发。

## 优先级
P0

## 复杂度
中

## 状态
ready

## 依赖
- Story 2-1: 日期动态路由与历史页面（已完成，提供 `/daily/[date]` 路由基础）
- Story 6-5: 商业机会日报文档生成与落盘（提供 `commercial-opportunity.md` 数据）
- Story 6-6: 首页商业机会板块渲染（提供入口卡片）

---

## 设计稿与节点映射

- 桌面入口卡片：`XqEim/finalCardEntry`（节点 ID: `kIH3Z`）
- 移动入口卡片：`OSbpZ/finalCardEntryMobile`（节点 ID: `RKjc6`）
- 桌面详情页画板：`OpportunityDetail-Desktop`（节点 ID: `aMadG`）
- 移动详情页画板：`OpportunityDetail-Mobile`（节点 ID: `rPOiv`）

---

## 数据契约（前端读取）

文件路径：`src/content/daily/YYYY-MM-DD/commercial-opportunity.md`

frontmatter 最低要求：
- `title: string`
- `date: string`
- `searchDomains: string[]`
- `attemptCount: number`
- `discardedCount: number`
- `finalOpportunity: string`
- `generatedAt: string`

正文最低区块：
1. 今日检索领域
2. 尝试探索内容
3. 无价值方案及淘汰理由
4. 最终确认的可商业化方案
5. 证据链（来源 URL / 引文 / 时间戳）
6. 2 周验证计划（建议）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 首页卡片可跳转详情页
**Given** 指定日期存在 `commercial-opportunity.md`  
**When** 用户点击首页最终方案卡片（桌面/移动）  
**Then** 跳转到 `/daily/[date]/opportunity`

### AC-2: 详情页展示完整信息结构
**Given** 跳转成功  
**When** 页面渲染  
**Then** 显示方案概览（标题、日期、评分、置信度、结论）  
**And** 显示检索领域、探索内容、淘汰理由、最终方案、证据链、验证计划

### AC-3: 历史日期可回看
**Given** 用户访问历史日期详情页 `/daily/2026-02-27/opportunity`  
**When** 该日期存在日报文件  
**Then** 展示该日期对应内容，而非当天内容

### AC-4: 无数据空状态
**Given** 该日期不存在机会日报文件  
**When** 用户访问 `/daily/[date]/opportunity`  
**Then** 展示“当日无可用方案”空状态  
**And** 提供返回当日简报入口

### AC-5: 可访问性
**Given** 键盘用户访问详情页  
**When** 使用 Tab 导航  
**Then** 可聚焦“返回简报”和证据链接  
**And** 语义化结构使用 `main`/`section`/`h1-h3`/`article`

### AC-6: 外链安全
**Given** 页面存在证据链接或原文链接  
**When** 链接在新标签打开  
**Then** 必须带 `rel="noopener noreferrer"`

### AC-7: 移动端可读性
**Given** 390px 视口  
**When** 打开详情页  
**Then** 信息块为单列纵向布局  
**And** 无横向滚动

---

## 技术任务列表 (Technical Tasks)

### Task 1: 扩展机会日报内容读取与类型
- 新增 `src/lib/opportunity-utils.ts`
- 提供 `getOpportunityByDate(date)` 与 `hasOpportunity(date)` 工具函数
- 对 frontmatter 字段做运行时兜底校验

### Task 2: 新增详情页路由
- 新建 `src/pages/daily/[date]/opportunity.astro`
- 读取 `[date]` 参数并加载对应 `commercial-opportunity.md`
- 数据缺失时渲染空状态

### Task 3: 新增详情页组件
- 新建 `src/components/opportunity/OpportunityDetail.astro`
- 按区块拆分渲染：概览、检索领域、探索内容、淘汰理由、最终方案、证据链、验证计划

### Task 4: 首页入口跳转接线
- 在首页“最终方案”区域增加详情跳转链接（桌面+移动）
- 跳转目标使用当前页面日期，保证历史回看一致

### Task 5: 可访问性与回退
- `aria-label`、语义标题层级、键盘可达
- 证据链接空值过滤，避免无效锚点

### Task 6: 测试
- 单元测试：`opportunity-utils`（存在/不存在/字段缺失）
- 页面测试：详情页渲染、空状态渲染、跳转 URL 正确性

---

## 实现备注

- 详情页视觉以 `UX/UX-design.pen` 的 `aMadG` 与 `rPOiv` 为准。
- 首页入口卡片节点 `kIH3Z` / `RKjc6` 已在设计稿中标注“查看详情”。
