---
title: "GitHub热门日报"
domain: "github-trending"
date: "2026-02-28"
itemCount: 10
generatedAt: "2026-02-28T21:41:00+08:00"
---

## OpenClaw — 史上增长最快的开源 AI Agent 框架

OpenClaw 是由奥地利开发者 Peter Steinberger 在 2025 年 11 月作为周末项目创建的开源自主 AI Agent 框架，短短 90 天内从零飙升至 190,000+ GitHub Stars，成为 GitHub 历史上增长最快的开源项目之一。它支持通过 WhatsApp、Telegram、Slack 等消息平台运行自主任务，可管理邮件、自动化工作流、控制桌面操作。2026 年 2 月 14 日，创始人宣布加入 OpenAI，项目将移交至开源基金会管理。语言：TypeScript/Python。值得关注：它定义了"持久化 AI Agent"这一新品类，但也暴露了严重的 RCE 安全漏洞，引发了关于 Agent 安全的行业讨论。

**来源：** [Wikipedia](https://en.wikipedia.org/wiki/OpenClaw) | **原文：** [OpenClaw GitHub](https://github.com/nicepkg/openclaw)

## HKUDS/nanobot — 超轻量级 AI Agent（仅 4000 行代码）

nanobot 是香港大学数据智能实验室（HKUDS）于 2026 年 2 月 2 日发布的超轻量级个人 AI 助手，仅用约 4,000 行 Python 代码实现了核心 Agent 功能，体积比 OpenClaw 的 430,000+ 行代码小 99%。2 月份获得 92,940 颗 Star，成为当月 TrendShift 排行榜冠军。它支持多 LLM 提供商（OpenRouter、Anthropic、OpenAI、DeepSeek 等）和多消息平台，采用技能扩展架构和 Agent 循环设计。语言：Python。值得关注：极简主义设计理念证明了"少即是多"，适合作为轻量级单用途 Agent 部署。

**来源：** [nanobot.club](https://nanobot.club/) | **原文：** [GitHub](https://github.com/HKUDS/nanobot)

## GitHub gh-aw — 用 Markdown 编写 GitHub Actions 的 Agentic Workflows

GitHub 官方推出的 Agentic Workflows（gh-aw）正在重塑 CI/CD 流程。开发者不再需要编写复杂的 YAML 配置，而是用自然语言 Markdown 文件描述想要的自动化行为，AI Agent 会自动执行。支持 GitHub Copilot、Claude（Anthropic）和 OpenAI Codex 作为执行引擎，可实现 Issue 自动分类、CI 失败分析、文档维护、测试覆盖率提升等任务。由 GitHub Next 和微软研究院联合开发，目前处于技术预览阶段。语言：Go/Markdown。值得关注：这是 GitHub 将 AI Agent 深度集成到开发工作流的标志性举措。

**来源：** [GitHub Agentic Workflows](https://github.github.com/gh-aw/) | **原文：** [GitHub](https://github.com/github/gh-aw)

## QwenLM/Qwen3-TTS — 阿里云开源语音合成模型家族

Qwen3-TTS 是阿里云通义千问团队于 2026 年 1 月发布的开源 TTS 模型系列，基于 500 万小时语音数据训练，支持中、英、日、韩、德、法、俄等 10 种语言。它集成了三大核心能力：语音生成、语音设计（通过文本描述创建新声音）和语音克隆（3 秒参考音频即可复制说话人音色）。延迟仅 97 毫秒，可在消费级显卡上实现真正的实时对话。采用 Apache-2.0 许可证开源。语言：Python。值得关注：社区测试者普遍认为其质量可与 ElevenLabs 等商业服务媲美甚至超越。

**来源：** [Qwen AI](https://qwen-ai.com/tts/) | **原文：** [GitHub](https://github.com/QwenLM/Qwen3-TTS)

## jamiepine/voicebox — 开源本地语音克隆工作室

Voicebox 是一个基于 Qwen3-TTS 的开源语音合成桌面应用，定位为 ElevenLabs 的本地免费替代品。它提供类似 DAW（数字音频工作站）的专业界面，支持模型下载、语音克隆和语音生成，所有处理完全在本地完成，无需联网。目前在 TrendShift 热门榜排名前十，获得约 1,500 颗 Star。语言：TypeScript。值得关注：隐私优先的设计理念让用户完全掌控自己的语音数据，是 AI 语音领域"本地优先"趋势的代表项目。

**来源：** [voicebox.sh](https://voicebox.sh/) | **原文：** [GitHub](https://github.com/jamiepine/voicebox)

## steipete/summarize — 万能内容摘要 CLI 与浏览器扩展

Summarize 是一个多功能内容摘要工具，支持 CLI 和 Chrome 侧边栏两种使用方式。只需指向任意 URL、YouTube 视频、播客或本地文件，即可快速提取要点。它采用完整的提取管线：抓取 → 清洗 → Markdown 转换（readability + markitdown），被屏蔽时自动回退到 Firecrawl。支持本地模型、付费模型和免费模型（OpenRouter 免费预设）。目前约 3,400 颗 Star。语言：TypeScript。值得关注：在 AI Agent 时代，快速理解任意内容是基础能力，这个工具填补了 CLI 生态中的重要空白。

**来源：** [summarize.sh](https://summarize.sh/) | **原文：** [GitHub](https://github.com/steipete/summarize)

## sickn33/antigravity-awesome-skills — 800+ AI Agent 技能合集

这是一个为 Claude Code、Antigravity、Cursor 等 AI 编程助手精心策划的技能（Skills）合集，包含 800+ 经过实战检验的高性能技能模板。涵盖代码审查、安全分析、测试生成、文档更新等开发全流程，并集成了 Anthropic 和 Vercel 官方技能。目前约 9,600 颗 Star。语言：Python/Markdown。值得关注：随着 AI 编程助手成为主流开发工具，"技能生态"正在成为新的竞争维度，这个项目是目前最全面的社区技能库。

**来源：** [TrendShift](https://trendshift.io/) | **原文：** [GitHub](https://github.com/sickn33/antigravity-awesome-skills)

## vercel-labs/agent-browser — AI Agent 专用浏览器自动化 CLI

Vercel Labs 推出的 agent-browser 是专为 AI Agent 设计的浏览器自动化命令行工具。与传统的 Playwright MCP 或 Chrome DevTools MCP 不同，它从 Agent 视角重新设计了浏览器交互方式，让 AI 能以更智能的方式与网页交互。截至 2026 年 1 月已获得约 8,900 颗 Star 和 461 个 Fork。语言：TypeScript。值得关注：2026 年 AI 浏览器市场预计从 45 亿美元增长至 768 亿美元（CAGR 32.8%），agent-browser 是这一赛道的重要开源基础设施。

**来源：** [TrendShift](https://trendshift.io/) | **原文：** [GitHub](https://github.com/vercel-labs/agent-browser)

## hummingbot/hummingbot — 开源高频加密货币交易机器人

Hummingbot 是一个帮助用户创建和部署高频加密货币交易机器人的开源软件，目前拥有约 16,400 颗 Star。它支持多种交易策略，包括做市、套利和流动性挖矿，可连接主流中心化和去中心化交易所。近期在 TrendShift 热门榜上表现活跃，持续获得社区关注。语言：Python。值得关注：在 DeFi 和量化交易持续升温的背景下，Hummingbot 为个人开发者提供了机构级交易工具的开源替代方案。

**来源：** [TrendShift](https://trendshift.io/) | **原文：** [GitHub](https://github.com/hummingbot/hummingbot)

## TypeScript 超越 Python 成为 GitHub 最常用语言

根据 GitHub Octoverse 报告，2025 年 8 月 TypeScript 首次超越 Python 和 JavaScript，成为 GitHub 上使用最多的编程语言。过去一年 TypeScript 新增超过 100 万贡献者，是所有语言中绝对增长量最大的。与此同时，TIOBE 2026 年 2 月指数显示 Python 仍以 21.81% 的评分稳居第一（峰值为 2025 年 7 月的 26.98%），Rust 以 83% 的满意度连续两年蝉联"最受喜爱语言"，Go 则在云原生和 AI 工具链领域持续增长。这一趋势反映了 AI 驱动的全栈开发对类型安全的强烈需求。

**来源：** [GitHub Blog](https://github.blog/news-insights/octoverse/) | **原文：** [WebProNews](https://www.webpronews.com/pythons-iron-grip-on-programming-tightens-as-rust-and-go-shake-up-the-old-guard-inside-the-tiobe-index-shifts-of-2026/)
