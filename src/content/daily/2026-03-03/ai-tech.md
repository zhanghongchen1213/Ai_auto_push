---
title: "AI技术日报"
domain: "ai-tech"
date: "2026-03-03"
itemCount: 20
generatedAt: "2026-03-03T14:00:15+08:00"
---

## [GitHub Release] llama.cpp b8192 发布：ARM架构性能优化

llama.cpp 发布 b8192 版本，为 ARM 架构（aarch64）添加了 SME FP16 计算路径，优化 Q4_0 GEMM 性能。该版本包含适用于 macOS（Apple Silicon 和 Intel）、Linux（Ubuntu x64 支持 CPU/Vulkan/ROCm，s390x）、Windows（x64/arm64 支持 CPU/CUDA/Vulkan/SYCL/HIP）以及 openEuler 平台的二进制文件。这一更新显著提升了在 ARM 设备上运行大语言模型的推理效率，特别是对边缘设备和移动端部署具有重要意义。

**来源：** [llama.cpp GitHub](https://github.com/ggerganov/llama.cpp) | **原文：** [Release b8192](https://github.com/ggml-org/llama.cpp/releases/tag/b8192)

## [WebFetch] 阿里巴巴开源 Qwen3.5 轻量级模型系列

阿里巴巴通义实验室正式开源四款 Qwen3.5 轻量级模型（0.8B/2B/4B/9B），采用原生多模态训练，专为边缘设备部署和轻量级智能体应用设计。这些模型在保持高性能的同时大幅降低了计算资源需求，使得 AI 能力能够在更多终端设备上运行。Qwen3.5-9B 在多项基准测试中表现出色，甚至在某些任务上可与参数量更大的模型相媲美，为端侧 AI 应用开辟了新的可能性。

**来源：** [AI-Bot 日报](https://ai-bot.cn/daily-ai-news/) | **原文：** [阿里巴巴通义开源 Qwen3.5 轻量级模型](https://ai-bot.cn/daily-ai-news/)

## [WebFetch] 小红书发布 FireRed-OCR 端到端文档识别模型

小红书 REDtech 团队发布并开源 FireRed-OCR 端到端文档识别模型，采用"三阶段渐进优化"策略，在 OmniDocBench 基准测试中达到 92.9% 的准确率，超越 Gemini-3.0 Pro 的文档理解能力。该模型能够处理复杂的文档布局、多语言混排和手写文字识别，为文档数字化、信息提取和知识管理提供了强大的技术支持。开源发布将推动 OCR 技术在更多场景中的应用落地。

**来源：** [AI-Bot 日报](https://ai-bot.cn/daily-ai-news/) | **原文：** [小红书发布 FireRed-OCR](https://ai-bot.cn/daily-ai-news/)

## [RSS] Cursor 年化收入突破 20 亿美元

AI 编程助手 Cursor 的年化收入在 2026 年 2 月突破 20 亿美元，过去三个月收入翻倍。这家成立于 2022 年的初创公司最初主要面向个人开发者销售产品，但在过去一年中将重心转向大型企业客户，企业客户目前占其收入的约 60%。Cursor 的快速增长反映了 AI 辅助编程工具的强劲需求，也标志着开发者工具市场正在经历由 AI 驱动的深刻变革。

**来源：** [TechCrunch](https://techcrunch.com) | **原文：** [Cursor has reportedly surpassed $2B in annualized revenue](https://techcrunch.com/2026/03/02/cursor-has-reportedly-surpassed-2b-in-annualized-revenue/)

## [WebSearch] OpenAI 修订五角大楼协议：增加监控限制

OpenAI CEO Sam Altman 承认与五角大楼的合作协议"看起来机会主义且草率"，并宣布修订协议条款，增加更严格的监控保护措施。修订后的协议明确禁止 OpenAI 技术用于"商业获取"的数据，而之前仅限制私人信息。此外，协议还明确禁止将 AI 用于大规模国内监控、完全自主武器以及高风险自动化决策。这一修订是在 Anthropic 拒绝类似协议并被特朗普政府列为"供应链风险"后做出的。

**来源：** [CNBC](https://www.cnbc.com) | **原文：** [OpenAI's Altman says defense deal 'looked opportunistic and sloppy'](https://www.cnbc.com/2026/03/03/openai-sam-altman-pentagon-deal-amended-surveillance-limits.html)

## [WebSearch] Anthropic 收购 Vercept 增强 Claude 计算机操作能力

Anthropic 宣布收购西雅图 AI 初创公司 Vercept，以增强 Claude 模型在软件应用中执行复杂任务的能力。Vercept 由艾伦人工智能研究所（Allen Institute for AI）校友创立，其技术能够实现类人的屏幕感知和软件交互。作为交易的一部分，Vercept 将在 30 天内关闭其桌面应用 Vy，团队和技术将整合到 Anthropic。这一收购标志着 AI 智能体竞争的加剧，各公司都在竞相构建能够自主完成用户任务的 AI 系统。

**来源：** [Anthropic 官方博客](https://www.anthropic.com) | **原文：** [Anthropic acquires Vercept to advance Claude's computer use capabilities](https://www.anthropic.com/news/acquires-vercept)

## [WebFetch] 阿里巴巴发布通义双语音生成模型

阿里巴巴通义实验室发布 Fun-CosyVoice3.5 和 Fun-AudioGen-VD 两款语音生成模型。新模型支持 FreeStyle 指令控制，可实现跨 13 种语言的语音克隆，并显著降低了生僻字的错误率。Fun-CosyVoice3.5 在语音自然度和情感表达方面取得突破，能够根据文本内容自动调整语调和节奏。Fun-AudioGen-VD 则专注于音频生成和变声技术，为多语言内容创作、有声读物制作和虚拟主播提供了强大的技术支持。

**来源：** [AI-Bot 日报](https://ai-bot.cn/daily-ai-news/) | **原文：** [通义双语音模型发布](https://ai-bot.cn/daily-ai-news/)

## [WebFetch] Kimi 和 Minimax 发布"Claw"产品

Kimi 和 Minimax 两家公司本周同时推出了名为"Claw"的新产品。虽然具体产品细节尚未完全公开，但这一同步发布引发了业界关注。"Claw"产品可能代表了新一代 AI 交互方式或应用形态，两家公司的同时行动也反映了国内 AI 市场竞争的激烈程度。业内人士推测这可能与 AI 智能体或多模态应用相关，预计将在未来几天披露更多技术细节。

**来源：** [机器之心](https://www.jiqizhixin.com/) | **原文：** [Kimi 和 Minimax 发布 Claw 产品](https://www.jiqizhixin.com/)

## [WebFetch] Google Gemini 升级至 3.1 Pro 版本

Google 将其 Gemini 大语言模型升级至 3.1 Pro 版本，进一步提升了模型的推理能力、代码生成质量和多模态理解能力。根据最新基准测试，Gemini 3.1 Pro 在多项任务中的表现超越了之前的版本，特别是在复杂推理和长文本理解方面有显著改进。这一升级是 Google 在 AI 竞赛中保持领先地位的重要举措，也为开发者提供了更强大的 API 服务。

**来源：** [机器之心](https://www.jiqizhixin.com/) | **原文：** [Google Gemini 升级至 3.1 Pro](https://www.jiqizhixin.com/)

## [WebFetch] Claude 服务中断引发全球 AI"熔断"讨论

Anthropic 的 Claude 服务经历了多次中断，暴露了 AI 系统基础设施的脆弱性。这些服务中断引发了业界对 AI 系统可靠性和容错能力的广泛讨论。随着越来越多的企业和开发者依赖 AI 服务，服务稳定性成为关键考量因素。这一事件促使 AI 公司重新审视其基础设施架构，加强冗余设计和故障恢复机制，以确保服务的高可用性。

**来源：** [36氪](https://36kr.com) | **原文：** [Claude崩了，全球AI因何"熔断"？](https://36kr.com/p/3707071953727872)

## [WebFetch] OpenClaw 改变 AI 创业逻辑

OpenClaw 的出现正在改变 AI 创业的底层逻辑。这场"被龙虾填满的聚会"标志着 AI 应用层面的竞争进入新阶段。OpenClaw 可能代表了一种新的开放协作模式或技术架构，使得 AI 创业公司能够更快速地构建和部署应用。这一变化促使创业者重新思考产品定位、技术路线和商业模式，从单纯的技术竞赛转向更注重应用场景和用户价值的交付。

**来源：** [36氪](https://36kr.com) | **原文：** [OpenClaw 之后，AI创业的逻辑变了](https://36kr.com/p/3707090433339522)

## [WebFetch] 具身智能企业单日融资 38 亿元

三家具身智能企业在同一天宣布融资，总额达 38 亿元人民币，使得 2026 年初具身智能领域累计融资超过 200 亿元。这一融资热潮反映了资本市场对具身智能（Embodied AI）技术的高度看好。具身智能结合了 AI、机器人技术和物理交互能力，被视为 AI 从虚拟世界走向现实世界的关键技术。大规模资金注入将加速具身智能在制造、物流、服务等领域的商业化落地。

**来源：** [36氪](https://36kr.com) | **原文：** [三家企业同日融资共38亿，具身智能开年狂奔](https://36kr.com/p/3707043535778177)

## [WebFetch] 人形机器人投资达 100 亿元

人形机器人领域获得 100 亿元投资，这一资金注入是在春节期间人形机器人获得广泛曝光和名人代言后实现的。人形机器人被视为 AI 技术的终极载体之一，能够在家庭服务、医疗护理、工业生产等多个场景中发挥作用。大规模投资将推动人形机器人在硬件设计、运动控制、人机交互等方面的技术突破，加速产品从实验室走向市场的进程。

**来源：** [36氪](https://36kr.com) | **原文：** [100亿，人形机器人砸钱上桌](https://36kr.com/p/3707071692435588)

## [WebFetch] 字节领航、Kimi 爆发：AI 行业变天

红包大战落幕后，AI 行业格局发生显著变化。字节跳动在 AI 领域持续领航，而 Kimi 则展现出爆发式增长。各大模型提供商正在加强能力建设，市场整合趋势明显。这一变化标志着 AI 竞争从单纯的技术比拼转向综合实力的较量，包括模型性能、应用生态、用户体验和商业化能力等多个维度。行业洗牌将加速，头部效应将更加明显。

**来源：** [36氪](https://36kr.com) | **原文：** [字节领航、Kimi 爆发：红包大战落幕，AI行业变天](https://36kr.com/p/3707093287121664)

## [GitHub Release] Ollama v0.17.5 支持 Qwen3.5 模型

Ollama 发布 v0.17.5 版本，新增对多个尺寸的 Qwen3.5 模型的支持。该版本修复了 Qwen 3.5 模型在 GPU 和 CPU 之间分割时的崩溃问题，以及 MLX runner 的内存问题。Ollama 作为本地运行大语言模型的流行工具，此次更新使用户能够在本地环境中轻松部署和使用阿里巴巴最新的 Qwen3.5 模型系列，为开发者提供了更多选择和灵活性。

**来源：** [Ollama GitHub](https://github.com/ollama/ollama) | **原文：** [Release v0.17.5](https://github.com/ollama/ollama/releases/tag/v0.17.5)

## [GitHub Release] PyTorch 性能优化更新

PyTorch 在 2026-03-03 发布多个更新，包括 DTensor 性能改进、torch.cat 的 C++ 缓存优化（首次调用后性能提升约 11μs）、SubgraphTracer 副作用追踪以及不透明对象检查修复。这些更新主要聚焦于提升分布式训练和推理的性能，特别是在大规模模型训练场景中。DTensor 的单调递减一元操作提取和 pytree 缓存优化将显著降低训练开销，提高整体效率。

**来源：** [PyTorch GitHub](https://github.com/pytorch/pytorch) | **原文：** [PyTorch Releases](https://github.com/pytorch/pytorch/releases)

## [GitHub Release] Open WebUI v0.8.8 新增终端功能

Open WebUI 发布 v0.8.8 版本，引入开放终端（Open Terminal）功能，支持文件拖放移动、HTML 文件预览（带渲染 iframe 视图和源码切换）、WebSocket 代理实现实时双向终端通信，以及管理员可控的功能开关。该版本还修复了多个 bug，包括中间件变量遮蔽、ChatControls 响应性和终端工具空参数处理。这些新功能使 Open WebUI 成为更强大的 AI 交互平台。

**来源：** [Open WebUI GitHub](https://github.com/open-webui/open-webui) | **原文：** [Release v0.8.8](https://github.com/open-webui/open-webui/releases/tag/v0.8.8)

## [WebSearch] Gemini 3.1 Pro 在基准测试中领先

根据 2026 年 2 月 19 日发布的预览版本，Google DeepMind 的 Gemini 3.1 Pro 在多项基准测试中表现出色，超越了 Anthropic 的 Claude Opus 4.6（53 分）和 OpenAI 的 GPT-5.2（51% 准确率）。Gemini 3.1 Pro 被定位为 Gemini 3 Pro 的直接升级版，在推理、编码和多模态理解方面都有显著提升。这一成绩巩固了 Google 在 AI 模型竞赛中的领先地位。

**来源：** [Evolink AI Blog](https://evolink.ai) | **原文：** [Gemini 3.1 Pro vs GPT-5.2 vs Claude Opus 4.6](https://evolink.ai/blog/gemini-3-1-pro-vs-gpt-5-2-vs-claude-opus)

## [WebSearch] Claude Opus 4.6 发布：100 万 token 上下文窗口

Anthropic 于 2026 年 2 月 5 日发布 Claude Opus 4.6，配备 100 万 token 上下文窗口和创纪录的基准测试分数。该模型在代码生成、复杂推理和长文本理解方面表现卓越，特别是在 SWE-bench 等开发者基准测试中领先。定价方面，Opus 级别模型保持在每百万输入 token 5 美元、输出 token 25 美元（超过 20 万 token 的提示有更高定价）。这一发布引发了与 OpenAI GPT-5.3 的激烈竞争。

**来源：** [DocsBot AI](https://www.docsbot.ai) | **原文：** [LLM Large Language Model Directory](https://www.docsbot.ai/models)

## [RSS] MIT Technology Review：OpenAI 五角大楼协议深度解析

MIT Technology Review 发布深度报道，详细分析 OpenAI 与五角大楼的协议内容。报道指出，该协议允许在机密环境中部署 OpenAI 模型，同时设定了禁止大规模国内监控、自主武器和高风险自动化决策的红线。这一协议在 Anthropic 拒绝类似条款后迅速达成，引发了关于 AI 伦理、国家安全和技术治理的广泛讨论。报道还探讨了 AI 公司在商业利益和社会责任之间的平衡问题。

**来源：** [MIT Technology Review](https://www.technologyreview.com) | **原文：** [The Download: OpenAI's Pentagon deal](https://www.technologyreview.com/2026/03/03/1133900/the-download-the-startup-that-says-it-can-stop-lightning-and-inside-openais-pentagon-deal/)
