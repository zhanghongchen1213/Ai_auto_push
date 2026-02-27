# Story 5-5: GitHub Actions CI/CD 部署流水线

## Story ID
5-5

## Epic
Epic 5: 管道健壮性与可观测性

## 标题
GitHub Actions CI/CD 部署流水线

## 描述
作为系统运维者，
我想要通过 GitHub Actions 实现站点的自动构建和部署，
以便管道推送新内容后网站自动更新，无需人工干预。

## 优先级
P0

## 复杂度
中

## 状态
ready

## 依赖
- Story 5-3: GitHub Actions 定时触发配置（已完成，提供 `.github/workflows/pipeline.yml` 内容管道 workflow）
- Story 4-4: Markdown 格式化输出（已完成，提供内容文件生成）
- Story 4-5: Git 自动提交推送（已完成，管道推送内容到 main 分支）

---

## 现状分析

### 已有的 CI/CD 基础设施

#### pipeline.yml（Story 5-3 已创建）
`.github/workflows/pipeline.yml` 负责内容管道的定时执行：
- 每日 UTC 01:00 定时触发，执行 `pnpm run pipeline`
- 抓取、筛选、格式化资讯内容并 git push 到 main 分支
- 该 workflow 职责是"生产内容"，不负责构建和部署站点

#### 构建脚本（package.json 已定义）
```json
{
  "build": "astro build && pagefind --site dist --force-language zh-cn"
}
```
- `astro build` 生成静态站点到 `dist/` 目录
- `pagefind` 在构建后自动索引所有 HTML 页面，支持中文搜索

#### Astro 配置（astro.config.mjs）
```javascript
export default defineConfig({
  output: 'static',
  site: 'https://xiaozhangxuezhang.github.io',
  base: '/Ai_auto_push',
  integrations: [mdx(), sitemap()],
});
```
- 静态输出模式，适合 GitHub Pages 部署
- `base: '/Ai_auto_push'` 已配置项目子路径
- 集成了 sitemap 生成

### 本 Story 需要实现的部分
1. **创建独立的 deploy.yml** — 构建部署 workflow，与 pipeline.yml 职责分离
2. **GitHub Pages 部署配置** — 使用 `actions/deploy-pages` 从 artifact 部署
3. **Pagefind 索引集成** — 确保搜索索引在构建流程中自动生成
4. **构建失败告警** — 利用 GitHub 原生通知机制

---

## 验收标准 (Acceptance Criteria)

### AC-1: main 分支 push 自动触发构建
**Given** 内容管道或开发者向 main 分支推送了新的 commit
**When** GitHub 检测到 main 分支的 push 事件
**Then** deploy.yml workflow 自动触发
**And** 执行 `pnpm install --frozen-lockfile` 安装依赖
**And** 执行 `pnpm run build`（包含 astro build + pagefind 索引）

### AC-2: Pagefind 搜索索引自动生成
**Given** `astro build` 成功生成静态 HTML 页面到 `dist/` 目录
**When** 构建脚本继续执行 pagefind 命令
**Then** Pagefind 自动索引 `dist/` 下所有 HTML 页面
**And** 索引文件生成在 `dist/pagefind/` 目录中
**And** 索引语言配置为 `zh-cn`

### AC-3: 构建产物上传为 Pages artifact
**Given** `pnpm run build` 成功完成
**When** 构建步骤结束
**Then** `dist/` 目录通过 `actions/upload-pages-artifact` 上传为 artifact
**And** artifact 包含完整的静态站点文件和 Pagefind 索引

### AC-4: GitHub Pages 自动部署
**Given** 构建产物已上传为 Pages artifact
**When** deploy job 执行
**Then** 通过 `actions/deploy-pages` 将 artifact 部署到 GitHub Pages
**And** 站点通过 HTTPS 提供服务
**And** 站点 URL 为 `https://xiaozhangxuezhang.github.io/Ai_auto_push/`

### AC-5: 部署后站点可访问最新内容
**Given** deploy job 成功完成
**When** 用户访问站点 URL
**Then** 站点在 5 分钟内展示最新部署的内容
**And** 搜索功能正常工作（Pagefind 索引已加载）

### AC-6: 构建失败时告警通知
**Given** 构建或部署过程中发生错误
**When** workflow 执行失败
**Then** GitHub 通过邮件/通知向仓库 owner 发送失败告警
**And** workflow 日志中包含详细的错误信息

### AC-7: 并发部署安全
**Given** 多个 push 事件在短时间内触发多次 workflow
**When** 新的 workflow run 开始
**Then** 取消正在进行的旧 workflow run（cancel-in-progress）
**And** 确保最终部署的是最新的 commit

---

## 技术任务列表 (Technical Tasks)

### Task 1: 创建 deploy.yml workflow 文件
**预估时间：** 15 分钟
**新建文件：** `.github/workflows/deploy.yml`

创建独立的构建部署 workflow，与 pipeline.yml 职责分离：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup pnpm
        uses: pnpm/action-setup@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - name: Install dependencies
        run: pnpm install --frozen-lockfile

      - name: Build site
        run: pnpm run build

      - name: Upload Pages artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    timeout-minutes: 5
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

关键设计决策：
- **触发条件**：`push` 到 main 分支（管道推送内容后自动触发）+ `workflow_dispatch`（手动触发）
- **权限最小化**：`contents: read`（只读代码）、`pages: write`（写入 Pages）、`id-token: write`（OIDC 部署认证）
- **并发控制**：`cancel-in-progress: true`，新部署取消旧部署，确保最终状态一致
- **两阶段 job**：build 和 deploy 分离，deploy 依赖 build 成功
- **environment 配置**：使用 `github-pages` environment，GitHub 自动关联 Pages 设置

---

### Task 2: 验证 build 脚本的 Pagefind 集成
**预估时间：** 5 分钟
**相关文件：** `package.json`

确认 `pnpm run build` 已包含 Pagefind 索引步骤：

```json
"build": "astro build && pagefind --site dist --force-language zh-cn"
```

验证要点：
- `astro build` 输出到 `dist/` 目录（Astro 默认行为）
- `pagefind --site dist` 在 `dist/` 中生成 `pagefind/` 索引目录
- `--force-language zh-cn` 确保中文分词正确
- 两个命令通过 `&&` 串联，astro build 失败时 pagefind 不会执行

无需修改，现有配置已满足需求。

---

### Task 3: 配置 GitHub Pages 仓库设置
**预估时间：** 5 分钟
**操作位置：** GitHub 仓库 Settings > Pages

需要手动配置（非代码变更）：
1. 进入仓库 Settings > Pages
2. Source 选择 "GitHub Actions"（而非 "Deploy from a branch"）
3. 确认 HTTPS 已启用（GitHub Pages 默认强制 HTTPS）

此步骤为一次性手动操作，确保 `actions/deploy-pages` 有权限部署。

---

### Task 4: 验证 astro.config.mjs 部署配置
**预估时间：** 5 分钟
**相关文件：** `astro.config.mjs`

确认现有配置与 GitHub Pages 部署兼容：

```javascript
export default defineConfig({
  output: 'static',           // 静态输出，适合 Pages
  site: 'https://xiaozhangxuezhang.github.io',  // 站点域名
  base: '/Ai_auto_push',     // 项目子路径
});
```

验证要点：
- `output: 'static'` 确保生成纯静态文件
- `site` 与 GitHub Pages 域名一致
- `base` 与仓库名一致，确保资源路径正确
- sitemap 集成会自动使用正确的 `site` + `base` 生成 URL

无需修改，现有配置已满足需求。

---

### Task 5: 添加构建状态徽章到 README（可选）
**预估时间：** 5 分钟
**修改文件：** `README.md`（如存在）

在项目 README 中添加部署状态徽章：

```markdown
[![Deploy to GitHub Pages](https://github.com/xiaozhangxuezhang/Ai_auto_push/actions/workflows/deploy.yml/badge.svg)](https://github.com/xiaozhangxuezhang/Ai_auto_push/actions/workflows/deploy.yml)
```

此任务为可选增强，不影响核心功能。

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `.github/workflows/deploy.yml` | 新建 | 构建部署 workflow（build + deploy 两阶段） |

### 无需修改的文件（已验证兼容）

| 文件路径 | 说明 |
|---------|------|
| `package.json` | `build` 脚本已包含 astro build + pagefind 索引 |
| `astro.config.mjs` | site/base/output 配置已适配 GitHub Pages |
| `.github/workflows/pipeline.yml` | 内容管道 workflow，职责独立，无需修改 |

---

## Workflow 职责分离说明

| Workflow | 文件 | 触发条件 | 职责 |
|----------|------|---------|------|
| Daily Pipeline | `pipeline.yml` | 定时 cron + 手动 | 抓取资讯、AI 筛选、生成 Markdown、git push |
| Deploy | `deploy.yml` | main 分支 push + 手动 | 构建 Astro 站点、Pagefind 索引、部署到 GitHub Pages |

执行流程：
```
pipeline.yml (定时触发)
  -> 抓取/筛选/格式化资讯
  -> git push 到 main 分支
  -> 触发 deploy.yml (push 事件)
    -> pnpm install + pnpm run build
    -> upload-pages-artifact
    -> deploy-pages -> 站点更新
```

---

## 测试策略

### 手动验证（主要方式）
GitHub Actions workflow 的测试主要依赖实际执行验证：

1. **workflow 语法验证**
   - 推送 deploy.yml 到 main 分支
   - 确认 workflow 被正确识别（Actions 页面可见）
   - 确认 push 事件正确触发 workflow

2. **构建流程验证**
   - 确认 `pnpm install --frozen-lockfile` 成功
   - 确认 `pnpm run build` 成功（astro build + pagefind）
   - 确认 `dist/` 目录包含 HTML 文件和 `pagefind/` 索引目录

3. **部署验证**
   - 确认 `upload-pages-artifact` 成功上传
   - 确认 `deploy-pages` 成功部署
   - 访问 `https://xiaozhangxuezhang.github.io/Ai_auto_push/` 验证站点可访问
   - 验证搜索功能正常工作（Pagefind 索引已加载）

4. **并发安全验证**
   - 快速连续推送两次 commit
   - 确认旧的 workflow run 被取消
   - 确认最终部署的是最新 commit 的内容

5. **失败告警验证**
   - 故意制造构建失败（如临时修改 build 脚本）
   - 确认 GitHub 发送失败通知
   - 确认 workflow 日志包含详细错误信息

### 本地构建验证
在创建 workflow 前，可本地验证构建流程：
```bash
pnpm install
pnpm run build
ls -la dist/
ls -la dist/pagefind/
```

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR1 | 页面首屏加载 ≤3s（4G 网络） | 静态站点 + GitHub Pages CDN 确保快速加载 |
| NFR5 | 全站 HTTPS | GitHub Pages 默认强制 HTTPS |
| NFR6 | 每日自动发布成功率 ≥99% | 自动化部署流水线，无人工干预 |
| NFR8 | 站点可用性 ≥99.9% | GitHub Pages 高可用基础设施 |
| FR22 | GitHub Actions 自动触发 | main 分支 push 事件自动触发构建部署 |

---

## 完成定义 (Definition of Done)

- [ ] `.github/workflows/deploy.yml` 已创建并推送到 main 分支
- [ ] GitHub 仓库 Pages 设置已配置为 "GitHub Actions" 源
- [ ] main 分支 push 事件自动触发 deploy workflow
- [ ] `pnpm install` 和 `pnpm run build` 在 CI 环境中成功执行
- [ ] Pagefind 在构建后自动索引所有 HTML 页面
- [ ] 构建产物通过 `actions/upload-pages-artifact` 成功上传
- [ ] `actions/deploy-pages` 成功部署到 GitHub Pages
- [ ] 站点通过 `https://xiaozhangxuezhang.github.io/Ai_auto_push/` 可访问
- [ ] 站点通过 HTTPS 提供服务
- [ ] 搜索功能正常工作（Pagefind 索引已加载）
- [ ] 构建失败时 GitHub 通知机制正常告警
- [ ] 并发部署时旧 run 被正确取消
- [ ] 部署完成后站点在 5 分钟内可访问最新内容

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Deployment 章节）
- PRD：_bmad-output/planning-artifacts/prd.md（FR22、NFR5、NFR6、NFR8）
- Astro 配置：astro.config.mjs
- 构建脚本：package.json（build script）
- 内容管道 workflow：.github/workflows/pipeline.yml（Story 5-3）
- Epic 分解：_bmad-output/planning-artifacts/epics-and-stories.md（Story 5.5）
