# Story 4-3: AI 内容筛选与摘要生成模块（AI Content Filter & Summary）

## Story ID
4-3

## Epic
Epic 4: Skills 自动化内容管道

## 标题
AI 内容筛选与摘要生成模块

## 描述
作为系统运维者，
我想要系统能够通过大模型对抓取的原始资讯进行质量筛选和摘要生成，
以便输出高质量的精选资讯内容供用户浏览。

## 优先级
P0

## 复杂度
高

## 状态
done

## 依赖
- Story 4-1: 管道入口与领域调度框架（已完成，提供 scripts/pipeline/ 基础框架）
- Story 4-2: 资讯抓取模块（已完成，提供 RawNewsItem[] 作为本模块输入）
- Story 1-2: Content Collections Schema 与领域配置（已完成，提供 src/config/domains.ts）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 筛选模块接口与 process.ts 集成
**Given** scripts/pipeline/process.ts 中存在 stubFilter 占位函数
**When** 筛选模块 scripts/pipeline/filter.ts 实现完成
**Then** process.ts 中的 stubFilter 被替换为对 filterAndSummarize 的真实调用
**And** filterAndSummarize 函数签名为 `filterAndSummarize(items: RawNewsItem[], config: DomainConfig, date: string): Promise<FilteredNewsItem[]>`
**And** 返回的 FilteredNewsItem 包含 title、summary、url、publishedAt、source 字段
**And** 筛选结果通过函数返回值传递给下游阶段（format），不写入中间文件
**And** 下游 stubFormat 签名更新以接收 FilteredNewsItem[] 参数（为 Story 4-4 预留）

### AC-2: 大模型 API 调用与 Prompt 工程
**Given** 抓取模块已返回某领域的 RawNewsItem[] 原始资讯数据
**When** filterAndSummarize 被调用并传入原始资讯列表
**Then** 模块将原始资讯批量发送给大模型 API 进行价值评估和摘要生成
**And** Prompt 包含明确的筛选标准：相关性、时效性、信息价值
**And** Prompt 要求大模型以结构化 JSON 格式返回筛选结果
**And** Prompt 指定摘要语言为中文，长度 150-200 字（FR2）
**And** Prompt 明确禁止大模型编造不存在于原文的信息（防幻觉）
**And** 大模型 API 通过环境变量配置（支持 Claude/OpenAI 等多种后端）

### AC-3: 筛选逻辑与数量控制
**Given** 某领域的原始资讯列表包含 N 条资讯（N 可能为 10-50 条）
**When** 大模型完成价值评估
**Then** 每个领域筛选后保留 3-8 条高价值资讯
**And** 筛选标准包括：与领域的相关性、信息的时效性、内容的独特价值
**And** 重复或高度相似的资讯被合并或去除（语义去重）
**And** 筛选结果按价值评分降序排列
**And** 当原始资讯不足 3 条时，全部保留并生成摘要

### AC-4: 摘要生成质量要求
**Given** 大模型正在为筛选通过的资讯生成摘要
**When** 摘要生成完成
**Then** 每条摘要长度为 150-200 字中文（FR2）
**And** 摘要准确反映原文核心内容，不产生幻觉信息
**And** 摘要使用流畅的中文表达，适合快速浏览
**And** 保留原始来源 URL 和发布时间，确保可追溯
**And** 摘要中不包含原文中的广告、推广等无关内容

### AC-5: 大模型 API 错误处理与重试
**Given** 大模型 API 调用过程中可能发生各类错误
**When** API 调用失败（网络错误、超时、速率限制、响应格式异常）
**Then** 单次 API 调用设置超时限制（≤60s）
**And** API 调用失败时自动重试，最多重试 2 次（共 3 次尝试）
**And** 重试间隔采用指数退避策略（1s、2s）
**And** 所有重试均失败时抛出包含领域标识和错误详情的结构化错误
**And** 不返回空结果或部分结果，确保数据完整性
**And** 速率限制（429）错误时延长重试等待时间

### AC-6: 响应解析与校验
**Given** 大模型返回了筛选和摘要结果
**When** 模块解析大模型响应
**Then** 严格校验响应 JSON 结构是否符合预期 schema
**And** 校验每条摘要长度是否在 150-200 字范围内（允许 ±20% 容差）
**And** 校验每条结果是否包含必要字段（title、summary、url）
**And** 校验 URL 是否与原始输入中的 URL 匹配（防止大模型篡改链接）
**And** 解析失败时记录原始响应内容用于调试，并抛出结构化错误

### AC-7: 日志输出与可观测性
**Given** 筛选模块正在执行
**When** 筛选过程中发生各类事件
**Then** 正常执行时输出日志：领域名称、输入条数、筛选后条数、摘要生成耗时
**And** API 调用时输出日志：请求 token 数估算、响应 token 数、调用耗时
**And** 重试时输出警告日志：重试次数、错误类型、等待时间
**And** 失败时抛出的错误包含：领域 slug、输入条数、错误阶段、错误详情
**And** 日志格式与 pipeline/run.ts 的缩进风格一致（使用 `    [filter]` 前缀）

---

## 技术任务列表 (Technical Tasks)

### Task 1: 定义筛选模块类型接口
**预估时间：** 10 分钟
- 在 scripts/pipeline/types.ts 中新增筛选相关类型定义
- 定义 `FilteredNewsItem` 接口：title(string)、summary(string)、url(string)、publishedAt(string)、source(string)
- 定义 `FilterResult` 接口：domain(string)、items(FilteredNewsItem[])、inputCount(number)、outputCount(number)、duration(number)
- 定义 `LLMConfig` 接口：provider(string)、model(string)、apiKey(string)、baseUrl?(string)、maxTokens?(number)
- 定义 `LLMResponse` 接口：items(FilteredNewsItem[])、usage?(object)

### Task 2: 实现 LLM API 客户端抽象层
**预估时间：** 25 分钟
- 创建 scripts/pipeline/llm.ts LLM 客户端模块
- 实现 `getLLMConfig(): LLMConfig` 从环境变量读取 LLM 配置
  - 支持 `LLM_PROVIDER`（默认 "openai"）、`LLM_MODEL`（默认 "gpt-4o-mini"）
  - 支持 `LLM_API_KEY`（必填）、`LLM_BASE_URL`（可选，用于自定义端点）
  - 启动时校验 LLM_API_KEY 存在性，缺失时输出明确错误提示
- 实现 `callLLM(prompt: string, config: LLMConfig): Promise<string>` 通用调用函数
  - 使用 Node.js 原生 fetch API（Node 18+）
  - 兼容 OpenAI Chat Completions API 格式（Claude/GPT 均可通过此格式调用）
  - 实现请求超时控制（AbortController，≤60s）
  - 返回大模型响应的文本内容

### Task 3: 实现重试与错误处理机制
**预估时间：** 15 分钟
- 实现 `callLLMWithRetry(prompt: string, config: LLMConfig, maxRetries?: number): Promise<string>` 带重试的调用函数
- 最多重试 2 次（共 3 次尝试），指数退避（1s、2s）
- 429 速率限制错误时延长等待时间（读取 Retry-After header 或默认 5s）
- 非可重试错误（如 401 认证失败）立即抛出，不重试
- 所有重试均失败时抛出聚合错误（包含每次尝试的错误摘要）

### Task 4: 设计筛选与摘要 Prompt
**预估时间：** 20 分钟
- 创建 scripts/pipeline/prompts.ts 存放 Prompt 模板
- 实现 `buildFilterPrompt(items: RawNewsItem[], domainName: string): string` 构建筛选 Prompt
- Prompt 内容要求：
  - 系统角色：资讯编辑，负责筛选高价值资讯并生成中文摘要
  - 筛选标准：相关性（与领域匹配度）、时效性（优先最新）、独特价值（非重复）
  - 数量要求：从输入中筛选 3-8 条，不足 3 条时全部保留
  - 摘要要求：150-200 字中文，准确反映原文，禁止编造信息
  - 输出格式：严格 JSON 数组，每项包含 title、summary、url、publishedAt、source
  - 包含 few-shot 示例确保输出格式稳定
- Prompt 使用模板字符串，将原始资讯序列化为结构化输入

### Task 5: 实现筛选主函数与响应解析
**预估时间：** 25 分钟
- 创建 scripts/pipeline/filter.ts 筛选模块
- 实现 `filterAndSummarize(items: RawNewsItem[], config: DomainConfig, date: string): Promise<FilteredNewsItem[]>` 主函数
- 调用 buildFilterPrompt 构建 Prompt
- 调用 callLLMWithRetry 获取大模型响应
- 实现 `parseLLMResponse(raw: string, originalItems: RawNewsItem[]): FilteredNewsItem[]` 响应解析函数
  - 从响应文本中提取 JSON（支持 markdown code block 包裹的 JSON）
  - 校验 JSON 结构：必须为数组，每项包含 title、summary、url 字段
  - 校验摘要长度：150-200 字（允许 ±20% 容差，即 120-240 字）
  - 校验 URL 匹配：每条结果的 url 必须存在于原始输入中
  - 过滤掉不合格的条目，记录警告日志
  - 解析完全失败时抛出结构化错误（包含原始响应前 500 字符用于调试）

### Task 6: 集成到 process.ts 管道流程
**预估时间：** 10 分钟
- 修改 scripts/pipeline/process.ts
- 将 stubFilter 替换为 filterAndSummarize 的真实调用
- 将 filterAndSummarize 返回的 FilteredNewsItem[] 传递给下游 stubFormat
- 更新 stubFormat 签名以接收 FilteredNewsItem[] 参数（为 Story 4-4 预留）
- 筛选阶段失败时，processDomain 捕获错误并返回 failed 状态
- 添加筛选阶段的日志输出（输入条数 → 输出条数，耗时）

### Task 7: 编写单元测试
**预估时间：** 35 分钟
- 测试 FilteredNewsItem 类型校验和数据映射
- 测试 LLM 配置加载（环境变量读取、缺失校验）
- 测试 LLM API 调用（mock HTTP 请求）
  - 正常响应解析
  - 超时处理（60s 超时）
  - 错误响应处理（401、429、500、网络错误）
- 测试重试机制
  - 可重试错误触发重试
  - 不可重试错误立即抛出
  - 指数退避间隔正确
  - 429 错误延长等待时间
- 测试 Prompt 构建（包含领域名称、资讯内容、格式要求）
- 测试响应解析
  - 正常 JSON 解析
  - markdown code block 包裹的 JSON 解析
  - 摘要长度校验（过短/过长/正常）
  - URL 匹配校验（篡改检测）
  - 格式异常时的错误处理
- 测试筛选主函数端到端流程（mock LLM 调用）
- 测试环境变量缺失时的错误提示
- 覆盖率目标 ≥80%

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR6 | 每日自动发布成功率 ≥99% | LLM API 重试机制 + 结构化错误处理，提高整体成功率 |
| NFR7 | 单领域失败不影响其他领域 | filterAndSummarize 抛出的错误由 process.ts try-catch 捕获，不中断管道 |
| NFR9 | 失败时保留完整错误日志 | 筛选失败时输出结构化错误信息（领域、输入条数、错误阶段、LLM 响应摘要） |

---

## 完成定义 (Definition of Done)

- [x] scripts/pipeline/types.ts 新增 FilteredNewsItem、LLMConfig 等类型定义
- [x] scripts/pipeline/llm.ts 实现 LLM API 客户端，支持超时控制和重试
- [x] scripts/pipeline/prompts.ts 包含筛选与摘要 Prompt 模板
- [x] scripts/pipeline/filter.ts 实现 filterAndSummarize 主函数
- [x] 大模型响应解析包含严格的 JSON 校验和 URL 匹配校验
- [x] 摘要长度校验在 150-200 字范围内（±20% 容差）
- [x] 重试机制实现指数退避，429 错误延长等待
- [x] process.ts 中 stubFilter 替换为真实 filterAndSummarize 调用
- [x] 下游 stubFormat 签名更新以接收 FilteredNewsItem[] 参数
- [x] 环境变量 LLM_API_KEY 校验逻辑完成
- [x] 单元测试覆盖核心逻辑，覆盖率 ≥80%
- [x] 所有日志输出格式与 pipeline 风格一致
- [x] `pnpm run pipeline` 可成功执行（LLM API key 缺失时输出明确提示而非崩溃）

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节，filter.ts 模块定义）
- PRD：_bmad-output/planning-artifacts/prd.md（FR2 摘要 150-200 字、FR19 标准化 Markdown）
- Epic 分解：_bmad-output/planning-artifacts/epics-and-stories.md（Story 4.3）
- 管道入口：scripts/pipeline/run.ts（Story 4-1 实现）
- 管道类型：scripts/pipeline/types.ts（现有类型定义，RawNewsItem 等）
- 抓取模块：scripts/pipeline/fetch.ts（Story 4-2 实现，提供 RawNewsItem[] 输入）
- 占位函数：scripts/pipeline/process.ts（待替换的 stubFilter）
- 领域配置：src/config/domains.ts
