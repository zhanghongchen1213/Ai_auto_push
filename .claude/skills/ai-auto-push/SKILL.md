---
name: ai-auto-push
description: "自动化内容管道：用 WebFetch 爬取专业资讯网站 + RSS订阅 + GitHub Releases + Brave Search + WebSearch 抓取多领域资讯、AI 筛选摘要、Markdown 格式化输出、Git 提交推送。当用户说"运行管道"、"抓取今日资讯"、"执行内容管道"、"pipeline"、"/ai-auto-push"时触发。覆盖领域：AI技术（多源增强）、跨境电商、产品创业、GitHub热门。"
---

# AI Auto Push — 内容管道自动化

## Overview

Claude Code 原生内容管道。AI技术领域采用五层数据采集（WebFetch 专业站点 + RSS 订阅 + GitHub Releases + Brave Search + WebSearch），其他领域采用 WebFetch + WebSearch 双层采集。自身 AI 能力筛选摘要，Write 工具生成 Markdown，Bash 执行 Git 发布。

## 环境变量

| 变量 | 用途 | 必需 |
|------|------|------|
| `BRAVE_API_KEY` | Brave Search API，用于 ai-tech 领域补充搜索 | 是（ai-tech 的 Brave 层） |

**BRAVE_API_KEY**: `BSAZ3NQPSBnzVf3BP8CFS_ivmRb3phE`

## 架构

```
AI技术领域（五层）:
  WebFetch(专业站点) + RSS(订阅源) + GitHub Releases + BraveSearch(API) + WebSearch(补充)
  → 严格日期过滤 → 去重+评分 → AI筛选摘要(最多20条) → Write Markdown → Git推送

其他领域（双层）:
  WebFetch(专业站点) + WebSearch(补充搜索)
  → 严格日期过滤 → AI筛选摘要(最多10条) → Write Markdown → Git推送
```

## 领域配置

| slug | 名称 | 最大条目数 | 数据层 | 专业资讯站点 |
|------|------|-----------|--------|-------------|
| ai-tech | AI技术 | **20** | WebFetch + RSS + GitHub Releases + Brave Search + WebSearch | ai-bot.cn, 36kr.com/AI, jiqizhixin.com + 15个RSS源 + 19个GitHub仓库 |
| cross-border-ecom | 跨境电商 | **10** | WebFetch + WebSearch | 36kr.com/cross-border, cifnews.com, hugo.com |
| product-startup | 产品创业 | **10** | WebFetch + WebSearch | 36kr.com/venture, iheima.com, chinaventure.com.cn |
| github-trending | GitHub热门 | **10** | WebFetch + WebSearch | github.com/trending, hellogithub.com, ossinsight.io |


## 项目路径（CRITICAL）

**项目绝对路径：** `/Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push`

记为 `{PROJECT_ROOT}`。所有文件操作和 Git 命令必须使用此绝对路径，确保从本机任何位置执行都能正确定位项目。

## 执行流程

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS EXACTLY:

<steps CRITICAL="TRUE">

### Step 0: 初始化

1. 设置项目根目录：`PROJECT_ROOT=/Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push`
2. 获取今天日期（UTC+8），格式 `YYYY-MM-DD`，记为 `{date}`
3. 用 TodoWrite 创建任务清单，每个领域一个任务
4. 用 Bash 创建输出目录：`mkdir -p {PROJECT_ROOT}/src/content/daily/{date}`

### Step 1: 抓取（Fetch）— 对每个领域执行

**核心原则：专业站点优先，WebSearch 补充，严格日期过滤。**

**聚合站点原文链接提取（CRITICAL）：**

从聚合类站点（如 ai-bot.cn、36kr.com 频道页、cifnews.com 首页等）爬取时，必须：
1. 提取每条资讯的**具体文章链接**，而非聚合页面的 URL。聚合首页（如 `ai-bot.cn/daily-ai-news/`）不能作为单条资讯的来源链接
2. 如果聚合站点的资讯条目链接到外部原文（如微信公众号 `mp.weixin.qq.com`、官方博客等），优先使用该外部原文 URL
3. 如果聚合站点的条目链接到站内详情页（如 `ai-bot.cn/article/xxx`），使用该站内详情页 URL
4. 仅当确实无法获取具体文章 URL 时，才回退使用聚合页面 URL

可以用 4 个并行的 Task(subagent_type=general-purpose) 同时处理 4 个领域以提高效率。每个子 agent 负责阶段 1-3（抓取、筛选、写文件）。


#### 1a. AI技术领域 (ai-tech) — 五层数据采集

**第一层：专业站点爬取（WebFetch）**

1. 爬取 `https://ai-bot.cn/daily-ai-news/` — 提取当日 AI 资讯列表
2. 爬取 `https://www.jiqizhixin.com/` — 机器之心首页最新文章
3. 爬取 `https://36kr.com/information/AI/` — 36氪 AI 频道

**第二层：RSS 订阅源（WebFetch 抓取 RSS feed XML，解析标题/链接/日期）**

高优先级 RSS 源（必须全部抓取）：
1. `https://blog.openai.com/rss/` — OpenAI 官方博客
2. `https://www.anthropic.com/rss.xml` — Anthropic 官方博客
3. `https://blog.google/technology/ai/rss/` — Google AI Blog
4. `https://hnrss.org/newest?q=AI+LLM+GPT&points=50` — Hacker News AI 热帖（50+赞）
5. `https://feeds.arstechnica.com/arstechnica/technology-lab` — Ars Technica 技术
6. `https://www.technologyreview.com/feed/` — MIT Technology Review
7. `https://techcrunch.com/category/artificial-intelligence/feed/` — TechCrunch AI
8. `https://www.theverge.com/rss/ai-artificial-intelligence/index.xml` — The Verge AI

补充 RSS 源（尽量抓取，失败可跳过）：
9. `https://huggingface.co/blog/feed.xml` — Hugging Face Blog
10. `https://lilianweng.github.io/index.xml` — Lilian Weng（OpenAI 研究员）
11. `https://simonwillison.net/atom/everything/` — Simon Willison（AI 工具观察）
12. `https://www.bensbites.com/feed` — Ben's Bites（AI 产品日报）
13. `https://buttondown.com/ainews/rss` — AI News Newsletter
14. `https://jack-clark.net/feed/` — Import AI（Jack Clark）
15. `https://newsletter.ruder.io/feed` — Sebastian Ruder（NLP 研究）

RSS 解析规则：
- 用 WebFetch 获取 RSS XML 内容
- 提取每个 `<item>` 或 `<entry>` 的 `<title>`、`<link>`、`<pubDate>` / `<published>`
- 严格按日期过滤，只保留 `{date}` 当天的条目
- RSS 源天然带精确时间戳，日期过滤比网页爬取更可靠

**第三层：GitHub Releases 监控（WebFetch 抓取 releases 页面）**

抓取以下 AI 核心仓库的最新 release 信息：
1. `https://github.com/vllm-project/vllm/releases.atom` — vLLM
2. `https://github.com/langchain-ai/langchain/releases.atom` — LangChain
3. `https://github.com/ollama/ollama/releases.atom` — Ollama
4. `https://github.com/langgenius/dify/releases.atom` — Dify
5. `https://github.com/run-llama/llama_index/releases.atom` — LlamaIndex
6. `https://github.com/huggingface/transformers/releases.atom` — Transformers
7. `https://github.com/open-webui/open-webui/releases.atom` — Open WebUI
8. `https://github.com/ggerganov/llama.cpp/releases.atom` — llama.cpp
9. `https://github.com/microsoft/autogen/releases.atom` — AutoGen
10. `https://github.com/crewAIInc/crewAI/releases.atom` — CrewAI
11. `https://github.com/pytorch/pytorch/releases.atom` — PyTorch
12. `https://github.com/apache/tvm/releases.atom` — Apache TVM
13. `https://github.com/oobabooga/text-generation-webui/releases.atom` — text-generation-webui
14. `https://github.com/AUTOMATIC1111/stable-diffusion-webui/releases.atom` — Stable Diffusion WebUI
15. `https://github.com/comfyanonymous/ComfyUI/releases.atom` — ComfyUI
16. `https://github.com/openai/openai-python/releases.atom` — OpenAI Python SDK
17. `https://github.com/anthropics/anthropic-sdk-python/releases.atom` — Anthropic Python SDK
18. `https://github.com/lm-sys/FastChat/releases.atom` — FastChat
19. `https://github.com/mlc-ai/mlc-llm/releases.atom` — MLC LLM

GitHub Releases 解析规则：
- 用 WebFetch 抓取 `.atom` feed
- 提取 `<entry>` 中的 `<title>`、`<link>`、`<updated>`
- 只保留 `{date}` 当天发布的 release
- 生成摘要时标注版本号和关键更新内容

**第四层：Brave Search API（CRITICAL — 使用环境变量中的 API Key）**

使用 Brave Search API 进行高质量搜索，补充前三层可能遗漏的内容。

调用方式（通过 Bash curl）：
```bash
curl -s "https://api.search.brave.com/res/v1/web/search?q=QUERY&freshness=pd&count=10" \
  -H "Accept: application/json" \
  -H "X-Subscription-Token: BSAZ3NQPSBnzVf3BP8CFS_ivmRb3phE"
```

Brave Search 查询（至少执行 4 次）：
- `"AI model release announcement today {date}"`
- `"LLM breakthrough new AI product launch {date}"`
- `"artificial intelligence funding investment {date}"`
- `"open source AI framework new release {date}"`

参数说明：
- `freshness=pd` — 限定过去 24 小时内的结果
- `count=10` — 每次返回 10 条结果
- 解析返回 JSON 中 `web.results[]` 的 `title`、`url`、`description`

**第五层：WebSearch 补充搜索（至少 3 次）**

- `"AI 大模型 最新发布 {date}"`
- `"LLM 技术突破 AI产品 最新动态 {date}"`
- `"AI 融资 开源 应用落地 最新"`
- `"OpenAI Claude Gemini GPT 最新发布"`
- `"AI芯片 算力 大模型训练 最新进展"`

**ai-tech 去重与评分（五层数据合并后执行）：**

所有五层数据合并后，按以下规则去重和评分：
1. **去重**：标题相似度 > 70% 的视为同一事件，保留评分最高的一条
2. **评分规则**：
   - 多源交叉验证（同一事件出现在 2+ 个数据层）：+5 分
   - 来自优先来源（OpenAI/Anthropic/Google 官方博客、GitHub Release）：+3 分
   - 当日发布（有精确时间戳确认）：+2 分
   - 有具体数据/版本号/融资金额：+1 分
3. **排序**：按总分降序，取前 20 条

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
- **ai-tech 领域**：选出最多 **20 条**最有价值的资讯（五层数据源，去重评分后取 top 20）
- **其他三个领域**（cross-border-ecom、product-startup、github-trending）：每个领域选出最多 **10 条**
- 每条摘要 150-200 字中文
- 摘要应包含：核心事件、关键数据、影响意义
- 语言风格：专业、客观、信息密度高
- ai-tech 领域的资讯需标注数据来源层（如 `[RSS]`、`[GitHub Release]`、`[Brave]`、`[WebFetch]`、`[WebSearch]`）


### Step 3: 格式化输出（Format）

对每个领域，使用 Write 工具生成 Markdown 文件。

**文件路径：** `{PROJECT_ROOT}/src/content/daily/{date}/{slug}.md`

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

**来源：** [{来源名称}]({来源页面URL}) | **原文：** [{原文标题或"阅读原文"}]({原文实际URL})

## {资讯标题2}

{150-200字中文摘要}

**来源：** [{来源名称}]({来源页面URL}) | **原文：** [{原文标题或"阅读原文"}]({原文实际URL})
```

**ai-tech 领域专用格式（在标题后标注数据来源层）：**

```markdown
## [RSS] OpenAI 发布 GPT-5.3 Turbo

{摘要内容}

**来源：** [OpenAI Blog](https://blog.openai.com/xxx)
```

来源层标签：`[RSS]`、`[GitHub Release]`、`[Brave]`、`[WebFetch]`、`[WebSearch]`

**如果只有一个 URL（即原文 URL 就是来源 URL），使用简化格式：**

```markdown
**来源：** [{来源名称}]({原文实际URL})
```

**格式规则：**
- frontmatter 中 title 格式固定为 `"{name}日报"`
- generatedAt 使用当前 ISO8601 时间戳（含时区 +08:00）
- 每条资讯之间空一行
- URL 中的括号需转义：`(` → `%28`，`)` → `%29`
- 来源名称中的 `[` `]` 需转义：`\[` `\]`
- 文件末尾保留一个换行符
- **来源与原文双链接格式**：当资讯来自聚合站点时，使用 `**来源：** [名称](聚合页URL) | **原文：** [标题](原文URL)` 格式，让前端能同时展示来源站点和原文链接
- 如果资讯直接来自原始来源（非聚合转载），只需使用单链接格式 `**来源：** [名称](原文URL)`


### Step 4: 发布（Publish）

使用 Bash 工具执行 Git 操作（必须先 cd 到项目目录）：

```bash
cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && git add src/content/daily/{date}/ && git commit -m "chore: daily update {date} ({success}/{total} domains)" && git push
```

**自动推送（CRITICAL — 强制执行）：**
- git push 必须自动执行，**禁止**询问用户确认
- commit 和 push 合并在同一条 Bash 命令中执行，确保全流程无人工干预
- 这是自动化管道的核心要求：抓取 → 筛选 → 写文件 → commit → push 全程自动完成
- 如果部分领域失败，commit message 应反映实际数量
- push 失败时最多重试 2 次，重试命令：`cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && git push`

### Step 5: 汇总报告

向用户报告执行结果：

| 领域 | 状态 | 条目数 | 上限 | 数据来源 |
|------|------|--------|------|----------|
| AI技术 | 成功/失败 | N | 20 | WebFetch+RSS+GitHub Releases+Brave Search+WebSearch |
| 跨境电商 | 成功/失败 | N | 10 | 站点爬取+搜索 |
| 产品创业 | 成功/失败 | N | 10 | 站点爬取+搜索 |
| GitHub热门 | 成功/失败 | N | 10 | 站点爬取+搜索 |

提示用户可运行 `pnpm build` 验证构建。

</steps>


---

## 并行执行优化

可用 4 个并行子 agent 同时处理 4 个领域：

**子 agent 超时配置：** `runTimeoutSeconds: 1200`（20 分钟）。AI技术领域需要五层数据采集，耗时较长，必须给予充足时间。

每个子 agent 负责阶段 1-3（爬取站点、搜索补充、日期过滤、筛选摘要、写文件），主 agent 负责阶段 4（Git 发布）。

子 agent 的 prompt 应包含：
- 项目绝对路径 `/Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push`
- 当日日期 `{date}`
- 该领域的专业站点列表
- 该领域的搜索关键词
- 严格日期过滤规则
- Markdown 格式模板
- 输出文件的绝对路径

---

## 错误处理

| 问题 | 处理方式 |
|------|----------|
| WebFetch 站点无法访问 | 跳过该站点，依赖其他数据层补充 |
| RSS feed 无法访问或解析失败 | 跳过该 RSS 源，记录失败，继续其他源 |
| RSS feed 返回非 XML 内容 | 跳过，不重试 |
| GitHub Releases atom feed 无响应 | 跳过该仓库，不影响整体流程 |
| Brave Search API 返回错误/429 | 等待 5 秒重试一次，仍失败则跳过，依赖 WebSearch 补充 |
| Brave Search API Key 无效 | 跳过 Brave 层，记录错误，依赖其他四层 |
| WebSearch 无结果 | 换关键词重试，尝试英文关键词 |
| 搜索结果质量低 | 增加搜索次数，扩大关键词范围 |
| 当日无任何有效资讯 | 生成空文件（itemCount: 0），报告中标记 |
| 文件写入失败 | 检查目录是否存在，重新 mkdir -p |
| Git push 失败 | 检查远程分支状态，最多重试 2 次 |
| 单个领域失败 | 继续处理其他领域，最终报告中标记失败 |
| 日期不匹配 | 严格丢弃非当日内容，不做降级处理 |
| ai-tech 去重冲突 | 标题相似度 > 70% 视为同一事件，保留评分最高的 |
