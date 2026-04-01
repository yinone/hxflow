---
name: hx-ctx
description: Phase 03 · 当前需求执行前预检（可选）
usage: hx-ctx [<feature>]
---

# Phase 03 · 当前需求执行前预检（可选）

## 目标

- 单独检查当前 feature 是否具备继续执行的最小前提。

## 何时使用

- 适用场景：`hx-run` 之前怀疑输入不完整，或需要单独排查配置、规则、进度文件问题。
- 不适用场景：正常主流程中优先直接运行 `hx-run`，因为 `hx-run` 已内置预检。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`<feature>`
- 默认值：未传入 `<feature>` 时，按当前需求上下文自动定位
- 依赖输入：`.hx/config.yaml`、`requirementDoc`、`planDoc`、`progressFile`、固定规则文件

## 执行步骤

1. 确定目标 `feature` 并读取 `.hx/config.yaml`。
2. 检查 `requirementDoc`、`planDoc`、`progressFile` 是否存在且可读取。
3. 读取 `src/contracts/progress-contract.md`，并调用 `validateProgressFile(progressFile)` 校验进度文件。
4. 检查 `.hx/rules/` 下的固定规则文件和 `gates` 配置是否齐备。
5. 输出预检结果，指出通过项、缺失项和异常项。

## 成功结果

- 输出一份当前 feature 的预检摘要，明确是否可以直接进入 `hx-run`。

## 失败边界

- `progressFile` contract 违规。
- 固定规则文件缺失，或 `gates` 未配置。
- 当前 feature 无法定位到完整执行上下文。

## 下一步

- 预检通过时运行 `hx-run`；预检失败时先补齐缺失项后重试。

## 约束

- 只依赖当前项目内的配置、规则和文档
- 正常主流程优先直接运行 `hx-run`；仅在排查输入问题时单独执行 `hx-ctx`
