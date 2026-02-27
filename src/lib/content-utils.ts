// src/lib/content-utils.ts
// 内容查询与解析工具函数

import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import type { DomainSlug } from "../config/domains";
import { compareDates, isValidDateFormat } from "./date-utils";

/** 单条资讯数据结构 */
export interface NewsItem {
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
}

/** 允许的 URL 协议白名单 */
const SAFE_URL_PROTOCOLS = ["https:", "http:"] as const;

/**
 * 校验 URL 是否安全（防止 javascript: 等 XSS 协议）
 * 不合法或危险的 URL 返回 "#"
 */
function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return (SAFE_URL_PROTOCOLS as readonly string[]).includes(parsed.protocol)
      ? url
      : "#";
  } catch {
    // 相对路径或无效 URL，保留 "#" 作为安全回退
    return url.startsWith("/") ? url : "#";
  }
}

/**
 * 从 Markdown body 中解析出资讯条目列表
 * 格式约定：## 标题 + 摘要段落 + **来源：** [名称](URL)
 */
export function parseNewsItems(body: string): readonly NewsItem[] {
  if (!body || typeof body !== "string") {
    return Object.freeze([]);
  }

  const sections = body.split(/^## /m).filter((s) => s.trim());

  const items = sections.reduce<readonly NewsItem[]>((acc, section) => {
    const lines = section.trim().split("\n");
    const title = (lines[0] ?? "").trim();
    if (!title) return acc;

    const sourceMatch = section.match(
      /\*\*来源[：:]\*\*\s*\[([^\]]+)\]\(([^)]+)\)/,
    );
    const rawUrl = sourceMatch?.[2] ?? "#";
    const sourceUrl = sanitizeUrl(rawUrl);
    const sourceName = sourceMatch?.[1] ?? "未知来源";

    // 摘要 = 去掉标题行和来源行后的段落文本
    const summary = lines
      .slice(1)
      .filter((l) => !l.startsWith("**来源"))
      .map((l) => l.trim())
      .filter(Boolean)
      .join(" ");

    return [...acc, { title, summary, sourceUrl, sourceName }];
  }, []);

  return Object.freeze(items);
}

/**
 * 按日期查询所有领域的资讯
 * @throws {Error} 日期格式不合法时抛出
 */
export async function getEntriesByDate(
  date: string,
): Promise<CollectionEntry<"daily">[]> {
  if (!isValidDateFormat(date)) {
    throw new Error(
      `getEntriesByDate: 无效的日期格式 "${date}"，期望 YYYY-MM-DD`,
    );
  }
  const entries = await getCollection("daily", (entry) => {
    return entry.data.date === date;
  });
  return entries;
}

/**
 * 按日期 + 领域查询单个资讯文件
 */
export async function getEntryByDomain(
  date: string,
  domain: DomainSlug,
): Promise<CollectionEntry<"daily"> | undefined> {
  const entries = await getEntriesByDate(date);
  return entries.find((entry) => entry.data.domain === domain);
}

/**
 * 获取所有有数据的日期列表（降序排列，最新日期在前）
 */
export async function getAllDates(): Promise<string[]> {
  const allEntries = await getCollection("daily");
  const dateSet = new Set(allEntries.map((entry) => entry.data.date));
  return Array.from(dateSet).sort((a, b) => compareDates(b, a));
}

/**
 * 获取最新（最近）的日期
 */
export async function getLatestDate(): Promise<string | undefined> {
  const dates = await getAllDates();
  return dates[0];
}

/**
 * 获取指定日期的前后相邻日期（仅限有数据的日期）
 */
export async function getAdjacentDates(
  date: string,
): Promise<{ prev: string | null; next: string | null }> {
  const dates = await getAllDates();
  const index = dates.indexOf(date);

  if (index === -1) {
    return { prev: null, next: null };
  }

  return {
    prev: index < dates.length - 1 ? dates[index + 1] : null,
    next: index > 0 ? dates[index - 1] : null,
  };
}
