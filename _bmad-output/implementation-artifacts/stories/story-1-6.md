# Story 1-6: 响应式适配与跨端体验

## Story ID
1-6

## Epic
Epic 1: 项目基础与每日资讯展示

## 标题
响应式适配与跨端体验

## 描述
作为用户，
我想要在手机和平板上也能舒适地浏览资讯，
以便在碎片时间通过移动设备获取信息。

## 优先级
P0

## 复杂度
中

## 状态
in-progress

## 依赖
- Story 1-4（每日资讯首页与新闻卡片组件）
- Story 1-5（领域筛选与色彩编码）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 移动端布局适配（<768px）
**Given** 首页资讯展示功能已完成（Story 1.4）
**When** 用户在移动端（<768px）访问网站
**Then** 内容区 padding 缩小为 12px 16px
**And** Header 高度缩小为 48px，padding 0 16px
**And** pill 导航支持横向滚动，隐藏滚动条（scrollbar-width: none）
**And** 新闻卡片 padding 缩小为 12px 16px
**And** 日期分组头字号缩小为 16px

### AC-2: 平板端布局适配（768px-1439px）
**When** 用户在平板端（768-1439px）访问网站
**Then** 内容区 padding 为 16px 24px
**And** Header padding 为 0 24px
**And** pill 导航保持水平排列，间距缩小为 gap 6px

### AC-3: 桌面端布局（>=1440px）
**When** 用户在桌面端（>=1440px）访问网站
**Then** 内容区 max-width 1440px 居中，padding 24px 48px

### AC-4: 触摸友好交互区域
**And** 所有可点击元素在移动端点击区域 >= 44x44px（WCAG 2.5.5）

### AC-5: 无障碍与对比度
**And** 所有文字与背景对比度 >= 4.5:1（WCAG AA, NFR14）

### AC-6: Viewport Meta 标签
**And** HTML head 包含正确的 viewport meta 标签
**And** 内容不溢出视口，无水平滚动条（pill 导航除外）

---

## 技术任务列表 (Technical Tasks)

### Task 1: 确保 viewport meta 标签存在
### Task 2: Header 组件响应式适配
### Task 3: CategoryNav/pill 导航响应式适配
### Task 4: NewsCard 卡片响应式适配
### Task 5: 内容区与页面边距响应式
### Task 6: DateGroupHeader 响应式适配
### Task 7: Footer 响应式适配
### Task 8: 全局溢出检查与修复

---

## 完成定义 (Definition of Done)

- [ ] viewport meta 标签已添加
- [ ] Header 在三个断点下正确显示
- [ ] pill 导航移动端可横向滚动，隐藏滚动条
- [ ] NewsCard 在各断点下间距正确
- [ ] 内容区边距在各断点下正确
- [ ] DateGroupHeader 移动端字号缩小
- [ ] 所有可点击元素触摸区域 >= 44x44px
- [ ] 无水平溢出（pill 导航除外）
- [ ] pnpm build 构建成功
- [ ] sprint-status.yaml 已更新

---

## 参考文档

- UX 设计规范：_bmad-output/planning-artifacts/ux-design-specification.md
- Epics & Stories：_bmad-output/planning-artifacts/epics-and-stories.md（Story 1.6）
