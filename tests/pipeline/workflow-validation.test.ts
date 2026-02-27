import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { domains } from "../../src/config/domains.ts";

const workflowDir = join(
  import.meta.dirname,
  "..",
  "..",
  ".github",
  "workflows",
);

const workflowPath = join(workflowDir, "pipeline.yml");
const deployWorkflowPath = join(workflowDir, "deploy.yml");

async function loadWorkflow(): Promise<string> {
  return readFile(workflowPath, "utf-8");
}

describe("GitHub Actions workflow 配置一致性", () => {
  it("workflow 文件存在且可读", async () => {
    const content = await loadWorkflow();
    expect(content.length).toBeGreaterThan(0);
  });

  it("workflow_dispatch 的领域选项与 domains.ts 保持同步", async () => {
    const content = await loadWorkflow();
    const expectedSlugs = domains.map((d) => d.slug);

    for (const slug of expectedSlugs) {
      expect(content).toContain(`- ${slug}`);
    }
    // "all" 选项必须存在
    expect(content).toContain("- all");
  });

  it("workflow_dispatch 不包含 domains.ts 中不存在的领域", async () => {
    const content = await loadWorkflow();
    const knownSlugs = new Set(domains.map((d) => d.slug));
    knownSlugs.add("all");

    // 提取 options 块中的所有 "- xxx" 项
    const optionsMatch = content.match(/options:\s*\n((?:\s+-\s+\S+\n?)+)/);
    expect(optionsMatch).not.toBeNull();

    const optionLines = optionsMatch![1].match(/- (\S+)/g) ?? [];
    const workflowSlugs = optionLines.map((line) => line.replace(/^- /, ""));

    for (const slug of workflowSlugs) {
      expect(knownSlugs.has(slug)).toBe(true);
    }
  });

  it("workflow 文件包含 schedule 触发器", async () => {
    const content = await loadWorkflow();
    expect(content).toContain("schedule:");
    expect(content).toMatch(/cron:\s*"/);
  });

  it("workflow 文件包含 workflow_dispatch 触发器", async () => {
    const content = await loadWorkflow();
    expect(content).toContain("workflow_dispatch:");
  });

  it("workflow 使用 pnpm run pipeline 执行管道", async () => {
    const content = await loadWorkflow();
    expect(content).toContain("pnpm run pipeline");
  });

  it("workflow 配置了 contents: write 权限", async () => {
    const content = await loadWorkflow();
    expect(content).toContain("contents: write");
  });

  it("workflow 配置了 concurrency 防止并发冲突", async () => {
    const content = await loadWorkflow();
    expect(content).toContain("concurrency:");
    expect(content).toContain("cancel-in-progress: false");
  });

  it("workflow 配置了 Git 身份", async () => {
    const content = await loadWorkflow();
    expect(content).toContain("github-actions[bot]");
  });

  it("workflow 注入了 LLM_API_KEY secret", async () => {
    const content = await loadWorkflow();
    expect(content).toContain("LLM_API_KEY");
    expect(content).toContain("secrets.LLM_API_KEY");
  });

  it("workflow_dispatch 包含 domain、date、dry_run 三个输入参数", async () => {
    const content = await loadWorkflow();
    expect(content).toContain("domain:");
    expect(content).toContain("date:");
    expect(content).toContain("dry_run:");
  });

  it("workflow 的参数构建步骤正确映射 CLI 参数", async () => {
    const content = await loadWorkflow();
    // domain 映射为 --domain
    expect(content).toContain("--domain $DOMAIN");
    // date 映射为 --date
    expect(content).toContain("--date $DATE");
    // dry_run 映射为 --dry-run
    expect(content).toContain("--dry-run");
  });

  it("workflow 通过 env 传递用户输入而非直接 ${{ }} 注入 shell", async () => {
    const content = await loadWorkflow();
    // 参数构建步骤应使用 env 块传递 inputs
    expect(content).toContain("INPUT_DOMAIN:");
    expect(content).toContain("INPUT_DATE:");
    expect(content).toContain("INPUT_DRY_RUN:");
    // shell 中应引用 env 变量而非 ${{ github.event.inputs.* }}
    expect(content).toContain("${INPUT_DOMAIN");
    expect(content).toContain("$INPUT_DATE");
    expect(content).toContain("$INPUT_DRY_RUN");
  });

  it("workflow 参数构建步骤包含输入校验", async () => {
    const content = await loadWorkflow();
    // domain slug 格式校验
    expect(content).toMatch(/grep.*\[a-z0-9\]/);
    // date 格式校验
    expect(content).toMatch(/grep.*\[0-9\]\{4\}/);
  });

  it("Run pipeline 步骤通过 env 传递 PIPELINE_ARGS 而非直接插值", async () => {
    const content = await loadWorkflow();
    expect(content).toContain("PIPELINE_ARGS:");
    expect(content).toContain("$PIPELINE_ARGS");
  });

  it("workflow 设置了合理的超时时间", async () => {
    const content = await loadWorkflow();
    expect(content).toMatch(/timeout-minutes:\s*\d+/);
  });
});

// --- Deploy workflow 验证 ---

async function loadDeployWorkflow(): Promise<string> {
  return readFile(deployWorkflowPath, "utf-8");
}

describe("Deploy workflow 配置验证", () => {
  it("deploy.yml 文件存在且可读", async () => {
    const content = await loadDeployWorkflow();
    expect(content.length).toBeGreaterThan(0);
  });

  it("deploy workflow 名称为 Deploy to GitHub Pages", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("name: Deploy to GitHub Pages");
  });

  it("deploy workflow 由 main 分支 push 事件触发", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("push:");
    expect(content).toContain("branches: [main]");
  });

  it("deploy workflow 支持手动触发", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("workflow_dispatch:");
  });

  it("deploy workflow 配置了最小权限: contents read", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("contents: read");
  });

  it("deploy workflow 配置了 pages write 权限", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("pages: write");
  });

  it("deploy workflow 配置了 id-token write 权限（OIDC 部署认证）", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("id-token: write");
  });

  it("deploy workflow 配置了并发控制且不取消进行中的部署", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("concurrency:");
    expect(content).toContain("group: pages-deploy");
    expect(content).toContain("cancel-in-progress: false");
  });

  it("deploy workflow 包含 build 和 deploy 两个 job", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("jobs:");
    expect(content).toMatch(/^\s+build:/m);
    expect(content).toMatch(/^\s+deploy:/m);
  });

  it("build job 使用 pnpm install --frozen-lockfile", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("pnpm install --frozen-lockfile");
  });

  it("build job 执行 pnpm run build（含 astro build + pagefind）", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("pnpm run build");
  });

  it("build job 使用 upload-pages-artifact 上传 dist 目录", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("actions/upload-pages-artifact@v3");
    expect(content).toContain("path: dist");
  });

  it("deploy job 依赖 build job", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("needs: build");
  });

  it("deploy job 使用 deploy-pages action", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("actions/deploy-pages@v4");
  });

  it("deploy job 配置了 github-pages environment", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("name: github-pages");
  });

  it("deploy job 输出 page_url", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("steps.deployment.outputs.page_url");
  });

  it("build 和 deploy job 都设置了超时时间", async () => {
    const content = await loadDeployWorkflow();
    const timeoutMatches = content.match(/timeout-minutes:\s*\d+/g);
    expect(timeoutMatches).not.toBeNull();
    expect(timeoutMatches!.length).toBeGreaterThanOrEqual(2);
  });

  it("deploy workflow 不包含 contents: write 权限（只读即可）", async () => {
    const content = await loadDeployWorkflow();
    expect(content).not.toContain("contents: write");
  });

  it("deploy workflow 与 pipeline workflow 职责分离（不含 pipeline 命令）", async () => {
    const content = await loadDeployWorkflow();
    expect(content).not.toContain("pnpm run pipeline");
    expect(content).not.toContain("LLM_API_KEY");
    expect(content).not.toContain("git config user.name");
  });

  it("deploy workflow push 触发配置了 paths-ignore 排除内容目录", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("paths-ignore:");
    expect(content).toContain("src/content/**");
  });

  it("deploy workflow 配置了 workflow_run 触发器监听 Daily Pipeline", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain("workflow_run:");
    expect(content).toContain('workflows: ["Daily Pipeline"]');
    expect(content).toContain("types: [completed]");
  });

  it("build job 仅在 workflow_run 成功时才执行", async () => {
    const content = await loadDeployWorkflow();
    expect(content).toContain(
      "github.event.workflow_run.conclusion == 'success'",
    );
  });

  it("deploy workflow 不包含危险权限", async () => {
    const content = await loadDeployWorkflow();
    expect(content).not.toContain("packages: write");
    expect(content).not.toContain("actions: write");
    expect(content).not.toContain("security-events: write");
  });
});
