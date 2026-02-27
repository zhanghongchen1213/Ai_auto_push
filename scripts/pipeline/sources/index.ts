// scripts/pipeline/sources/index.ts
// 领域信息源配置统一入口 - 基于注册表的动态发现机制

import type { DomainFetchConfig } from "../types.ts";
import {
  getAllRegisteredSlugs,
  getRegisteredSources,
  loadAllSources,
} from "./registry.ts";

/** 初始化 promise（防止并发重复加载） */
let initPromise: Promise<void> | null = null;

/**
 * 初始化信息源配置：动态加载 sources/ 目录下所有配置文件
 * 必须在查询信息源之前调用一次
 * 并发安全：多次调用共享同一个 Promise
 */
export async function initSources(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = loadAllSources().then(() => {
    const slugs = getAllRegisteredSlugs();
    console.log(`    [config] 已加载 ${slugs.length} 个信息源配置`);
  });

  return initPromise;
}

/**
 * 根据领域 slug 获取对应的抓取配置
 * @returns 匹配的配置，未找到时返回 undefined
 */
export function getDomainFetchConfig(
  slug: string,
): DomainFetchConfig | undefined {
  const sources = getRegisteredSources(slug);
  if (!sources) return undefined;
  return { domainSlug: slug, sources };
}

/** 获取所有领域抓取配置 */
export function getAllDomainFetchConfigs(): readonly DomainFetchConfig[] {
  return getAllRegisteredSlugs().map((slug) => ({
    domainSlug: slug,
    sources: getRegisteredSources(slug) ?? [],
  }));
}

/** 重置初始化状态（用于测试），同时清空注册表 */
export function resetInitialized(): void {
  initPromise = null;
}
