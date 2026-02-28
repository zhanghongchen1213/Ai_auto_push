# Story 6-2: 多源检索与候选归一化

## Story ID
6-2

## Epic
Epic 6: 商业机会日报全自主链路

## 标题
多源检索与候选归一化

## 描述
作为系统，
我想要从国内多源收集痛点线索并归一化，
以便后续评分基于统一候选结构。

## 优先级
P0

## 复杂度
高

## 状态
ready-for-dev

## 依赖
- Story 6-1 已完成：主编排 Skill 文件已创建，Step 1 stub 实现已就位
- SKILL.md 数据契约已定义：RawCandidate 结构
- 关联需求：FR28, FR29

---

## 现状分析

### Story 6-1 留下的 Stub
SKILL.md 中 Step 1（检索阶段）当前为占位实现：

```
rawCandidates = []  // 空数组，占位
```

本 Story 需要将此 stub 替换为真实的多源检索与归一化逻辑。

### 目标数据契约（来自 SKILL.md）

```
RawCandidate:
  title: string — 痛点标题
  sourceUrl: string — 来源 URL
  sourceCategory: "social" | "forum" | "appstore" | "marketplace" | "complaint"
  rawText: string — 原文片段（≤500 字）
  timestamp: string — 发现时间 ISO8601
  platform: string — 具体平台名称
```

### FR28 要求
系统每次运行至少从 5 个不同数据源成功采集候选线索，且来源类别至少覆盖社交平台、社区论坛、应用商店评价、交易求购、投诉平台中的 3 类。

### FR29 要求
系统将检索结果归一化为小众痛点候选集合，并为每个候选保留来源 URL、原文片段与时间戳。

---

## 数据源配置（≥10 个来源，覆盖 5 类）

### social（社交平台）
| # | 平台 | 检索方式 | 关键词策略 |
|---|------|---------|-----------|
| 1 | 微博 | WebSearch `site:weibo.com` | "求推荐 工具/软件" "太难用了" |
| 2 | 小红书 | WebSearch `site:xiaohongshu.com` | "求推荐" "踩坑" "有没有替代" |

### forum（社区论坛）
| # | 平台 | 检索方式 | 关键词策略 |
|---|------|---------|-----------|
| 3 | V2EX | WebSearch `site:v2ex.com` | "求推荐" "替代方案" "太贵了" |
| 4 | 知乎 | WebSearch `site:zhihu.com` | "有什么好的替代" "为什么没有" |
| 5 | 吾爱破解 | WebSearch `site:52pojie.cn` | "求助" "有没有免费的" |

### appstore（应用商店评价）
| # | 平台 | 检索方式 | 关键词策略 |
|---|------|---------|-----------|
| 6 | App Store 评价 | WebSearch `site:apps.apple.com` | "差评" "不好用" |
| 7 | 酷安 | WebSearch `site:coolapk.com` | "差评" "求替代" |

### marketplace（交易求购）
| # | 平台 | 检索方式 | 关键词策略 |
|---|------|---------|-----------|
| 8 | 闲鱼/淘宝 | WebSearch `闲鱼 求购 定制 工具` | "求购" "有没有人做" |
| 9 | 电鸭/程序员客栈 | WebSearch `site:eleduck.com OR site:proginn.com` | "外包需求" "小工具" |

### complaint（投诉平台）
| # | 平台 | 检索方式 | 关键词策略 |
|---|------|---------|-----------|
| 10 | 黑猫投诉 | WebSearch `site:tousu.sina.com.cn` | "投诉" "功能缺失" |
| 11 | 贴吧 | WebSearch `site:tieba.baidu.com` | "吐槽" "求替代" |

---

## 验收标准 (Acceptance Criteria)

### AC-1: 数据源覆盖度
**Given** 数据源配置包含至少 10 个来源
**When** 执行检索阶段
**Then** 成功采集候选线索并覆盖至少 3 类来源类别
**And** 每个候选包含来源 URL、原文片段、时间戳

### AC-2: 归一化输出符合 RawCandidate 契约
**Given** 从各数据源获取到原始数据
**When** 归一化处理完成
**Then** 每个输出对象严格符合 RawCandidate 结构
**And** `sourceCategory` 为五类枚举值之一
**And** `rawText` 长度 ≤ 500 字
**And** `timestamp` 为有效 ISO8601 格式

### AC-3: 部分数据源失败不阻塞
**Given** 部分数据源不可达或返回空结果
**When** 检索阶段执行
**Then** 记录失败源并继续用已获取数据
**And** 仅当全部数据源失败时才输出 `[STAGE_FAILED]` 终止管道

### AC-4: 去重处理
**Given** 多个数据源可能返回相同或高度相似的线索
**When** 归一化处理
**Then** 基于 URL 精确去重
**And** 基于标题相似度（≥90%）模糊去重

### AC-5: 日志标记正确
**Given** 检索阶段执行完成
**When** 输出阶段完成标记
**Then** 格式为 `[STAGE_COMPLETE] retrieve | duration={ms} | status=success | candidates={数量}`
**And** 数量与实际 rawCandidates 数组长度一致

---

## 技术任务列表 (Technical Tasks)

### Task 1: 定义数据源配置结构
**预估时间：** 10 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

在 SKILL.md 的 Step 1 区域添加数据源配置表，包含 11 个数据源，覆盖 5 类 sourceCategory。每个数据源定义：
- `platform`: 平台名称
- `sourceCategory`: 类别枚举
- `searchPattern`: WebSearch 查询模板
- `keywords`: 关键词数组

### Task 2: 实现多源并行检索逻辑
**预估时间：** 30 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

替换 Step 1 的 stub 实现，核心流程：

1. 输出 `[STAGE_START] retrieve | time={ISO8601}`
2. 遍历数据源配置，对每个数据源：
   a. 构造 WebSearch 查询（`{searchPattern} {keywords} {date相关时间限定}`）
   b. 调用 WebSearch 获取结果
   c. 对每条结果提取：标题、URL、摘要片段
   d. 记录成功/失败状态
3. 汇总所有结果进入归一化阶段

**错误处理：**
- 单个数据源超时或失败：记录日志，跳过继续
- 全部失败：输出 `[STAGE_FAILED]`，终止管道

### Task 3: 实现候选归一化逻辑
**预估时间：** 20 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

将原始检索结果转换为 RawCandidate 数组：

1. 对每条原始结果映射为 RawCandidate：
   - `title`: 从搜索结果标题提取，清洗 HTML 实体
   - `sourceUrl`: 原始 URL
   - `sourceCategory`: 从数据源配置继承
   - `rawText`: 搜索结果摘要，截断至 500 字
   - `timestamp`: 优先从结果中提取发布时间，否则使用当前时间
   - `platform`: 从数据源配置继承
2. 验证每个字段非空且类型正确
3. 丢弃不合规记录并记录日志

### Task 4: 实现去重逻辑
**预估时间：** 10 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

两层去重：
1. URL 精确去重：以 `sourceUrl` 为 key，保留首次出现
2. 标题模糊去重：标题相似度 ≥90% 时保留来源类别更优先的一条（优先级：complaint > marketplace > appstore > forum > social）

### Task 5: 更新 SKILL.md Step 1 完整实现
**预估时间：** 20 分钟
**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

将 Task 1-4 的逻辑整合，替换 Step 1 中 `TODO — Stub 实现（待 Story 6-2 填充）` 区块。完整伪代码：

```
输出 [STAGE_START] retrieve | time={ISO8601}
记录 stageStartTime

// 1. 多源检索
for each source in dataSourceConfig:
    try:
        results = WebSearch(source.searchPattern + source.keywords)
        rawResults.push(...results with source metadata)
    catch:
        log failed source, continue

// 2. 全部失败检查
if rawResults.length == 0:
    输出 [STAGE_FAILED] retrieve | error=all sources failed
    终止管道

// 3. 归一化
rawCandidates = rawResults.map(normalize).filter(valid)

// 4. 去重
rawCandidates = deduplicate(rawCandidates)

// 5. 完成
输出 [STAGE_COMPLETE] retrieve | duration={ms} | candidates={N}
```

### Task 6: 验证与回归测试
**预估时间：** 15 分钟
**验证方式：** 手动执行

1. 触发商业机会管道，验证 Step 1 不再输出 `candidates=0`
2. 验证 rawCandidates 每个元素符合 RawCandidate 结构
3. 验证覆盖至少 3 类 sourceCategory
4. 验证 `[STAGE_COMPLETE] retrieve` 日志格式正确
5. 验证后续阶段 stub 能正确接收 rawCandidates
6. 模拟部分数据源失败，验证不阻塞整体流程

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `.claude/skills/commercial-opportunity/SKILL.md` | 修改 | 替换 Step 1 stub 为完整检索与归一化实现 |

---

## 测试策略

### 功能测试（手动）
- 触发管道后 Step 1 输出非空 rawCandidates
- 每个 RawCandidate 字段完整且类型正确
- sourceCategory 覆盖 ≥ 3 类
- 成功采集来源 ≥ 5 个不同数据源

### 容错测试（手动）
- 模拟网络不稳定，验证部分数据源失败时管道继续
- 验证全部数据源失败时输出 `[STAGE_FAILED]` 并终止

### 去重测试（手动）
- 验证相同 URL 不重复出现
- 验证高度相似标题被合并

### 回归测试（手动）
- 验证 Step 2-5 的 stub 实现仍能正常接收 Step 1 输出
- 验证管道端到端仍可完成 5/5 阶段

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| FR28 | 至少 5 个数据源、3 类来源类别 | 11 个数据源配置，覆盖 5 类 |
| FR29 | 归一化为统一候选集合，保留 URL/原文/时间戳 | RawCandidate 归一化逻辑 |
| NFR22 | 自治流程人工交互步骤数 = 0 | 检索阶段全自动，无人工确认 |

---

## 完成定义 (Definition of Done)

- [ ] 数据源配置包含 ≥ 10 个来源，覆盖 5 类 sourceCategory
- [ ] Step 1 stub 已替换为完整检索实现
- [ ] 每次运行成功采集候选线索来自 ≥ 5 个不同数据源
- [ ] 来源类别覆盖 ≥ 3 类
- [ ] 每个 RawCandidate 包含完整字段（title, sourceUrl, sourceCategory, rawText, timestamp, platform）
- [ ] rawText ≤ 500 字
- [ ] URL 精确去重 + 标题模糊去重已实现
- [ ] 部分数据源失败时管道继续执行
- [ ] 全部数据源失败时输出 `[STAGE_FAILED]` 并终止
- [ ] `[STAGE_COMPLETE] retrieve` 日志格式正确
- [ ] 后续阶段 stub 能正确接收 rawCandidates 输入

---

## 参考文档

- 主编排 Skill：`.claude/skills/commercial-opportunity/SKILL.md`
- Story 6-1：`_bmad-output/implementation-artifacts/stories/story-6-1.md`
- PRD：`_bmad-output/planning-artifacts/prd.md`（FR28, FR29）
- 架构设计：`_bmad-output/planning-artifacts/architecture.md`
- Sprint 状态：`_bmad-output/implementation-artifacts/sprint-status.yaml`
