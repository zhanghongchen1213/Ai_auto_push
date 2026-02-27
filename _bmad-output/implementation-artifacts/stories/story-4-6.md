# Story 4-6: Skills 配置与新领域扩展机制（Skills Config & Domain Extension）

## Story ID
4-6

## Epic
Epic 4: Skills 自动化内容管道

## 标题
Skills 配置与新领域扩展机制

## 描述
作为系统运维者，
我想要通过新增 Skills 配置文件即可添加新的关注领域，
以便无需修改代码即可扩展资讯覆盖范围。

## 优先级
P1

## 复杂度
低

## 状态
done

## 依赖
- Story 4-1: 管道入口与领域调度框架（已完成，提供 scripts/pipeline/run.ts 调度框架和 PipelineContext 类型）
- Story 4-2: 资讯抓取模块（已完成，提供 scripts/pipeline/fetch.ts 和 sources/ 目录结构）
- Story 4-3: AI 内容筛选与摘要生成模块（已完成，提供 scripts/pipeline/filter.ts）
- Story 4-4: Markdown 格式化输出模块（已完成，提供 scripts/pipeline/format.ts）
- Story 4-5: Git 自动提交与推送模块（已完成，提供 scripts/pipeline/publish.ts）
- Story 1-2: Content Collections Schema 与领域配置（已完成，提供 src/config/domains.ts）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 领域配置 Schema 验证与类型安全
**Given** src/config/domains.ts 中存在现有的 4 个领域配置（as const 数组）
**When** 新增领域扩展机制实现完成
**Then** domains.ts 中的领域配置数组保持 as const 类型安全
**And** 每个领域配置项包含必填字段：slug(string)、name(string)、icon(string)、order(number)、color(string)、bgColor(string)、pillBg(string)、pillText(string)
**And** 提供 `DomainConfigSchema` 运行时校验函数，在管道启动时验证所有领域配置的完整性
**And** 校验失败时输出明确的错误信息，指出缺失或格式错误的字段
**And** slug 字段仅允许小写字母、数字和连字符（与 run.ts 中 SLUG_PATTERN 一致）

### AC-2: 信息源配置自动发现机制
**Given** scripts/pipeline/sources/ 目录下存在按领域 slug 命名的配置文件（如 ai-tech.ts）
**When** 新增一个领域的信息源配置文件（如 web3.ts）
**Then** sources/index.ts 提供动态发现机制，无需手动修改 index.ts 中的 import 列表
**And** 动态发现通过 sources/registry.ts 注册表实现，每个信息源文件调用 registerDomainSources() 注册自身
**And** 注册表在管道启动时自动加载 sources/ 目录下所有 .ts 配置文件
**And** 未找到某领域信息源配置时，该领域状态标记为 skipped 并输出警告日志：`[pipeline] 领域 "{slug}" 无信息源配置，跳过`
**And** 信息源配置文件格式与现有文件一致（导出 readonly FetchSource[] 数组）

### AC-3: 新领域添加操作流程（两步完成）
**Given** 用户想要添加一个新的关注领域（如 "Web3"）
**When** 用户执行新领域添加操作
**Then** 操作步骤仅需两步：
1. 在 src/config/domains.ts 的 domains 数组中添加新领域配置项
2. 在 scripts/pipeline/sources/ 目录下创建对应的信息源配置文件（如 web3.ts）
**And** 无需修改 sources/index.ts 或任何其他文件
**And** 无需修改前端组件代码（前端已通过 domains 配置驱动渲染）
**And** 下次管道执行时自动发现并处理新领域（FR18）
**And** 新领域的资讯在下次站点构建后自动展示（FR8）

### AC-4: 领域配置模板与文档注释
**Given** 用户需要参考示例来添加新领域
**When** 查看信息源配置目录
**Then** scripts/pipeline/sources/ 目录下存在 _template.ts 模板文件
**And** 模板文件包含完整的字段注释说明（每个 FetchSource 字段的用途和取值规范）
**And** 模板文件包含一个可直接复制使用的示例配置
**And** src/config/domains.ts 文件顶部包含新增领域的操作说明注释
**And** 注释说明领域色彩选择建议（主色 + 浅色背景 + pill 标签色的搭配规则）

### AC-5: 管道启动时的配置一致性校验
**Given** 管道入口 run.ts 启动执行
**When** 读取领域配置和信息源配置
**Then** 管道启动时执行配置一致性校验：
- 检查 domains.ts 中每个领域是否有对应的信息源配置文件
- 检查 sources/ 目录下每个配置文件是否有对应的 domains.ts 条目
**And** 存在不匹配时输出警告日志但不中断执行：
- 有领域配置但无信息源：`[pipeline] 警告: 领域 "{slug}" 在 domains.ts 中配置但无信息源文件，将跳过`
- 有信息源但无领域配置：`[pipeline] 警告: 信息源文件 "{filename}" 无对应的 domains.ts 配置，将忽略`
**And** 校验结果汇总输出：`[pipeline] 配置校验: {matched}/{total} 个领域配置匹配`

### AC-6: 领域 slug 唯一性与 order 连续性校验
**Given** domains.ts 中存在多个领域配置
**When** 管道启动时执行配置校验
**Then** 校验 slug 字段在所有领域中唯一，重复时抛出错误并终止
**And** 校验 order 字段无重复值，重复时输出警告（不终止，按数组顺序处理）
**And** 校验 slug 格式符合 kebab-case 规范（小写字母、数字、连字符）
**And** 校验 color 和 bgColor 字段为合法的 hex 颜色值（#RRGGBB 格式）

### AC-7: 日志输出与可观测性
**Given** 管道启动并执行配置发现和校验
**When** 配置加载过程中发生各类事件
**Then** 正常启动时输出日志：发现的领域数量、已匹配信息源数量
**And** 日志格式与 pipeline 风格一致（使用 `    [config]` 前缀）
**And** 新领域首次被发现时输出：`[config] 发现新领域: {name} ({slug})`
**And** 配置校验完成后输出汇总：`[config] 已加载 {n} 个领域配置，{m} 个信息源配置`

---

## 技术任务列表 (Technical Tasks)

### Task 1: 实现领域配置运行时校验函数
**预估时间：** 15 分钟
- 在 scripts/pipeline/config-validator.ts 中实现配置校验逻辑
- 实现 `validateDomainConfig(config: unknown): ValidationResult` 校验单个领域配置
  - 校验必填字段存在性和类型
  - 校验 slug 格式（kebab-case）
  - 校验 color/bgColor 为合法 hex 颜色值
- 实现 `validateAllDomains(): ValidationResult` 校验所有领域配置
  - slug 唯一性检查
  - order 重复检查
- 定义 `ValidationResult` 类型：valid(boolean)、errors(string[])、warnings(string[])

### Task 2: 实现信息源配置注册表
**预估时间：** 20 分钟
- 创建 scripts/pipeline/sources/registry.ts 注册表模块
- 实现 `registerDomainSources(slug: string, sources: readonly FetchSource[]): void` 注册函数
- 实现 `getRegisteredSources(slug: string): readonly FetchSource[] | undefined` 查询函数
- 实现 `getAllRegisteredSlugs(): string[]` 获取所有已注册领域 slug
- 实现 `loadAllSources(): Promise<void>` 动态加载 sources/ 目录下所有配置文件
  - 扫描 sources/ 目录下的 .ts 文件（排除 index.ts、registry.ts、_template.ts）
  - 动态 import 每个文件触发注册
  - 记录加载成功/失败的文件

### Task 3: 重构 sources/index.ts 使用注册表
**预估时间：** 10 分钟
- 修改 scripts/pipeline/sources/index.ts
  - 移除硬编码的 import 列表和 domainFetchConfigs 数组
  - getDomainFetchConfig 改为从注册表查询
  - getAllDomainFetchConfigs 改为从注册表获取所有配置
  - 新增 `initSources(): Promise<void>` 初始化函数，调用 loadAllSources
- 修改现有 4 个信息源文件（ai-tech.ts 等），在文件末尾调用 registerDomainSources 注册自身
- 确保向后兼容：现有的 getDomainFetchConfig 函数签名不变

### Task 4: 实现配置一致性校验
**预估时间：** 10 分钟
- 在 scripts/pipeline/config-validator.ts 中新增一致性校验
- 实现 `checkConfigConsistency(domainSlugs: string[], sourceSlugs: string[]): ConsistencyResult`
  - 找出有领域配置但无信息源的 slug
  - 找出有信息源但无领域配置的 slug
  - 返回 matched、missingSource、orphanSource 三个列表
- 定义 `ConsistencyResult` 类型

### Task 5: 集成到管道启动流程
**预估时间：** 10 分钟
- 修改 scripts/pipeline/run.ts 的 runPipeline 函数
  - 在领域调度循环之前，调用 initSources() 加载信息源配置
  - 调用 validateAllDomains() 校验领域配置
  - 调用 checkConfigConsistency() 校验一致性
  - 校验失败（errors 非空）时终止管道执行
  - 校验警告（warnings 非空）时输出警告但继续执行
- 确保 processDomain 中对无信息源领域的处理：标记为 skipped

### Task 6: 创建信息源配置模板文件
**预估时间：** 5 分钟
- 创建 scripts/pipeline/sources/_template.ts 模板文件
  - 包含完整的字段注释说明
  - 包含一个示例配置（使用占位值）
  - 包含 registerDomainSources 调用示例
  - 文件顶部注释说明使用方法：复制、重命名、修改配置
- 更新 src/config/domains.ts 顶部注释
  - 添加新增领域的操作步骤说明
  - 添加色彩搭配建议

### Task 7: 编写单元测试
**预估时间：** 25 分钟
- 测试文件：tests/pipeline/config-validator.test.ts
- 测试 validateDomainConfig
  - 合法配置：返回 valid=true
  - 缺失必填字段：返回对应错误信息
  - slug 格式错误（含大写、空格等）：返回错误
  - color 格式错误（非 hex）：返回错误
- 测试 validateAllDomains
  - 正常配置：无错误无警告
  - slug 重复：返回错误
  - order 重复：返回警告
- 测试 checkConfigConsistency
  - 完全匹配：matched 包含所有 slug
  - 有领域无信息源：missingSource 包含对应 slug
  - 有信息源无领域：orphanSource 包含对应 slug
- 测试文件：tests/pipeline/sources/registry.test.ts
- 测试 registerDomainSources
  - 正常注册：可通过 getRegisteredSources 查询
  - 重复注册同一 slug：后者覆盖前者
- 测试 getAllRegisteredSlugs
  - 返回所有已注册的 slug 列表
- 覆盖率目标 ≥80%

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR7 | 单领域失败不影响其他领域 | 无信息源的领域标记为 skipped 而非 failed，不影响其他领域执行 |
| NFR9 | 失败时保留完整错误日志 | 配置校验错误和警告通过结构化日志输出，包含具体字段和原因 |

---

## 完成定义 (Definition of Done)

- [x] scripts/pipeline/config-validator.ts 实现领域配置校验（字段完整性、slug 格式、颜色格式、唯一性）
- [x] scripts/pipeline/sources/registry.ts 实现信息源注册表（注册、查询、动态加载）
- [x] scripts/pipeline/sources/index.ts 重构为使用注册表，移除硬编码 import
- [x] 现有 4 个信息源文件（ai-tech.ts 等）改为调用 registerDomainSources 注册
- [x] scripts/pipeline/sources/_template.ts 模板文件包含完整注释和示例
- [x] src/config/domains.ts 顶部包含新增领域操作说明注释
- [x] run.ts 启动时执行配置校验和一致性检查
- [x] 无信息源的领域标记为 skipped，不中断管道执行
- [x] 新增领域仅需两步：添加 domains.ts 配置 + 创建信息源文件（FR17、FR18）
- [x] 新领域无需修改前端代码即可自动展示（FR8）
- [x] 单元测试覆盖配置校验和注册表核心逻辑，覆盖率 ≥80%
- [x] 所有日志输出格式与 pipeline 风格一致（`    [config]` 前缀）
- [x] `pnpm run pipeline` 可成功执行，启动时输出配置校验汇总

---

## 设计决策说明

### 信息源发现机制：注册表模式 vs 文件扫描模式

选择注册表模式（每个文件主动注册）而非纯文件扫描模式，原因：

1. **类型安全**：注册函数强制要求传入 `readonly FetchSource[]` 类型，编译时即可发现格式错误
2. **显式依赖**：每个信息源文件通过 import registry 建立显式依赖关系，IDE 可追踪引用
3. **灵活性**：支持条件注册（如根据环境变量启用/禁用某些信息源）
4. **可测试性**：注册表可在测试中轻松 mock，无需操作文件系统

### 两步添加 vs 单文件添加

当前设计需要修改两个位置（domains.ts + sources/），而非单文件完成。原因：

1. **关注点分离**：domains.ts 管理前端展示元数据（颜色、图标、排序），sources/ 管理管道抓取配置（查询词、信息源类型），两者职责不同
2. **共享配置源**：domains.ts 被前端和管道共同引用，是跨系统的配置契约，不应混入管道专属的抓取配置
3. **渐进式添加**：可以先添加 domains.ts 配置让前端预留位置，再添加信息源配置启用管道抓取
4. **架构一致性**：与 architecture.md 中"领域配置集中管理于 src/config/domains.ts"的决策一致

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（领域配置管理、管道架构章节）
- PRD：_bmad-output/planning-artifacts/prd.md（FR8 新领域自动适配、FR17 Skills 配置、FR18 新增领域）
- Epic 分解：_bmad-output/planning-artifacts/epics-and-stories.md（Story 4.6）
- 管道入口：scripts/pipeline/run.ts（Story 4-1 实现，runPipeline 主流程）
- 管道类型：scripts/pipeline/types.ts（FetchSource、DomainFetchConfig 等类型定义）
- 信息源配置：scripts/pipeline/sources/index.ts（现有硬编码入口，待重构）
- 信息源示例：scripts/pipeline/sources/ai-tech.ts（现有信息源配置格式参考）
- 领域配置：src/config/domains.ts（领域元数据，slug/name/color/order 等）
