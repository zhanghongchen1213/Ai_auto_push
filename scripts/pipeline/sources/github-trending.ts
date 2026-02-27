// scripts/pipeline/sources/github-trending.ts
// GitHub 热门项目领域信息源配置

import type { FetchSource } from "../types.ts";
import { registerDomainSources } from "./registry.ts";

export const githubTrendingSources: readonly FetchSource[] = [
  {
    name: "GitHub 热门项目",
    query: "GitHub trending repositories open source",
    type: "openclaw",
  },
  {
    name: "开源工具与框架",
    query: "open source tools frameworks release",
    type: "openclaw",
  },
] as const;

registerDomainSources("github-trending", githubTrendingSources);
