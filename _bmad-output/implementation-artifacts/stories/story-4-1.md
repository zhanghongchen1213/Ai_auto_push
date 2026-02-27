# Story 4-1: 管道入口与领域调度框架

## Story ID
4-1

## Epic
Epic 4: Skills 自动化内容管道

## 标题
管道入口与领域调度框架

## 描述
作为系统运维者，
我想要一个管道入口脚本能够按领域独立调度执行抓取任务，
以便实现全链路自动化的基础框架。

## 优先级
P0

## 复杂度
中

## 状态
done

## 依赖
- Story 1-1: 项目初始化与基础框架搭建（已完成）
- Story 1-2: Content Collections Schema 与领域配置（已完成，提供 src/config/domains.ts）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 管道入口脚本可执行
**Given** 项目中存在 scripts/pipeline/ 目录
**When** 执行 `pnpm run pipeline` 命令
**Then** 管道入口脚本 scripts/pipeline/run.ts 被正确执行
**And** 脚本通过 tsx 运行，无需预编译
**And** package.json 中注册了 `pipeline` 脚本命令

### AC-2: 领域配置读取与调度
**Given** src/config/domains.ts 中定义了四大领域配置
**When** 管道入口脚本启动
**Then** 脚本从 src/config/domains.ts 读取所有领域配置
**And** 按 order 字段顺序为每个领域依次调度执行
**And** 每个领域调度时传入完整的领域配置对象（slug、name、color 等）

### AC-3: 领域独立执行与失败隔离
**Given** 管道正在按顺序执行多个领域的任务
**When** 某个领域的执行过程抛出异常
**Then** 该领域的错误被 try-catch 捕获并记录
**And** 不中断整体管道流程，继续执行下一个领域
**And** 失败领域不生成任何输出文件

### AC-4: 执行结果汇总日志
**Given** 所有领域的调度执行完成
**When** 管道输出汇总信息
**Then** 日志包含总领域数、成功数、失败数
**And** 失败领域列出领域名称和错误摘要
**And** 日志输出到 stdout，格式清晰可读
**And** 管道在有任意领域成功时以退出码 0 结束
**And** 管道在所有领域均失败时以退出码 1 结束

### AC-5: 命令行参数支持单领域执行
**Given** 运维者需要调试或修复某个特定领域
**When** 执行 `pnpm run pipeline -- --domain ai-tech`
**Then** 管道仅执行指定 slug 的领域任务
**And** 指定不存在的 slug 时输出错误提示并退出
**And** 不指定 --domain 参数时执行所有领域

### AC-6: 管道阶段占位函数
**Given** 后续 Story（4-2 ~ 4-5）尚未实现
**When** 管道为某个领域执行任务
**Then** 调用占位函数 processDomain(domainConfig) 并返回模拟结果
**And** 占位函数输出日志表明当前阶段为 stub 实现
**And** 占位函数的接口签名与后续模块对接兼容

---

## 技术任务列表 (Technical Tasks)

### Task 1: 安装管道运行依赖
**预估时间：** 5 分钟
- 安装 tsx 作为开发依赖（用于直接运行 TypeScript 脚本）
- 安装 minimist 或使用 Node.js 内置 parseArgs 解析命令行参数
- 在 package.json 中添加 `"pipeline": "tsx scripts/pipeline/run.ts"` 脚本

### Task 2: 定义管道类型接口
**预估时间：** 10 分钟
- 创建 scripts/pipeline/types.ts
- 定义 PipelineResult 接口（domain、status、error?、duration）
- 定义 PipelineContext 接口（date、targetDomain?）
- 从 src/config/domains.ts 复用 DomainConfig 类型

### Task 3: 实现领域调度逻辑
**预估时间：** 20 分钟
- 创建 scripts/pipeline/run.ts 入口脚本
- 读取 domains 配置并按 order 排序
- 解析 --domain 命令行参数，支持单领域过滤
- 实现 for...of 串行调度循环，每个领域包裹 try-catch

### Task 4: 实现占位处理函数
**预估时间：** 10 分钟
- 创建 scripts/pipeline/process.ts
- 实现 processDomain(config: DomainConfig, date: string): Promise<PipelineResult>
- 占位实现：输出日志 + 返回成功结果
- 预留 fetch → filter → format 的阶段调用结构（注释标注）

### Task 5: 实现汇总日志输出
**预估时间：** 10 分钟
- 收集所有领域的 PipelineResult
- 输出汇总表格：领域名称 | 状态 | 耗时 | 错误信息
- 根据成功/失败数量设置进程退出码

### Task 6: 编写单元测试
**预估时间：** 20 分钟
- 测试领域配置读取和排序
- 测试 --domain 参数过滤逻辑
- 测试单领域失败不中断整体流程
- 测试汇总日志输出格式
- 测试退出码逻辑（全部成功 → 0，全部失败 → 1）

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR6 | 每日自动发布成功率 ≥99% | 领域隔离执行，单领域失败不影响整体 |
| NFR7 | 单领域失败不影响其他领域 | try-catch 包裹每个领域执行 |
| NFR9 | 失败时保留完整错误日志 | 汇总日志输出到 stdout，GitHub Actions 自动捕获 |

---

## 完成定义 (Definition of Done)

- [x] tsx 开发依赖安装完成
- [x] package.json 包含 `pipeline` 脚本命令
- [x] scripts/pipeline/types.ts 定义了管道类型接口
- [x] scripts/pipeline/run.ts 实现了领域调度逻辑
- [x] scripts/pipeline/process.ts 实现了占位处理函数
- [x] 支持 --domain 参数指定单领域执行
- [x] 单领域失败不中断整体管道执行
- [x] 执行完成后输出汇总日志（成功/失败数量）
- [x] 退出码正确反映执行结果
- [x] 单元测试覆盖核心逻辑，覆盖率 ≥80%
- [x] `pnpm run pipeline` 可成功执行并输出结果

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节）
- PRD：_bmad-output/planning-artifacts/prd.md（FR16-FR20）
- 领域配置：src/config/domains.ts
- Epic 分解：_bmad-output/planning-artifacts/epics-and-stories.md（Story 4.1）
