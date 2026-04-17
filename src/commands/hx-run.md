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

1. 解析参数并确定目标 `feature`，定位 `requirementDoc`、`planDoc`、`progressFile` 和 `gates.*`；若计划文件被归档到 `docs/archive/{feature}/`，先还原到 `docs/plans/`。
2. 校验输入是否完整并读取 `src/contracts/feature-contract.md`、`src/contracts/progress-contract.md`、`rules/golden-rules.md` 与对应文档。
3. 按 `src/contracts/progress-contract.md` 的恢复与调度规则执行 task：优先恢复 `recoverable`，再执行可运行的 pending task；`--plan-task` 仅执行指定任务。
4. 按 progress contract 与脚本实现回写 `progressFile`，确保 `lastRun` 与 task 状态一致，并在每次回写后完成校验。
5. 所有 task 完成后，新开一个质量复查子 agent，检查边界条件、实现完整性和回归风险；主 agent 必须根据复查结论补齐必要修正。

## 成功结果

- 输出全部已执行的 task 列表、最终 `progressFile` 状态和必要修正摘要。

## 失败边界

- 需求文档、计划文件、规则文件或进度文件缺失。
- `progressFile` 结构校验失败，或调度、恢复、回写过程中出现 contract 违规。
- 质量复查后仍存在阻断问题。

## 下一步

- 全部任务完成后，运行 `hx-check`。

## 约束

- 执行时只依赖当前项目内的配置、规则和文档
- 调度前的输入完整性校验是固定步骤，不是独立命令，也不能被项目覆盖移除
- 默认执行整个 feature；`--plan-task` 仅用于调试和恢复单个计划任务
- `feature` 只允许续接已有需求上下文，不允许在执行阶段生成或修改；续接时须遵守固定头部解析规则
- 调度规则、回写规则和字段约束以 `src/contracts/progress-contract.md` 与对应脚本实现为准
- 断点恢复时必须优先处理 `recoverable` 的 `in-progress` task，并保持 `lastRun` 与 task 状态一致
- 所有 task 执行完成后，必须新开一个质量复查子 agent 做复查，主 agent 根据复查结果补齐必要修正后才能输出
- 执行阶段只读取现有 `feature`，不生成、不改写、不重算
