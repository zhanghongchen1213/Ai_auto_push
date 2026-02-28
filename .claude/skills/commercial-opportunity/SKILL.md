---
name: commercial-opportunity
description: "商业机会日报全自主管道：基于记忆的智能域选择、多轮深挖保证每日产出、人类可读淘汰分析。当用户说"运行商业机会管道"、"商业机会日报"、"commercial opportunity"、"/commercial-opportunity"、"执行商业机会检索"时触发。"
---

# 商业机会日报 — 全自主管道编排

## Overview

Claude Code 原生商业机会发现管道。基于历史记忆智能选择探索域，多轮深挖保证每日至少产出1个可商业化方案，淘汰理由为人类可读的深度分析。

六阶段串行流程：记忆回顾 → 智能检索 → 筛选评分（含多轮安全阀） → 日报生成 → 文件落盘 → Git 推送。全程零人工交互。

核心设计：
- **记忆驱动域选择**：读取历史探索记录，避免重复，智能聚焦高产域
- **人类可读淘汰理由**：深度分析如"大厂同质化严重，竞争壁垒低"，而非"综合评分未达标(77/100)"
- **每日必产出安全阀**：最多3轮探索，确保每日至少1个可商业化方案
- **小众痛点定义**：月搜索量<5000、大厂未覆盖、个人可解决
- **两阶段探索策略**：冷启动广撒网 → 稳定期关联扩展

## 项目路径（CRITICAL）

**项目绝对路径：** `/Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push`

记为 `{PROJECT_ROOT}`。所有文件操作和 Git 命令必须使用此绝对路径。

## 数据契约

### RawCandidate（检索阶段输出）
- `title`: string — 痛点标题
- `sourceUrl`: string — 来源 URL
- `sourceCategory`: "social" | "forum" | "appstore" | "marketplace" | "complaint"
- `rawText`: string — 原文片段（≤500 字）
- `timestamp`: string — 发现时间 ISO8601
- `platform`: string — 具体平台名称

### ScoredCandidate（筛选阶段输出）
在 RawCandidate 基础上增加：
- `scores.blankness`: number (0-10) — 空白度：是否已有现成方案
- `scores.rigidity`: number (0-10) — 刚需程度：用户多迫切需要
- `scores.bigCorpAvoidance`: number (0-10) — 大厂回避度：大厂是否会忽略此细分
- `scores.aiSolvability`: number (0-10) — AI可解度：AI/技术能否有效解决
- `scores.monetization`: number (0-10) — 变现可行度：能否赚钱
- `scores.total`: number (0-10) — 五维均分（保留一位小数）
- `eliminationReason`: string | null — 人类可读淘汰深度分析

### FinalProposal（决策阶段输出）
- `candidate`: ScoredCandidate — 最终选中候选（total ≥ 7.0）
- `evidenceChain.sourceUrls`: string[] — 来源 URL 列表
- `evidenceChain.quotes`: string[] — 关键引文
- `evidenceChain.scoringBasis`: string — 评分依据
- `validationPlan`: string — 2周验证计划
- `status`: "commercializable" | "no_viable_proposal"

## 日志标记格式

**阶段生命周期：**
```
[STAGE_START] {阶段名} | time={ISO8601}
[STAGE_COMPLETE] {阶段名} | duration={ms} | status=success | {阶段特定指标}
[STAGE_FAILED] {阶段名} | duration={ms} | error={错误摘要}
```

**管道生命周期：**
```
[PIPELINE_START] commercial-opportunity | date={date} | time={ISO8601}
[PIPELINE_COMPLETE] commercial-opportunity | date={date} | duration={ms} | stages_completed={N}/6
[PIPELINE_FAILED] commercial-opportunity | date={date} | duration={ms} | failed_stage={阶段名} | error={摘要}
```

## 错误处理策略

| 阶段 | 失败场景 | 处理方式 |
|------|---------|---------|
| memory | 记忆服务不可达 | 跳过记忆，使用默认域配置继续 |
| retrieve | 数据源全部不可达 | 输出 `[STAGE_FAILED]`，管道终止 |
| retrieve | 部分数据源失败 | 记录失败源，继续用已获取数据 |
| screen | AI 评分失败 | 重试 1 次，仍失败则终止 |
| screen | 3轮均无达标方案 | 正常产出 no_viable_proposal 日报 |
| generate | Markdown 生成异常 | 管道终止，不落盘 |
| persist | 文件写入失败 | mkdir -p 后重试 1 次 |
| publish | Git push 失败 | 最多重试 2 次 |

**核心原则：** 串行依赖，关键阶段失败即终止，避免产出不完整日报。

## Git 发布规范

**Commit Message 格式：**
```
chore: commercial opportunity daily {date} ({status})
```
其中 `{status}` 为 `commercializable` 或 `no_viable_proposal`。

**自动推送（CRITICAL — 强制执行）：**
- git push 必须自动执行，**禁止**询问用户确认
- commit 和 push 合并在同一条 Bash 命令中执行
- push 失败时最多重试 2 次

## 执行流程

IT IS CRITICAL THAT YOU FOLLOW THESE STEPS EXACTLY:

<steps CRITICAL="TRUE">

### Step 0: 初始化

1. 设置 `PROJECT_ROOT=/Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push`
2. 获取今天日期（UTC+8），格式 `YYYY-MM-DD`，记为 `{date}`
3. 用 TodoWrite 创建任务清单（6 个阶段各一个任务：记忆回顾、检索、筛选、生成、落盘、推送）
4. 用 Bash 确认输出目录：`mkdir -p {PROJECT_ROOT}/src/content/daily/{date}`
5. 输出 `[PIPELINE_START] commercial-opportunity | date={date} | time={ISO8601}`
6. 记录管道开始时间戳 `pipelineStartTime`
7. 初始化 `currentRound = 0`、`maxRounds = 3`、`allRawCandidates = []`、`finalProposal = null`

### Step 1: 记忆回顾（Memory）

- 阶段标识：`memory`
- 输入：无
- 输出：`memoryContext` — 包含历史域表现、已淘汰方案、已成功方案
- 完成标记：`[STAGE_COMPLETE] memory | duration={ms} | domains_history={数量} | past_proposals={数量}`
- 失败处理：记忆服务不可达时跳过，使用默认配置继续

输出 `[STAGE_START] memory | time={ISO8601}`

记录 `stageStartTime`。

#### 1.1 读取历史探索记录

执行3次记忆搜索：

1. 调用 `mcp__plugin_claude-mem_mcp-search__search` 查询 `"commercial opportunity domain exploration"`，获取过去探索过的域及其产出质量
2. 调用 `mcp__plugin_claude-mem_mcp-search__search` 查询 `"commercial opportunity eliminated"`，获取过去被淘汰的方案（避免重复探索）
3. 调用 `mcp__plugin_claude-mem_mcp-search__search` 查询 `"commercial opportunity proposal commercializable"`，获取过去成功的方案（避免重复产出）

对搜索结果，使用 `mcp__plugin_claude-mem_mcp-search__get_observations` 获取相关条目的详细内容。

#### 1.2 构建记忆上下文

从记忆中提取：
- `exploredDomains`: 过去探索过的域列表及每个域的历史产出率（成功方案数/探索次数）
- `eliminatedTopics`: 过去已淘汰的痛点标题列表（用于增量去重）
- `pastProposals`: 过去已产出的成功方案标题列表（避免重复）
- `highYieldDomains`: 历史产出率高的域（优先探索）
- `lowYieldDomains`: 历史产出率低的域（降低优先级）

#### 1.3 智能域选择

**数据源池（全部可选域）：**

| # | platform | sourceCategory | searchQuery |
|---|----------|---------------|-------------|
| 1 | 小红书 | social | `site:xiaohongshu.com 求推荐 踩坑 有没有替代` |
| 2 | 知乎 | forum | `site:zhihu.com 有什么好的替代 为什么没有` |
| 3 | V2EX | forum | `site:v2ex.com 求推荐 替代方案 太贵了` |
| 4 | App Store 差评 | appstore | `site:apps.apple.com 差评 不好用 功能缺失` |
| 5 | 酷安 | appstore | `site:coolapk.com 差评 求替代 不好用` |
| 6 | 黑猫投诉 | complaint | `site:tousu.sina.com.cn 投诉 功能缺失 软件` |
| 7 | 贴吧 | complaint | `site:tieba.baidu.com 吐槽 求替代 软件 工具` |
| 8 | 微博 | social | `site:weibo.com 求推荐 工具 太难用了` |
| 9 | 吾爱破解 | forum | `site:52pojie.cn 求助 有没有免费的` |
| 10 | 闲鱼/淘宝 | marketplace | `site:2.taobao.com OR site:goofish.com 求购 定制 工具 软件` |
| 11 | 电鸭/程序员客栈 | marketplace | `site:eleduck.com OR site:proginn.com 外包需求 小工具` |

**域选择策略：**

根据记忆上下文，每轮选择5个域：

- **冷启动（无历史记忆或记忆条目<3）：** 从11个域中随机选5个，确保至少覆盖3个不同 sourceCategory
- **稳定期（有历史记忆）：**
  - 2个来自 `highYieldDomains`（历史高产域）
  - 2个来自最近未探索的域（避免重复）
  - 1个随机域（保持探索多样性）
  - 排除连续3天都探索过的域

将选中的域记为 `selectedDomains`，并记录选择理由 `domainSelectionReasons`。

输出 `[STAGE_COMPLETE] memory | duration={duration}ms | status=success | domains_history={exploredDomains.length} | past_proposals={pastProposals.length} | selected_domains={selectedDomains.length}`

更新 TodoWrite 标记记忆回顾阶段完成。

### Step 2: 检索（Retrieve）

- 阶段标识：`retrieve`
- 输入：`{date}`、`selectedDomains`（Step 1 输出）
- 输出：`rawCandidates[]` — RawCandidate 数组
- 完成标记：`[STAGE_COMPLETE] retrieve | duration={ms} | candidates={数量}`
- 失败标记：`[STAGE_FAILED] retrieve | duration={ms} | error={摘要}` → 终止管道

输出 `[STAGE_START] retrieve | time={ISO8601}`

记录 `stageStartTime`。

#### 2.1 多源检索

遍历 `selectedDomains`，对每个域执行：

1. 调用 **WebSearch** 搜索该域的 `searchQuery`
2. 对返回的每条搜索结果，记录标题、URL、摘要片段
3. 如果某个域 WebSearch 失败或返回空结果，记录 `[WARN] {platform}: search failed, skipping`，跳过继续
4. 对摘要 < 80 字的条目，可选用 **WebFetch** 抓取 URL 提取更多文本（失败则保留已有摘要）。每个域最多 WebFetch 2 条，全局最多 WebFetch 6 条

**全部失败检查：** 如果所有域均失败（rawResults 为空），输出 `[STAGE_FAILED] retrieve | duration={ms} | error=all sources failed` 并终止管道。

#### 2.2 归一化为 RawCandidate

将每条原始搜索结果映射为 RawCandidate：
- `title`: 搜索结果标题，清洗 HTML 实体
- `sourceUrl`: 结果 URL
- `sourceCategory`: 从域配置继承
- `rawText`: 摘要或 WebFetch 正文，**截断至 ≤500 字**
- `timestamp`: 优先从搜索结果提取发布时间（ISO8601），无法提取则使用当前时间
- `platform`: 从域配置继承

丢弃 title 或 sourceUrl 为空的记录。

#### 2.3 去重（含历史去重）

三层去重，按顺序执行：

1. **URL 精确去重**：以 `sourceUrl` 为 key，保留首次出现的记录
2. **标题模糊去重**：字符级 Jaccard 相似度（bigram），阈值 ≥0.9 视为重复，保留 sourceCategory 优先级更高的一条（complaint > marketplace > appstore > forum > social）
3. **历史去重**：与 `eliminatedTopics` 和 `pastProposals` 比对标题，Jaccard ≥0.8 视为历史重复，标记跳过

**候选上限：** 去重后若超过 30 条，按 sourceCategory 优先级排序后截断至 30 条。

将本轮候选追加到 `allRawCandidates`。

输出 `[STAGE_COMPLETE] retrieve | duration={duration}ms | status=success | candidates={rawCandidates.length} | round={currentRound+1}`

更新 TodoWrite 标记检索阶段完成。

### Step 3: 筛选（Screen）— 含多轮安全阀

- 阶段标识：`screen`
- 输入：`allRawCandidates[]`
- 输出：`scoredCandidates[]`、`finalProposal`
- 完成标记：`[STAGE_COMPLETE] screen | duration={ms} | scored={数量} | final={有/无} | rounds={轮数}`
- 失败标记：`[STAGE_FAILED] screen | duration={ms} | error={摘要}` → 终止管道

输出 `[STAGE_START] screen | time={ISO8601}`

记录 `stageStartTime`。

#### 3.1 第一阶段：语义模式识别（规则引擎快速过滤）

定义关键词列表：

```
painPatterns = ["太难用", "求推荐", "有没有替代", "为什么没有",
                "求购", "定制", "有没有人做", "功能缺失",
                "太贵了", "有没有免费的", "求破解",
                "差评", "不好用", "踩坑", "吐槽", "求助", "求替代"]
adPatterns = ["优惠", "限时", "点击购买", "折扣", "促销", "领券"]
```

初始化 `passedCandidates = []`、`eliminatedCandidates = []`。

遍历 `allRawCandidates`，对每个 candidate：

1. 构造 `scored = { ...candidate, scores: {blankness:0, rigidity:0, bigCorpAvoidance:0, aiSolvability:0, monetization:0, total:0}, eliminationReason: null }`

2. **淘汰规则1 — 信息量不足：** 若 `rawText` 长度 < 20 字，设置 `eliminationReason = "原始信息过少，无法判断是否为真实痛点，缺乏足够上下文进行商业价值评估"`，加入 `eliminatedCandidates`，跳过。

3. **淘汰规则2 — 营销内容：** 若含 adPatterns 且不含 painPatterns，设置 `eliminationReason = "内容为营销推广而非真实用户痛点，不具备独立产品化价值"`，加入 `eliminatedCandidates`，跳过。

4. **淘汰规则3 — 无痛点信号：** 若不含 painPatterns，设置 `eliminationReason = "未检测到明确的用户不满或需求信号，可能是普通讨论而非可商业化痛点"`，加入 `eliminatedCandidates`，跳过。

5. 通过全部规则的候选加入 `passedCandidates`。

#### 3.2 第二阶段：AI 五维评分（10分制）

对 `passedCandidates` 进行五维评分。**若评分失败，重试 1 次；仍失败则终止管道。**

对每个 passedCandidate，基于其 `title`、`rawText`、`platform`、`sourceCategory`，按以下标准给出 0-10 分（保留一位小数）：

**blankness（空白度）：** 9-10=完全无现有工具；7-8=仅1-2个不成熟方案；4-6=有方案但用户不满；0-3=已有成熟产品。

**rigidity（刚需程度）：** 9-10=反复提及、多平台出现、影响核心工作流；7-8=主动求助、愿付费；4-6=抱怨但可忍受；0-3=偶尔提及。

**bigCorpAvoidance（大厂回避度）：** 9-10=极度垂直小众，月搜索量<5000；7-8=细分领域大厂短期不关注；4-6=大厂可能附属覆盖；0-3=大厂核心赛道。

**aiSolvability（AI可解度）：** 9-10=AI可直接解决核心痛点；7-8=AI可显著提升效率；4-6=AI可辅助但非核心；0-3=非技术问题。

**monetization（变现可行度）：** 9-10=用户已表达付费意愿；7-8=可SaaS订阅或按次付费；4-6=可增值服务或广告；0-3=变现路径不清晰。

计算 `total = (blankness + rigidity + bigCorpAvoidance + aiSolvability + monetization) / 5`，保留一位小数。

#### 3.3 人类可读淘汰分析（CRITICAL）

对每个未达标候选（`total < 7.0`），**必须生成深度人类可读的淘汰理由**，而非简单的分数描述。

**淘汰理由撰写规则：**
- 禁止使用 "综合评分未达标(X.X/10)" 这类机械描述
- 禁止使用 "无痛点语义信号" 这类技术术语
- 必须从商业角度分析为什么这个方向不值得做
- 每条理由 30-80 字，包含具体的商业判断

**淘汰理由示例（参考风格）：**
- "大厂同质化严重，飞书/钉钉/企微已全面覆盖，个人开发者无法建立差异化壁垒"
- "需求不刚需，用户吐槽但实际可用Excel凑合，付费意愿极低"
- "目标用户群体过小且分散，获客成本高于LTV，难以形成可持续商业模式"
- "技术门槛低，任何开发者半天可复制，无法形成护城河"
- "虽有痛点但属于政策/法规限制问题，技术方案无法根本解决"
- "市场已进入红海期，头部玩家已完成用户教育，后入者获客成本极高"

#### 3.4 记忆存储（淘汰分析持久化）

对每个被淘汰的候选，调用 `mcp__plugin_claude-mem_mcp-search__save_memory` 保存：

```
标题: "commercial opportunity eliminated: {candidate.title}"
内容: "日期:{date} | 平台:{platform} | 淘汰理由:{eliminationReason} | 评分:{total}/10"
```

#### 3.5 安全阀：多轮深挖机制

**达标判定：** 从 `passedCandidates` 中筛选 `total >= 7.0` 的候选为 `qualifiedCandidates`。

**若 `qualifiedCandidates` 非空 → 进入 3.6 最终决策。**

**若 `qualifiedCandidates` 为空且 `currentRound < maxRounds - 1`：**

1. `currentRound += 1`
2. 输出 `[SAFETY_VALVE] round {currentRound+1}/{maxRounds} | reason=no qualified candidates | action=deeper exploration`
3. 调整搜索策略：
   - 更换搜索关键词（在原 searchQuery 基础上添加更具体的垂直领域词，如 "小众工具"、"冷门需求"、"独立开发"）
   - 从未选中的域中补充 2-3 个新域
4. 回到 **Step 2（检索）** 执行新一轮检索，新候选追加到 `allRawCandidates`
5. 对新候选重新执行 3.1-3.5

**若 `qualifiedCandidates` 为空且 `currentRound >= maxRounds - 1`：**
- 接受 no_viable_proposal 结果，进入 3.6

#### 3.6 最终方案决策

**若 `qualifiedCandidates` 非空：**

选最高分候选 `best = qualifiedCandidates 按 total 降序取第一个`。同分时按 `blankness` 降序（确保可复现）。

验证证据链完整性：
- `sourceUrl` 非空
- `rawText` 非空且长度 > 0
- 五维分数均 > 0

```
finalProposal = {
  status: "commercializable",
  candidate: best,
  evidenceChain: {
    sourceUrls: [best.sourceUrl],
    quotes: [best.rawText.substring(0, 200)],
    scoringBasis: "空白度:" + blankness + "/10 刚需:" + rigidity + "/10 大厂回避:" + bigCorpAvoidance + "/10 AI可解:" + aiSolvability + "/10 变现:" + monetization + "/10 均分:" + total + "/10"
  },
  validationPlan: "（在 Step 4 生成阶段填充2周验证计划）"
}
```

调用 `mcp__plugin_claude-mem_mcp-search__save_memory` 保存成功方案：
```
标题: "commercial opportunity proposal: {best.title}"
内容: "日期:{date} | 平台:{platform} | 评分:{total}/10 | 方案概述:{best.rawText.substring(0,100)}"
```

保存域探索结果：
```
标题: "commercial opportunity domain exploration {date}"
内容: "探索域:{selectedDomains的platform列表} | 产出:commercializable | 方案:{best.title} | 高产域:{产出best的platform}"
```

**若 `qualifiedCandidates` 为空：**

```
finalProposal = { status: "no_viable_proposal", candidate: null, evidenceChain: null, validationPlan: null }
```

保存域探索结果（无产出）：
```
标题: "commercial opportunity domain exploration {date}"
内容: "探索域:{selectedDomains的platform列表} | 产出:no_viable_proposal | 轮数:{currentRound+1}/{maxRounds} | 低产域:{本次所有域}"
```

输出 `[STAGE_COMPLETE] screen | duration={duration}ms | status=success | scored={passedCandidates.length} | eliminated={eliminatedCandidates.length} | final={有/无} | rounds={currentRound+1}`

更新 TodoWrite 标记筛选阶段完成。

### Step 4: 生成（Generate）

- 阶段标识：`generate`
- 输入：`allRawCandidates[]`、`scoredCandidates[]`、`eliminatedCandidates[]`、`finalProposal`、`selectedDomains`、`domainSelectionReasons`
- 输出：`markdownContent` — 完整 Markdown 文档字符串
- 完成标记：`[STAGE_COMPLETE] generate | duration={ms} | bytes={字节数}`
- 失败标记：`[STAGE_FAILED] generate | duration={ms} | error={摘要}` → 终止管道

输出 `[STAGE_START] generate | time={ISO8601}`

记录 `stageStartTime`。

#### 4.1 计算统计值

```
retrievedCount = allRawCandidates.length
scoredCount = passedCandidates.length（进入AI评分的候选数）
eliminatedCount = eliminatedCandidates.length（被淘汰的候选总数）
finalStatus = finalProposal.status
searchDomains = selectedDomains 的 platform 列表逗号分隔
proposalName = finalProposal.status == "commercializable" ? finalProposal.candidate.title : ""
proposalScore = finalProposal.status == "commercializable" ? finalProposal.candidate.scores.total.toString() : ""
generatedAt = 当前时间 ISO8601（UTC+8）
```

#### 4.2 生成 frontmatter

```markdown
---
title: "商业机会日报"
domain: "commercial-opportunity"
date: "{date}"
finalStatus: "{finalStatus}"
retrievedCount: {retrievedCount}
scoredCount: {scoredCount}
eliminatedCount: {eliminatedCount}
searchDomains: "{searchDomains}"
proposalName: "{proposalName}"
proposalScore: "{proposalScore}"
generatedAt: "{generatedAt}"
---
```

#### 4.3 生成正文

**第一部分 — 今日概况：**

```markdown
## 今日概况

今日共检索 {retrievedCount} 条候选，{scoredCount} 条进入 AI 评分，{eliminatedCount} 条被淘汰，共执行 {currentRound+1} 轮探索。最终状态：{finalStatus == "commercializable" ? "发现可商业化方案 ✅" : "今日无可用方案 ❌"}。
```

若 `retrievedCount == 0`：`今日各数据源均未返回有效候选，无数据进入筛选流程。`

**第二部分 — 今日检索领域：**

```markdown
## 今日检索领域
```

列出每个 selectedDomain 及选择理由：

```markdown
- **{platform}**（{sourceCategory}）：{domainSelectionReasons[该域的理由]}
```

**第三部分 — 尝试探索内容：**

```markdown
## 尝试探索内容
```

对 `allRawCandidates` 编号列出：

```markdown
1. **{title}** — {platform} | {rawText前80字}...
```

**第四部分 — 无价值方案及淘汰理由：**

```markdown
## 无价值方案及淘汰理由
```

遍历 `eliminatedCandidates`，每条输出：

```markdown
### {candidate.title}

- **平台：** {candidate.platform}
- **淘汰分析：** {candidate.eliminationReason}
```

若无淘汰候选：`今日无淘汰方案。`

**第五部分 — 最终方案：**

```markdown
## 最终方案
```

若 `finalProposal.status == "commercializable"`：

```markdown
### {finalProposal.candidate.title}

- **平台：** {finalProposal.candidate.platform}
- **综合评分：** {total}/10
- **五维评分：** 空白度 {blankness}/10 | 刚需 {rigidity}/10 | 大厂回避 {bigCorpAvoidance}/10 | AI可解 {aiSolvability}/10 | 变现 {monetization}/10
- **来源：** [{sourceUrl}]({sourceUrl})
- **方案概述：** {rawText前200字}
```

若 `finalProposal.status == "no_viable_proposal"`：

```markdown
今日经过 {currentRound+1} 轮探索，所有候选均未达到商业化阈值（7.0/10）。主要原因分析：{汇总top3淘汰理由类型}。
```

**第六部分 — 证据链：**

```markdown
## 证据链
```

若 commercializable，列出：
```markdown
- **来源URL：** {sourceUrl}
- **关键引文：** "{quote}"
- **发现时间：** {timestamp}
- **评分依据：** {scoringBasis}
```

若 no_viable_proposal：`本日无达标方案，无证据链输出。`

**第七部分 — 验证计划：**

```markdown
## 验证计划
```

若 commercializable，生成2周验证计划：

```markdown
### 第1周：需求验证
- Day 1-2: 竞品深度调研，确认空白度
- Day 3-4: 目标用户访谈（至少5人），验证刚需程度
- Day 5-7: MVP原型设计，核心功能定义

### 第2周：市场验证
- Day 8-9: Landing page 搭建，收集注册意向
- Day 10-11: 社区发帖测试反馈（小红书/V2EX/知乎）
- Day 12-14: 数据分析，决定是否继续投入
```

若 no_viable_proposal：`本日无达标方案，无需验证计划。`

#### 4.4 组装与校验

将 frontmatter + 七部分正文拼接为 `markdownContent`。

**结构完整性校验：** 验证包含七个必需二级标题：`## 今日概况`、`## 今日检索领域`、`## 尝试探索内容`、`## 无价值方案及淘汰理由`、`## 最终方案`、`## 证据链`、`## 验证计划`。任一缺失则终止管道。

若 `markdownContent` 为空或字节数为 0，终止管道。

输出 `[STAGE_COMPLETE] generate | duration={duration}ms | status=success | bytes={bytes}`

更新 TodoWrite 标记生成阶段完成。

### Step 5: 落盘（Persist）

- 阶段标识：`persist`
- 输入：`markdownContent`、`{date}`
- 输出：文件写入 `{PROJECT_ROOT}/src/content/daily/{date}/commercial-opportunity.md`
- 完成标记：`[STAGE_COMPLETE] persist | duration={ms} | path={文件路径}`
- 失败标记：`[STAGE_FAILED] persist | duration={ms} | error={摘要}` → 终止管道

输出 `[STAGE_START] persist | time={ISO8601}`

记录 `stageStartTime`。

设置 `filePath = {PROJECT_ROOT}/src/content/daily/{date}/commercial-opportunity.md`。

#### 5.1 确保目录存在

```bash
mkdir -p {PROJECT_ROOT}/src/content/daily/{date}
```

#### 5.2 写入文件

使用 Write 工具将 `markdownContent` 写入 `filePath`。

若 Write 失败：
1. 再次 `mkdir -p {PROJECT_ROOT}/src/content/daily/{date}`
2. 再次 Write
3. 仍失败则输出 `[STAGE_FAILED] persist | duration={ms} | error=write failed after retry` 并终止管道

#### 5.3 校验文件

```bash
wc -c < {filePath}
```

若字节数为 0 或命令失败，终止管道。

输出 `[STAGE_COMPLETE] persist | duration={duration}ms | status=success | path={filePath}`

更新 TodoWrite 标记落盘阶段完成。

### Step 6: 推送（Publish）

- 阶段标识：`publish`
- 输入：`{date}`、落盘文件路径、`finalProposal.status`
- 输出：Git commit + push 完成
- 完成标记：`[STAGE_COMPLETE] publish | duration={ms} | commit={hash}`
- 失败标记：`[STAGE_FAILED] publish | duration={ms} | error={摘要}`

输出 `[STAGE_START] publish | time={ISO8601}`

记录 `stageStartTime`。

其中 `{status}` 取自 `finalProposal.status`。

**1. Git add + commit + pull rebase + push（单条命令）：**

```bash
git add src/content/daily/{date}/commercial-opportunity.md && git commit -m "chore: commercial opportunity daily {date} ({status})" && git pull --rebase && git push
```

**2. 重试逻辑（最多重试 2 次，共 3 次尝试）：**

若 push 失败：

```bash
cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && git pull --rebase && git push
```

**3. 成功处理：**

```bash
cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && git rev-parse --short HEAD
```

输出 `[STAGE_COMPLETE] publish | duration={duration}ms | status=success | commit={hash}`

**4. 失败处理：**

3 次均失败时输出 `[STAGE_FAILED] publish | duration={duration}ms | error=push failed after 3 attempts`

更新 TodoWrite 标记推送阶段完成。

### Post-Pipeline: 汇总报告

计算管道总耗时，输出 `[PIPELINE_COMPLETE] commercial-opportunity | date={date} | duration={总耗时}ms | stages_completed=6/6`

向用户输出汇总表：

| 阶段 | 状态 | 耗时 | 关键指标 |
|------|------|------|---------|
| 记忆回顾 | 成功/跳过 | Nms | 历史域: X，历史方案: Y |
| 检索 | 成功/失败 | Nms | 候选数: X，域数: Y |
| 筛选 | 成功/失败 | Nms | 评分数: X，淘汰数: Y，轮数: Z |
| 生成 | 成功/失败 | Nms | 文档大小: X bytes |
| 落盘 | 成功/失败 | Nms | 路径: src/content/daily/{date}/commercial-opportunity.md |
| 推送 | 成功/失败 | Nms | commit: {hash} |

**最终结论：** {可商业化方案标题 + 评分} 或 "今日经过N轮探索无可用方案"

**30日运行指标：**

```bash
cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && SUCCESS=$(git log --oneline --since="30 days ago" --grep="chore: commercial opportunity daily" | wc -l | tr -d ' ') && TOTAL=$(( ($(date +%s) - $(date -v-30d +%s 2>/dev/null || date -d "30 days ago" +%s)) / 86400 )) && echo "success=${SUCCESS} total=${TOTAL}"
```

| 指标 | 数值 |
|------|------|
| 30日推送成功率 | {success}/{total} = {percent}% |
| 30日商业化方案产出率 | {commercializable_count}/{success} = {percent}% |

如果管道中途失败，输出：
`[PIPELINE_FAILED] commercial-opportunity | date={date} | duration={ms} | failed_stage={阶段名} | error={摘要}`

</steps>
