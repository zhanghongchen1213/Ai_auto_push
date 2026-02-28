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

/** 从 Markdown body 提取指定 ## 标题下的内容（split-based，避免 m flag 下 $ 匹配行尾的问题） */
function extractSection(body: string, heading: string): string {
  const parts = body.split(/^## /m);
  for (const part of parts) {
    if (part.startsWith(heading)) {
      return part
        .slice(heading.length)
        .replace(/^\s*\n/, "")
        .trim();
    }
  }
  return "";
}

/** 轻量 Markdown → HTML 渲染（覆盖报告中常见语法） */
export function renderMd(md: string): string {
  if (!md) return "";
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = md.split("\n");
  const out: string[] = [];
  let inList = false;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (/^### /.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<h3>${inline(esc(line.slice(4)))}</h3>`);
    } else if (/^- /.test(line)) {
      if (!inList) {
        out.push("<ul>");
        inList = true;
      }
      out.push(`<li>${inline(esc(line.slice(2)))}</li>`);
    } else if (/^\d+\.\s/.test(line)) {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p>${inline(esc(line))}</p>`);
    } else if (line === "") {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
    } else {
      if (inList) {
        out.push("</ul>");
        inList = false;
      }
      out.push(`<p>${inline(esc(line))}</p>`);
    }
  }
  if (inList) out.push("</ul>");
  return out.join("\n");
}

function inline(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(
      /\[(.+?)\]\((.+?)\)/g,
      '<a href="$2" target="_blank" rel="noopener">$1</a>',
    );
}

/** 解析商业机会日报 Markdown 为结构化数据 */
export function parseOpportunityMarkdown(body: string): OpportunityData {
  if (!body) {
    return {
      summary: "",
      searchDomains: "",
      exploredItems: [],
      discardedItems: [],
      finalSection: "",
      evidenceSection: "",
      validationPlan: "",
    };
  }

  const summary = extractSection(body, "今日概况");
  const searchDomains =
    extractSection(body, "今日检索领域") || extractSection(body, "检索领域");

  // 解析尝试探索内容
  const exploreRaw = extractSection(body, "尝试探索内容");
  const exploredItems = exploreRaw
    ? exploreRaw
        .split("\n")
        .filter((l) => /^\d+\./.test(l.trim()))
        .map((l) => l.trim())
    : [];

  // 解析无价值方案
  const discardRaw =
    extractSection(body, "无价值方案及淘汰理由") ||
    extractSection(body, "无价值方案");
  const discardedItems: DiscardedItem[] = [];
  if (discardRaw) {
    const blocks = discardRaw.split(/^### /m).filter((b) => b.trim());
    for (const block of blocks) {
      const lines = block.trim().split("\n");
      const title = lines[0]?.trim() ?? "";
      const reasonMatch = block.match(
        /(?:淘汰理由|淘汰分析)[：:]\s*\*?\*?\s*(.+)/,
      );
      const reason = reasonMatch?.[1]?.trim() ?? "";
      if (title) discardedItems.push({ title, reason });
    }
  }

  const finalSection =
    extractSection(body, "最终方案") ||
    extractSection(body, "最终确认的可商业化方案");
  const evidenceSection = extractSection(body, "证据链");
  const validationPlan = extractSection(body, "验证计划");

  return {
    summary,
    searchDomains,
    exploredItems,
    discardedItems,
    finalSection,
    evidenceSection,
    validationPlan,
  };
}
