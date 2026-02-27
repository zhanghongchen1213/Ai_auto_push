// scripts/pipeline/types.ts
// 管道类型定义 - Pipeline type definitions

import type { DomainConfig } from "../../src/config/domains.ts";

/** 领域处理状态 */
export type DomainStatus = "success" | "failed" | "skipped";

/** 失败发生的阶段 */
export type FailedStage = "fetch" | "filter" | "format";

/** 错误分类 */
export type ErrorType =
  | "timeout"
  | "api_error"
  | "parse_error"
  | "write_error"
  | "unknown";

/** 单个领域的处理结果 */
export interface DomainProcessResult {
  /** 领域 slug */
  domain: string;
  /** 领域名称 */
  name: string;
  /** 执行状态 */
  status: DomainStatus;
  /** 执行耗时（毫秒） */
  duration: number;
  /** 错误信息（仅 failed 时存在） */
  error?: string;
  /** 失败发生的阶段（仅 failed 时存在） */
  failedStage?: FailedStage;
  /** 错误分类（仅 failed 时存在） */
  errorType?: ErrorType;
}

/** 管道执行上下文 */
export interface PipelineContext {
  /** 执行日期 YYYY-MM-DD */
  date: string;
  /** 指定单领域执行（可选） */
  targetDomain?: string;
  /** 是否 dry-run 模式 */
  dryRun: boolean;
}

/** 管道整体执行结果 */
export interface PipelineResult {
  /** 各领域处理结果 */
  results: DomainProcessResult[];
  /** 总耗时（毫秒） */
  totalDuration: number;
  /** 成功数 */
  successCount: number;
  /** 失败数 */
  failedCount: number;
  /** 跳过数 */
  skippedCount: number;
}

/** 原始资讯条目（抓取阶段输出） */
export interface RawNewsItem {
  /** 资讯标题 */
  title: string;
  /** 正文内容 */
  content: string;
  /** 来源 URL */
  url: string;
  /** 发布时间 ISO 字符串 */
  publishedAt: string;
}

/** 信息源定义 */
export interface FetchSource {
  /** 信息源名称 */
  name: string;
  /** 搜索查询关键词 */
  query: string;
  /** 信息源类型标识 */
  type: string;
}

/** 领域抓取配置 */
export interface DomainFetchConfig {
  /** 领域 slug */
  domainSlug: string;
  /** 该领域的信息源列表 */
  sources: readonly FetchSource[];
}

/** 单个信息源的抓取结果 */
export interface SourceFetchResult {
  /** 信息源名称 */
  source: string;
  /** 抓取状态 */
  status: "success" | "failed";
  /** 抓取到的条目数 */
  itemCount: number;
  /** 错误信息（仅 failed 时存在） */
  error?: string;
}

/** 领域抓取汇总结果 */
export interface FetchResult {
  /** 领域 slug */
  domain: string;
  /** 抓取到的资讯条目 */
  items: RawNewsItem[];
  /** 各信息源的抓取结果 */
  sourceResults: SourceFetchResult[];
}

/** 筛选后的资讯条目（filter 阶段输出） */
export interface FilteredNewsItem {
  /** 资讯标题 */
  title: string;
  /** 中文摘要（150-200 字） */
  summary: string;
  /** 来源 URL */
  url: string;
  /** 发布时间 ISO 字符串 */
  publishedAt: string;
  /** 来源名称 */
  source: string;
  /** 质量评分（0-100） */
  score: number;
}

/** 筛选结果汇总 */
export interface FilterResult {
  /** 领域 slug */
  domain: string;
  /** 筛选后的资讯列表 */
  items: FilteredNewsItem[];
  /** 输入条数 */
  inputCount: number;
  /** 输出条数 */
  outputCount: number;
  /** 耗时（毫秒） */
  duration: number;
}

/** 格式化输出结果 */
export interface FormatResult {
  /** 输出文件路径（空输入时为空字符串） */
  filePath: string;
  /** 资讯条目数量 */
  itemCount: number;
  /** 写入字节数（dry-run 或空输入时为 0） */
  bytesWritten: number;
}

/** LLM 配置 */
export interface LLMConfig {
  /** 提供商标识 */
  provider: string;
  /** 模型名称 */
  model: string;
  /** API 密钥 */
  apiKey: string;
  /** 自定义 API 端点 */
  baseUrl?: string;
  /** 最大输出 token 数 */
  maxTokens?: number;
}

/** LLM 响应 */
export interface LLMResponse {
  /** 筛选后的资讯列表 */
  items: FilteredNewsItem[];
  /** token 用量 */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

/** 发布结果 */
export interface PublishResult {
  /** 提交哈希（短格式 7 位，dry-run 或无变更时为空字符串） */
  commitHash: string;
  /** 暂存文件数量 */
  filesAdded: number;
  /** 提交信息 */
  commitMessage: string;
}

/** Git 命令执行错误 */
export interface GitCommandError {
  /** 执行的命令 */
  command: string;
  /** 退出码 */
  exitCode: number;
  /** 标准错误输出 */
  stderr: string;
}

// Re-export DomainConfig for pipeline modules
export type { DomainConfig };
