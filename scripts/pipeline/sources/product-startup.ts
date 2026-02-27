// scripts/pipeline/sources/product-startup.ts
// 产品创业领域信息源配置

import type { FetchSource } from "../types.ts";
import { registerDomainSources } from "./registry.ts";

export const productStartupSources: readonly FetchSource[] = [
  {
    name: "创业与融资动态",
    query: "startup funding venture capital news",
    type: "openclaw",
  },
  {
    name: "产品管理与设计",
    query: "product management design launch news",
    type: "openclaw",
  },
] as const;

registerDomainSources("product-startup", productStartupSources);
