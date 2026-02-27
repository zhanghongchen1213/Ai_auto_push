// scripts/pipeline/prompts.ts
// Prompt 模板 - 筛选与摘要生成
// Story 4-3 实现

import type { RawNewsItem } from "./types.ts";

/** 单条资讯的序列化格式（供 Prompt 使用） */
interface PromptNewsEntry {
  index: number;
  title: string;
  content: string;
  url: string;
  publishedAt: string;
}

/**
 * 将 RawNewsItem 数组序列化为 Prompt 输入格式
 * 截断过长内容，避免 token 浪费
 */
/**
 * 基础清理：移除可能干扰 Prompt 指令的特殊模式
 * 不做过度过滤，仅针对常见 prompt injection 模式
 */
function sanitizeText(text: string): string {
  return text
    .replace(/```/g, "")
    .replace(/^(system|assistant|user)\s*:/gim, "[$1]:")
    .replace(
      /ignore\s+(all\s+)?(previous|above)\s+instructions/gi,
      "[filtered]",
    );
}

function serializeItems(items: readonly RawNewsItem[]): PromptNewsEntry[] {
  return items.map((item, i) => ({
    index: i + 1,
    title: sanitizeText(item.title.slice(0, 200)),
    content: sanitizeText(item.content.slice(0, 800)),
    url: item.url,
    publishedAt: item.publishedAt,
  }));
}

/**
 * 构建筛选与摘要生成 Prompt
 *
 * @param items - 原始资讯列表
 * @param domainName - 领域名称（中文）
 * @returns 完整的 Prompt 文本
 */
export function buildFilterPrompt(
  items: readonly RawNewsItem[],
  domainName: string,
): string {
  const serialized = serializeItems(items);
  const itemsJson = JSON.stringify(serialized, null, 2);

  const minOutput = Math.min(items.length, 3);
  const maxOutput = Math.min(items.length, 8);

  return (
    buildSystemSection(domainName, minOutput, maxOutput) +
    buildRulesSection() +
    buildExampleSection() +
    buildInputSection(itemsJson)
  );
}

// ---------------------------------------------------------------------------
// Prompt 各段落构建
// ---------------------------------------------------------------------------

function buildSystemSection(
  domainName: string,
  minOutput: number,
  maxOutput: number,
): string {
  return `你是一位专业的「${domainName}」领域资讯编辑。
你的任务是从以下原始资讯中筛选出最有价值的内容，并为每条生成中文摘要。

## 筛选标准
1. 相关性：与「${domainName}」领域高度相关
2. 时效性：优先选择最新发布的资讯
3. 独特价值：内容具有独特见解或重要信息，避免重复
4. 信息质量：内容完整、来源可靠

## 数量要求
从输入资讯中筛选 ${minOutput}-${maxOutput} 条最有价值的资讯。
按价值评分从高到低排列。

`;
}

function buildRulesSection(): string {
  return `## 摘要要求
- 每条摘要长度：150-200 字中文
- 语言：流畅的中文表达，适合快速浏览
- 准确性：严格基于原文内容，禁止编造任何不存在于原文的信息
- 不包含广告、推广等无关内容

## 输出格式
严格输出 JSON 数组，不要包含任何其他文字。每个元素包含：
- title: 资讯标题（使用原始标题）
- summary: 中文摘要（150-200字）
- url: 原始来源URL（必须与输入中的URL完全一致）
- publishedAt: 发布时间（使用原始值）
- source: 来源网站名称
- score: 价值评分（0-100整数）

`;
}

function buildExampleSection(): string {
  return `## 输出示例
\`\`\`json
[
  {
    "title": "OpenAI 发布 GPT-5 模型",
    "summary": "OpenAI 于今日正式发布了新一代大语言模型 GPT-5，该模型在推理能力、多模态理解和代码生成方面均有显著提升。据官方介绍，GPT-5 在多项基准测试中超越前代模型，特别是在复杂数学推理和长文本理解任务上表现突出。新模型已通过 API 向开发者开放，预计将推动 AI 应用生态的进一步发展。业内分析人士认为，这一发布将加速大模型技术在企业级应用中的落地。",
    "url": "https://example.com/news/1",
    "publishedAt": "2026-02-27T08:00:00Z",
    "source": "TechCrunch",
    "score": 95
  }
]
\`\`\`

`;
}

function buildInputSection(itemsJson: string): string {
  return `## 待筛选的原始资讯
\`\`\`json
${itemsJson}
\`\`\`

请严格按照上述格式输出 JSON 数组，不要输出任何其他内容。`;
}
