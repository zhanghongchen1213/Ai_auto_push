// scripts/pipeline/sources/_template.ts
// ============================================================
// 新领域信息源配置模板 - Domain Source Template
// ============================================================
//
// 使用方法：
// 1. 复制本文件并重命名为领域 slug（如 web3.ts）
// 2. 修改下方的 slug 和 sources 配置
// 3. 在 src/config/domains.ts 中添加对应的领域配置
// 4. 完成！下次管道执行时会自动发现并处理新领域
//
// 注意：
// - 文件名必须与领域 slug 一致（如 slug 为 "web3" 则文件名为 web3.ts）
// - 无需修改 sources/index.ts，注册表会自动发现新文件
// ============================================================

import type { FetchSource } from "../types.ts";
import { registerDomainSources } from "./registry.ts";

/**
 * 信息源配置数组
 *
 * FetchSource 字段说明：
 * - name:  信息源显示名称，用于日志输出和调试
 * - query: 搜索查询关键词，传递给抓取 API 的搜索词
 * - type:  信息源类型标识，当前支持 "openclaw"
 *
 * 建议每个领域配置 2-4 个信息源，覆盖不同角度
 */
export const yourDomainSources: readonly FetchSource[] = [
  {
    name: "示例信息源 1",
    query: "your search keywords here",
    type: "openclaw",
  },
  {
    name: "示例信息源 2",
    query: "another search query",
    type: "openclaw",
  },
] as const;

// 注册信息源：slug 必须与 domains.ts 中的 slug 一致
// registerDomainSources("your-domain-slug", yourDomainSources);
