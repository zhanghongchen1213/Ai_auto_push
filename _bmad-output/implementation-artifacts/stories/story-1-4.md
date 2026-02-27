# Story 1-4: 每日资讯首页与新闻卡片组件

## Story ID
1-4

## Epic
Epic 1: 项目基础与每日资讯展示

## 标题
每日资讯首页与新闻卡片组件

## 描述
作为用户，
我想要在首页看到当天各领域的资讯列表，每条资讯包含标题、摘要和原文链接，
以便 30 秒内完成所有领域关键动态的浏览。

## 优先级
P0

## 复杂度
中

## 状态
in-progress

## 依赖
- Story 1-1: 项目初始化与基础框架搭建（已完成）
- Story 1-2: Content Collections Schema 与领域配置（已完成）
- Story 1-3: 基础布局与 Header 组件（已完成）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 首页展示最新日期资讯
**Given** 基础布局和 Header 已完成，且存在资讯数据
**When** 用户打开网站首页（/）
**Then** 页面自动展示最新日期的资讯内容

### AC-2: 日期分组头
**Given** 首页已加载资讯数据
**When** 页面渲染完成
**Then** 内容区顶部显示日期分组头：蓝色竖条(4px宽x20px高) + 日期文字(18px/600) + 计数 badge + 更新时间

### AC-3: 资讯卡片展示
**Given** 首页已加载资讯数据
**When** 页面渲染完成
**Then** 资讯以卡片列表纵向排列，卡片圆角 8px，内边距 16px 20px
**And** 每张卡片包含：领域 pill 标签 + 来源 + 标题 + 摘要 + "阅读原文" 链接
**And** 卡片悬停时显示阴影效果，过渡 0.2s

### AC-4: 领域专属卡片背景色
**And** 每张资讯卡片的背景色根据所属领域动态设置

### AC-5: 领域分区标题
**Then** 每个领域分区的标题栏包含领域主色色条（4px 宽竖条）

### AC-6: 外部链接安全
**Then** 链接在新标签页打开（target="_blank"），设置 rel="noopener noreferrer"

### AC-7: 语义化 HTML
**Then** 每条资讯使用 article 语义标签

### AC-8: 空状态处理
**Then** 无数据时显示友好的空状态提示信息

---

## 技术任务列表

1. 创建 src/components/news/NewsCard.astro
2. 创建 src/components/news/DomainSection.astro
3. 创建 src/components/news/NewsList.astro
4. 改造 src/pages/index.astro
5. 更新 src/lib/content-utils.ts 添加 Markdown 解析

---

## 完成定义 (Definition of Done)

- [ ] NewsCard.astro 组件创建完成
- [ ] DomainSection.astro 组件创建完成
- [ ] NewsList.astro 组件创建完成
- [ ] index.astro 改造完成
- [ ] pnpm build 构建成功
