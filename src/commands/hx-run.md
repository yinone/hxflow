---
name: hx-run
description: Phase 04 · 执行需求
usage: hx-run [<feature>] [--plan-task <task-id>]
hooks:
  - pre
  - post
---

# Phase 04 · 执行需求

## 目标

- 执行当前 feature 的可运行任务，并把 `progressFile` 维护在可恢复、可校验的状态。

## 何时使用

- 适用场景：`hx-plan` 完成后继续实现，或中断后恢复当前 feature。
- 不适用场景：还没有需求文档和计划文件时，优先走 `hx-go` 或先补 `hx-doc`、`hx-plan`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`<feature>`、`--plan-task <task-id>`
- 默认值：未传 `<feature>` 时按当前需求上下文自动续接；未传 `--plan-task` 时执行整个 feature 当前可运行的 task
- 依赖输入：`.hx/config.yaml`、`requirementDoc`、`planDoc`、`progressFile`、`src/contracts/feature-contract.md`、`src/contracts/progress-contract.md`、`rules/golden-rules.md`、`gates.*`

## 执行步骤

1. 解析参数并确定目标 `feature`，定位 `requirementDoc`、`planDoc`、`progressFile` 和 `gates.*`。
2. 执行内置预检，并读取 `src/contracts/feature-contract.md`、`src/contracts/progress-contract.md`、`rules/golden-rules.md`、需求文档、计划文件和进度文件。
3. 在进入调度前调用 `validateProgressFile(progressFile)`；若当前文件无效，立即停止，不得在坏状态的 `progressFile` 上继续执行。
4. 先识别 `recoverable` 的 `in-progress` task；若存在可恢复任务，优先恢复并保留原有 `startedAt`，不重复执行阶段一。
5. 若没有恢复任务，则只按 `progressFile` 的 `dependsOn` 和 `parallelizable` 解析 runnable task；传入 `--plan-task` 时，仅执行该计划任务，否则只执行当前可运行的 pending task。
6. 按 `src/contracts/progress-contract.md` 的两阶段写入要求回写 `progressFile`：执行前写 `in-progress`，执行后写结果和 `lastRun`，且每次写回后都重新校验。
7. 本轮执行完成后，必须新开一个质量复查子 agent，检查边界条件、实现完整性和回归风险；主 agent 必须根据复查结论补齐必要修正。

## 成功结果

- 输出本轮执行的 task 列表、更新后的 `progressFile` 状态和必要修正摘要。
- 若还有未完成任务，明确保留继续执行的恢复点。

## 失败边界

- 需求文档、计划文件、规则文件或进度文件缺失。
- `progressFile` 结构校验失败，或调度、恢复、回写过程中出现 contract 违规。
- 质量复查后仍存在阻断问题。

## 下一步

- 若仍有 `pending` 任务，继续运行 `hx-run`。
- 全部任务完成后，运行 `hx-qa`。

## 约束

- 执行时只依赖当前项目内的配置、规则和文档
- 默认执行整个 feature；`--plan-task` 仅用于调试和恢复单个计划任务
- `feature` 只允许续接已有需求上下文，不允许在执行阶段生成或修改
- 续接 `feature` 时，读取需求文档头部必须遵守 `src/contracts/feature-contract.md` 的固定头部解析规则
- 进入调度前必须先执行 `validateProgressFile(progressFile)`
- `progressFile` 的调度规则、回写规则和字段约束全部以 `src/contracts/progress-contract.md` 为准
- 断点恢复时必须优先处理 `recoverable` 的 `in-progress` task
- `lastRun` 与 task 状态必须保持一致
- 每次回写 `progressFile` 后都必须执行 `validateProgressFile`
- 执行完成后，必须新开一个质量复查子 agent 做复查，主 agent 根据复查结果补齐必要修正后才能输出
- 执行阶段只读取现有 `feature`，不生成、不改写、不重算
