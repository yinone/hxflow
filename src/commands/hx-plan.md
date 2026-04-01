---
name: hx-plan
description: Phase 02 · 生成执行计划
usage: hx-plan [<feature>]
hooks:
  - pre
  - post
---

# Phase 02 · 生成执行计划

## 目标

- 把 `requirementDoc` 转成可执行的 `planDoc` 和 `progressFile`，为后续调度提供稳定输入。

## 何时使用

- 适用场景：需求文档已经确认，需要初始化计划和进度状态。
- 不适用场景：正常主流程优先用 `hx-go`；若只是继续实现已有 feature，优先用 `hx-run`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`<feature>`
- 默认值：未传入 `<feature>` 时，按需求文档和当前需求上下文自动定位
- 依赖输入：`.hx/config.yaml`、`requirementDoc`、`src/contracts/feature-contract.md`、`src/contracts/progress-contract.md`、`rules/golden-rules.md`、`rules/plan-template.md`、`src/templates/progress.json`

## 执行步骤

1. 解析参数并确定目标 `feature`，定位 `requirementDoc`、`planDoc` 和 `progressFile`。
2. 读取 `src/contracts/feature-contract.md`、`src/contracts/progress-contract.md`、`rules/golden-rules.md` 和 `rules/plan-template.md`。
3. 从需求文档读取已有 `feature`、输入事实、验收标准、task 依赖关系和并行约束。
4. 写入 `planDoc`，只保留目标、修改范围、实施要点、验收标准和验证方式；task 依赖关系和并行约束不写入 `planDoc`。
5. 按 progress contract 的初始化规则，使用 `src/templates/progress.json` 生成 `progressFile`，并把依赖关系写入 `dependsOn` 和 `parallelizable` 字段。
6. 新开一个子 agent 评审 `planDoc` 和 `progressFile` 的任务拆分、边界、验收标准和调度元数据；主 agent 必须根据评审结论修正。
7. 写入完成后调用 `validateProgressData(progressData)` 或 `validateProgressFile(progressFile)` 校验结果；若校验失败，立即停止。

## 成功结果

- 生成或更新 `planDoc`。
- 生成一个通过校验的 `progressFile`，可直接供 `hx-run` 调度。

## 失败边界

- 需求文档缺失，或无法从需求文档续接已有 `feature`。
- 计划评审未通过，或 `progressFile` 校验失败。
- 已有计划文件不允许被静默覆盖。

## 下一步

- 正常情况下运行 `hx-run`；若想回到自动主链路，可继续用 `hx-go`。

## 约束

- 不覆盖已存在的计划文件（提示用户确认）
- 每个 TASK 必须包含目标、修改范围、实施要点、验收标准、验证方式；不包含前置任务或并行标记
- task 依赖关系和并行约束只写入 `progressFile` 的 `dependsOn` 和 `parallelizable` 字段，`planDoc` 中不得出现对应描述
- `feature` 只允许从需求文档续接，不允许在本阶段生成或修改
- 读取需求文档头部时，必须遵守 `src/contracts/feature-contract.md` 的固定头部解析规则
- `progressFile` 的结构、字段、初始化规则与校验规则全部以 `src/contracts/progress-contract.md` 为准
- 生成后的 `progressFile` 必须通过 `validateProgressData` 或 `validateProgressFile` 校验
- 已有需求文档中的 `feature` 只允许续接，不允许在本阶段重算
- 计划和进度初始化完成后，必须新开子 agent 评审一次，主 agent 根据评审结果修正后才能输出
