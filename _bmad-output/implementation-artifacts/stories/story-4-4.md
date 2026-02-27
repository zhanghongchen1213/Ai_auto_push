# Story 4-4: Markdown 格式化输出模块（Markdown Format Output）

## Story ID
4-4

## Epic
Epic 4: Skills 自动化内容管道

## 标题
Markdown 格式化输出模块

## 描述
作为系统运维者，
我想要系统能够将筛选后的资讯自动格式化为标准 Markdown 文件，
以便前端 Content Collections 能够正确解析和展示。

## 优先级
P0

## 复杂度
低

## 状态
done

## 依赖
- Story 4-1: 管道入口与领域调度框架（已完成，提供 scripts/pipeline/ 基础框架）
- Story 4-2: 资讯抓取模块（已完成，提供 RawNewsItem[] 数据流）
- Story 4-3: AI 内容筛选与摘要生成（已完成，提供 FilteredNewsItem[] 作为本模块输入）
- Story 1-2: Content Collections Schema 与领域配置（已完成，提供 src/config/domains.ts 和 Markdown frontmatter 规范）

---

## 验收标准 (Acceptance Criteria)

### AC-1: 格式化模块接口与 process.ts 集成
**Given** scripts/pipeline/process.ts 中存在 stubFormat 占位函数
**When** 格式化模块 scripts/pipeline/format.ts 实现完成
**Then** process.ts 中的 stubFormat 被替换为对 formatAndWrite 的真实调用
**And** formatAndWrite 函数签名为 `formatAndWrite(items: FilteredNewsItem[], config: DomainConfig, date: string, dryRun: boolean): Promise<FormatResult>`
**And** 返回的 FormatResult 包含 filePath、itemCount、bytesWritten 字段
**And** dryRun 模式下生成 Markdown 内容但不写入文件系统，仅输出预览日志
**And** 格式化阶段失败时，processDomain 捕获错误并返回 failed 状态

### AC-2: Frontmatter 生成符合 Content Collections Schema
**Given** 筛选模块已返回某领域的 FilteredNewsItem[] 精选资讯列表
**When** formatAndWrite 被调用并传入筛选结果
**Then** 生成的 Markdown 文件包含 YAML frontmatter 块（以 `---` 分隔）
**And** frontmatter 包含 title 字段，值为领域名称 + "日报"（如 "AI技术日报"）
**And** frontmatter 包含 domain 字段，值为领域 slug（如 "ai-tech"）
**And** frontmatter 包含 date 字段，格式为 "YYYY-MM-DD"（如 "2026-02-26"）
**And** frontmatter 包含 itemCount 字段，值为资讯条目数量（number）
**And** frontmatter 包含 generatedAt 字段，值为 ISO 8601 格式的生成时间（如 "2026-02-26T08:00:00+08:00"）
**And** 五个字段均为必填，缺失任何字段将导致 Astro 构建时类型校验失败

### AC-3: 资讯正文格式化
**Given** FilteredNewsItem[] 包含 title、summary、url、publishedAt、source 字段
**When** 格式化模块将资讯列表转为 Markdown 正文
**Then** 每条资讯以 `## {title}` 二级标题分隔
**And** 标题下方为摘要段落（纯文本，150-200 字中文）
**And** 摘要段落下方为来源链接行，格式固定为 `**来源：** [{source}]({url})`
**And** 资讯条目之间以空行分隔，确保 Markdown 渲染正确
**And** 资讯按 FilteredNewsItem[] 数组顺序排列（即按质量评分降序，由 filter 阶段决定）

### AC-4: 文件输出路径与编码
**Given** 格式化模块生成了完整的 Markdown 内容
**When** 写入文件系统
**Then** 输出文件路径为 `src/content/daily/{date}/{domain-slug}.md`（如 `src/content/daily/2026-02-26/ai-tech.md`）
**And** 日期目录不存在时自动创建（recursive mkdir）
**And** 文件编码为 UTF-8
**And** 换行符为 LF（\n），不使用 CRLF
**And** 文件末尾以单个换行符结束
**And** 同名文件已存在时覆盖写入（幂等性，支持重复执行）

### AC-5: 空输入与边界处理
**Given** 筛选模块可能返回空数组或异常数据
**When** formatAndWrite 接收到空的 FilteredNewsItem[]
**Then** 不生成 Markdown 文件，不创建空文件
**And** 返回 FormatResult 中 itemCount 为 0，filePath 为空字符串
**And** 输出警告日志："[format] {domain} 无资讯条目，跳过文件生成"
**When** FilteredNewsItem 中某条资讯的 title 或 url 为空字符串
**Then** 跳过该条资讯，记录警告日志
**And** 其余合法资讯正常格式化输出

### AC-6: 日志输出与可观测性
**Given** 格式化模块正在执行
**When** 格式化过程中发生各类事件
**Then** 正常执行时输出日志：领域名称、资讯条数、输出文件路径、文件大小
**And** dry-run 模式时输出日志前缀包含 "(dry-run)"，并打印生成的 Markdown 前 500 字符预览
**And** 文件写入失败时抛出包含领域 slug、目标路径和系统错误信息的结构化错误
**And** 日志格式与 pipeline/run.ts 的缩进风格一致（使用 `    [format]` 前缀）

---

## 技术任务列表 (Technical Tasks)

### Task 1: 定义格式化模块类型接口
**预估时间：** 5 分钟
- 在 scripts/pipeline/types.ts 中新增格式化相关类型定义
- 定义 `FormatResult` 接口：filePath(string)、itemCount(number)、bytesWritten(number)

### Task 2: 实现 Markdown 内容生成函数
**预估时间：** 15 分钟
- 创建 scripts/pipeline/format.ts 格式化模块
- 实现 `buildFrontmatter(config: DomainConfig, date: string, itemCount: number): string` 生成 YAML frontmatter
  - title: `${config.name}日报`
  - domain: `config.slug`
  - date: YYYY-MM-DD 格式字符串（带引号）
  - itemCount: 资讯条数
  - generatedAt: 当前时间 ISO 8601 格式（带时区）
- 实现 `buildMarkdownBody(items: FilteredNewsItem[]): string` 生成正文内容
  - 每条资讯格式：`## {title}\n\n{summary}\n\n**来源：** [{source}]({url})\n`
  - 跳过 title 或 url 为空的条目，记录警告
  - 条目间以空行分隔
- 实现 `buildMarkdown(items: FilteredNewsItem[], config: DomainConfig, date: string): string` 组合完整 Markdown
  - 拼接 frontmatter + 空行 + body
  - 确保文件末尾以 `\n` 结束

### Task 3: 实现文件写入函数
**预估时间：** 10 分钟
- 实现 `writeMarkdownFile(content: string, filePath: string): Promise<number>` 写入文件
  - 使用 Node.js fs/promises API
  - 自动创建目录（recursive: true）
  - 写入 UTF-8 编码内容
  - 返回写入字节数
  - 写入失败时抛出包含路径信息的结构化错误
- 实现 `getOutputPath(date: string, domainSlug: string): string` 计算输出路径
  - 返回 `src/content/daily/{date}/{domainSlug}.md`
  - 使用 path.join 确保跨平台兼容

### Task 4: 实现格式化主函数
**预估时间：** 10 分钟
- 实现 `formatAndWrite(items: FilteredNewsItem[], config: DomainConfig, date: string, dryRun: boolean): Promise<FormatResult>` 主函数
  - 空数组检查：items 为空时跳过，返回空结果
  - 过滤无效条目（title 或 url 为空）
  - 调用 buildMarkdown 生成完整内容
  - dryRun 模式：输出预览日志，不写入文件
  - 正常模式：调用 writeMarkdownFile 写入文件
  - 返回 FormatResult（filePath、itemCount、bytesWritten）
  - 输出格式化完成日志

### Task 5: 集成到 process.ts 管道流程
**预估时间：** 10 分钟
- 修改 scripts/pipeline/process.ts
- 导入 formatAndWrite 函数
- 将 stubFormat 替换为 formatAndWrite 的真实调用
- 传递 filtered（FilteredNewsItem[]）、config、date、dryRun 参数
- 删除 stubFormat 函数定义
- 格式化阶段失败时由 processDomain 的 try-catch 统一捕获

### Task 6: 编写单元测试
**预估时间：** 25 分钟
- 测试文件：tests/pipeline/format.test.ts
- 测试 buildFrontmatter
  - 验证生成的 YAML 包含全部 5 个必填字段
  - 验证 date 格式为 YYYY-MM-DD
  - 验证 generatedAt 为 ISO 8601 格式
  - 验证 title 为 "{领域名称}日报"
- 测试 buildMarkdownBody
  - 正常输入：验证每条资讯包含 ## 标题、摘要段落、来源链接
  - 空数组：返回空字符串
  - 含无效条目（空 title/url）：跳过无效条目，正常输出其余
  - 来源链接格式：`**来源：** [{source}]({url})`
- 测试 buildMarkdown
  - 验证 frontmatter + body 拼接正确
  - 验证文件以 `\n` 结尾
- 测试 getOutputPath
  - 验证路径格式 `src/content/daily/{date}/{slug}.md`
- 测试 writeMarkdownFile（mock fs）
  - 正常写入：验证调用 mkdir + writeFile
  - 目录不存在：验证 recursive mkdir
  - 写入失败：验证抛出结构化错误
- 测试 formatAndWrite 主函数
  - 正常流程：验证生成文件并返回正确 FormatResult
  - 空输入：验证跳过文件生成
  - dryRun 模式：验证不调用 writeFile
  - 无效条目过滤：验证跳过空 title/url 条目
- 覆盖率目标 ≥80%

---

## 非功能需求关联

| NFR | 描述 | 本 Story 中的实现 |
|-----|------|-------------------|
| NFR6 | 每日自动发布成功率 ≥99% | 幂等写入（覆盖已有文件）+ 空输入安全处理，避免格式化阶段成为失败点 |
| NFR7 | 单领域失败不影响其他领域 | 每个领域独立生成文件，单个领域格式化失败由 process.ts try-catch 隔离 |
| NFR9 | 失败时保留完整错误日志 | 文件写入失败时输出结构化错误信息（领域、路径、系统错误） |

---

## 完成定义 (Definition of Done)

- [ ] scripts/pipeline/types.ts 新增 FormatResult 类型定义
- [ ] scripts/pipeline/format.ts 实现 formatAndWrite 主函数及辅助函数
- [ ] 生成的 Markdown frontmatter 包含 title、domain、date、itemCount、generatedAt 五个必填字段
- [ ] 资讯正文格式：## 标题 + 摘要段落 + **来源：** [名称](URL)
- [ ] 输出路径为 src/content/daily/{date}/{domain-slug}.md
- [ ] 文件编码 UTF-8，换行符 LF，末尾单个换行
- [ ] 空输入不生成文件，无效条目被跳过并记录警告
- [ ] dryRun 模式生成内容但不写入文件
- [ ] process.ts 中 stubFormat 替换为真实 formatAndWrite 调用
- [ ] 单元测试覆盖核心逻辑，覆盖率 ≥80%
- [ ] 所有日志输出格式与 pipeline 风格一致（`    [format]` 前缀）
- [ ] `pnpm run pipeline` 可成功执行，生成的 Markdown 文件通过 Astro 构建校验

---

## 参考文档

- 架构设计：_bmad-output/planning-artifacts/architecture.md（Pipeline Architecture 章节，format.ts 模块定义，Markdown 输出规范）
- PRD：_bmad-output/planning-artifacts/prd.md（FR19 标准化 Markdown 格式，frontmatter 字段定义）
- Epic 分解：_bmad-output/planning-artifacts/epics-and-stories.md（Story 4.4）
- 管道入口：scripts/pipeline/run.ts（Story 4-1 实现）
- 管道类型：scripts/pipeline/types.ts（现有类型定义，FilteredNewsItem 等）
- 筛选模块：scripts/pipeline/filter.ts（Story 4-3 实现，提供 FilteredNewsItem[] 输入）
- 占位函数：scripts/pipeline/process.ts（待替换的 stubFormat）
- 领域配置：src/config/domains.ts（领域 slug、name 等元数据）
- 现有 Markdown 示例：src/content/daily/2026-02-26/ai-tech.md（格式参考）
