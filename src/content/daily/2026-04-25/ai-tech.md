---
title: "AI技术日报"
domain: "ai-tech"
date: "2026-04-25"
itemCount: 8
generatedAt: "2026-04-25T21:50:00+08:00"
---

## vLLM v0.20.0 重大版本更新：CUDA 13.0 默认支持，PyTorch 2.11 升级，Gemma 4 与 MLX 性能优化

vLLM v0.20.0 版本于2026年4月23日发布，包含大量重要更新。该版本默认切换到 CUDA 13.0，升级到 PyTorch 2.11，并开始支持 Transformers v5。FlashAttention 4 成为默认的 MLA prefill 后端，新增 TurboQuant 2-bit KV 缓存压缩功能可实现 4 倍容量提升。MLX runner 新增 logprobs 支持，通过融合 top-P 和 top-K 单次排序实现更快的采样速度。新增支持的模型架构包括 EXAONE-4.5、Phi-4 reasoning vision-15B、Cheers multimodal 等。此外还引入了 vLLM IR 中间表示框架，为未来的内核工作奠定基础。该版本在 NVIDIA、AMD、Intel 和 CPU 平台均有大量性能优化。

**来源：** [vLLM GitHub](https://github.com/vllm-project/vllm/releases/tag/v0.20.0)

## Ollama v0.21.x 系列更新：Hermes Agent 集成，Gemma 4 MLX 支持，OpenClaw 深度集成

Ollama 在2026年4月18日至24日期间密集发布了 v0.21.0 到 v0.21.3 系列更新。最引人注目的是新增 Hermes Agent，可通过 `ollama launch hermes` 启动，该 Agent 能够随用户学习自动创建技能，特别适用于研究和工程任务。v0.21.0 版本添加了对 Apple Silicon 上通过 MLX 运行 Gemma 4 的支持，包括混合精度量化和新的操作封装器。v0.21.1 版本新增通过 Ollama 安装和运行 Kimi CLI，支持 Kimi K2.6 云端模型执行长周期的智能体任务。v0.21.2 版本改进了 OpenClaw 入职流程的可靠性，并在 OpenClaw 中捆绑了 Ollama 的网页搜索插件。v0.21.3 版本则增加了对 "max" 作为 think 值的 API 支持。

**来源：** [Ollama GitHub](https://github.com/ollama/ollama/releases)

## LangChain 生态系统密集更新：OpenAI v1.2.x、Core v1.3.x、Anthropic v1.4.1 等多包迭代

LangChain 生态系统在近期进行了密集的版本更新。langchain-openai 升至 v1.2.1，新增支持 gpt-5.5 pro 的 Responses API 检查，并添加了以内容块为中心的流式传输（v2）。langchain-core 升级至 v1.3.2，实现了内容块中心化流式传输 v2，并更新了 tracer metadata 的继承行为。langchain-anthropic v1.4.1 新增支持 Claude Opus 4.7 的新特性，包括自适应思维模式，并修复了压缩块中的空 encrypted_content 问题。此外还发布了 langchain-fireworks v1.2.0，支持流式传输时填充 usage_metadata 并尊重 max_retries 设置。所有集成包都升级了 langsmith 依赖到 0.7.31，并修复了 pygments 的 CVE-2026-4539 安全漏洞。

**来源：** [LangChain GitHub](https://github.com/langchain-ai/langchain/releases)

## Claude 将直接连接 Spotify、Uber Eats、TurboTax 等个人应用程序

Anthropic 于4月23日宣布为 Claude AI 推出全新的个人应用连接器生态系统，用户现在可以直接通过 Claude 访问从徒步旅行规划到日常杂货采购的各类个人服务。新集成的应用包括 Audible、Spotify、Uber、AllTrails、TripAdvisor、Instacart、TurboTax 等。一旦连接应用，Claude 会在对话中直接建议相关的连接应用功能，例如使用 AllTrails 推荐徒步路线。在此之前，Claude 已经支持连接 Microsoft 等工作相关应用。这一扩展标志着 AI 助手从工作场景向个人生活场景的深度渗透，也反映了 AI 平台竞争的焦点正在从模型能力转向生态系统整合。

**来源：** [The Verge](https://www.theverge.com/ai-artificial-intelligence/917871/anthropic-claude-personal-app-connectors)

## OpenAI 发布 GPT-5.5 模型，效率更高，代码能力显著提升

OpenAI 于4月23日正式发布 GPT-5.5 模型，称其为"迄今为止最智能、最直观易用的模型"，也是实现"在计算机上完成工作的新方式"的重要一步。该版本在 GPT-5.4 的基础上进行了重大升级，特别擅长编写和调试代码、在线研究、处理电子表格和文档，以及跨不同工具完成这些工作。与之前版本相比，用户现在可以交给 GPT-5.5 一个复杂的多部分任务，信任它能够规划、使用工具、检查工作、在模糊情况下导航并持续推进。这标志着 OpenAI 在通用人工智能道路上的重要进展，也反映了行业从单回合问答向复杂多步骤任务处理能力的范式转移。

**来源：** [The Verge](https://www.theverge.com/ai-artificial-intelligence/917612/openai-gpt-5-5-chatgpt)

## Meta 计划5月裁员约10%，约8,000人受影响，同时大举投资 AI 基础设施

Meta 于4月23日宣布计划在5月裁员约10%，预计约8,000名员工将受到影响，同时还将关闭约6,000个空缺职位。此次裁员正值 Meta 对 AI 进行巨额投资之际，包括投入大量资金招聘顶尖人才和建设数据中心。该公司在1月份曾预测，2026年将在资本支出上投入1,150亿至1,350亿美元，相比2025年的722.2亿美元大幅增长。这一举措反映了大型科技公司在 AI 时代的战略调整：一方面需要在 AI 研发和基础设施上进行前所未有的资本投入，另一方面也在积极优化成本结构，提高运营效率。这也标志着 AI 竞赛进入了更加理性和注重投入产出比的阶段。

**来源：** [The Verge](https://www.theverge.com/tech/917690/meta-is-laying-off-10-percent-of-its-staff)

## Anthropic Mythos 安全事件引发担忧，受限模型意外落入未经授权用户手中

Anthropic 备受关注的 Claude Mythos 模型在4月23日被曝出安全事件：在该公司坚称这款具备强大网络安全能力的模型过于危险，不应向公众开放的同时，一小群未经授权的用户已经获得了访问权限。这一事件对于一个以 AI 安全著称的公司来说是相当尴尬的。Mythos 的存在本身最初也是通过泄露才为人所知的，当时 Anthropic 计划仅向精选企业客户提供测试。这一事件凸显了 AI 安全领域的核心困境：随着模型能力的指数级增长，如何在开发强大能力的同时确保其不被滥用，正成为所有领先 AI 公司面临的严峻挑战。

**来源：** [The Verge](https://www.theverge.com/ai-artificial-intelligence/917644/anthropic-claude-mythos-breach-humiliation)

## 中国 AI 公司 DeepSeek 发布 V4 模型预览，宣称可与 Anthropic、Google、OpenAI 顶尖模型竞争

中国 AI 公司 DeepSeek 于4月24日发布了其备受期待的下一代 AI 模型 V4 的预览版本。该公司表示，这一开源模型能够与 Anthropic、Google 和 OpenAI 的顶尖闭源系统相竞争。DeepSeek V4 在编码能力上实现了重大飞跃，这一能力已成为 AI 智能体的核心技术之一。该版本的发布也标志着中国芯片产业的一个里程碑，DeepSeek 明确强调了其与国产华为技术的兼容性。这一发布正值 DeepSeek 凭借其性价比和技术创新，在全球 AI 格局中迅速崛起，不仅对传统科技巨头形成有力竞争，也推动了 AI 开源运动的发展和全球 AI 技术的民主化进程。

**来源：** [The Verge](https://www.theverge.com/ai-artificial-intelligence/918035/deepseek-preview-v4-ai-model)
