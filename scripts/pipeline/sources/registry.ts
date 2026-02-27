// scripts/pipeline/sources/registry.ts
// 信息源注册表 - Domain source registry with auto-discovery

import type { FetchSource } from "../types.ts";

/** slug 格式：仅允许小写字母、数字、连字符，不允许首尾连字符 */
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** 内部注册表：slug → sources 映射 */
const registry = new Map<string, readonly FetchSource[]>();

/**
 * 注册领域信息源配置
 * @param slug - 领域 slug（如 "ai-tech"）
 * @param sources - 该领域的信息源列表
 * @throws 当 slug 格式非法或已被注册时抛出错误
 */
export function registerDomainSources(
  slug: string,
  sources: readonly FetchSource[],
): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new Error(
      `信息源注册失败: slug "${slug}" 格式非法，仅允许小写字母、数字和连字符`,
    );
  }
  if (registry.has(slug)) {
    throw new Error(
      `信息源注册冲突: slug "${slug}" 已被注册，请检查是否有重复的配置文件`,
    );
  }
  registry.set(slug, sources);
}

/**
 * 查询指定领域的信息源配置
 * @returns 信息源列表，未注册时返回 undefined
 */
export function getRegisteredSources(
  slug: string,
): readonly FetchSource[] | undefined {
  return registry.get(slug);
}

/** 获取所有已注册的领域 slug 列表 */
export function getAllRegisteredSlugs(): string[] {
  return [...registry.keys()];
}

/** 清空注册表（用于测试） */
export function clearRegistry(): void {
  registry.clear();
}

/** 排除的文件名（不作为信息源配置加载） */
const EXCLUDED_FILES = new Set(["index.ts", "registry.ts", "_template.ts"]);

/** 合法的信息源文件名：仅允许小写字母、数字、连字符，以 .ts 结尾 */
const VALID_SOURCE_FILE = /^[a-z0-9]+(-[a-z0-9]+)*\.ts$/;

/**
 * 动态加载 sources/ 目录下所有信息源配置文件
 * 每个文件在被 import 时会自动调用 registerDomainSources 注册自身
 */
export async function loadAllSources(): Promise<void> {
  const { readdir, lstat } = await import("node:fs/promises");
  const { fileURLToPath } = await import("node:url");
  const { dirname, join } = await import("node:path");

  const currentDir = dirname(fileURLToPath(import.meta.url));
  const entries = await readdir(currentDir);

  const sourceFiles = entries.filter(
    (f) => f.endsWith(".ts") && !EXCLUDED_FILES.has(f),
  );

  for (const file of sourceFiles) {
    // 校验文件名格式，防止非预期文件被加载
    if (!VALID_SOURCE_FILE.test(file)) {
      console.warn(`    [config] 跳过非法文件名: ${file}`);
      continue;
    }

    // 跳过符号链接，防止路径遍历
    const fullPath = join(currentDir, file);
    try {
      const stat = await lstat(fullPath);
      if (stat.isSymbolicLink()) {
        console.warn(`    [config] 跳过符号链接: ${file}`);
        continue;
      }
    } catch {
      console.warn(`    [config] 无法读取文件状态: ${file}`);
      continue;
    }

    try {
      await import(fullPath);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`    [config] 加载信息源文件失败: ${file} - ${msg}`);
    }
  }
}
