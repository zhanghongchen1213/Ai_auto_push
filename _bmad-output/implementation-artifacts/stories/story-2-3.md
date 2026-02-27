# Story 2-3: 日历弹窗与日期选择

## Story ID
2-3

## Epic
Epic 2: 历史导航与日期浏览

## 标题
日历弹窗与日期选择

## 描述
作为用户，
我想要通过日历弹窗快速选择任意历史日期，
以便直接跳转到该日期的资讯内容，无需逐天翻页。

## 优先级
P1

## 复杂度
中

## 状态
in-progress

## 依赖
- Story 2-1（日期动态路由与历史页面）— 已完成
- Story 2-2（前后日期切换导航）— 已完成

---

## 验收标准 (Acceptance Criteria)

### AC-1: 日历弹窗触发
**Given** 用户正在浏览首页或任意日期的资讯页面
**When** 用户点击日期导航区域的日历按钮
**Then** 桌面端弹出浮层日历，宽度 280px，定位于触发按钮下方
**And** 移动端弹出底部面板日历，从屏幕底部滑入，显示半透明遮罩层
**And** 日历按钮的 aria-expanded 属性更新为 "true"

### AC-2: 日历月历视图
**Given** 日历弹窗已打开
**When** 用户查看日历面板
**Then** 面板顶部显示月份切换行（左箭头 + "YYYY年M月" + 右箭头）
**And** 星期标题行显示：日/一/二/三/四/五/六
**And** 日期网格为 7列 × 5-6行，每个单元格 36px × 36px（移动端 44px × 44px）

### AC-3: 日期状态区分
**Given** 日历弹窗已打开
**When** 用户查看日期网格
**Then** 有数据的日期显示为可点击状态（文字色 #1A1A1A，悬停时背景 #F0F5FF）
**And** 无数据的日期显示为禁用状态（文字色 #D9D9D9，不可点击）
**And** 当前正在浏览的日期高亮标记（蓝色圆形背景 #1677FF，白色文字）
**And** 今天的日期（未选中时）显示蓝色文字 + 底部小圆点

### AC-4: 日期选择跳转
**Given** 日历弹窗已打开，且某日期有数据
**When** 用户点击该日期
**Then** 日历弹窗自动关闭
**And** 页面跳转到对应日期路由（如 /daily/2026-02-25/）

### AC-5: 弹窗关闭
**Given** 日历弹窗已打开
**When** 用户点击弹窗外部区域、按 Escape 键、或再次点击日历按钮
**Then** 日历弹窗关闭
**And** 焦点返回到日历触发按钮

### AC-6: 月份切换
**Given** 日历弹窗已打开
**When** 用户点击月份切换箭头
**Then** 日历网格更新为对应月份的日期
**And** 有数据/无数据的日期状态正确更新

### AC-7: 可访问性
**Given** 日历弹窗已打开
**When** 使用键盘或屏幕阅读器操作
**Then** 弹窗使用 role="dialog" 和 aria-modal="true"
**And** 焦点在弹窗内循环（焦点陷阱）
**And** Escape 键关闭弹窗
**And** 日期网格使用 role="grid" 和 role="gridcell"
**And** 日历触发按钮包含 aria-haspopup 和 aria-expanded 属性

---

## 技术任务列表 (Technical Tasks)

### Task 1: 创建 CalendarPopup.astro 组件
**预估时间：** 60 分钟
**描述：**
- 创建 src/components/ui/CalendarPopup.astro
- 实现月历视图（月份切换、星期标题、日期网格）
- 有数据日期高亮可点击，无数据日期灰色禁用
- 当前日期蓝色圆形高亮，今天日期蓝色文字+小圆点
- 点击有数据日期跳转到对应页面
- 桌面端浮层定位，移动端底部面板
- 弹窗打开/关闭淡入淡出动画
- 焦点陷阱、Escape 关闭、点击外部关闭

**产出文件：** src/components/ui/CalendarPopup.astro

### Task 2: 修改 DateNavigation.astro 启用日历按钮
**预估时间：** 20 分钟

### Task 3: 修改 [date].astro 传递可用日期列表
**预估时间：** 10 分钟

---

## 完成定义 (Definition of Done)

- [ ] CalendarPopup.astro 组件创建完成
- [ ] 日历月历视图正确显示当前月份日期网格
- [ ] 有数据日期可点击并跳转，无数据日期禁用
- [ ] 当前日期高亮，今天日期有视觉标记
- [ ] 月份前后切换功能正常
- [ ] 桌面端浮层定位正确
- [ ] 移动端底部面板 + 遮罩层正常工作
- [ ] Escape 键和点击外部可关闭弹窗
- [ ] 焦点陷阱正常工作
- [ ] ARIA 属性完整
- [ ] DateNavigation 日历按钮启用并可触发弹窗
- [ ] [date].astro 正确传递可用日期列表
- [ ] pnpm build 构建成功

---

## 参考文档

- UX 设计规范：_bmad-output/planning-artifacts/ux-design-specification.md
- 现有组件：src/components/ui/DateNavigation.astro
- 日期工具：src/lib/date-utils.ts、src/lib/content-utils.ts
