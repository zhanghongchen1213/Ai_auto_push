---
name: commercial-opportunity
description: "商业机会日报全自主管道：单次触发后自动完成多源检索、双阶段筛选、日报生成、文件落盘、Git推送五阶段。当用户说"运行商业机会管道"、"商业机会日报"、"commercial opportunity"、"/commercial-opportunity"、"执行商业机会检索"时触发。"
---

# 商业机会日报 — 全自主管道编排

## Overview

Claude Code 原生商业机会发现管道。单次触发后自动完成五阶段串行流程：多源检索 → 双阶段筛选 → 日报生成 → 文件落盘 → Git 推送。全程零人工交互（FR36, NFR22）。

与资讯管道的核心差异：单文件串行流程（非多领域并行），阶段间严格依赖，前阶段失败即终止。

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
- `scores.blankness`: number (0-20) — 空白度
- `scores.rigidity`: number (0-20) — 刚需程度
- `scores.bigCorpAvoidance`: number (0-20) — 大厂回避度
- `scores.aiSolvability`: number (0-20) — AI 可解度
- `scores.monetization`: number (0-20) — 变现可行度
- `scores.total`: number (0-100) — 综合评分
- `eliminationReason`: string | null — 淘汰理由

### FinalProposal（决策阶段输出）
- `candidate`: ScoredCandidate — 最终选中候选（total ≥ 80）
- `evidenceChain.sourceUrls`: string[] — 来源 URL 列表
- `evidenceChain.quotes`: string[] — 关键引文
- `evidenceChain.scoringBasis`: string — 评分依据
- `status`: "commercializable" | "no_viable_proposal"

### DailyReport（生成阶段输出）
- `markdownContent`: string — 完整 Markdown 文档
- `metadata.date`: string
- `metadata.retrievedCount`: number
- `metadata.scoredCount`: number
- `metadata.eliminatedCount`: number
- `metadata.finalStatus`: "commercializable" | "no_viable_proposal"

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
[PIPELINE_COMPLETE] commercial-opportunity | date={date} | duration={ms} | stages_completed={N}/5
[PIPELINE_FAILED] commercial-opportunity | date={date} | duration={ms} | failed_stage={阶段名} | error={摘要}
```

## 错误处理策略

| 阶段 | 失败场景 | 处理方式 |
|------|---------|---------|
| retrieve | 数据源全部不可达 | 输出 `[STAGE_FAILED]`，管道终止 |
| retrieve | 部分数据源失败 | 记录失败源，继续用已获取数据 |
| screen | AI 评分失败 | 重试 1 次，仍失败则终止 |
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
3. 用 TodoWrite 创建任务清单（5 个阶段各一个任务）
4. 用 Bash 确认输出目录：`mkdir -p {PROJECT_ROOT}/src/content/daily/{date}`
5. 输出 `[PIPELINE_START] commercial-opportunity | date={date} | time={ISO8601}`
6. 记录管道开始时间戳 `pipelineStartTime`

### Step 1: 检索（Retrieve）

- 阶段标识：`retrieve`
- 输入：`{date}`、数据源配置
- 输出：`rawCandidates[]` — RawCandidate 数组
- 完成标记：`[STAGE_COMPLETE] retrieve | duration={ms} | candidates={数量}`
- 失败标记：`[STAGE_FAILED] retrieve | duration={ms} | error={摘要}` → 终止管道

**多源检索与候选归一化实现：**

输出 `[STAGE_START] retrieve | time={ISO8601}`

记录 `stageStartTime`。

#### 1.1 数据源配置

| # | platform | sourceCategory | searchQuery |
|---|----------|---------------|-------------|
| 1 | 微博 | social | `site:weibo.com 求推荐 工具 太难用了` |
| 2 | 小红书 | social | `site:xiaohongshu.com 求推荐 踩坑 有没有替代` |
| 3 | V2EX | forum | `site:v2ex.com 求推荐 替代方案 太贵了` |
| 4 | 知乎 | forum | `site:zhihu.com 有什么好的替代 为什么没有` |
| 5 | 吾爱破解 | forum | `site:52pojie.cn 求助 有没有免费的` |
| 6 | App Store 评价 | appstore | `site:apps.apple.com 差评 不好用` |
| 7 | 酷安 | appstore | `site:coolapk.com 差评 求替代` |
| 8 | 闲鱼/淘宝 | marketplace | `site:2.taobao.com OR site:goofish.com 求购 定制 工具 软件` |
| 9 | 电鸭/程序员客栈 | marketplace | `site:eleduck.com OR site:proginn.com 外包需求 小工具` |
| 10 | 黑猫投诉 | complaint | `site:tousu.sina.com.cn 投诉 功能缺失 软件` |
| 11 | 贴吧 | complaint | `site:tieba.baidu.com 吐槽 求替代 软件 工具` |

#### 1.2 多源检索

遍历上述 11 个数据源，对每个数据源执行：

1. 调用 **WebSearch** 搜索该数据源的 `searchQuery`
2. 对返回的每条搜索结果，记录标题、URL、摘要片段
3. 如果某个数据源 WebSearch 失败或返回空结果，记录日志（如 `[WARN] 微博: search failed, skipping`），**跳过继续下一个数据源**
4. 对搜索结果中信息不足的条目（摘要 < 80 字），可选用 **WebFetch** 抓取该 URL 页面提取更多文本内容（失败则保留已有摘要）。每个数据源最多 WebFetch 2 条 URL，全局最多 WebFetch 8 条，避免上下文膨胀

**全部失败检查：** 如果所有 11 个数据源均失败（rawResults 为空），输出 `[STAGE_FAILED] retrieve | duration={ms} | error=all 11 sources failed` 并终止管道。

#### 1.3 归一化为 RawCandidate

将每条原始搜索结果映射为 RawCandidate：

- `title`: 搜索结果标题，清洗 HTML 实体
- `sourceUrl`: 结果 URL
- `sourceCategory`: 从数据源配置继承（social/forum/appstore/marketplace/complaint）
- `rawText`: 搜索结果摘要或 WebFetch 提取的正文，**截断至 ≤500 字**
- `timestamp`: 优先从搜索结果中提取发布时间（ISO8601），无法提取则使用当前时间
- `platform`: 从数据源配置继承（微博/小红书/V2EX 等）

丢弃 title 或 sourceUrl 为空的记录，记录日志。

#### 1.4 去重

两层去重，按顺序执行：

1. **URL 精确去重**：以 `sourceUrl` 为 key，保留首次出现的记录
2. **标题模糊去重**：使用字符级 Jaccard 相似度（bigram 集合交集/并集），阈值 ≥0.9 时视为重复，保留 sourceCategory 优先级更高的一条（优先级：complaint > marketplace > appstore > forum > social）。比较前先统一去除标点、空格并转小写。

**候选上限：** 去重后若 rawCandidates 超过 50 条，按 sourceCategory 优先级（complaint > marketplace > appstore > forum > social）排序后截断至 50 条，避免下游阶段处理负担过重。

#### 1.5 完成

计算耗时 `duration = now - stageStartTime`。

输出 `[STAGE_COMPLETE] retrieve | duration={duration}ms | status=success | candidates={rawCandidates.length}`

更新 TodoWrite 标记检索阶段完成。

### Step 2: 筛选（Screen）

- 阶段标识：`screen`
- 输入：`rawCandidates[]`
- 输出：`scoredCandidates[]`、`finalProposal`
- 完成标记：`[STAGE_COMPLETE] screen | duration={ms} | scored={数量} | final={有/无}`
- 失败标记：`[STAGE_FAILED] screen | duration={ms} | error={摘要}` → 终止管道

**双阶段筛选与评分实现：**

输出 `[STAGE_START] screen | time={ISO8601}`

记录 `stageStartTime`。

#### 2.1 第一阶段：语义模式识别（规则引擎快速过滤）

定义关键词列表：

```
painPatterns = ["太难用", "求推荐", "有没有替代", "为什么没有",
                "求购", "定制", "有没有人做", "功能缺失",
                "太贵了", "有没有免费的", "求破解",
                "差评", "不好用", "踩坑", "吐槽", "求助", "求替代"]
adPatterns = ["优惠", "限时", "点击购买", "折扣", "促销", "领券"]
```

初始化 `passedCandidates = []`、`eliminatedCandidates = []`。

遍历 `rawCandidates`，对每个 candidate：

1. 构造 `scored = { ...candidate, scores: { blankness:0, rigidity:0, bigCorpAvoidance:0, aiSolvability:0, monetization:0, total:0 }, eliminationReason: null }`

2. **淘汰规则1 — 信息量不足：** 若 `candidate.rawText` 长度 < 20 字，设置 `scored.eliminationReason = "信息量不足"`，加入 `eliminatedCandidates`，跳过。

3. **淘汰规则2 — 营销内容过滤：** 检查 `rawText` 是否包含 `adPatterns` 中任一关键词（`hasAdSignal`），以及是否包含 `painPatterns` 中任一关键词（`hasPainSignal`）。若 `hasAdSignal AND NOT hasPainSignal`，设置 `scored.eliminationReason = "营销内容，非真实痛点"`，加入 `eliminatedCandidates`，跳过。

4. **淘汰规则3 — 无痛点语义信号：** 若 `NOT hasPainSignal`，设置 `scored.eliminationReason = "无痛点语义信号"`，加入 `eliminatedCandidates`，跳过。

5. 通过全部规则的候选加入 `passedCandidates`。

#### 2.2 第二阶段：AI 五维评分

对 `passedCandidates` 调用 Claude 内置推理能力进行五维评分。**若评分失败，重试 1 次；仍失败则输出 `[STAGE_FAILED] screen | duration={duration}ms | error=scoring failed after retry` 并终止管道。**

对每个 passedCandidate，基于其 `title`、`rawText`、`platform`、`sourceCategory`，按以下评分标准给出 0-20 分：

**blankness（空白度）：** 16-20=无现有工具解决；11-15=仅1-2个不成熟方案；6-10=有方案但用户不满；0-5=已有成熟产品。

**rigidity（刚需程度）：** 16-20=反复提及、多平台出现、影响核心工作流；11-15=主动求助、愿付费；6-10=抱怨但可忍受；0-5=偶尔提及。

**bigCorpAvoidance（大厂回避度）：** 16-20=极度垂直小众；11-15=细分领域大厂短期不关注；6-10=大厂可能附属覆盖；0-5=大厂核心赛道。

**aiSolvability（AI可解度）：** 16-20=AI可直接解决核心痛点；11-15=AI可显著提升效率；6-10=AI可辅助但非核心；0-5=非技术问题。

**monetization（变现可行度）：** 16-20=用户已表达付费意愿；11-15=可SaaS订阅或按次付费；6-10=可增值服务或广告；0-5=变现路径不清晰。

评分输出填充到 `scored.scores`。对每个维度分值执行 `clamp(0, 20)` 校验，超出范围则截断至边界值。计算 `scored.scores.total = blankness + rigidity + bigCorpAvoidance + aiSolvability + monetization`。

#### 2.3 评分后淘汰

遍历 `passedCandidates`，若 `scored.scores.total < 40`，设置 `scored.eliminationReason = "综合评分过低(" + total + "/100)"`，并将该候选从 `passedCandidates` 移入 `eliminatedCandidates`。

#### 2.4 合并结果与输出

```
scoredCandidates = [...passedCandidates, ...eliminatedCandidates]
```

**最终方案决策（Story 6-4）：**

从 `passedCandidates` 中筛选达标候选：`qualifiedCandidates = passedCandidates.filter(c => c.scores.total >= 80)`

对达标候选验证证据链完整性，保留满足以下全部条件的候选：
- `c.sourceUrl` 非空且非空字符串（`c.sourceUrl && c.sourceUrl.trim().length > 0`）
- `c.rawText` 非空且长度 > 0（`c.rawText && c.rawText.trim().length > 0`）
- `c.scores.blankness > 0 AND c.scores.rigidity > 0 AND c.scores.bigCorpAvoidance > 0 AND c.scores.aiSolvability > 0 AND c.scores.monetization > 0`

记验证通过的为 `validCandidates`。

**若 `validCandidates` 非空：**

选最高分候选 `best = validCandidates 按 scores.total 降序排列取第一个`。若存在同分候选，按 `scores.blankness` 降序取第一个（确保决策可复现）。

```
finalProposal = {
  status: "commercializable",
  candidate: best,
  evidenceChain: {
    sourceUrls: [best.sourceUrl],
    quotes: [best.rawText.substring(0, 200)],
    scoringBasis: "空白度:" + best.scores.blankness + "/20 刚需:" + best.scores.rigidity + "/20 大厂回避:" + best.scores.bigCorpAvoidance + "/20 AI可解:" + best.scores.aiSolvability + "/20 变现:" + best.scores.monetization + "/20 总分:" + best.scores.total + "/100"
  }
}
```

标记未入选候选的淘汰理由：
- `qualifiedCandidates` 中证据链不完整的：`eliminationReason = "证据链不完整"`
- `qualifiedCandidates` 中证据链完整但非 best 的：`eliminationReason = "非最高分候选(" + scores.total + "/100)"`
- `passedCandidates` 中 `scores.total < 80` 的：`eliminationReason = "综合评分未达标(" + scores.total + "/100，阈值80)"`

**若 `validCandidates` 为空：**

```
finalProposal = { status: "no_viable_proposal", candidate: null, evidenceChain: null }
```

标记所有 passedCandidates 中尚无 eliminationReason 的候选：
- `qualifiedCandidates` 中证据链不完整的：`eliminationReason = "证据链不完整"`
- `passedCandidates` 中 `scores.total < 80` 的：`eliminationReason = "综合评分未达标(" + scores.total + "/100，阈值80)"`

设置 `finalStatus = finalProposal.status == "commercializable" ? "有" : "无"`。

计算耗时 `duration = now - stageStartTime`。

输出 `[STAGE_COMPLETE] screen | duration={duration}ms | status=success | scored={passedCandidates.length} | eliminated={eliminatedCandidates.length} | final={finalStatus}`

更新 TodoWrite 标记筛选阶段完成。

### Step 3: 生成（Generate）

- 阶段标识：`generate`
- 输入：`rawCandidates[]`（Step 1 输出）、`scoredCandidates[]`（Step 2 输出）、`finalProposal`（Step 2 输出）
- 输出：`markdownContent` — 完整 Markdown 文档字符串
- 完成标记：`[STAGE_COMPLETE] generate | duration={ms} | bytes={字节数}`
- 失败标记：`[STAGE_FAILED] generate | duration={ms} | error={摘要}` → 终止管道

**Markdown 生成实现（Story 6-5）：**

输出 `[STAGE_START] generate | time={ISO8601}`

记录 `stageStartTime`。

#### 3.1 计算统计值

```
retrievedCount = rawCandidates.length（Step 1 输出的原始候选总数）
scoredCount = passedCandidates.length（通过规则引擎进入 AI 评分的候选数）
eliminatedCount = scoredCandidates.filter(c => c.eliminationReason != null).length（被淘汰的候选总数，含规则淘汰+评分淘汰+决策阶段淘汰）
finalStatus = finalProposal.status
generatedAt = 当前时间 ISO8601（UTC+8）
```

#### 3.2 生成 frontmatter

```markdown
---
title: "商业机会日报"
domain: "commercial-opportunity"
date: "{date}"
finalStatus: "{finalStatus}"
retrievedCount: {retrievedCount}
scoredCount: {scoredCount}
eliminatedCount: {eliminatedCount}
generatedAt: "{generatedAt}"
---
```

#### 3.3 生成正文四部分

**第一部分 — 今日概况：**

```markdown
## 今日概况

今日共检索 {retrievedCount} 条候选，{scoredCount} 条进入 AI 评分，{eliminatedCount} 条被淘汰。最终状态：{finalStatus == "commercializable" ? "发现可商业化方案" : "今日无可用方案"}。
```

若 `retrievedCount == 0`，概况改为：`今日各数据源均未返回有效候选，无数据进入筛选流程。`

**第二部分 — 检索领域：**

```markdown
## 检索领域
```

按 `sourceCategory` 对 `rawCandidates` 分组统计，输出每个类别及命中数：

```markdown
- **{sourceCategory}**：{该类别候选数} 条（来源：{该类别涉及的 platform 列表逗号分隔}）
```

若 `rawCandidates` 为空，输出：`今日无检索数据。`

**第三部分 — 无价值方案：**

```markdown
## 无价值方案
```

遍历 `scoredCandidates` 中 `eliminationReason` 非 null 的候选，每条输出：

```markdown
### {candidate.title}

- **平台：** {candidate.platform}
- **淘汰理由：** {candidate.eliminationReason}
```

若无淘汰候选，输出：`今日无淘汰方案。`

**第四部分 — 最终方案：**

```markdown
## 最终方案
```

若 `finalProposal.status == "commercializable"`：

```markdown
### {finalProposal.candidate.title}

- **平台：** {finalProposal.candidate.platform}
- **综合评分：** {finalProposal.candidate.scores.total}/100
- **五维评分：** 空白度 {blankness}/20 | 刚需 {rigidity}/20 | 大厂回避 {bigCorpAvoidance}/20 | AI可解 {aiSolvability}/20 | 变现 {monetization}/20
- **来源：** [{finalProposal.candidate.sourceUrl}]({finalProposal.candidate.sourceUrl})
- **证据摘要：** {finalProposal.evidenceChain.quotes[0]}
```

若 `finalProposal.status == "no_viable_proposal"`：

```markdown
今日无可用方案。所有候选均未达到商业化阈值（80/100）或证据链不完整。
```

#### 3.4 组装与输出

将 frontmatter + 四部分正文拼接为 `markdownContent` 字符串。

计算字节数 `bytes = markdownContent 的 UTF-8 字节长度`。

若 `markdownContent` 为空或 bytes == 0，输出 `[STAGE_FAILED] generate | duration={ms} | error=empty markdown content` 并终止管道。

**结构完整性校验：** 验证 `markdownContent` 包含四个必需的二级标题：`## 今日概况`、`## 检索领域`、`## 无价值方案`、`## 最终方案`。若任一缺失，输出 `[STAGE_FAILED] generate | duration={ms} | error=missing required section(s)` 并终止管道。

计算耗时 `duration = now - stageStartTime`。

输出 `[STAGE_COMPLETE] generate | duration={duration}ms | status=success | bytes={bytes}`

更新 TodoWrite 标记生成阶段完成。

### Step 4: 落盘（Persist）

- 阶段标识：`persist`
- 输入：`markdownContent`、`{date}`
- 输出：文件写入 `{PROJECT_ROOT}/src/content/daily/{date}/commercial-opportunity.md`
- 完成标记：`[STAGE_COMPLETE] persist | duration={ms} | path={文件路径}`
- 失败标记：`[STAGE_FAILED] persist | duration={ms} | error={摘要}` → 终止管道

**文件落盘实现（Story 6-5）：**

输出 `[STAGE_START] persist | time={ISO8601}`

记录 `stageStartTime`。

设置 `filePath = {PROJECT_ROOT}/src/content/daily/{date}/commercial-opportunity.md`。

#### 4.1 确保目录存在

使用 Bash 执行：`mkdir -p {PROJECT_ROOT}/src/content/daily/{date}`

#### 4.2 写入文件

使用 Write 工具将 `markdownContent` 写入 `filePath`。

若 Write 失败，执行重试：
1. 再次 `mkdir -p {PROJECT_ROOT}/src/content/daily/{date}`
2. 再次 Write `markdownContent` 到 `filePath`
3. 仍失败则输出 `[STAGE_FAILED] persist | duration={ms} | error=write failed after retry` 并终止管道

#### 4.3 校验文件

使用 Bash 执行 `wc -c < {filePath}` 获取字节数。

若字节数为 0 或命令失败，输出 `[STAGE_FAILED] persist | duration={ms} | error=file empty or unreadable` 并终止管道。

计算耗时 `duration = now - stageStartTime`。

输出 `[STAGE_COMPLETE] persist | duration={duration}ms | status=success | path={PROJECT_ROOT}/src/content/daily/{date}/commercial-opportunity.md`

更新 TodoWrite 标记落盘阶段完成。

### Step 5: 推送（Publish）

- 阶段标识：`publish`
- 输入：`{date}`、落盘文件路径、`finalProposal.status`
- 输出：Git commit + push 完成
- 完成标记：`[STAGE_COMPLETE] publish | duration={ms} | commit={hash}`
- 失败标记：`[STAGE_FAILED] publish | duration={ms} | error={摘要}`

输出 `[STAGE_START] publish | time={ISO8601}`

记录 `stageStartTime`。

其中 `{status}` 取自 `finalProposal.status`（动态值，如 `commercializable` 或 `no_viable_proposal`）。

**1. Git add + commit + pull rebase + push（单条命令，禁止拆分）：**

```bash
cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && git add src/content/daily/{date}/commercial-opportunity.md && git commit -m "chore: commercial opportunity daily {date} ({status})" && git pull --rebase && git push
```

若上述命令中 push 失败（整条命令返回非零退出码），进入重试循环。

**2. 重试逻辑（最多重试 2 次，共 3 次尝试）：**

首次尝试即上述命令。若失败，捕获退出码并记录：

```bash
cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && git pull --rebase && git push; EXIT_CODE=$?; echo "publish attempt {N}/3 | exit_code=${EXIT_CODE} | result=$([ $EXIT_CODE -eq 0 ] && echo success || echo failed)"; exit $EXIT_CODE
```

每次尝试后根据 Bash 工具返回的退出码判断成功/失败，记录日志：`publish attempt {N}/3 | exit_code={code} | result={success|failed}`

**3. 成功处理：**

push 成功后提取 commit hash：
```bash
cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && git rev-parse --short HEAD
```

输出 `[STAGE_COMPLETE] publish | duration={计算耗时}ms | status=success | commit={hash}`

**4. 失败处理：**

3 次均失败时，使用最后一次捕获的退出码，输出 `[STAGE_FAILED] publish | duration={计算耗时}ms | error=push failed after 3 attempts | last_exit_code={code}`

更新 TodoWrite 标记推送阶段完成。

### Post-Pipeline: 汇总报告（不计入五阶段）

计算管道总耗时，输出 `[PIPELINE_COMPLETE] commercial-opportunity | date={date} | duration={总耗时}ms | stages_completed=5/5`

向用户输出汇总表：

| 阶段 | 状态 | 耗时 | 关键指标 |
|------|------|------|---------|
| 检索 | 成功/失败 | Nms | 候选数: X，来源类别: Y |
| 筛选 | 成功/失败 | Nms | 评分数: X，淘汰数: Y |
| 生成 | 成功/失败 | Nms | 文档大小: X bytes |
| 落盘 | 成功/失败 | Nms | 路径: src/content/daily/{date}/commercial-opportunity.md |
| 推送 | 成功/失败 | Nms | commit: {hash} |

**最终结论：** {可商业化方案标题} 或 "今日无可用方案"

**30日运行指标：**

1. **30日推送成功率**：统计最近30天匹配 commit message 的提交数量。

```bash
cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && SUCCESS=$(git log --oneline --since="30 days ago" --grep="chore: commercial opportunity daily" | wc -l | tr -d ' ') && TOTAL=$(( ($(date +%s) - $(date -v-30d +%s 2>/dev/null || date -d "30 days ago" +%s)) / 86400 )) && echo "success=${SUCCESS} total=${TOTAL}"
```

计算成功率：`30日推送成功率: {success}/{total} = {percent}%`（分母为实际天数，非硬编码30）

2. **30日方案重复率**：扫描最近30天的日报文件，提取最终方案标题，统计出现重复标题的天数。

```bash
cd /Users/xiaozhangxuezhang/Documents/GitHub/Ai_auto_push && THIRTY_DAYS_AGO=$(date -v-30d +%Y-%m-%d 2>/dev/null || date -d "30 days ago" +%Y-%m-%d) && TITLES="" && TOTAL=0 && for d in src/content/daily/*/commercial-opportunity.md; do DAY=$(echo "$d" | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}'); [ -z "$DAY" ] && continue; [ "$DAY" \< "$THIRTY_DAYS_AGO" ] && continue; T=$(grep -A1 "^## 最终方案" "$d" 2>/dev/null | grep "^### " | sed 's/^### //'); [ -z "$T" ] && continue; TOTAL=$((TOTAL+1)); TITLES="$TITLES$T"$'\n'; done && DUP_DAYS=$(echo "$TITLES" | grep -v "^$" | sort | uniq -d | wc -l | tr -d ' ') && echo "duplicate_days=${DUP_DAYS} total_days=${TOTAL}"
```

该命令按文件名中的日期筛选最近30天，提取每日最终方案标题，用 `uniq -d` 统计出现多次的标题数（即有重复的天数）。计算：`30日方案重复率: {duplicateDays}/30 = {percent}%`

输出30日指标汇总：

| 指标 | 数值 |
|------|------|
| 30日推送成功率 | {success}/{total} = {percent}% |
| 30日方案重复率 | {duplicateDays}/30 = {percent}% |

如果管道中途失败，输出：
`[PIPELINE_FAILED] commercial-opportunity | date={date} | duration={ms} | failed_stage={阶段名} | error={摘要}`

并在汇总表中标记失败阶段及后续未执行阶段。

</steps>
