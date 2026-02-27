// src/types/index.ts
// 全局类型定义

export interface NewsEntry {
  title: string;
  summary: string;
  sourceUrl: string;
  sourceName: string;
}

export interface DailyContent {
  domain: string;
  date: string;
  title: string;
  itemCount: number;
  generatedAt: string;
  entries: NewsEntry[];
}
