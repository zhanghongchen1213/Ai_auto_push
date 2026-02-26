# Story 1-1: 项目初始化与基础框架搭建

## Story ID
1-1

## Epic
Epic 1: 项目基础与每日资讯展示

## 标题
项目初始化与基础框架搭建

## 描述
作为开发者，
我想要基于 Astro Blog Starter 模板初始化项目并安装核心依赖，
以便拥有一个可运行的项目骨架作为后续开发的基础。

## 优先级
P0（阻塞所有后续开发）

## 复杂度
低

## 状态
ready-for-dev

## 依赖
无（这是项目的第一个 Story）

---

## 验收标准 (Acceptance Criteria)

### AC-1: Astro 项目初始化
**Given** 开发环境已安装 Node.js (>=18.x) 和 pnpm
**When** 执行项目初始化命令使用 blog 模板和 TypeScript strict 模式
**Then** 项目成功创建，包含 Astro 5.x 基础结构
**And** 项目根目录包含 astro.config.mjs、tsconfig.json、package.json

### AC-2: Tailwind CSS v4 集成
**Given** Astro 项目已初始化
**When** 安装 Tailwind CSS 集成
**Then** Tailwind CSS v4 通过 @astrojs/tailwind 集成安装完成
**And** astro.config.mjs 中正确注册 tailwind 集成
**And** 可以在 .astro 组件中使用 Tailwind 实用类

### AC-3: TypeScript Strict 模式
**Given** 项目已初始化
**When** 检查 TypeScript 配置
**Then** tsconfig.json 配置为 strict 模式
**And** TypeScript 编译无错误

### AC-4: 开发服务器启动
**Given** 所有依赖已安装
**When** 启动开发服务器
**Then** 开发服务器成功启动，无报错
**And** 浏览器可访问本地开发页面

### AC-5: 静态构建成功
**Given** 所有依赖已安装
**When** 执行构建命令
**Then** 构建命令成功完成，生成 dist/ 目录
**And** 构建过程无错误或警告
**And** 输出为纯静态 HTML 文件

### AC-6: Git 配置
**Given** 项目已初始化
**When** 检查版本控制配置
**Then** .gitignore 包含 node_modules/、dist/、.astro/ 等标准忽略项
**And** 项目可正常执行 git 操作

---

## 技术任务列表 (Technical Tasks)

### Task 1: Astro 项目脚手架创建
**预估时间：** 15 分钟
**描述：**
- 使用 Astro Blog Starter 模板初始化项目
- 初始化命令：pnpm create astro@latest -- --template blog --typescript strict
- 确认 Astro 版本为 5.x 稳定版
- 验证生成的项目结构完整性

**产出文件：**
- astro.config.mjs
- tsconfig.json
- package.json
- src/ 目录结构

### Task 2: Tailwind CSS v4 安装与配置
**预估时间：** 15 分钟
**描述：**
- 安装 @astrojs/tailwind 和 tailwindcss 依赖
- 在 astro.config.mjs 中注册 tailwind 集成
- 验证 Tailwind 实用类在组件中可用
- 确保构建时自动清除未使用样式

**产出文件：**
- astro.config.mjs（更新）
- package.json（更新依赖）
### Task 3: TypeScript 严格模式配置
**预估时间：** 10 分钟
**描述：**
- 确认 tsconfig.json 中 strict 模式已启用
- 配置路径别名（如 @components、@layouts、@config）
- 验证 TypeScript 编译通过，无类型错误
- 确保 Astro 组件中的 TypeScript 类型检查正常工作

**产出文件：**
- tsconfig.json（验证/更新）

### Task 4: Astro 构建配置
**预估时间：** 15 分钟
**描述：**
- 配置 astro.config.mjs 的 output 为 static 模式
- 配置 site URL（GitHub Pages 部署地址）
- 配置 base 路径（如需要）
- 验证构建输出为纯静态 HTML

**产出文件：**
- astro.config.mjs（更新）

**参考配置：**
```typescript
// astro.config.mjs
import { defineConfig } from "astro/config";
import tailwind from "@astrojs/tailwind";

export default defineConfig({
  output: "static",
  site: "https://<username>.github.io",
  base: "/Ai_auto_push",
  integrations: [tailwind()],
});
```

### Task 5: 项目目录结构规划
**预估时间：** 10 分钟
**描述：**
- 创建标准项目目录结构
- 确保目录组织符合架构文档规范

**目标目录结构：**
```
src/
├── components/      # UI 组件
├── config/          # 配置文件（领域配置等）
├── content/         # Content Collections（Markdown 资讯）
│   └── daily/       # 按日期组织的资讯文件
├── layouts/         # 页面布局模板
├── pages/           # 页面路由
│   ├── index.astro  # 首页
│   └── daily/       # 日期动态路由
├── styles/          # 全局样式
└── utils/           # 工具函数
scripts/
└── pipeline/        # Skills 自动化管道脚本
public/              # 静态资源
```

**产出文件：**
- 上述目录结构（空目录可包含 .gitkeep）

### Task 6: .gitignore 配置
**预估时间：** 5 分钟
**描述：**
- 确认 .gitignore 包含所有必要的忽略项
- 添加项目特定的忽略规则

**必须包含的忽略项：**
```
node_modules/
dist/
.astro/
.env
.env.*
*.log
.DS_Store
```

**产出文件：**
- .gitignore（验证/更新）

### Task 7: 开发与构建验证
**预估时间：** 10 分钟
**描述：**
- 启动开发服务器，确认无报错
- 执行构建命令，确认静态输出正常
- 验证 Tailwind CSS 类在页面中生效
- 确认 TypeScript 类型检查通过

---

## 技术规格 (Technical Specifications)

### 技术栈
| 技术 | 版本 | 用途 |
|------|------|------|
| Astro | 5.x | SSG 静态站点生成框架 |
| TypeScript | strict 模式 | 类型安全 |
| Tailwind CSS | v4 | 实用优先的 CSS 框架 |
| Node.js | >=18.x | 运行时环境 |
| pnpm | latest | 包管理器 |
| Vite | 内置于 Astro | 构建工具 |

### 关键配置项
- **输出模式：** static（纯静态 HTML）
- **TypeScript：** strict 模式，启用路径别名
- **Tailwind：** 通过 @astrojs/tailwind 集成，构建时清除未使用样式
- **部署目标：** GitHub Pages

### 架构约束
- 零客户端 JS 框架：不引入 React/Vue/Svelte，所有 UI 使用 .astro 组件
- 静态输出：构建产物为纯 HTML/CSS/JS，无服务端运行时
- Content Collections：Markdown 内容通过 Astro Content Collections 管理，构建时类型校验
- Git 仓库作为系统总线：管道输出和前端输入通过 Git commit 耦合

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR1 | FCP <= 1.5s | 选择 Astro SSG 静态输出，零运行时框架开销 |
| NFR4 | 单页面 <= 500KB | Tailwind CSS 构建时清除未使用样式 |
| NFR10 | HTTPS 服务 | GitHub Pages 默认提供 HTTPS |

---

## 完成定义 (Definition of Done)

- [ ] Astro 5.x 项目通过 Blog Starter 模板成功初始化
- [ ] Tailwind CSS v4 通过 @astrojs/tailwind 集成安装并可用
- [ ] tsconfig.json 配置为 strict 模式，编译无错误
- [ ] astro.config.mjs 配置 static 输出模式和 GitHub Pages 部署参数
- [ ] 项目目录结构符合架构文档规范
- [ ] .gitignore 包含所有标准忽略项
- [ ] 开发服务器可成功启动
- [ ] 构建命令可成功生成 dist/ 静态输出
- [ ] 代码已提交至 Git 仓库

---

## 测试策略

### 验证清单
1. **初始化验证：** 项目创建后目录结构完整
2. **依赖验证：** pnpm install 无错误，所有依赖正确安装
3. **TypeScript 验证：** tsc --noEmit 编译通过
4. **开发服务器验证：** 启动后可访问 localhost
5. **构建验证：** pnpm build 成功生成 dist/ 目录
6. **Tailwind 验证：** 在组件中使用 Tailwind 类，构建后样式正确应用

---

## 后续 Story 依赖说明

本 Story 完成后，以下 Story 可以开始开发：
- **Story 1-2（Content Collections Schema 与领域配置）：** 依赖本 Story 提供的项目骨架
- **Story 1-3（基础布局与 Header 组件）：** 依赖本 Story 的 Tailwind CSS 和布局基础
- **Story 5-5（GitHub Actions CI/CD）：** 依赖本 Story 的构建配置

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md
- PRD：_bmad-output/planning-artifacts/prd.md
- UX 设计规范：_bmad-output/planning-artifacts/ux-design-specification.md
- Epics & Stories：_bmad-output/planning-artifacts/epics-and-stories.md
- Astro 官方文档：https://docs.astro.build
- Tailwind CSS v4 文档：https://tailwindcss.com/docs
