---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
  - docs/brainstorming-session-2026-02-27.md
workflowType: 'epics-and-stories'
status: 'complete'
completedAt: '2026-02-28'
project_name: 'Ai_auto_push'
---

# Ai_auto_push - Epic Breakdown

## Overview

本文档提供 Ai_auto_push 的完整 Epic 与 Story 拆分，将 PRD、Architecture、UX 设计规范与头脑风暴结果转化为可开发、可测试、可验收的实施计划。

## Requirements Inventory

### Functional Requirements

- FR1: 用户可以查看当天各领域的资讯列表
- FR2: 用户可以查看每条资讯的标题、摘要（150-200字）和原文链接
- FR3: 用户可以点击原文链接跳转至信息源原始页面
- FR4: 系统按日期分组展示资讯，每天一个独立页面
- FR5: 系统按时间轴纵向排列资讯条目
- FR6: 系统将资讯按领域分区展示（AI技术、跨境电商、产品创业、GitHub热门项目）
- FR7: 系统通过领域专属颜色编码、标题栏色条和卡片背景色区分不同领域资讯区块（具体色值参见 UX 设计稿）
- FR8: 系统自动识别并适配新增的领域分区（通过 Skills 配置驱动）
- FR9: 用户可以通过日历弹窗选择任意历史日期（桌面端为浮层日历 rhhn2，移动端为底部弹出面板 1W03N）
- FR10: 用户可以浏览任意历史日期的资讯内容
- FR11: 用户可以通过头部日期导航区的左右箭头一键切换相邻日期（前一天/后一天）
- FR12: 用户可以通过关键词搜索资讯内容
- FR13: 搜索结果支持跨日期、跨领域匹配
- FR14: 搜索结果展示匹配的资讯标题、摘要片段和所属日期
- FR15: 用户可以从搜索结果直接跳转到对应资讯详情
- FR16: 系统每日自动执行抓取-整理-发布全链路流程
- FR17: 系统通过 Skills 配置文件定义各领域的信息源和抓取规则
- FR18: 用户可以通过新增 Skill 文件添加新的关注领域
- FR19: 系统将抓取内容自动整理为标准化 Markdown 格式（标题+摘要+链接）
- FR20: 系统自动将生成的 Markdown 文件推送至 Git 仓库触发站点构建
- FR21: 单个领域的抓取失败不影响其他领域的正常发布
- FR22: 系统通过 Git commit 记录提供运行状态可观测性
- FR23: 用户可以手动触发 Skills 执行进行故障恢复
- FR24: 系统在抓取失败时保留错误日志供排查
- FR25: 网站在桌面端（≥1440px）以双列或多列布局（列间距24px）展示领域分区
- FR26: 网站在移动端（<768px）以单列纵向布局展示内容
- FR27: 用户在任意设备上均可完成资讯浏览、商业机会日报浏览和搜索操作
- FR28: 系统必须通过 1 个主编排 Skill（可选 1-4 个子 Skill）每日自动检索国内用户反馈线索；每次运行至少从 5 个不同数据源成功采集候选线索，且来源类别至少覆盖社交平台、社区论坛、应用商店评价、交易求购、投诉平台中的 3 类
- FR29: 系统可以将检索结果归一化为小众痛点候选集合，并为每个候选保留来源 URL、原文片段与时间戳
- FR30: 系统可以执行双阶段筛选（语义模式识别 → 多维评分），并保存评分明细（空白度、刚需程度、大厂回避度、AI 可解度、变现可行度）
- FR31: 系统每天确认 1 个最终小众痛点方案；仅当候选满足 FR30 综合评分 ≥80/100 且证据链完整（来源 URL、原文引用、评分明细）时标记为“可商业化”；当日无候选达标时输出“无可用方案”结论
- FR32: 系统必须记录当日全部“无价值方案”及淘汰理由，且在日报中可见
- FR33: 系统每天生成《商业机会日报》Markdown 文档（`.md`），内容至少包含：今日检索领域、尝试探索内容、无价值方案及淘汰理由、最终确认的可商业化方案
- FR34: 系统将《商业机会日报》写入 `src/content/daily/YYYY-MM-DD/commercial-opportunity.md`
- FR35: 网站首页在对应日期展示“商业机会日报”板块，并支持历史日期回看
- FR36: 用户仅需手动执行一次目标 Skills 触发任务；系统在无人工输入条件下必须连续完成检索、筛选、生成、落盘、推送 5 个阶段，并在运行日志输出阶段完成标记
- FR37: 生成日报后，系统自动推送 Git 仓库以触发网站内容更新

### NonFunctional Requirements

- NFR1: 首屏内容绘制（FCP）≤1.5 秒
- NFR2: 最大内容绘制（LCP）≤2.5 秒
- NFR3: Lighthouse 性能评分 ≥90
- NFR4: 单页面总资源体积 ≤500KB
- NFR5: 客户端搜索响应时间 ≤500ms（1000 条资讯规模下）
- NFR6: 每日自动发布成功率 ≥99%
- NFR7: 单个领域抓取失败时，其余领域正常发布不受影响
- NFR8: 站点可用性 ≥99.9%（依赖 CDN/托管平台 SLA）
- NFR9: 自动化管道失败时，Git 仓库保留完整的错误日志
- NFR10: 站点通过 HTTPS 提供服务
- NFR11: 静态资源配置 CSP 头，至少包含 default-src 'self' 和 script-src 'self' 指令
- NFR12: 外部链接不泄露引用来源信息且不共享浏览器上下文
- NFR13: 语义化 HTML 标签，屏幕阅读器可完成标题跳转、区域导航和链接列表浏览
- NFR14: 颜色对比度符合 WCAG 2.1 AA 标准（≥4.5:1）
- NFR15: 支持键盘导航完成浏览资讯、浏览商业机会日报、切换日期、执行搜索四项核心操作
- NFR16: 单次触发商业机会 Skills 后，端到端执行时长 ≤15 分钟（在常规数据量下）
- NFR17: 商业机会日报每日产出率 =100%（每日有且仅有 1 份 `commercial-opportunity.md`）
- NFR18: 最终商业方案证据链完整率 =100%（必须包含来源 URL、关键引文与评分依据）
- NFR19: 无价值方案记录覆盖率 =100%（所有被淘汰候选均有淘汰理由）
- NFR20: 历史 30 天内最终方案重复率 ≤10%；按每日最终方案“标题 + 核心痛点标签”去重后统计（重复天数/30），每次日更后自动计算并写入运行日志
- NFR21: 商业机会日报自动推送 GitHub 成功率 ≥99%；按最近 30 天每日触发批次统计（成功 push 批次/总触发批次），失败批次必须记录错误码与重试结果
- NFR22: 自治流程运行期间人工交互步骤数 =0（触发动作除外）

### Additional Requirements

- 架构明确采用 **Astro 官方 Blog Starter** 作为初始化模板（Epic 1 Story 1 必须落地）
- 内容数据以 `src/content/daily/YYYY-MM-DD/*.md` 为唯一前后端契约，使用 Content Collections schema 严格校验
- 域配置集中在 `src/config/domains.ts`，前端展示与管道输出共享同一配置源
- 搜索基于 Pagefind 构建时索引，保持零后端依赖
- 部署链路为 GitHub Actions + GitHub Pages，Push 触发自动构建发布
- 商业机会日报来源于 Skills 全自主流程，且必须与现有资讯链路并存，不互相阻塞
- UX 需满足桌面/移动双端一致语义，重点保障日期导航、搜索、领域切换与商业机会板块可达性

### FR Coverage Map

| FR | Epic | 说明 |
|----|------|------|
| FR1 | Epic 1 | 当天资讯列表 |
| FR2 | Epic 1 | 标题/摘要/链接展示 |
| FR3 | Epic 1 | 原文跳转 |
| FR4 | Epic 2 | 日期分组独立页面 |
| FR5 | Epic 1 | 时间轴列表布局 |
| FR6 | Epic 1 | 领域分区 |
| FR7 | Epic 1 | 领域视觉编码 |
| FR8 | Epic 1 | 新领域自动适配 |
| FR9 | Epic 2 | 日历选择日期 |
| FR10 | Epic 2 | 历史浏览 |
| FR11 | Epic 2 | 相邻日期切换 |
| FR12 | Epic 3 | 关键词搜索 |
| FR13 | Epic 3 | 跨日期跨领域搜索 |
| FR14 | Epic 3 | 搜索结果结构化展示 |
| FR15 | Epic 3 | 搜索结果跳转 |
| FR16 | Epic 4 | 每日自动执行资讯管道 |
| FR17 | Epic 4 | Skills 信息源规则 |
| FR18 | Epic 4 | 新增 Skill 扩展领域 |
| FR19 | Epic 4 | 资讯标准化 Markdown |
| FR20 | Epic 4 | 自动推送触发构建 |
| FR21 | Epic 5 | 单领域失败隔离 |
| FR22 | Epic 5 | Git 可观测性 |
| FR23 | Epic 5 | 手动触发恢复 |
| FR24 | Epic 5 | 错误日志留存 |
| FR25 | Epic 1 | 桌面响应式布局 |
| FR26 | Epic 1 | 移动响应式布局 |
| FR27 | Epic 1 / 3 / 6 | 跨端浏览、搜索、商业机会浏览 |
| FR28 | Epic 6 | 商业机会多源检索 |
| FR29 | Epic 6 | 候选归一化与证据记录 |
| FR30 | Epic 6 | 双阶段筛选评分 |
| FR31 | Epic 6 | 每日最终方案确认 |
| FR32 | Epic 6 | 无价值方案记录 |
| FR33 | Epic 6 | 日报文档生成 |
| FR34 | Epic 6 | 日报落盘路径 |
| FR35 | Epic 6 | 首页商业机会板块展示 |
| FR36 | Epic 6 | 单次触发全自主执行 |
| FR37 | Epic 6 | 日报生成后自动推送 |

## Epic List

### Epic 1: 基线工程与每日资讯首页体验
用户可以在桌面和移动端稳定访问首页，按领域浏览当天资讯，完成高密度速览。
**FRs covered:** FR1, FR2, FR3, FR5, FR6, FR7, FR8, FR25, FR26, FR27

### Epic 2: 日期导航与历史回溯
用户可以通过日历与日期切换高效访问任意历史日期内容。
**FRs covered:** FR4, FR9, FR10, FR11

### Epic 3: 搜索与结果跳转
用户可以跨日期、跨领域检索资讯并直接跳转到目标内容。
**FRs covered:** FR12, FR13, FR14, FR15, FR27

### Epic 4: 资讯 Skills 自动化生产与发布
系统自动完成资讯抓取、整理、落盘和推送，形成日更生产链路。
**FRs covered:** FR16, FR17, FR18, FR19, FR20

### Epic 5: 可靠性、容错与运维可观测
系统在失败场景下保持局部可用，支持定位、恢复与可观测告警。
**FRs covered:** FR21, FR22, FR23, FR24

### Epic 6: 商业机会日报全自主链路
系统通过 Skills 全自主完成机会检索、筛选、日报生成、展示与推送，用户只需一次触发。
**FRs covered:** FR28, FR29, FR30, FR31, FR32, FR33, FR34, FR35, FR36, FR37, FR27

## Epic 1: 基线工程与每日资讯首页体验

搭建可交付的前端基础与资讯首页核心体验，确保用户可在 30 秒内完成当天资讯速览。

### Story 1.1: 以 Astro Blog Starter 初始化项目基线

As a 开发者,
I want 使用架构选定的 starter template 初始化工程,
So that 后续所有故事可以在统一基线下迭代。

**Acceptance Criteria:**

**Given** 本地具备 Node.js 与 pnpm
**When** 执行项目初始化命令并启用 TypeScript strict
**Then** 成功创建可运行的 Astro 项目骨架
**And** 集成 Tailwind、Pagefind、基础脚本与构建配置
**And** 本地 `pnpm dev` 与 `pnpm build` 均执行成功
**And** 关联需求：FR16, NFR1, NFR3

### Story 1.2: 建立内容 schema 与领域配置中心

As a 开发者,
I want 定义 Content Collections schema 与 domains 配置,
So that 资讯内容可被稳定校验并支持领域扩展。

**Acceptance Criteria:**

**Given** 项目基础完成
**When** 定义 `src/content` schema 与 `src/config/domains.ts`
**Then** Markdown frontmatter 在构建时进行严格校验
**And** 领域配置支持新增领域时无需改动渲染逻辑
**And** 至少提供 2 天测试数据覆盖 4 个领域
**And** 关联需求：FR6, FR8, FR19

### Story 1.3: 实现首页资讯流与领域区块渲染

As a 用户,
I want 在首页按领域看到当天资讯卡片,
So that 可以快速浏览所有重点动态。

**Acceptance Criteria:**

**Given** 存在当日资讯内容
**When** 用户访问首页
**Then** 页面展示当天所有领域资讯列表
**And** 每条卡片包含标题、150-200 字摘要、原文链接
**And** 资讯按时间轴纵向排列并带领域视觉编码
**And** 关联需求：FR1, FR2, FR3, FR5, FR6, FR7

### Story 1.4: 响应式与无障碍首页体验

As a 用户,
I want 在桌面与移动设备都能顺畅浏览,
So that 不同设备下体验一致且可访问。

**Acceptance Criteria:**

**Given** 首页资讯流已可渲染
**When** 用户在桌面端与移动端访问
**Then** 桌面端按多列或宽屏策略展示，移动端单列展示
**And** 键盘可完成导航与链接访问，语义结构适配屏幕阅读器
**And** 颜色对比满足 WCAG 2.1 AA
**And** 关联需求：FR25, FR26, FR27, NFR13, NFR14, NFR15

## Epic 2: 日期导航与历史回溯

建立稳定的日期路由和交互，使历史内容访问成为主路径而非附属功能。

### Story 2.1: 实现按日期生成与读取页面路由

As a 用户,
I want 通过日期 URL 访问当天或历史内容,
So that 可以稳定回看任意日期资讯。

**Acceptance Criteria:**

**Given** 已存在多天内容数据
**When** 访问 `/daily/YYYY-MM-DD/`
**Then** 页面展示该日期对应资讯
**And** 首页默认展示最新日期内容
**And** 关联需求：FR4, FR10

### Story 2.2: 日历弹窗选择日期（桌面/移动）

As a 用户,
I want 使用日历快速选择目标日期,
So that 减少逐天切换成本。

**Acceptance Criteria:**

**Given** 用户位于首页或日期页
**When** 点击日期入口
**Then** 桌面端展示浮层日历，移动端展示底部抽屉日历
**And** 选择日期后关闭面板并切换到目标日期内容
**And** 关联需求：FR9, FR10, NFR15

### Story 2.3: 相邻日期一键切换与边界处理

As a 用户,
I want 点击左右箭头切换前后日期,
So that 可以连续浏览近几日变化。

**Acceptance Criteria:**

**Given** 当前页面处于某个日期
**When** 点击前一天或后一天箭头
**Then** 页面跳转到相邻日期并正确渲染
**And** 对不存在日期显示明确空态或禁用态
**And** 关联需求：FR11

## Epic 3: 搜索与结果跳转

提供跨日期、跨领域检索能力，构建“浏览 + 搜索”双模式获取路径。

### Story 3.1: 构建搜索索引与查询入口

As a 用户,
I want 在网站中输入关键词进行检索,
So that 可以快速定位历史信息。

**Acceptance Criteria:**

**Given** 已有历史内容
**When** 完成构建并进入搜索页
**Then** 可检索标题与摘要文本
**And** 搜索索引包含跨日期跨领域数据
**And** 关联需求：FR12, FR13, NFR5

### Story 3.2: 搜索结果结构化展示

As a 用户,
I want 在结果中看到关键信息与来源,
So that 能快速判断点击目标。

**Acceptance Criteria:**

**Given** 输入任意关键词
**When** 搜索返回结果
**Then** 每条结果展示标题、摘要片段、所属日期与领域
**And** 无结果时展示可行动提示
**And** 关联需求：FR14

### Story 3.3: 从搜索结果直达目标内容

As a 用户,
I want 点击搜索结果直接进入对应资讯,
So that 减少二次定位步骤。

**Acceptance Criteria:**

**Given** 搜索结果中存在匹配条目
**When** 用户点击目标条目
**Then** 跳转到对应日期页面并定位到资讯项
**And** 外部原文链接打开策略满足安全要求
**And** 关联需求：FR15, NFR12

## Epic 4: 资讯 Skills 自动化生产与发布

构建稳定的资讯自动化链路，实现每天自动抓取、整理、写入与推送。

### Story 4.1: 资讯主编排 Skill 与调度入口

As a 维护者,
I want 通过统一 Skill 入口调度资讯流程,
So that 可以每日自动执行且支持手动触发。

**Acceptance Criteria:**

**Given** 已定义资讯领域配置
**When** 触发主编排 Skill（定时或手动）
**Then** 按顺序执行抓取、整理、落盘流程
**And** 运行过程输出可追踪日志
**And** 关联需求：FR16, FR17

### Story 4.2: 领域 Skill 规范与扩展机制

As a 维护者,
I want 新增领域只需新增 Skill 文件,
So that 扩展关注范围无需改动核心代码。

**Acceptance Criteria:**

**Given** 新领域 Skill 已按规范定义
**When** 主编排读取配置
**Then** 新领域自动纳入当日执行
**And** 字段校验失败时给出明确错误并不中断其他领域
**And** 关联需求：FR18, FR21

### Story 4.3: 资讯 Markdown 标准化输出

As a 系统,
I want 将抓取结果写成统一 Markdown 契约,
So that 前端可稳定消费并构建。

**Acceptance Criteria:**

**Given** 各领域抓取结果已生成
**When** 执行整理与输出阶段
**Then** 生成符合 schema 的 `src/content/daily/YYYY-MM-DD/{domain}.md`
**And** 每条资讯包含标题、摘要、元信息、原文链接
**And** 关联需求：FR19

### Story 4.4: 自动推送与发布触发

As a 系统,
I want 内容生成后自动推送仓库,
So that 站点自动构建并更新页面。

**Acceptance Criteria:**

**Given** 当日内容输出成功
**When** 执行发布阶段
**Then** 自动提交并推送到 Git 仓库
**And** 触发 GitHub Actions 构建流程
**And** 推送失败记录错误并保留重试信息
**And** 关联需求：FR20, NFR6

## Epic 5: 可靠性、容错与运维可观测

保证自动化链路在单点失败时仍可部分成功，并可定位、恢复、审计。

### Story 5.1: 领域级隔离执行与降级发布

As a 系统,
I want 每个领域独立执行并隔离失败,
So that 单领域异常不会影响整体产出。

**Acceptance Criteria:**

**Given** 多领域并行或串行执行
**When** 某领域抓取失败
**Then** 其他领域继续执行并正常产出
**And** 失败领域在日报中标记状态
**And** 关联需求：FR21, NFR7

### Story 5.2: 可观测日志与错误留存

As a 维护者,
I want 查看完整运行日志与错误上下文,
So that 可以快速定位问题并复盘。

**Acceptance Criteria:**

**Given** 管道任务执行
**When** 任务成功或失败
**Then** 输出结构化运行日志并归档到仓库
**And** 错误日志包含阶段、错误码、上下文摘要
**And** 关联需求：FR22, FR24, NFR9

### Story 5.3: 手动恢复与重试机制

As a 维护者,
I want 在失败后手动触发恢复流程,
So that 可以在短时间内恢复当日更新。

**Acceptance Criteria:**

**Given** 当日任务存在失败阶段
**When** 手动触发恢复命令
**Then** 可从失败阶段或全量重新执行
**And** 恢复过程与结果写入日志并可追踪
**And** 关联需求：FR23

## Epic 6: 商业机会日报全自主链路

在不增加人工中间步骤的前提下，实现从多源检索到最终方案确认、文档落盘、站点展示与推送发布的闭环。

### Story 6.1: 商业机会主编排 Skill 与执行边界

As a 用户,
I want 只触发一次目标 Skill,
So that 系统全自主完成当日商业机会日报。

**Acceptance Criteria:**

**Given** 主编排 Skill 与子 Skill 已配置
**When** 用户触发一次任务
**Then** 系统自动完成检索、筛选、生成、落盘、推送五阶段
**And** 无需二次人工输入
**And** 每个阶段产生日志完成标记
**And** 关联需求：FR36, NFR22

### Story 6.2: 多源检索与候选归一化

As a 系统,
I want 从国内多源收集痛点线索并归一化,
So that 后续评分基于统一候选结构。

**Acceptance Criteria:**

**Given** 数据源配置包含至少 10 个来源
**When** 执行检索阶段
**Then** 成功采集候选线索并覆盖至少 3 类来源类别
**And** 每个候选包含来源 URL、原文片段、时间戳
**And** 关联需求：FR28, FR29

### Story 6.3: 双阶段筛选与评分模型执行

As a 系统,
I want 对候选执行语义识别与多维评分,
So that 每日可筛出最高价值机会。

**Acceptance Criteria:**

**Given** 候选集合已归一化
**When** 执行筛选阶段
**Then** 完成语义模式识别并输出候选评分明细
**And** 评分包含空白度、刚需程度、大厂回避度、AI 可解度、变现可行度
**And** 关联需求：FR30

### Story 6.4: 最终方案确认与淘汰记录

As a 用户,
I want 每天得到一个可执行的最终方案并看到淘汰依据,
So that 可以快速决策是否投入开发。

**Acceptance Criteria:**

**Given** 候选评分已完成
**When** 执行决策阶段
**Then** 仅当综合评分 ≥80/100 且证据链完整时输出“可商业化”最终方案
**And** 所有未入选候选都带淘汰理由并保留在日报内容中
**And** 无候选达标时输出“无可用方案”
**And** 关联需求：FR31, FR32, NFR18, NFR19

### Story 6.5: 商业机会日报文档生成与落盘

As a 系统,
I want 生成标准化 `commercial-opportunity.md`,
So that 网站可以按日期稳定渲染该板块。

**Acceptance Criteria:**

**Given** 决策阶段已完成
**When** 执行文档生成阶段
**Then** 生成 `src/content/daily/YYYY-MM-DD/commercial-opportunity.md`
**And** 文档包含检索领域、尝试内容、无价值方案、最终方案四部分
**And** frontmatter 包含约定字段并通过 schema 校验
**And** 关联需求：FR33, FR34, NFR17

### Story 6.6: 首页“商业机会日报”板块渲染与历史回看

As a 用户,
I want 在首页和历史日期查看商业机会日报,
So that 可以把资讯与机会一起评估。

**Acceptance Criteria:**

**Given** 指定日期存在 `commercial-opportunity.md`
**When** 用户访问首页或历史日期页
**Then** 页面展示商业机会日报板块并与资讯内容同日期同步
**And** 移动端与桌面端均可浏览完整板块内容
**And** 板块内容可被搜索入口检索到关键字段
**And** 关联需求：FR35, FR27


### Story 6.7: 日报自动推送与 30 日指标统计

As a 系统,
I want 在日报生成后自动推送并更新运行指标,
So that 可持续验证自治效果与质量。

**Acceptance Criteria:**

**Given** 日报文件已成功落盘
**When** 执行发布与统计阶段
**Then** 自动推送仓库并触发站点更新
**And** 记录最近 30 天推送成功率（成功批次/总批次）
**And** 记录最近 30 天最终方案重复率（重复天数/30）
**And** 推送失败记录错误码、重试结果
**And** 关联需求：FR37, NFR20, NFR21

## Final Validation Notes

- 所有 FR1-FR37 均已映射到 Epic 与 Story。
- 商业机会日报链路已按“单次触发、全自主执行”原则拆分为独立可交付故事。
- Epic 依赖方向：Epic1 → Epic2/3 → Epic4/5 → Epic6；同一 Epic 内故事按编号顺序可独立完成。
- Epic 1 Story 1 已满足架构文档中“starter template 先行”的硬性约束。
