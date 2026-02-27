# Story 3-1: Pagefind 搜索集成与搜索页面

## Story ID
3-1

## Epic
Epic 3: 搜索功能

## 标题
Pagefind 搜索集成与搜索页面

## 描述
作为用户，
我想要通过关键词搜索历史资讯内容，
以便快速找到我记忆中的某条资讯。

## 优先级
P1

## 复杂度
中

## 状态
in-progress

## 依赖
- Story 1-1: 项目初始化与基础框架搭建（已完成）
- Story 1-4: 每日资讯首页与新闻卡片组件（已完成）
- Story 2-1: 日期动态路由与历史页面（已完成）

---

## 验收标准 (Acceptance Criteria)

### AC-1: Pagefind 依赖安装与构建集成
**Given** 项目已完成基础框架搭建（Story 1-1）
**When** 执行 pnpm build 命令
**Then** Pagefind 在构建后自动索引所有生成的 HTML 页面
**And** 搜索索引文件生成在 dist/pagefind/ 目录
**And** 索引随静态文件一起部署，无需后端服务

### AC-2: 内容页面 Pagefind 标记
**Given** 资讯内容页面已渲染（首页和日期页）
**When** Pagefind 执行索引
**Then** 资讯卡片的标题和摘要被正确索引
**And** 非内容区域（Header、Footer、导航）不被索引
**And** 每条资讯的领域信息作为 filter 属性被索引

### AC-3: 搜索页面基础框架
**Given** 网站已构建并包含搜索索引
**When** 用户访问 /search/ 页面
**Then** 页面展示搜索输入框和结果区域
**And** 搜索框获得焦点后可输入关键词
**And** 输入关键词后实时展示匹配结果

### AC-4: 搜索结果展示
**Given** 用户在搜索页输入关键词
**When** Pagefind 返回匹配结果
**Then** 搜索结果包含匹配的资讯标题和摘要片段（高亮关键词）
**And** 搜索支持跨日期、跨领域匹配（FR13）
**And** 搜索响应时间 <=500ms（NFR5）

### AC-5: 中文搜索支持
**Given** 资讯内容为中文
**When** 用户输入中文关键词搜索
**Then** Pagefind 正确分词并返回匹配结果
**And** 中文标题和摘要均可被搜索命中

---

## 技术任务列表 (Technical Tasks)

### Task 1: 安装 Pagefind 依赖
**预估时间：** 5 分钟
- 安装 pagefind 作为开发依赖
- 在 package.json 的 build 脚本后添加 pagefind 索引命令

### Task 2: 为内容组件添加 Pagefind 标记
**预估时间：** 15 分钟
- 在 NewsList 内容区域添加 data-pagefind-body
- 在 NewsCard 标题添加 data-pagefind-meta
- 在 DomainSection 添加 data-pagefind-filter
- 在 Header/Footer 添加 data-pagefind-ignore

### Task 3: 创建搜索页面
**预估时间：** 30 分钟
- 创建 src/pages/search.astro
- 集成 Pagefind UI 客户端搜索
- 配置中文界面文案
- 自定义搜索结果样式

### Task 4: 构建验证
**预估时间：** 10 分钟
- 执行 pnpm build 验证构建成功
- 确认 dist/pagefind/ 目录生成

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR5 | 搜索响应 <=500ms | Pagefind 客户端搜索，预构建索引 |
| NFR4 | 页面体积 <=500KB | Pagefind JS ~10KB gzip，索引按需加载 |
| NFR13 | 语义化 HTML | 搜索页使用 role="search"、aria-label |
| NFR15 | 键盘导航 | 搜索框支持 Enter/Escape |

---

## 完成定义 (Definition of Done)

- [ ] Pagefind 作为开发依赖安装完成
- [ ] package.json build 脚本包含 pagefind 索引命令
- [ ] 内容组件添加了正确的 data-pagefind-* 属性
- [ ] 非内容区域标记了 data-pagefind-ignore
- [ ] /search/ 页面创建完成，包含 Pagefind UI
- [ ] pnpm build 成功且 dist/pagefind/ 目录生成
- [ ] 中文关键词搜索可返回正确结果

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md
- PRD：_bmad-output/planning-artifacts/prd.md
- Pagefind 官方文档：https://pagefind.app
