---
name: hx-mr
description: Phase 08 · 创建 Merge Request
usage: hx-mr [<feature>] [--project <group/repo>] [--target <branch>]
hooks:
  - pre
  - post
---

# Phase 08 · 创建 Merge Request

## 目标

- 基于需求文档、进度状态和当前 git 变更生成可直接使用的 MR 标题与描述。

## 何时使用

- 适用场景：需求实现和核心检查已经完成，准备创建或更新 Merge Request。
- 不适用场景：需求尚未完成、`progressFile` 还不完整时，优先先完成 `hx-run` 或 `hx-check`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`<feature>`、`--project <group/repo>`、`--target <branch>`
- 默认值：未传 `<feature>` 时按当前需求上下文自动续接；未传 `--project` 与 `--target` 时按当前仓库和默认目标分支推导
- 依赖输入：`src/contracts/feature-contract.md`、`.hx/config.yaml`、`~/.hx/settings.yaml`、`requirementDoc`、`progressFile`、当前 git diff 与提交历史

## 执行步骤

1. 解析参数，确定 `feature`、`--project` 和 `--target`。
2. 按 `src/contracts/feature-contract.md` 续接已有 `feature`；若无法唯一定位，则停止并要求用户补充。
3. 读取项目 `.hx/config.yaml`、`~/.hx/settings.yaml`、当前需求对应的 `requirementDoc` 与 `progressFile`。
4. 收集事实来源：需求摘要、验收标准、任务完成状态、`git log <target>..HEAD --oneline` 和 `git diff <target>...HEAD --stat`。
5. 生成 MR 标题和 Markdown 描述，覆盖需求背景、变更说明、AC 验收清单、任务完成情况和测试说明。
6. 将 `docs/plans/{feature}.md` 和 `docs/plans/{feature}-progress.json` 移动到 `docs/archive/{feature}/`，完成归档。

## 成功结果

- 输出可直接使用的 MR 标题。
- 输出可直接粘贴到平台中的 Markdown 描述。
- `docs/plans/{feature}.md` 和 `docs/plans/{feature}-progress.json` 已归档至 `docs/archive/{feature}/`。

## 失败边界

- 无法定位 `feature`，或当前需求上下文不完整。
- 需求文档、进度文件或 git 事实不足，无法生成可靠的 MR 内容。

## 下一步

- 创建或更新 Merge Request；若任务未全部完成，先补齐 `progressFile` 状态再重试。

## 约束

- `feature` 只允许读取已有需求上下文，不允许在 MR 阶段生成或重算；读取需求文档头部须遵守固定头部解析规则
- 归档目标路径固定为 `docs/archive/{feature}/`，不允许自定义
- 归档前必须确认 `progressFile` 所有 task 均为 `done`，否则停止归档并返回原因
