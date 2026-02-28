// src/lib/opportunity-utils.ts
// 商业机会日报 Markdown 解析工具

export interface DiscardedItem {
  title: string;
  reason: string;
}

export interface OpportunityData {
  summary: string;
  searchDomains: string;
  exploredItems: string[];
  discardedItems: DiscardedItem[];
  finalSection: string;
  evidenceSection: string;
  validationPlan: string;
}

/** 从 Markdown body 提取指定 ## 标题下的内容 */
function extractSection(body: string, heading: string): string {
  const pattern = new RegExp(`^## ${heading}\\s*\\n([\\s\\S]*?)(?=^## |$)`, 'm');
  return pattern.exec(body)?.[1]?.trim() ?? '';
}

/** 解析商业机会日报 Markdown 为结构化数据 */
export function parseOpportunityMarkdown(body: string): OpportunityData {
  if (!body) {
    return { summary: '', searchDomains: '', exploredItems: [], discardedItems: [], finalSection: '', evidenceSection: '', validationPlan: '' };
  }

  const summary = extractSection(body, '今日概况');
  const searchDomains = extractSection(body, '今日检索领域') || extractSection(body, '检索领域');

  // 解析尝试探索内容
  const exploreRaw = extractSection(body, '尝试探索内容');
  const exploredItems = exploreRaw
    ? exploreRaw.split('\n').filter(l => /^\d+\./.test(l.trim())).map(l => l.trim())
    : [];

  // 解析无价值方案
  const discardRaw = extractSection(body, '无价值方案及淘汰理由') || extractSection(body, '无价值方案');
  const discardedItems: DiscardedItem[] = [];
  if (discardRaw) {
    const blocks = discardRaw.split(/^### /m).filter(b => b.trim());
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      const title = lines[0]?.trim() ?? '';
      const reasonMatch = block.match(/淘汰理由[：:]\*?\*?\s*(.+)/);
      const reason = reasonMatch?.[1]?.trim() ?? '';
      if (title) discardedItems.push({ title, reason });
    }
  }

  const finalSection = extractSection(body, '最终方案') || extractSection(body, '最终确认的可商业化方案');
  const evidenceSection = extractSection(body, '证据链');
  const validationPlan = extractSection(body, '验证计划');

  return { summary, searchDomains, exploredItems, discardedItems, finalSection, evidenceSection, validationPlan };
}
