# Story 3-3: Header 常驻搜索框

## Story ID
3-3

## Epic
Epic 3: 搜索功能

## 标题
Header 常驻搜索框

## 描述
作为用户，
我想要在任何页面都能快速发起搜索，
以便随时从浏览模式切换到搜索模式。

## 优先级
P1

## 复杂度
低

## 状态
done

## 依赖
- Story 3-1: Pagefind 搜索集成与搜索页面（已完成）
- Story 3-2: 搜索结果展示与跳转（已完成）
- Story 1-3: 基础布局与 Header 组件（已完成）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 搜索框默认态样式
**Given** 用户在网站任意页面（首页、日期页、搜索页）
**When** 页面加载完成
**Then** Header 右侧显示搜索框，默认态样式为：
- 圆角 20px
- 背景色 #F5F5F5
- 无边框（border: 1px solid transparent）
- 宽度 200px，高度 36px
- 占位文字"搜索资讯..."，13px/400，色值 #BFBFBF

### AC-2: 搜索框聚焦态样式
**Given** 用户在任意页面看到 Header 搜索框
**When** 用户点击搜索框使其获得焦点
**Then** 搜索框背景变为白色（#FFFFFF）
**And** 边框变为 1px solid #1677FF
**And** 显示聚焦光晕 box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1)
**And** 过渡动画 0.2s（background, border-color, box-shadow）

### AC-3: 搜索提交跳转
**Given** 用户在搜索框中输入关键词
**When** 用户按下 Enter 键
**Then** 页面跳转到 /search/?q={关键词} 搜索结果页
**And** 搜索结果页自动执行该关键词的搜索
**And** 空输入时按 Enter 不触发跳转

### AC-4: 移动端搜索框适配
**Given** 用户在移动端（<768px）访问网站
**When** 页面加载完成
**Then** 搜索框从 Header 右侧移至 pill 导航下方独立行
**And** 搜索框全宽显示（width: 100%）
**And** 搜索框高度增大为 44px（满足移动端最小点击区域要求）
**And** 桌面端搜索框隐藏（display: none），移动端搜索框显示

### AC-5: 搜索页回显关键词
**Given** 用户从 Header 搜索框提交搜索跳转到 /search/ 页面
**When** 搜索结果页加载完成
**Then** 搜索页的搜索框中回显用户输入的关键词
**And** 用户可以直接修改关键词重新搜索

### AC-6: 键盘交互与无障碍
**Given** 用户使用键盘或屏幕阅读器
**When** 在任意页面操作 Header 搜索框
**Then** 搜索框可通过 Tab 键聚焦
**And** 搜索框包含 aria-label="搜索资讯" 无障碍标签（NFR13）
**And** 搜索表单使用 role="search" 语义标记
**And** 输入框 maxlength 限制为 200 字符，防止异常输入

### AC-7: 全站一致性
**Given** 搜索框已在 Header 中实现
**When** 用户在首页（/）、日期页（/daily/YYYY-MM-DD/）、搜索页（/search/）之间切换
**Then** 搜索框在所有页面的位置、样式和行为完全一致
**And** Header 使用 data-pagefind-ignore 确保搜索框本身不被索引

---

## 技术任务列表 (Technical Tasks)

### Task 1: 验证现有 Header 搜索框实现
**预估时间：** 10 分钟
- 审查 `src/components/ui/Header.astro` 中已有的搜索框代码
- 确认桌面端搜索框（.search-desktop）和移动端搜索框（.search-mobile）的 HTML 结构
- 确认 form action 指向 `/search/`，method 为 GET，参数名为 `q`
- 确认 aria-label、role="search"、maxlength 等无障碍属性已设置
- 记录与验收标准的差异点

### Task 2: 搜索框样式精调
**预估时间：** 15 分钟
- 验证默认态样式：圆角 20px、背景 #F5F5F5、无边框、宽度 200px、高度 36px
- 验证聚焦态样式：白色背景、#1677FF 边框、聚焦光晕
- 验证占位文字样式：13px/400、#BFBFBF
- 验证过渡动画：background/border-color/box-shadow 0.2s
- 如有差异，修正 CSS 使其完全匹配设计规范

### Task 3: 移动端搜索框适配验证
**预估时间：** 10 分钟
- 验证 <768px 断点下桌面端搜索框隐藏、移动端搜索框显示
- 验证移动端搜索框全宽、高度 44px
- 验证移动端搜索框位于 pill 导航下方
- 确认移动端点击区域 >= 44x44px（NFR13）

### Task 4: 搜索提交行为与空输入防护
**预估时间：** 15 分钟
- 验证 Enter 键提交后跳转到 `/search/?q={关键词}`
- 添加空输入防护：空字符串或纯空格时阻止表单提交
- 添加客户端 JavaScript：监听 submit 事件，trim 输入值，空值时 preventDefault
- 确保 Astro 页面过渡（astro:after-swap）后事件监听器正确重新绑定

### Task 5: 搜索页关键词回显
**预估时间：** 10 分钟
- 在 `/search/` 页面的搜索框中读取 URL 参数 `q` 并回填到 input value
- 确保 Header 组件支持接收初始搜索词（通过 props 或客户端 JS 读取 URL）
- 验证回显后用户可直接修改关键词重新搜索

### Task 6: 全站一致性验证
**预估时间：** 10 分钟
- 在首页（/）、日期页（/daily/YYYY-MM-DD/）、搜索页（/search/）分别验证搜索框
- 确认所有页面的搜索框位置、样式、行为一致
- 确认 Header 的 data-pagefind-ignore 属性阻止搜索框被索引

### Task 7: 编写测试
**预估时间：** 20 分钟
- 单元测试：空输入防护逻辑（trim + 空值阻止提交）
- 集成测试：搜索框提交后 URL 参数正确传递
- 集成测试：搜索页关键词回显
- 视觉回归：桌面端/移动端搜索框样式截图对比

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR4 | 页面体积 <=500KB | 搜索框为纯 HTML+CSS，无额外 JS 库依赖 |
| NFR13 | 语义化 HTML | role="search"、aria-label="搜索资讯"、语义化 form |
| NFR14 | 对比度 WCAG 2.1 AA | 占位文字 #BFBFBF 在 #F5F5F5 背景上、输入文字 #1A1A1A 在白色背景上均满足对比度要求 |
| NFR15 | 键盘导航 | Tab 聚焦、Enter 提交、搜索框可通过键盘完成完整搜索流程 |

---

## 完成定义 (Definition of Done)

- [x] Header 搜索框在所有页面（首页、日期页、搜索页）正确显示
- [x] 默认态样式匹配设计规范（圆角、背景、占位文字）
- [x] 聚焦态样式匹配设计规范（白色背景、蓝色边框、光晕）
- [x] Enter 提交跳转到 /search/?q={关键词}
- [x] 空输入时不触发跳转
- [x] 移动端搜索框全宽显示在 pill 导航下方
- [x] 搜索页正确回显 URL 中的关键词
- [x] aria-label、role="search" 等无障碍属性正确设置
- [x] data-pagefind-ignore 阻止搜索框被索引
- [x] 测试覆盖空输入防护、URL 参数传递、关键词回显

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md
- PRD：_bmad-output/planning-artifacts/prd.md
- UX 设计规范：_bmad-output/planning-artifacts/ux-design-specification.md
- 设计稿组件：lBzjR (SearchBox)
- Story 3-1：_bmad-output/implementation-artifacts/stories/story-3-1.md
- Story 3-2：_bmad-output/implementation-artifacts/stories/story-3-2.md
- 现有 Header 组件：src/components/ui/Header.astro
