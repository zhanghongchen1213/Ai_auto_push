// scripts/pipeline/sources/cross-border-ecom.ts
// 跨境电商领域信息源配置

import type { FetchSource } from "../types.ts";
import { registerDomainSources } from "./registry.ts";

export const crossBorderEcomSources: readonly FetchSource[] = [
  {
    name: "跨境电商政策与趋势",
    query: "cross-border e-commerce news policy",
    type: "openclaw",
  },
  {
    name: "亚马逊卖家动态",
    query: "Amazon seller news updates",
    type: "openclaw",
  },
] as const;

registerDomainSources("cross-border-ecom", crossBorderEcomSources);
