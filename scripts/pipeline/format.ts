// scripts/pipeline/format.ts
// Markdown 格式化输出模块
// Story 4-4 实现

import { mkdir, writeFile, rename, unlink } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { DomainConfig, FilteredNewsItem, FormatResult } from "./types.ts";

/** 项目根目录（相对于脚本位置） */
const PROJECT_ROOT = join(dirname(new URL(import.meta.url).pathname), "../..");

/** 内容输出基础目录 */
const CONTENT_BASE = "src/content/daily";

/** 日期格式校验：YYYY-MM-DD（限制月份 01-12，日期 01-31） */
const DATE_RE = /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/;

/** slug 格式校验：仅允许小写字母、数字、连字符 */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------------------------------------------------------------------------
// 路径计算
// ---------------------------------------------------------------------------

/**
 * 计算输出文件路径
 * 包含路径遍历防护：校验 date 和 domainSlug 格式
 *
 * @param date - 日期 YYYY-MM-DD
 * @param domainSlug - 领域 slug
 * @returns 相对于项目根目录的文件路径
 * @throws 当 date 或 domainSlug 格式非法时抛出错误
 */
export function getOutputPath(date: string, domainSlug: string): string {
  if (!DATE_RE.test(date)) {
    throw new Error(`[format] 非法日期格式: "${date}"，期望 YYYY-MM-DD`);
  }
  if (!SLUG_RE.test(domainSlug)) {
    throw new Error(
      `[format] 非法领域 slug: "${domainSlug}"，仅允许小写字母、数字和连字符`,
    );
  }
  return join(CONTENT_BASE, date, `${domainSlug}.md`);
}

// ---------------------------------------------------------------------------
// Frontmatter 生成
// ---------------------------------------------------------------------------

/**
 * 生成 YAML frontmatter 块
 *
 * @param config - 领域配置
 * @param date - 日期 YYYY-MM-DD
 * @param itemCount - 资讯条目数量
 * @returns frontmatter 字符串（含 --- 分隔符）
 */
export function buildFrontmatter(
  config: DomainConfig,
  date: string,
  itemCount: number,
): string {
  const generatedAt = new Date().toISOString();
  // 转义 YAML 双引号字符串中的特殊字符
  const safeName = config.name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const safeSlug = config.slug.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  const lines = [
    "---",
    `title: "${safeName}日报"`,
    `domain: "${safeSlug}"`,
    `date: "${date}"`,
    `itemCount: ${itemCount}`,
    `generatedAt: "${generatedAt}"`,
    "---",
  ];
  return lines.join("\n");
}

// ---------------------------------------------------------------------------
// 正文生成
// ---------------------------------------------------------------------------

/**
 * 将 FilteredNewsItem[] 转为 Markdown 正文
 * 跳过 title 或 url 为空的条目
 *
 * @param items - 筛选后的资讯列表
 * @returns Markdown 正文字符串
 */
export function buildMarkdownBody(items: readonly FilteredNewsItem[]): string {
  const sections: string[] = [];

  for (const item of items) {
    if (!item.title.trim() || !item.url.trim()) {
      console.warn(
        `    [format] 警告: 跳过无效条目 (title=${item.title ? "有" : "空"}, url=${item.url ? "有" : "空"})`,
      );
      continue;
    }

    let sourceName = item.source?.trim() || "";
    if (!sourceName) {
      try {
        sourceName = new URL(item.url).hostname;
      } catch {
        sourceName = item.url.trim();
      }
    }
    // 转义 URL 中的括号，防止 Markdown 链接注入
    const safeUrl = item.url.trim().replace(/\(/g, "%28").replace(/\)/g, "%29");
    // 转义 sourceName 中的 [ ] 防止 Markdown 链接文本注入
    const safeSourceName = sourceName
      .replace(/\[/g, "\\[")
      .replace(/\]/g, "\\]");
    const section = [
      `## ${item.title.trim()}`,
      "",
      item.summary.trim(),
      "",
      `**来源：** [${safeSourceName}](${safeUrl})`,
    ].join("\n");

    sections.push(section);
  }

  return sections.join("\n\n");
}

// ---------------------------------------------------------------------------
// Markdown 组合
// ---------------------------------------------------------------------------

/**
 * 组合完整 Markdown 文件内容
 *
 * @param items - 筛选后的资讯列表
 * @param config - 领域配置
 * @param date - 日期 YYYY-MM-DD
 * @returns 完整 Markdown 字符串（frontmatter + body + 末尾换行）
 */
export function buildMarkdown(
  items: readonly FilteredNewsItem[],
  config: DomainConfig,
  date: string,
): string {
  const validItems = items.filter(
    (item) => item.title.trim() !== "" && item.url.trim() !== "",
  );
  const frontmatter = buildFrontmatter(config, date, validItems.length);
  const body = buildMarkdownBody(validItems);
  return frontmatter + "\n\n" + body + "\n";
}

// ---------------------------------------------------------------------------
// 文件写入
// ---------------------------------------------------------------------------

/**
 * 写入 Markdown 文件到文件系统（原子写入）
 * 先写入临时文件再原子重命名，确保不会产生不完整文件
 *
 * @param content - Markdown 内容
 * @param filePath - 绝对文件路径
 * @returns 写入字节数
 */
export async function writeMarkdownFile(
  content: string,
  filePath: string,
): Promise<number> {
  const tmpPath = filePath + ".tmp";
  try {
    await mkdir(dirname(filePath), { recursive: true });
    const buffer = Buffer.from(content, "utf-8");
    await writeFile(tmpPath, buffer);
    await rename(tmpPath, filePath);
    return buffer.byteLength;
  } catch (err) {
    // 清理临时文件（忽略不存在的情况）
    try {
      await unlink(tmpPath);
    } catch {
      /* ignore */
    }
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`[format] 文件写入失败: ${filePath} - ${msg}`);
  }
}

// ---------------------------------------------------------------------------
// 主函数
// ---------------------------------------------------------------------------

/**
 * 格式化并写入 Markdown 文件
 *
 * @param items - 筛选后的资讯列表
 * @param config - 领域配置
 * @param date - 日期 YYYY-MM-DD
 * @param dryRun - 是否 dry-run 模式
 * @returns 格式化结果
 */
export async function formatAndWrite(
  items: readonly FilteredNewsItem[],
  config: DomainConfig,
  date: string,
  dryRun: boolean,
): Promise<FormatResult> {
  const slug = config.slug;

  // 空输入：跳过文件生成
  if (items.length === 0) {
    console.warn(`    [format] ${slug} 无资讯条目，跳过文件生成`);
    return { filePath: "", itemCount: 0, bytesWritten: 0 };
  }

  // 生成 Markdown 内容
  const markdown = buildMarkdown(items, config, date);
  const relativePath = getOutputPath(date, slug);

  // 计算有效条目数（排除无效条目）
  const validCount = items.filter(
    (i) => i.title.trim() !== "" && i.url.trim() !== "",
  ).length;

  // dry-run 模式：输出预览，不写入文件
  if (dryRun) {
    const preview = markdown.slice(0, 500);
    console.log(
      `    [format] (dry-run) ${slug}: ${validCount} 条资讯, ` +
        `目标 ${relativePath}`,
    );
    console.log(`    [format] (dry-run) 预览:\n${preview}`);
    return { filePath: "", itemCount: validCount, bytesWritten: 0 };
  }

  // 正常模式：写入文件（失败时清理残留）
  const absolutePath = join(PROJECT_ROOT, relativePath);
  try {
    const bytesWritten = await writeMarkdownFile(markdown, absolutePath);

    console.log(
      `    [format] ${slug}: ${validCount} 条资讯, ` +
        `${bytesWritten} bytes → ${relativePath}`,
    );

    return { filePath: relativePath, itemCount: validCount, bytesWritten };
  } catch (err) {
    // 确保不残留损坏文件
    try {
      await unlink(absolutePath);
    } catch {
      /* 文件可能不存在 */
    }
    throw err;
  }
}
