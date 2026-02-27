---
name: ai-auto-push
description: "自动化内容管道：用 WebSearch 抓取多领域资讯、AI 筛选摘要、Markdown 格式化输出、Git 提交推送。当用户说"运行管道"、"抓取今日资讯"、"执行内容管道"、"pipeline"、"/ai-auto-push"时触发。覆盖领域：AI技术、跨境电商、产品创业、GitHub热门。无需任何外部 API Key。"
---

# AI Auto Push — 内容管道自动化

## Overview

Claude Code 原生内容管道。使用 WebSearch 抓取资讯、自身 AI 能力筛选摘要、Write 工具生成 Markdown、Bash 执行 Git 发布。零外部依赖，无需任何 API Key。

## 架构

```
WebSearch → AI筛选摘要 → Write Markdown → Git提交推送
   阶段1        阶段2         阶段3          阶段4
```

## 领域配置

| slug | 名称 | 搜索关键词 |
|------|------|-----------|
| ai-tech | AI技术 | AI大模型发布、LLM技术突破、AI产品动态 |
| cross-border-ecom | 跨境电商 | 跨境电商政策、亚马逊卖家、Temu/SHEIN动态 |
| product-startup | 产品创业 | 创业融资、产品管理、SaaS创业动态 |
| github-trending | GitHub热门 | GitHub trending projects、热门开源项目 |

## 输出路径

`src/content/daily/{YYYY-MM-DD}/{domain-slug}.md`

---

## 执行流程

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS EXACTLY:

<steps CRITICAL="TRUE">

### Step 0: 初始化

1. 获取今天日期（UTC+8），格式 `YYYY-MM-DD`
2. 用 TodoWrite 创建任务清单，每个领域一个任务
3. 用 Bash 创建输出目录：`mkdir -p src/content/daily/{date}`

### Step 1: 抓取（Fetch）— 对每个领域执行

使用 WebSearch 工具搜索每个领域的最新资讯。

**搜索策略：**

- **ai-tech**: 搜索 `"AI 大模型 最新发布 2026"` 和 `"LLM AI技术突破 最新"`
- **cross-border-ecom**: 搜索 `"跨境电商 最新政策 动态 2026"` 和 `"亚马逊 Temu SHEIN 卖家 最新"`
- **product-startup**: 搜索 `"创业 融资 最新动态 2026"` 和 `"SaaS 产品管理 创业"`
- **github-trending**: 搜索 `"GitHub trending repositories this week"` 和 `"热门开源项目 最新"`

**要求：**
- 每个领域至少搜索 2 次（不同关键词），收集足够的候选资讯
- 记录每条资讯的：标题、来源网站、URL、内容摘要
- 可以用 4 个并行的 Task(subagent_type=general-purpose) 同时处理 4 个领域以提高效率

### Step 2: 筛选摘要（Filter）

对每个领域的搜索结果，用你自己的 AI 能力筛选和摘要：

**筛选标准：**
- 时效性：优先最近 1-3 天的内容
- 相关性：必须与该领域直接相关
- 质量：来源可靠，内容有实质信息
- 去重：相同事件只保留一条

**摘要要求：**
- 每个领域选出 3-5 条最有价值的资讯
- 每条摘要 150-200 字中文
- 摘要应包含：核心事件、关键数据、影响意义
- 语言风格：专业、客观、信息密度高

### Step 3: 格式化输出（Format）

对每个领域，使用 Write 工具生成 Markdown 文件。

**文件路径：** `src/content/daily/{date}/{slug}.md`

**严格遵循以下格式模板：**

```markdown
---
title: "{领域名称}日报"
domain: "{slug}"
date: "{YYYY-MM-DD}"
itemCount: {条目数}
generatedAt: "{ISO8601时间戳}"
---

## {资讯标题1}

{150-200字中文摘要，专业客观，信息密度高}

**来源：** [{来源名称}]({URL})

## {资讯标题2}

{150-200字中文摘要}

**来源：** [{来源名称}]({URL})
```

**格式规则：**
- frontmatter 中 title 格式固定为 `"{name}日报"`
- generatedAt 使用当前 ISO8601 时间戳（含时区 +08:00）
- 每条资讯之间空一行
- URL 中的括号需转义：`(` → `%28`，`)` → `%29`
- 来源名称中的 `[` `]` 需转义：`\[` `\]`
- 文件末尾保留一个换行符

### Step 4: 发布（Publish）

使用 Bash 工具执行 Git 操作：

```bash
git add src/content/daily/{date}/
git commit -m "chore: daily update {date} ({success}/{total} domains)"
```

**注意：**
- git push 前必须询问用户确认（影响远程仓库）
- 如果部分领域失败，commit message 应反映实际数量
- push 失败时最多重试 2 次

### Step 5: 汇总报告

向用户报告执行结果：

| 领域 | 状态 | 条目数 |
|------|------|--------|
| AI技术 | 成功/失败 | N |
| 跨境电商 | 成功/失败 | N |
| 产品创业 | 成功/失败 | N |
| GitHub热门 | 成功/失败 | N |

提示用户可运行 `pnpm build` 验证构建。

</steps>

---

## 并行执行优化

可用 4 个并行子 agent 同时处理 4 个领域：

每个子 agent 负责阶段 1-3（搜索、筛选、写文件），主 agent 负责阶段 4（Git 发布）。

---

## 错误处理

| 问题 | 处理方式 |
|------|----------|
| WebSearch 无结果 | 换关键词重试，或用 WebFetch 直接访问领域相关网站 |
| 搜索结果质量低 | 增加搜索次数，尝试英文关键词 |
| 文件写入失败 | 检查目录是否存在，重新 mkdir -p |
| Git push 失败 | 检查远程分支状态，最多重试 2 次 |
| 单个领域失败 | 继续处理其他领域，最终报告中标记失败 |
