---
name: ai-auto-push
description: "自动化内容管道：用 WebFetch 爬取专业资讯网站 + WebSearch 抓取多领域资讯、AI 筛选摘要、Markdown 格式化输出、Git 提交推送。当用户说"运行管道"、"抓取今日资讯"、"执行内容管道"、"pipeline"、"/ai-auto-push"时触发。覆盖领域：AI技术、跨境电商、产品创业、GitHub热门。无需任何外部 API Key。"
---

# AI Auto Push — 内容管道自动化

## Overview

Claude Code 原生内容管道。优先使用 WebFetch 爬取专业资讯网站获取当日内容，再用 WebSearch 补充搜索，自身 AI 能力筛选摘要，Write 工具生成 Markdown，Bash 执行 Git 发布。零外部依赖，无需任何 API Key。

## 架构

```
WebFetch(专业站点) + WebSearch(补充搜索) → 严格日期过滤 → AI筛选摘要 → Write Markdown → Git提交推送
        阶段1a              阶段1b              阶段1c         阶段2         阶段3          阶段4
```

## 领域配置

| slug | 名称 | 专业资讯站点 | 搜索关键词 |
|------|------|-------------|-----------|
| ai-tech | AI技术 | ai-bot.cn/daily-ai-news, 36kr.com/information/AI, jiqizhixin.com | AI大模型发布、LLM技术突破、AI产品动态、AI融资、AI开源、AI应用落地、AI政策监管 |
| cross-border-ecom | 跨境电商 | 36kr.com/information/cross-border, cifnews.com, hugo.com | 跨境电商政策、亚马逊卖家、Temu/SHEIN动态、独立站、海外仓、物流、关税、选品 |
| product-startup | 产品创业 | 36kr.com/information/venture, iheima.com, chinaventure.com.cn | 创业融资、产品管理、SaaS创业、天使轮、A轮B轮、独角兽、商业模式、增长黑客 |
| github-trending | GitHub热门 | github.com/trending, hellogithub.com, ossinsight.io | GitHub trending projects、热门开源项目、developer tools、AI开源框架、Rust/Go新项目 |


## 执行流程

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS EXACTLY:

<steps CRITICAL="TRUE">

### Step 0: 初始化

1. 获取今天日期（UTC+8），格式 `YYYY-MM-DD`，记为 `{date}`
2. 用 TodoWrite 创建任务清单，每个领域一个任务
3. 用 Bash 创建输出目录：`mkdir -p src/content/daily/{date}`

### Step 1: 抓取（Fetch）— 对每个领域执行

**核心原则：专业站点优先，WebSearch 补充，严格日期过滤。**

可以用 4 个并行的 Task(subagent_type=general-purpose) 同时处理 4 个领域以提高效率。每个子 agent 负责阶段 1-3（抓取、筛选、写文件）。


#### 1a. AI技术领域 (ai-tech)

**专业站点爬取（WebFetch 优先）：**

1. 爬取 `https://ai-bot.cn/daily-ai-news/` — 提取当日 AI 资讯列表
2. 爬取 `https://www.jiqizhixin.com/` — 机器之心首页最新文章
3. 爬取 `https://36kr.com/information/AI/` — 36氪 AI 频道

**WebSearch 补充搜索（至少 3 次）：**

- `"AI 大模型 最新发布 {date}"`
- `"LLM 技术突破 AI产品 最新动态 {date}"`
- `"AI 融资 开源 应用落地 最新"`
- `"OpenAI Claude Gemini GPT 最新发布"`
- `"AI芯片 算力 大模型训练 最新进展"`

#### 1b. 跨境电商领域 (cross-border-ecom)

**专业站点爬取（WebFetch 优先）：**

1. 爬取 `https://www.cifnews.com/` — 雨果跨境首页最新资讯
2. 爬取 `https://www.hugo.com/` — Hugo 跨境电商资讯
3. 爬取 `https://36kr.com/information/cross-border/` — 36氪跨境频道

**WebSearch 补充搜索（至少 3 次）：**

- `"跨境电商 最新政策 动态 {date}"`
- `"亚马逊 Temu SHEIN 卖家 最新消息"`
- `"独立站 海外仓 物流 跨境 最新"`
- `"跨境电商 关税 合规 选品 趋势"`
- `"东南亚 拉美 跨境电商 市场 最新"`


#### 1c. 产品创业领域 (product-startup)

**专业站点爬取（WebFetch 优先）：**

1. 爬取 `https://36kr.com/information/venture/` — 36氪创投频道
2. 爬取 `https://www.iheima.com/` — i黑马创业资讯
3. 爬取 `https://www.chinaventure.com.cn/` — 投中网

**WebSearch 补充搜索（至少 3 次）：**

- `"创业 融资 最新动态 {date}"`
- `"SaaS 产品管理 创业 最新"`
- `"天使轮 A轮 B轮 融资 最新消息"`
- `"独角兽 商业模式 增长 创业公司"`
- `"AI创业 硬科技 融资 最新"`

#### 1d. GitHub热门领域 (github-trending)

**专业站点爬取（WebFetch 优先）：**

1. 爬取 `https://github.com/trending` — GitHub 官方 Trending 页面
2. 爬取 `https://github.com/trending?since=daily` — 当日热门
3. 爬取 `https://hellogithub.com/` — HelloGitHub 中文开源推荐

**WebSearch 补充搜索（至少 3 次）：**

- `"GitHub trending repositories this week {date}"`
- `"热门开源项目 最新 本周"`
- `"GitHub 新项目 AI开源 developer tools"`
- `"Rust Go Python 热门开源 最新"`
- `"开源项目 star增长最快 本周"`


#### 1e. 严格日期过滤（CRITICAL）

**所有领域必须执行严格日期过滤：**

- 只保留日期为 `{date}`（今天）的资讯内容
- 如果从网页中提取的资讯没有明确标注日期为今天，则丢弃
- WebFetch 爬取专业站点时，检查页面中的日期标记，只提取匹配 `{date}` 的条目
- WebSearch 搜索时，在关键词中包含 `{date}` 以限定时间范围
- 如果某个领域当日无任何有效资讯，在摘要中说明"今日暂无重大更新"，仍生成文件但 itemCount 为 0
- **绝对禁止**：将本月其他日期的资讯混入当日日报

**日期判断方法：**
1. 页面中明确显示的发布日期
2. URL 中包含的日期路径（如 `/2026/02/27/`）
3. 搜索结果中显示的时间戳
4. 如果无法确定日期，标记为"日期不确定"并降低优先级

### Step 2: 筛选摘要（Filter）

对每个领域的搜索结果，用你自己的 AI 能力筛选和摘要：

**筛选标准（按优先级排序）：**
1. 日期匹配：必须是今天 `{date}` 的内容（最高优先级）
2. 相关性：必须与该领域直接相关
3. 质量：来源可靠，内容有实质信息
4. 去重：相同事件只保留一条
5. 影响力：优先选择行业重大事件、融资、产品发布、政策变化

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

| 领域 | 状态 | 条目数 | 数据来源 |
|------|------|--------|----------|
| AI技术 | 成功/失败 | N | 站点爬取+搜索 |
| 跨境电商 | 成功/失败 | N | 站点爬取+搜索 |
| 产品创业 | 成功/失败 | N | 站点爬取+搜索 |
| GitHub热门 | 成功/失败 | N | 站点爬取+搜索 |

提示用户可运行 `pnpm build` 验证构建。

</steps>


---

## 并行执行优化

可用 4 个并行子 agent 同时处理 4 个领域：

每个子 agent 负责阶段 1-3（爬取站点、搜索补充、日期过滤、筛选摘要、写文件），主 agent 负责阶段 4（Git 发布）。

子 agent 的 prompt 应包含：
- 当日日期 `{date}`
- 该领域的专业站点列表
- 该领域的搜索关键词
- 严格日期过滤规则
- Markdown 格式模板
- 输出文件路径

---

## 错误处理

| 问题 | 处理方式 |
|------|----------|
| WebFetch 站点无法访问 | 跳过该站点，依赖 WebSearch 补充 |
| WebSearch 无结果 | 换关键词重试，尝试英文关键词 |
| 搜索结果质量低 | 增加搜索次数，扩大关键词范围 |
| 当日无任何有效资讯 | 生成空文件（itemCount: 0），报告中标记 |
| 文件写入失败 | 检查目录是否存在，重新 mkdir -p |
| Git push 失败 | 检查远程分支状态，最多重试 2 次 |
| 单个领域失败 | 继续处理其他领域，最终报告中标记失败 |
| 日期不匹配 | 严格丢弃非当日内容，不做降级处理 |
