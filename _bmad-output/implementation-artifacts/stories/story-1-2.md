# Story 1-2: Content Collections Schema 与领域配置

## Story ID
1-2

## Epic
Epic 1: 项目基础与每日资讯展示

## 标题
Content Collections Schema 与领域配置

## 描述
作为开发者，
我想要定义 Content Collections schema 和领域配置文件，
以便系统能够类型安全地管理资讯内容并集中管理领域元数据。

## 优先级
P0

## 复杂度
低

## 状态
in-progress

## 依赖
- Story 1-1（项目初始化与基础框架搭建）— 已完成

---

## 验收标准 (Acceptance Criteria)

### AC-1: Content Collections Schema 定义
**Given** 项目已初始化完成（Story 1.1）
**When** 创建 src/content.config.ts 定义 daily collection schema
**Then** schema 包含 title(string)、domain(enum)、date(string, YYYY-MM-DD)、itemCount(number)、generatedAt(string, ISO 8601) 字段
**And** domain 字段使用 z.enum 约束为 domains.ts 中定义的合法 slug 值
**And** 构建时自动校验 Markdown frontmatter 格式，不合规文件触发构建错误

### AC-2: 领域配置完整性
**Given** src/config/domains.ts 已存在
**When** 检查领域配置内容
**Then** 包含四大领域配置：ai-tech、cross-border-ecom、product-startup、github-trending
**And** 每个领域包含 slug、name、icon、color、bgColor、order 属性
**And** 使用 TypeScript as const 确保类型安全

### AC-3: 测试 Markdown 数据文件
**Given** Content Collections schema 已定义
**When** 创建测试数据文件
**Then** 创建至少 2 天的测试 Markdown 数据（2026-02-25 和 2026-02-26）
**And** 每天覆盖 4 个领域
**And** 每个测试文件包含 3-5 条资讯（标题 + 摘要 + 来源链接）

### AC-4: 内容工具函数
**Given** Content Collections 和测试数据已就绪
**When** 创建内容查询工具函数
**Then** src/lib/content-utils.ts 提供按日期查询、按领域过滤、获取日期列表等函数

### AC-5: 日期工具函数
**Given** 项目使用 YYYY-MM-DD 格式统一管理日期
**When** 创建日期工具函数
**Then** src/lib/date-utils.ts 提供日期格式化、比较、前后日期计算等函数

### AC-6: 构建验证
**Given** 所有文件已创建
**When** 执行 pnpm build
**Then** 构建成功完成，无错误

---

## 完成定义 (Definition of Done)

- [ ] src/content.config.ts 包含完整的 daily collection schema 定义
- [ ] src/config/domains.ts 包含四大领域配置，类型安全
- [ ] 创建 2 天 x 4 领域 = 8 个测试 Markdown 文件
- [ ] src/lib/content-utils.ts 提供内容查询工具函数
- [ ] src/lib/date-utils.ts 提供日期处理工具函数
- [ ] pnpm build 构建成功，无错误

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md
- PRD：_bmad-output/planning-artifacts/prd.md
- Story 1-1：_bmad-output/implementation-artifacts/stories/story-1-1.md
