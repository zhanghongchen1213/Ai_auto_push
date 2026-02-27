# Story 2-2: 前后日期切换导航

## Story ID
2-2

## Epic
Epic 2: 历史导航与日期浏览

## 标题
前后日期切换导航

## 描述
作为用户，
我想要一键切换到前一天或后一天的资讯，
以便快速连续浏览相邻日期的内容。

## 优先级
P1

## 复杂度
低

## 状态
in-progress

## 依赖
- Story 2-1: 日期动态路由与历史页面（已完成）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 前一天导航
**Given** 用户正在浏览某个日期的资讯页面，且前一天存在数据
**When** 用户点击"前一天"按钮
**Then** 页面跳转到前一天的资讯页面
**And** 导航使用纯静态 `<a>` 标签链接，非 JS 路由

### AC-2: 后一天导航
**Given** 用户正在浏览某个日期的资讯页面，且后一天存在数据
**When** 用户点击"后一天"按钮
**Then** 页面跳转到后一天的资讯页面

### AC-3: 禁用状态 - 无前一天数据
**Given** 用户正在浏览最早日期的资讯页面
**When** 查看"前一天"按钮
**Then** 按钮显示为禁用状态（灰色、不可点击）
**And** 按钮设置 aria-disabled="true"

### AC-4: 禁用状态 - 无后一天数据
**Given** 用户正在浏览最新日期的资讯页面
**When** 查看"后一天"按钮
**Then** 按钮显示为禁用状态（灰色、不可点击）
**And** 按钮设置 aria-disabled="true"

### AC-5: 当前日期显示
**Given** 用户正在浏览某个日期的资讯页面
**When** 查看日期导航区域
**Then** 显示当前日期的中文格式（如"2026年2月26日 周四"）

### AC-6: 日历图标占位
**Given** 用户正在浏览某个日期的资讯页面
**When** 查看日期导航区域
**Then** 显示日历图标按钮（占位，Story 2-3 实现弹窗功能）

### AC-7: 键盘可访问性
**Given** 用户使用键盘导航
**When** Tab 聚焦到导航按钮并按 Enter
**Then** 触发对应的页面跳转（NFR15）
**And** 按钮包含 aria-label 说明跳转目标日期

### AC-8: 响应式适配
**Given** 用户在不同设备上浏览
**When** 在移动端（<768px）查看日期导航
**Then** 导航组件适配移动端布局，保持可用性
**And** 所有可点击元素点击区域 >= 44x44px

---

## 技术任务列表 (Technical Tasks)

### Task 1: 创建 DateNavigation.astro 组件
**预估时间：** 30 分钟
**描述：**
- 创建 src/components/ui/DateNavigation.astro
- 接收 props: date, prevDate, nextDate
- 显示当前日期（中文格式，带星期）
- 前一天/后一天按钮（<a> 标签或禁用 <span>）
- 日历图标按钮（占位）

### Task 2: 集成到日期页面
**预估时间：** 15 分钟
**描述：**
- 在 src/pages/daily/[date].astro 中导入 DateNavigation
- 使用 getAdjacentDates 获取相邻日期
- 将 DateNavigation 放置在 NewsList 上方

### Task 3: 构建验证
**预估时间：** 5 分钟
**描述：**
- 执行 pnpm build 确认构建成功

---

## 完成定义 (Definition of Done)

- [ ] DateNavigation.astro 组件创建完成
- [ ] 组件集成到 [date].astro 页面
- [ ] 有数据的方向按钮可正确跳转
- [ ] 无数据的方向按钮显示禁用状态
- [ ] 当前日期以中文格式显示
- [ ] 日历图标按钮占位就绪
- [ ] 键盘可访问（Tab + Enter）
- [ ] aria-label 和 aria-disabled 正确设置
- [ ] 响应式适配（桌面端 + 移动端）
- [ ] pnpm build 构建成功

---

## 参考文档

- 设计稿参考：组件 1tPAu (DateNav) 左右箭头
- UX 设计规范：_bmad-output/planning-artifacts/ux-design-specification.md
- Epics & Stories：_bmad-output/planning-artifacts/epics-and-stories.md
