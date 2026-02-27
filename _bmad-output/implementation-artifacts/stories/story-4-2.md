# Story 4-2: 资讯抓取模块（News Fetch Module）

## Story ID
4-2

## Epic
Epic 4: Skills 自动化内容管道

## 标题
资讯抓取模块（openclaw 集成）

## 描述
作为系统运维者，
我想要系统能够通过 openclaw 从各领域信息源抓取原始资讯数据，
以便获取每日最新的资讯内容作为后续 AI 整理的输入。

## 优先级
P0

## 复杂度
中

## 状态
done

## 依赖
- Story 4-1: 管道入口与领域调度框架（已完成，提供 scripts/pipeline/ 基础框架）
- Story 1-2: Content Collections Schema 与领域配置（已完成，提供 src/config/domains.ts）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 抓取模块接口与 process.ts 集成
**Given** scripts/pipeline/process.ts 中存在 stubFetch 占位函数
**When** 抓取模块 scripts/pipeline/fetch.ts 实现完成
**Then** process.ts 中的 stubFetch 被替换为对 fetchNews 的真实调用
**And** fetchNews 函数签名为 `fetchNews(config: DomainConfig, date: string): Promise<RawNewsItem[]>`
**And** 返回的 RawNewsItem 包含 title、content、url、publishedAt 字段
**And** 抓取结果通过函数返回值传递给下游阶段（filter），不写入中间文件

### AC-2: openclaw API 调用与数据解析
**Given** 领域配置中包含该领域的信息源定义
**When** fetchNews 被调用并传入领域配置
**Then** 模块通过 openclaw API 从该领域配置的信息源抓取原始数据
**And** API 响应被解析为标准化的 RawNewsItem 数组
**And** 每个 RawNewsItem 包含：title（资讯标题）、content（正文内容）、url（来源 URL）、publishedAt（发布时间）
**And** 空响应或无有效数据时返回空数组，不抛出异常

### AC-3: 信息源配置驱动（Skills 配置）
**Given** 项目中存在 Skills 配置目录（如 scripts/pipeline/sources/）
**When** 抓取模块读取某领域的信息源配置
**Then** 每个领域的信息源列表通过配置文件定义，包含 source name、query、抓取策略（FR17）
**And** 配置文件格式为 TypeScript，支持类型校验
**And** 新增信息源只需修改配置文件，无需修改抓取代码逻辑
**And** 至少为四大领域（ai-tech、cross-border-ecom、product-startup、github-trending）提供初始信息源配置

### AC-4: 超时控制与单源失败隔离
**Given** 某个领域配置了多个信息源
**When** 抓取模块依次从各信息源获取数据
**Then** 每个信息源的抓取设置独立超时（单个源 ≤30s）
**And** 单个信息源超时或失败时，跳过该源并记录警告日志
**And** 继续抓取该领域的其他信息源
**And** 只要有至少一个信息源成功，该领域视为抓取成功
**And** 所有信息源均失败时，抛出包含领域标识和错误详情的结构化错误

### AC-5: 抓取结果去重与基础清洗
**Given** 多个信息源可能返回重复的资讯条目
**When** 抓取模块汇总所有信息源的结果
**Then** 基于 URL 进行去重，相同 URL 的资讯只保留一条
**And** 过滤掉标题或 URL 为空的无效条目
**And** 对标题和内容进行基础清洗（去除多余空白、HTML 标签残留）
**And** 去重和清洗后的结果按 publishedAt 降序排列（最新在前）

### AC-6: 日志输出与错误报告
**Given** 抓取模块正在执行
**When** 抓取过程中发生各类事件
**Then** 正常抓取时输出日志：领域名称、信息源数量、抓取条数、耗时
**And** 单源失败时输出警告日志：领域名称、失败源名称、错误类型
**And** 全部失败时抛出的错误包含：领域 slug、尝试的信息源列表、各源的错误摘要
**And** 日志格式与 pipeline/run.ts 的缩进风格一致（使用 `    [fetch]` 前缀）

---

## 技术任务列表 (Technical Tasks)

### Task 1: 定义抓取模块类型接口
**预估时间：** 10 分钟
- 在 scripts/pipeline/types.ts 中新增抓取相关类型定义
- 定义 `RawNewsItem` 接口：title(string)、content(string)、url(string)、publishedAt(string)
- 定义 `FetchSource` 接口：name(string)、query(string)、type(string)
- 定义 `DomainFetchConfig` 接口：domainSlug(string)、sources(FetchSource[])
- 定义 `FetchResult` 接口：domain(string)、items(RawNewsItem[])、sourceResults(SourceFetchResult[])
- 定义 `SourceFetchResult` 接口：source(string)、status('success'|'failed')、itemCount(number)、error?(string)

### Task 2: 创建领域信息源配置文件
**预估时间：** 15 分钟
- 创建 scripts/pipeline/sources/ 目录存放信息源配置
- 创建 scripts/pipeline/sources/index.ts 统一导出
- 为四大领域创建初始信息源配置：
  - ai-tech: AI 技术相关信息源（如 AI 新闻、论文、产品发布）
  - cross-border-ecom: 跨境电商相关信息源
  - product-startup: 产品创业相关信息源
  - github-trending: GitHub 热门项目信息源
- 每个领域配置 2-3 个信息源，包含 name、query/url、抓取策略
- 配置使用 TypeScript as const 确保类型安全

### Task 3: 实现 openclaw API 客户端
**预估时间：** 25 分钟
- 创建 scripts/pipeline/fetch.ts 抓取模块
- 实现 openclaw API 调用封装函数 `callOpenclawAPI(query: string, options?: FetchOptions): Promise<RawNewsItem[]>`
- 使用 Node.js 原生 fetch API（Node 18+）
- 实现请求超时控制（AbortController，单源 ≤30s）
- 实现响应解析：将 openclaw API 响应映射为 RawNewsItem 数组
- API 密钥通过环境变量 `OPENCLAW_API_KEY` 读取
- 启动时校验环境变量存在性，缺失时输出明确错误提示

### Task 4: 实现多源抓取与失败隔离
**预估时间：** 20 分钟
- 实现 `fetchNews(config: DomainConfig, date: string): Promise<RawNewsItem[]>` 主函数
- 根据 domainSlug 查找对应的信息源配置
- 串行遍历该领域的所有信息源，逐个调用 openclaw API
- 每个信息源独立 try-catch，单源失败记录警告并继续
- 收集所有源的 SourceFetchResult 用于日志输出
- 所有源均失败时抛出聚合错误（包含各源的错误摘要）

### Task 5: 实现结果去重与基础清洗
**预估时间：** 15 分钟
- 实现 `deduplicateByUrl(items: RawNewsItem[]): RawNewsItem[]` 去重函数
- 实现 `cleanNewsItem(item: RawNewsItem): RawNewsItem | null` 清洗函数
  - 过滤标题或 URL 为空的条目
  - 去除标题和内容中的多余空白
  - 去除内容中的 HTML 标签残留（简单正则替换）
  - 截断过长内容（保留前 5000 字符，避免下游处理超限）
- 实现 `sortByDate(items: RawNewsItem[]): RawNewsItem[]` 排序函数
- 在 fetchNews 返回前依次执行：去重 → 清洗 → 排序

### Task 6: 集成到 process.ts 管道流程
**预估时间：** 10 分钟
- 修改 scripts/pipeline/process.ts
- 将 stubFetch 替换为 fetchNews 的真实调用
- 将 fetchNews 返回的 RawNewsItem[] 传递给下游 stubFilter
- 更新 stubFilter 签名以接收 RawNewsItem[] 参数（为 Story 4-3 预留）
- 抓取阶段失败时，processDomain 捕获错误并返回 failed 状态

### Task 7: 编写单元测试
**预估时间：** 30 分钟
- 测试 RawNewsItem 类型校验和数据映射
- 测试信息源配置加载（四大领域均有配置）
- 测试 openclaw API 调用（mock HTTP 请求）
  - 正常响应解析
  - 超时处理（30s 超时）
  - 错误响应处理（4xx、5xx、网络错误）
- 测试多源抓取与失败隔离
  - 部分源失败时继续抓取
  - 全部源失败时抛出聚合错误
- 测试去重逻辑（相同 URL 去重）
- 测试清洗逻辑（空标题过滤、HTML 标签清除、空白清理）
- 测试排序逻辑（按 publishedAt 降序）
- 测试环境变量缺失时的错误提示
- 覆盖率目标 ≥80%

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR6 | 每日自动发布成功率 ≥99% | 多源冗余 + 单源失败隔离，提高整体成功率 |
| NFR7 | 单领域失败不影响其他领域 | fetchNews 抛出的错误由 process.ts try-catch 捕获，不中断管道 |
| NFR9 | 失败时保留完整错误日志 | 抓取失败时输出结构化错误信息（领域、信息源、错误类型） |

---

## 完成定义 (Definition of Done)

- [x] scripts/pipeline/types.ts 新增 RawNewsItem、FetchSource 等类型定义
- [x] scripts/pipeline/sources/ 目录包含四大领域的信息源配置
- [x] scripts/pipeline/fetch.ts 实现 fetchNews 主函数
- [x] openclaw API 调用封装完成，支持超时控制
- [x] 多源抓取实现单源失败隔离
- [x] 结果去重（基于 URL）和基础清洗功能完成
- [x] process.ts 中 stubFetch 替换为真实 fetchNews 调用
- [x] 下游 stubFilter 签名更新以接收 RawNewsItem[] 参数
- [x] 环境变量 OPENCLAW_API_KEY 校验逻辑完成
- [x] 单元测试覆盖核心逻辑，覆盖率 ≥80%
- [x] 所有日志输出格式与 pipeline 风格一致
- [x] `pnpm run pipeline` 可成功执行（API key 缺失时输出明确提示而非崩溃）

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节）
- PRD：_bmad-output/planning-artifacts/prd.md（FR16-FR17, FR21）
- Epic 分解：_bmad-output/planning-artifacts/epics-and-stories.md（Story 4.2）
- 管道入口：scripts/pipeline/run.ts（Story 4-1 实现）
- 管道类型：scripts/pipeline/types.ts（现有类型定义）
- 占位函数：scripts/pipeline/process.ts（待替换的 stubFetch）
- 领域配置：src/config/domains.ts
