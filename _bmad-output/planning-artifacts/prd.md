---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain-skipped, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish, step-e-01-discovery, step-e-02-review, step-e-03-edit]
inputDocuments:
  - product-brief-Ai_auto_push-2026-02-26.md
  - UX/UX-design.pen
documentCounts:
  briefs: 1
  research: 0
  brainstorming: 0
  projectDocs: 0
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: low
  projectContext: greenfield
lastEdited: '2026-02-26'
editHistory:
  - date: '2026-02-26'
    changes: '新增UX设计规范章节(引用UX-design.pen); 修复FR7/FR11/NFR11/NFR12/NFR13/NFR15共6处验证警告'
---

# Product Requirements Document - Ai_auto_push

**Author:** Xiaozhangxuezhang
**Date:** 2026-02-26

## Executive Summary

Ai_auto_push 是一个面向个人使用的全自动化多领域智能资讯聚合平台。通过 Claude Code Skills 驱动 openclaw + 大模型的组合，实现从资讯抓取、AI 整理到自动发布的零人工干预闭环。目标用户是同时关注 AI 技术、跨境电商、产品创业、GitHub 热门项目等多领域动态的信息密集型工作者。核心场景：每天早上打开一个页面，30秒内掌握所有关注领域的关键动态，感兴趣的内容一键直达原文。

### 核心差异化

1. **Skills 驱动的声明式信息管道**：用户只需通过 Skills 配置"关注什么"，系统自动完成抓取、整理和发布，实现声明式而非命令式的信息管理。
2. **极简架构的全链路自动化**：Markdown 文件即数据库，Git 仓库即中间层，静态站点即前端——最低成本技术栈实现最完整自动化闭环，零运维。
3. **精选而非轰炸**：区别于信息流的无限滚动，每日输出结构化精选摘要，每条含标题、150-200字摘要和原文链接，尊重用户注意力。
4. **开放的领域扩展性**：通过 Skills 随时添加新关注领域，无需修改代码或重新部署。

## Project Classification

- **项目类型：** Web App（静态资讯网站 + Claude Code Skills 自动化管道）
- **领域：** 通用（内容聚合，无特殊合规要求）
- **复杂度：** 低
- **项目上下文：** 全新项目（Greenfield）

## Success Criteria

### User Success

- 每天早上打开网站，30秒内完成所有关注领域关键资讯的浏览
- 每条资讯包含标题、150-200字摘要、可用原文链接，点击即达
- 完全替代公众号、视频号等碎片化渠道，成为每日唯一信息入口
- 通过 Skills 添加新领域后，次日即可看到新领域内容

### Business Success

- 系统连续 7 天稳定运行，每日自动更新（MVP 验证标准）
- 零运维成本：上线后无需日常人工干预
- 可扩展性验证：通过 Skills 添加新领域无需修改代码

### Technical Success

- 每日自动发布成功率 ≥99%
- 资讯时间准确率 100%
- 原文链接可用率 100%
- 四个领域每天均有资讯输出，覆盖完整度 100%
- PC 和移动端均可正常浏览

### Measurable Outcomes

| KPI | 目标值 | 衡量方式 |
|-----|--------|----------|
| 每日自动发布成功率 | ≥99% | 监控每日 8:00 后网站是否有新内容 |
| 资讯时间准确率 | 100% | 抽查验证日期一致性 |
| 原文链接可用率 | 100% | 自动或手动检测链接可访问性 |
| 领域覆盖完整度 | 100% | 每个配置领域每天有对应输出 |
| 每日信息获取时间 | ≤5分钟 | 从打开网站到完成浏览 |

## Product Scope

### MVP - Minimum Viable Product

1. 每日资讯展示（按日期分组，时间轴纵向排列）
2. 四大领域分区（AI技术、跨境电商、产品创业、GitHub 热门项目）
3. 历史资讯浏览（时间线导航，按日期跳转）
4. 搜索功能（关键词全文检索，跨日期跨领域）
5. 移动端响应式适配
6. Skills 自动化管道（抓取层 + 领域层 + 整理层 + 发布层）

### Growth Features (Post-MVP)

- 用户系统 + 收藏书签
- 邮件/微信推送通知

### Vision (Future)

- 多用户个性化订阅
- 更多领域扩展
- 从个人工具演进为开放的多领域资讯聚合平台

## User Journeys

### Journey 1: 晨间资讯速览（核心体验）

**角色：** Xiaozhangxuezhang，多领域关注者

**开场：** 周一早上 8:15，到达办公桌，打开电脑。以前的习惯是先刷公众号、再看视频号、然后逛 GitHub Trending——光这一圈下来就要 30 分钟，而且总觉得漏了什么。

**行动：** 打开 Ai_auto_push 网站，今天的资讯已经自动更新。页面按领域分区：AI 技术区有 3 条关于 Claude 4.6 新能力的摘要；跨境电商区有亚马逊新政策解读；GitHub 区有一个新的开源 Agent 框架正在爆火。

**高潮：** 扫到 GitHub 区的一个项目——正好是自己这周想解决的问题的开源方案。如果不是这个平台聚合，很可能就错过了。点击原文链接，直接跳转到 GitHub 仓库。

**结局：** 8:20，5 分钟内完成了以前需要 30 分钟的信息获取。带着清晰的信息视野开始一天的工作。

**揭示的能力需求：** 每日自动更新、领域分区展示、标题+摘要+链接格式、原文链接可用性

### Journey 2: 历史资讯回溯（边缘场景）

**角色：** Xiaozhangxuezhang

**开场：** 周三下午，同事提到上周有个重要的 AI 模型发布，但记不清具体是哪天。

**行动：** 打开 Ai_auto_push，通过时间线导航回到上周。逐日浏览 AI 技术区，快速定位到周二的资讯中有相关报道。

**备选路径：** 也可以直接使用搜索功能，输入模型名称关键词，跨日期检索到对应资讯。

**结局：** 2 分钟内找到了需要的信息，把摘要和原文链接分享给同事。

**揭示的能力需求：** 时间线导航、按日期浏览、搜索功能、跨日期检索

### Journey 3: 新领域扩展（配置场景）

**角色：** Xiaozhangxuezhang（运维/配置者身份）

**开场：** 最近开始关注 Web3 领域，想把相关资讯也纳入每日聚合。

**行动：** 在 Claude Code 中编写一个新的 Web3 领域 Skill，定义信息源、抓取规则和整理格式。Skill 遵循标准 Claude Code Skills 格式，配置完成后提交。

**结局：** 次日早上打开网站，Web3 领域的资讯已经出现在页面上，与其他四个领域并列展示。整个过程无需修改网站代码或重新部署。

**揭示的能力需求：** Skills 标准化格式、领域动态发现、网站自动适配新领域

### Journey 4: 系统异常排查（故障恢复）

**角色：** Xiaozhangxuezhang（运维者身份）

**开场：** 周四早上打开网站，发现今天的资讯没有更新。

**行动：** 检查 Git 仓库，发现今天没有新的 commit 推送。查看 openclaw 运行日志，发现某个信息源的抓取失败。手动触发一次 Skills 执行，确认其他信息源正常。

**结局：** 修复失败的信息源配置后，手动触发一次完整的抓取-整理-推送流程，资讯在 30 分钟内更新到网站。记录问题原因，优化 Skill 的容错配置。

**揭示的能力需求：** Git 仓库可观测性、Skills 手动触发能力、错误日志可追溯、单源失败不影响其他领域

### Journey Requirements Summary

| 能力领域 | 来源旅程 | 优先级 |
|----------|----------|--------|
| 每日自动更新与领域分区展示 | Journey 1 | MVP |
| 标题+摘要+原文链接格式 | Journey 1 | MVP |
| 时间线导航与历史浏览 | Journey 2 | MVP |
| 关键词搜索（跨日期跨领域） | Journey 2 | MVP |
| Skills 标准化与领域动态发现 | Journey 3 | MVP |
| 网站自动适配新领域 | Journey 3 | MVP |
| Git 仓库可观测性 | Journey 4 | MVP |
| Skills 手动触发与错误恢复 | Journey 4 | MVP |
| 单源失败隔离 | Journey 4 | MVP |

## Innovation & Novel Patterns

### Detected Innovation Areas

- **声明式信息管道架构**：通过 Claude Code Skills 配置文件驱动全链路（抓取→整理→发布），用户只需声明"关注什么"，无需编写管道代码。这是对传统 ETL/爬虫架构的简化重构。
- **极简基础设施组合**：Markdown 文件即数据库 + Git 仓库即中间层 + 静态站点即前端，三层架构均为零成本、零运维的成熟工具组合，但用于资讯聚合场景属于新颖应用。

## Web App Specific Requirements

### Project-Type Overview

Ai_auto_push 的前端是一个静态生成的资讯展示网站。内容由 Skills 管道每日生成 Markdown 文件并推送至 Git 仓库，触发静态站点自动构建部署。网站本身无需后端服务、无需数据库、无需用户认证。

- **架构模式：** SSG（Static Site Generation）/ MPA（Multi-Page Application）
- **实时性：** 无需实时更新，内容按日更新，每日构建一次即可
- **数据流：** Markdown 文件 → 静态站点生成器 → HTML/CSS/JS → CDN 部署

### Technical Architecture Considerations

**浏览器支持：**
- Chrome/Edge（最近2个版本）
- Safari（最近2个版本）
- Firefox（最近2个版本）
- 移动端 Safari / Chrome

**响应式设计：**
- 桌面端（≥1024px）：多列领域分区布局
- 平板端（768-1023px）：双列布局
- 移动端（<768px）：单列纵向排列

**性能目标：**（详见 Non-Functional Requirements）
- FCP ≤1.5s / LCP ≤2.5s / Lighthouse ≥90 / 页面体积 ≤500KB

**SEO 策略：**
- 静态 HTML 页面天然 SEO 友好
- 每日资讯页面独立 URL，支持搜索引擎索引
- 结构化数据标记（JSON-LD）用于资讯摘要
- sitemap.xml 自动生成，每日更新

**无障碍：**（详见 Non-Functional Requirements）
- WCAG 2.1 AA 基础合规、语义化 HTML、键盘导航、颜色对比度 ≥4.5:1

### UX 设计规范

本项目采用 `UX/UX-design.pen` 作为官方 UX 设计标准，所有前端实现须遵循该设计稿定义的视觉规范：

**布局架构：**
- 单列纵向布局（编辑式晨报风格），最大宽度 1200px
- 页面背景 #FAFAFA，内容区域内边距 32px/48px
- 各领域区块纵向排列，区块间距 32px

**领域色彩编码：**
- AI 技术：蓝色系（主色 #3B82F6，卡片背景 #EFF6FF）
- 跨境电商：绿色系（主色 #10B981，卡片背景 #ECFDF5）
- 产品创业：琥珀色系（主色 #F59E0B，卡片背景 #FFFBEB）
- GitHub 热门：紫色系（主色 #8B5CF6，卡片背景 #F5F3FF）

**卡片规范：**
- 圆角 8px，内边距 16px/20px
- 标题：Inter 17px/600，色值 #1A1A2E
- 摘要：Inter 15px/normal，色值 #6B7280，行高 1.6
- 元信息：Inter 12px，色值 #9CA3AF
- 原文链接：Inter 13px/500，色值 #3B82F6

**Header 规范：**
- 白色背景，含品牌标识、日期显示、更新状态指示器、搜索栏
- 搜索栏圆角 20px，背景 #F3F4F6

### Implementation Considerations

- **静态站点生成器选型**：推荐 Astro（对 Markdown 内容驱动站点支持优秀，构建速度快，生态活跃）
- **部署方式**：GitHub Pages / Vercel / Netlify，Git push 触发自动构建
- **搜索实现**：客户端搜索（如 Pagefind / Fuse.js），无需后端服务
- **内容格式约定**：每日一个 Markdown 文件，frontmatter 包含日期、领域标签，正文为结构化资讯列表

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

**MVP 方法：** 问题解决型 MVP——用最小功能集验证"全自动多领域资讯聚合"这个核心假设是否成立。

**核心验证假设：**
1. Skills 驱动的自动化管道能否稳定运行（技术可行性）
2. AI 整理的摘要质量是否满足快速浏览需求（内容质量）
3. 多领域聚合是否真的比单独浏览各渠道更高效（用户价值）

**资源需求：** 单人开发，预计 2-3 周完成 MVP

### Risk Mitigation Strategy

**技术风险：**
- 风险：openclaw 抓取目标网站结构变化导致抓取失败
- 缓解：单源失败隔离机制，一个领域失败不影响其他领域发布

**内容质量风险：**
- 风险：大模型整理的摘要质量不稳定或出现幻觉
- 缓解：Skills 中定义严格的输出格式规范，保留原文链接供用户验证

**运维风险：**
- 风险：自动化管道静默失败，用户不知道今天没有更新
- 缓解：Git commit 记录作为运行日志，无 commit 即为异常信号

## Functional Requirements

### 每日资讯展示

- FR1: 用户可以查看当天各领域的资讯列表
- FR2: 用户可以查看每条资讯的标题、摘要（150-200字）和原文链接
- FR3: 用户可以点击原文链接跳转至信息源原始页面
- FR4: 系统按日期分组展示资讯，每天一个独立页面
- FR5: 系统按时间轴纵向排列资讯条目

### 多领域内容组织

- FR6: 系统将资讯按领域分区展示（AI技术、跨境电商、产品创业、GitHub热门项目）
- FR7: 用户可以通过领域专属颜色编码、标题栏色条和卡片背景色区分不同领域的资讯区块（具体色值参见 UX 设计稿）
- FR8: 系统自动识别并适配新增的领域分区（通过 Skills 配置驱动）

### 导航与历史浏览

- FR9: 用户可以通过时间线导航选择任意历史日期
- FR10: 用户可以浏览任意历史日期的资讯内容
- FR11: 用户可以一次点击切换至相邻日期（前一天/后一天）

### 搜索功能

- FR12: 用户可以通过关键词搜索资讯内容
- FR13: 搜索结果支持跨日期、跨领域匹配
- FR14: 搜索结果展示匹配的资讯标题、摘要片段和所属日期
- FR15: 用户可以从搜索结果直接跳转到对应资讯详情

### 内容管道与 Skills 自动化

- FR16: 系统每日自动执行抓取-整理-发布全链路流程
- FR17: 系统通过 Skills 配置文件定义各领域的信息源和抓取规则
  - Skills 遵循 Claude Code Skills 标准格式，每个 Skill 配置文件包含：name（技能名称）、description（描述）、domain（领域标识）、sources（信息源列表，含 URL 和抓取策略）、output_format（输出 Markdown 模板）、schedule（执行频率，默认 daily）。
- FR18: 用户可以通过新增 Skill 文件添加新的关注领域
- FR19: 系统将抓取内容自动整理为标准化 Markdown 格式（标题+摘要+链接）
  - 标准化 Markdown 格式定义如下：每日内容文件路径为 src/content/daily/YYYY-MM-DD/index.md，frontmatter 包含 date、domain、source_count、generated_at 字段；正文按领域分组，每条资讯包含三级标题（资讯标题）、摘要段落（150-200字）、元信息行（来源、时间）和原文链接。
- FR20: 系统自动将生成的 Markdown 文件推送至 Git 仓库触发站点构建

### 系统可靠性与容错

- FR21: 单个领域的抓取失败不影响其他领域的正常发布
- FR22: 系统通过 Git commit 记录提供运行状态可观测性
- FR23: 用户可以手动触发 Skills 执行进行故障恢复
- FR24: 系统在抓取失败时保留错误日志供排查

### 响应式与跨端适配

- FR25: 网站在桌面端（≥1024px）以多列布局展示领域分区
- FR26: 网站在移动端（<768px）以单列纵向布局展示内容
- FR27: 用户在任意设备上均可完成资讯浏览和搜索操作

## Non-Functional Requirements

### 性能

- NFR1: 首屏内容绘制（FCP）≤1.5 秒
- NFR2: 最大内容绘制（LCP）≤2.5 秒
- NFR3: Lighthouse 性能评分 ≥90
- NFR4: 单页面总资源体积 ≤500KB
- NFR5: 客户端搜索响应时间 ≤500ms（1000 条资讯规模下）

### 可靠性

- NFR6: 每日自动发布成功率 ≥99%
- NFR7: 单个领域抓取失败时，其余领域正常发布不受影响
- NFR8: 站点可用性 ≥99.9%（依赖 CDN/托管平台 SLA）
- NFR9: 自动化管道失败时，Git 仓库保留完整的错误日志

### 安全性（基础级别）

- NFR10: 站点通过 HTTPS 提供服务
- NFR11: 静态资源配置 CSP 头，至少包含 default-src 'self' 和 script-src 'self' 指令
- NFR12: 外部链接不泄露引用来源信息且不共享浏览器上下文

### 无障碍（基础级别）

- NFR13: 语义化 HTML 标签，屏幕阅读器可完成标题跳转、区域导航和链接列表浏览
- NFR14: 颜色对比度符合 WCAG 2.1 AA 标准（≥4.5:1）
- NFR15: 支持键盘导航完成浏览资讯、切换日期、执行搜索三项核心操作
