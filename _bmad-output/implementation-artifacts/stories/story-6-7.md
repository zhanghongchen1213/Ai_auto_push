# Story 6-7: 日报自动推送与30日指标统计

## Story ID
6-7

## Epic
Epic 6: 商业机会日报全自主链路

## 标题
日报自动推送与30日指标统计

## 描述
作为系统，
我想要在日报生成后自动推送仓库并统计最近30天运行指标，
以便可持续验证自治效果与质量。

## 优先级
P0

## 复杂度
中

## 状态
ready-for-dev

## 依赖
- Story 6-5 已完成：日报文档生成与落盘逻辑已实现
- Story 6-6 已完成：首页板块渲染已就绪
- SKILL.md Step 5 publish 已有基础 stub（git add/commit/push）
- 关联需求：FR37, NFR20, NFR21

---

## 现状分析

### Step 5 当前 Stub
SKILL.md 中 Step 5（publish）当前为基础 stub 实现，包含：
- 基本的 `git add` / `git commit` / `git push` 命令
- push 失败时最多重试 2 次的描述
- commit hash 提取的占位描述

### 缺失项（本 Story 需完善）
1. **git pull --rebase**：push 前未执行 rebase，远端有新提交时会失败
2. **错误码记录**：push 失败时未记录具体错误码与重试结果
3. **commit hash 提取**：未给出具体提取命令
4. **30日推送成功率统计**：Post-Pipeline 汇总报告中无此指标
5. **30日方案重复率统计**：Post-Pipeline 汇总报告中无此指标

### 参考：资讯管道 publish 实现
`ai-auto-push/SKILL.md` Step 4 的 publish 模式：
```bash
cd {PROJECT_ROOT} && git add src/content/daily/{date}/ && \
git commit -m "chore: daily update {date} ({success}/{total} domains)" && \
git push
```
- push 失败时最多重试 2 次
- commit 和 push 合并在同一条 Bash 命令中，全程无人工干预

---

## 实现方案

### Task 1: 完善 SKILL.md Step 5 (publish) stub

**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

将当前 stub 替换为完整实现：

#### 1.1 push 前 rebase
在 git push 之前执行 `git pull --rebase`，避免远端有新提交时 push 失败。

#### 1.2 错误处理与重试
- push 失败时记录 exit code
- 最多重试 2 次（共 3 次尝试），每次重试前执行 `git pull --rebase`
- 每次重试结果（成功/失败 + exit code）写入阶段日志

#### 1.3 commit hash 提取
push 成功后执行 `git rev-parse --short HEAD` 提取 commit hash，写入完成标记。

#### 1.4 失败终止
3 次均失败时输出 `[STAGE_FAILED] publish | duration={ms} | error=push failed after 3 attempts | last_exit_code={code}`

### Task 2: 在 Post-Pipeline 汇总报告中添加30日指标统计

**修改文件：** `.claude/skills/commercial-opportunity/SKILL.md`

在 Post-Pipeline 汇总报告部分追加两项30日指标：

#### 2.1 推送成功率（NFR21）
- 扫描最近30天的 git log，统计 commit message 匹配 `chore: commercial opportunity daily` 的提交数
- 对比最近30天的日历天数，计算成功率
- 输出格式：`30日推送成功率: {success}/{total} = {percent}%`

#### 2.2 方案重复率（NFR20）
- 扫描最近30天 `src/content/daily/*/commercial-opportunity.md` 文件
- 提取每日 finalStatus 为 "commercializable" 的方案标题
- 按"标题"去重统计重复天数
- 输出格式：`30日方案重复率: {duplicateDays}/30 = {percent}%`

---

## 验收标准 (Acceptance Criteria)

### AC-1: push 前执行 rebase
**Given** 日报文件已落盘
**When** 执行 publish 阶段
**Then** 在 git push 之前执行 `git pull --rebase`

### AC-2: push 成功并提取 commit hash
**Given** git push 执行成功
**When** 阶段完成
**Then** 输出包含 `commit={7位短hash}` 的完成标记

### AC-3: push 失败重试与错误记录
**Given** git push 首次失败
**When** 重试机制触发
**Then** 最多重试 2 次（共 3 次尝试），每次记录 exit code
**And** 全部失败时输出包含 `last_exit_code` 的失败标记

### AC-4: 30日推送成功率统计
**Given** 管道执行完成
**When** 输出 Post-Pipeline 汇总报告
**Then** 报告包含最近30天推送成功率（成功批次/总批次）

### AC-5: 30日方案重复率统计
**Given** 管道执行完成
**When** 输出 Post-Pipeline 汇总报告
**Then** 报告包含最近30天最终方案重复率（重复天数/30）

### AC-6: 全程无人工交互
**Given** 用户已触发管道
**When** publish 阶段执行
**Then** git commit 和 push 全程自动完成，禁止询问用户确认

---

## 需要修改的文件清单

| 文件路径 | 修改类型 | 说明 |
|---------|---------|------|
| `.claude/skills/commercial-opportunity/SKILL.md` | 修改 | 完善 Step 5 stub + 扩展 Post-Pipeline 汇总报告 |

---

## 完成定义 (Definition of Done)

- [ ] Step 5 stub 已替换为完整 publish 逻辑（含 rebase + 重试 + 错误码记录）
- [ ] commit hash 通过 `git rev-parse --short HEAD` 提取
- [ ] push 失败时记录 exit code 与重试结果
- [ ] Post-Pipeline 汇总报告包含30日推送成功率
- [ ] Post-Pipeline 汇总报告包含30日方案重复率
- [ ] 全流程无人工交互（NFR22）

---

## 参考文档

- 主编排 Skill：`.claude/skills/commercial-opportunity/SKILL.md`
- 资讯管道 Skill（publish 参考）：`.claude/skills/ai-auto-push/SKILL.md`
- Story 6-5：`_bmad-output/implementation-artifacts/stories/story-6-5.md`
- Sprint 状态：`_bmad-output/implementation-artifacts/sprint-status.yaml`
