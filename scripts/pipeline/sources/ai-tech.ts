// scripts/pipeline/sources/ai-tech.ts
// AI 技术领域信息源配置

import type { FetchSource } from "../types.ts";
import { registerDomainSources } from "./registry.ts";

export const aiTechSources: readonly FetchSource[] = [
  {
    name: "AI 综合资讯",
    query: "artificial intelligence news today",
    type: "openclaw",
  },
  {
    name: "大模型与 LLM 动态",
    query: "large language model LLM news",
    type: "openclaw",
  },
  {
    name: "AI 产品发布",
    query: "AI product launch release announcement",
    type: "openclaw",
  },
] as const;

registerDomainSources("ai-tech", aiTechSources);
