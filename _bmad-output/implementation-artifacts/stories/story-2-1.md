# Story 2-1: 日期动态路由与历史页面

## Story ID
2-1

## Epic
Epic 2: 历史导航与日期浏览

## 标题
日期动态路由与历史页面

## 描述
作为用户，
我想要通过 URL 访问任意历史日期的资讯页面，
以便回顾过去某天的资讯内容。

## 优先级
P0

## 复杂度
中

## 状态
in-progress

## 依赖
- Story 1-1 ~ 1-4（均已完成）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 日期动态路由页面生成
**Given** 系统中存在多天的资讯数据
**When** 执行构建
**Then** Astro 通过 getStaticPaths() 为所有有数据的日期生成静态页面

### AC-2: 日期页面内容展示
**Given** 用户访问 /daily/2026-02-25/ 格式的 URL
**When** 页面加载完成
**Then** 页面展示该日期的所有领域资讯，布局与首页一致
**And** 页面标题包含日期信息

### AC-3: 无效日期返回 404
**Given** 用户访问不存在数据的日期 URL
**Then** 返回 404 页面

### AC-4: 首页展示最新日期内容
**Given** 用户访问首页
**Then** 自动展示最新日期的资讯内容

### AC-5: SEO 独立 meta 标签
**Given** 用户访问某个日期页面
**Then** title 和 meta description 包含日期信息

---

## 技术任务列表

### Task 1: 创建 src/pages/daily/[date].astro
- 实现 getStaticPaths() 生成所有日期路径
- 复用 NewsList 组件和 BaseLayout 布局
- 页面标题包含日期

### Task 2: 构建验证
- pnpm build 成功
- dist/ 中包含日期页面目录

---

## 完成定义

- [ ] src/pages/daily/[date].astro 创建完成
- [ ] getStaticPaths() 正确生成所有日期静态路径
- [ ] 页面标题包含日期信息
- [ ] pnpm build 构建成功
- [ ] sprint-status.yaml 已更新

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md
- 工具函数：src/lib/content-utils.ts、src/lib/date-utils.ts
- 组件：src/components/news/NewsList.astro
