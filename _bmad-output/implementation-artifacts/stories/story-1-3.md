# Story 1-3: 基础布局与 Header 组件

## Story ID
1-3

## Epic
Epic 1: 项目基础与每日资讯展示

## 标题
基础布局与 Header 组件

## 描述
作为用户，
我想要看到一个清晰的页面布局，包含品牌标识和领域导航，
以便快速识别网站并切换不同领域的资讯。

## 优先级
P0

## 复杂度
中

## 状态
in-progress

## 依赖
- Story 1-1: 项目初始化与基础框架搭建（已完成）
- Story 1-2: Content Collections Schema 与领域配置（已完成）

## 设计稿参考
- XqEim 头部区域（桌面端）, OSbpZ 头部区域（移动端）
- 组件 1tPAu (DateNav), lBzjR (SearchBox)

---

## 验收标准 (Acceptance Criteria)

### AC-1: BaseLayout 布局结构
**Given** Content Collections schema 和领域配置已就绪
**When** 用户打开网站首页
**Then** 页面使用 BaseLayout，包含 Header、内容区和 Footer
**And** 页面背景色为 #F5F7FA，内容区最大宽度 1440px 居中

### AC-2: Header 品牌标识与导航
**Given** 页面已加载
**When** 用户查看页面顶部
**Then** Header 高度 54px，白色背景，包含品牌 Logo（"资讯雷达"，22px/700，#1677FF）
**And** 包含水平 pill 标签导航（全部/AI技术/跨境电商/产品创业/GitHub热门）
**And** pill 标签圆角 16px，内边距 6px 16px，激活态背景 #1677FF 文字白色

### AC-3: Footer
**Given** 页面已加载
**Then** Footer 包含版权信息和 GitHub 链接，使用 footer 语义标签

### AC-4: 响应式与无障碍
**Then** 移动端 Header 高 48px，pill 导航横向滚动
**And** 语义化 HTML（header/nav/main/footer），pill 使用 role="tablist"/"tab"

---

## 参考文档
- 架构设计：_bmad-output/planning-artifacts/architecture.md
- UX 设计规范：_bmad-output/planning-artifacts/ux-design-specification.md
