# Story 5-3: 手动触发与故障恢复

## Story ID
5-3

## Epic
Epic 5: 管道健壮性与可观测性

## 标题
手动触发与故障恢复

## 描述
作为系统运维者，
我想要能够手动触发管道执行进行故障恢复，
以便在自动执行失败时快速修复并补发当日资讯。

## 优先级
P1

## 复杂度
低

## 状态
ready

## 依赖
- Story 4-1: 管道入口与领域调度框架（已完成，提供 run.ts CLI 参数解析与调度循环）
- Story 4-5: Git 自动提交推送（已完成，提供 publish.ts 提交与推送逻辑）
- Story 5-1: 单领域失败隔离机制（已完成，提供逐阶段错误隔离与错误分类）
- Story 5-2: Git commit 可观测性（已完成，提供结构化 commit message）

---

## 现状分析

### 已有的 CLI 参数支持（Story 4-1 已实现）
当前 `run.ts` 已支持以下命令行参数：

```typescript
// run.ts L52-L66 - 现有 CLI 参数解析
const { values } = parseArgs({
  args,
  options: {
    domain: { type: "string", short: "d" },
    "dry-run": { type: "boolean", default: false },
    date: { type: "string" },
  },
  strict: true,
});
```

- `--domain / -d`：指定单领域执行（已实现）
- `--dry-run`：模拟执行不写入文件（已实现）
- `--date`：指定执行日期（已实现，默认 UTC 当天）

### 已有的 npm script
```json
"pipeline": "tsx scripts/pipeline/run.ts"
```

可通过 `pnpm run pipeline -- --domain ai-tech --date 2026-02-27` 手动执行。

### 已有的幂等性基础
`format.ts` 的 `writeMarkdownFile` 使用原子写入（tmp + rename），重复执行同一天的管道会覆盖已有的 Markdown 文件，天然具备幂等性。

### 尚未实现的部分
1. **GitHub Actions workflow 文件** — `.github/workflows/` 目录不存在，需从零创建
2. **workflow_dispatch 手动触发配置** — 需支持参数化触发（指定领域、日期）
3. **定时触发 schedule** — 每日自动执行的 cron 配置
4. **环境变量传递** — LLM API Key 等 secrets 注入

---

## 验收标准 (Acceptance Criteria)

### AC-1: GitHub Actions 手动触发
**Given** 当日自动管道执行失败或部分失败
**When** 运维者通过 GitHub Actions 手动触发 pipeline workflow
**Then** 管道重新执行完整的抓取-筛选-格式化-发布流程（FR23）
**And** 手动触发的执行与自动触发使用相同的管道代码路径

### AC-2: 支持指定单领域执行
**Given** 运维者需要定向修复某个失败领域
**When** 通过 workflow_dispatch 参数指定执行单个领域
**Then** 管道仅执行指定领域的抓取-筛选-格式化-发布流程
**And** 参数值为领域 slug（如 `ai-tech`、`cross-border-ecom`）
**And** 留空或选择 `all` 时执行全部领域

### AC-3: 支持指定日期执行
**Given** 运维者需要补发某天的资讯
**When** 通过 workflow_dispatch 参数指定执行日期
**Then** 管道使用指定日期执行（格式 YYYY-MM-DD）
**And** 留空时默认使用 UTC 当天日期

### AC-4: 幂等性覆盖
**Given** 某日的管道已执行过（成功或部分成功）
**When** 重复执行同一天的管道
**Then** 新生成的 Markdown 文件覆盖已有文件
**And** Git commit 正常记录本次执行结果

### AC-5: 手动执行的可观测性
**Given** 手动触发的管道执行完成
**When** 查看执行结果
**Then** GitHub Actions 日志展示完整的管道执行汇总
**And** Git commit message 与自动触发格式一致
**And** 可区分手动触发与自动触发（通过 GitHub Actions 的触发类型标记）

### AC-6: 定时自动触发
**Given** 配置了 cron schedule
**When** 到达预定执行时间
**Then** 管道自动执行全部领域
**And** 执行结果通过 Git commit 记录

---

## 技术任务列表 (Technical Tasks)

### Task 1: 创建 GitHub Actions workflow 文件
**预估时间：** 15 分钟
**新建文件：** `.github/workflows/pipeline.yml`

创建支持 schedule + workflow_dispatch 双触发模式的 workflow：

```yaml
name: Daily Pipeline

on:
  schedule:
    - cron: "0 1 * * *"  # 每日 UTC 01:00（北京时间 09:00）

  workflow_dispatch:
    inputs:
      domain:
        description: "指定领域 slug（留空执行全部领域）"
        required: false
        default: "all"
        type: choice
        # 注意：新增领域时需同步更新此列表，与 src/config/domains.ts 保持一致
        options:
          - all
          - ai-tech
          - cross-border-ecom
          - product-startup
          - github-trending
      date:
        description: "指定执行日期 YYYY-MM-DD（留空使用 UTC 当天）"
        required: false
        type: string
      dry_run:
        description: "模拟执行（不写入文件、不提交）"
        required: false
        default: false
        type: boolean

permissions:
  contents: write

concurrency:
  group: pipeline-${{ github.ref }}
  cancel-in-progress: false
```

关键设计：
- `workflow_dispatch.inputs.domain` 使用 `choice` 类型，列出所有可用领域 slug，避免手动输入错误
- schedule 触发时 `github.event.inputs` 为空，所有参数走默认值（全部领域、当天日期、非 dry-run）
- `permissions: contents: write` 确保 pipeline 的 git push 有权限
- `concurrency` 排队执行，防止并发 push 冲突
- `cancel-in-progress: false` 确保不会取消正在执行的管道

---

### Task 2: 实现 workflow jobs 步骤
**预估时间：** 10 分钟
**修改文件：** `.github/workflows/pipeline.yml`

在 workflow 文件中添加 jobs 定义：

```yaml
jobs:
  run-pipeline:
    runs-on: ubuntu-latest
    timeout-minutes: 15

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

      - name: Configure Git identity
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"

      - name: Build pipeline arguments
        id: args
        run: |
          ARGS=""
          DOMAIN="${{ github.event.inputs.domain || 'all' }}"
          if [ "$DOMAIN" != "all" ] && [ -n "$DOMAIN" ]; then
            ARGS="$ARGS --domain $DOMAIN"
          fi
          DATE="${{ github.event.inputs.date }}"
          if [ -n "$DATE" ]; then
            ARGS="$ARGS --date $DATE"
          fi
          DRY_RUN="${{ github.event.inputs.dry_run }}"
          if [ "$DRY_RUN" = "true" ]; then
            ARGS="$ARGS --dry-run"
          fi
          echo "pipeline_args=$ARGS" >> "$GITHUB_OUTPUT"

      - name: Run pipeline
        env:
          LLM_API_KEY: ${{ secrets.LLM_API_KEY }}
          LLM_BASE_URL: ${{ secrets.LLM_BASE_URL }}
        run: pnpm run pipeline -- ${{ steps.args.outputs.pipeline_args }}
```

关键设计：
- Git 身份配置在 pipeline 执行前，确保 `publish.ts` 的 git commit 正常工作
- `Build pipeline arguments` 步骤将 workflow_dispatch 输入转换为 CLI 参数
- schedule 触发时 `github.event.inputs` 为空，`DOMAIN` 默认 `all`，`DATE` 和 `DRY_RUN` 为空，等价于无参数执行
- `timeout-minutes: 15` 防止管道卡死占用 runner

---

### Task 3: 验证 publish.ts 的 CI 兼容性
**预估时间：** 10 分钟
**修改文件：** `scripts/pipeline/publish.ts`（如需修改）

检查 `publish.ts` 中的 git push 逻辑在 GitHub Actions 环境下的兼容性：

1. **push 目标分支**：确认 push 到当前 checkout 的分支（`actions/checkout` 默认 checkout 触发分支）
2. **认证方式**：`actions/checkout@v4` 默认使用 `GITHUB_TOKEN` 配置 git credential，无需额外配置
3. **并发保护**：workflow 层面已通过 `concurrency` 配置排队执行

需要验证的点：
- `git push` 命令是否指定了远程和分支（CI 环境可能需要显式指定）
- 如果 push 失败（如远程有新提交），是否有重试或 pull-rebase 逻辑
- dry-run 模式下是否正确跳过 push

---

### Task 4: 编写 workflow 配置一致性测试
**预估时间：** 10 分钟
**新建文件：** `tests/pipeline/workflow-validation.test.ts`

编写测试验证 workflow 文件中的领域列表与 `domains.ts` 保持一致：

```typescript
import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { domains } from "../../src/config/domains.ts";

describe("GitHub Actions workflow 配置一致性", () => {
  it("workflow_dispatch 的领域选项与 domains.ts 保持同步", async () => {
    const workflowPath = join(
      import.meta.dirname, "..", "..",
      ".github", "workflows", "pipeline.yml",
    );
    const content = await readFile(workflowPath, "utf-8");
    const expectedSlugs = domains.map((d) => d.slug);

    for (const slug of expectedSlugs) {
      expect(content).toContain(`- ${slug}`);
    }
    expect(content).toContain("- all");
  });

  it("workflow 文件包含必要的触发器", async () => {
    const workflowPath = join(
      import.meta.dirname, "..", "..",
      ".github", "workflows", "pipeline.yml",
    );
    const content = await readFile(workflowPath, "utf-8");

    expect(content).toContain("workflow_dispatch:");
    expect(content).toContain("schedule:");
    expect(content).toContain("pnpm run pipeline");
  });
});
```

---

### Task 5: 配置 GitHub Repository Secrets
**预估时间：** 5 分钟
**操作位置：** GitHub 仓库 Settings → Secrets and variables → Actions

需要配置的 Secrets：

| Secret 名称 | 说明 | 必需 |
|-------------|------|------|
| `LLM_API_KEY` | LLM 服务的 API 密钥 | 是 |
| `LLM_BASE_URL` | LLM 服务的自定义端点（如使用非默认端点） | 否 |

注意：`GITHUB_TOKEN` 由 GitHub Actions 自动提供，无需手动配置。`actions/checkout@v4` 会自动使用它配置 git credential，支持 push 操作。

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `.github/workflows/pipeline.yml` | 新建 | GitHub Actions workflow，支持 schedule + workflow_dispatch |
| `scripts/pipeline/publish.ts` | 检查 | 验证 git push 在 CI 环境的兼容性（可能无需修改） |
| `tests/pipeline/workflow-validation.test.ts` | 新建 | workflow 配置一致性测试 |

---

## 测试策略

### 配置一致性测试（自动化）
- workflow 文件中的领域选项列表与 `domains.ts` 保持同步
- workflow 文件包含必要的触发器（schedule、workflow_dispatch）
- workflow 文件包含正确的 pipeline 执行命令

### 手动验证清单（push 后执行）
由于 GitHub Actions workflow 无法在本地完整模拟，以下项目需在 push 后手动验证：

- [ ] workflow 文件语法正确（GitHub 自动校验）
- [ ] 手动触发 → 选择 `all` → 全部领域执行成功
- [ ] 手动触发 → 选择 `ai-tech` → 仅 ai-tech 领域执行
- [ ] 手动触发 → 指定日期 `2026-02-26` → 使用指定日期执行
- [ ] 手动触发 → 勾选 dry_run → 不写入文件、不提交
- [ ] 定时触发 → 等待 cron 时间到达后自动执行
- [ ] 重复执行同一天 → 覆盖已有文件，Git commit 正常
- [ ] Git commit message 格式与本地执行一致
- [ ] 并发触发 → 排队执行，不冲突

### 幂等性验证
- 连续两次执行同一天同一领域的管道
- 验证第二次执行覆盖第一次的 Markdown 文件
- 验证两次 Git commit 均正常记录

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| FR23 | 手动触发管道执行 | workflow_dispatch 支持参数化手动触发 |
| NFR6 | 每日自动发布成功率 ≥99% | 故障恢复机制 + 定时自动触发 |
| NFR7 | 单领域失败不影响其他领域 | 手动触发支持指定单领域定向修复 |
| NFR9 | 失败时保留完整错误日志 | GitHub Actions 日志 + Git commit message |

---

## 完成定义 (Definition of Done)

- [ ] `.github/workflows/pipeline.yml` 创建完成，包含 schedule 和 workflow_dispatch 触发器
- [ ] workflow_dispatch 支持 domain、date、dry_run 三个输入参数
- [ ] domain 参数提供下拉选择，包含 all 和所有领域 slug
- [ ] schedule 配置每日 UTC 01:00 自动执行
- [ ] workflow 配置 Git 身份（github-actions[bot]）
- [ ] workflow 配置并发控制（排队不取消）
- [ ] workflow 注入 LLM_API_KEY 等必要 secrets
- [ ] 手动触发与自动触发使用相同的 `pnpm run pipeline` 代码路径
- [ ] 重复执行同一天的管道覆盖已有文件（幂等性）
- [ ] 配置一致性测试通过（领域列表同步验证）
- [ ] 手动验证清单全部通过

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节）
- PRD：_bmad-output/planning-artifacts/prd.md（FR23、NFR6）
- 管道入口：scripts/pipeline/run.ts（CLI 参数解析）
- 领域配置：src/config/domains.ts（领域 slug 列表）
- Epic 分解：_bmad-output/planning-artifacts/epics-and-stories.md（Story 5.3）
- Story 5-1：_bmad-output/implementation-artifacts/stories/story-5-1.md（失败隔离机制）
- Story 5-2：_bmad-output/implementation-artifacts/stories/story-5-2.md（Git commit 可观测性）
