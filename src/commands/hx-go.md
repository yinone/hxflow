---
name: hx-go
description: 全自动流水线 · 从需求到交付
usage: hx-go [<feature>] [--from <step-id>] [--pipeline <name>]
---

# 全自动流水线 · 从需求到交付

## 目标

- 按 pipeline 自动串起主链路命令，完成从需求到交付的整段流程。

## 何时使用

- 适用场景：想走完整主路径，或在中断后从某个 step 继续推进。
- 不适用场景：只想单独补文档、补计划或继续执行单个 feature 时，优先用 `hx-doc`、`hx-plan`、`hx-run`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`<feature>`、`--from <step-id>`、`--pipeline <name>`
- 默认值：未传 `<feature>` 时按当前需求上下文自动续接；未传 `--pipeline` 时使用默认 pipeline；未传 `--from` 时自动判定恢复起点
- 依赖输入：`src/contracts/feature-contract.md`、pipeline 定义、子命令 contract、耐久产物（`requirementDoc` / `planDoc` / `progressFile`）

## 执行步骤

1. 解析 `<feature>`、`--from <step-id>`、`--pipeline <name>`。
2. 读取 `src/contracts/feature-contract.md`，确定当前 feature。
3. 按全局 pipeline 规则加载目标流水线，并解析各个 step 对应的命令实体。
4. 确定恢复起点：若显式传入 `--from`，从该 step 开始；否则按耐久产物自动判断最早未完成 step。
5. 自动恢复时，按固定规则判断 `doc`、`plan`、`run` 是否已完成；`check`、`mr` 视为必须重新执行的 step。
6. 从恢复起点开始顺序调度子命令，直到 pipeline 结束或某一步失败。

## 成功结果

- 输出本次使用的 pipeline、恢复起点和实际执行的 step 列表。
- 若整条 pipeline 跑完，给出进入提交流程的结论。

## 失败边界

- `--from <step-id>` 非法，或目标 step 不存在于 pipeline。
- 目标 pipeline 不存在，或某个 step 无法解析到命令实体。
- 子命令失败，或自动恢复无法唯一确定起点。

## 下一步

- 未完成时，优先继续运行 `hx-go --from <failed-step>`。
- 已完成时，进入最终提交或创建 MR 的流程。

## 约束

- `hx-go` 自身不定义 command / hook / pipeline 的运行规则
- `hx-go` 只负责调度子命令与遵守 pipeline 定义
- 未显式传入 `<feature>` 时，只按 `src/contracts/feature-contract.md` 的自动续接规则和固定头部解析规则读取已有需求上下文
- `--from <step-id>` 必须作为显式恢复锚点，且命中的 step 必须存在于目标 pipeline
- 自动恢复时，不得跳过最早未完成 step
- 没有耐久完成标记的 step 不得自动判定为已完成
