---
name: hx-qa
description: Phase 06 · 质量校验
usage: hx-qa
---

# Phase 06 · 质量校验

## 目标

- 按项目配置执行质量门，确认当前代码处于可交付状态。

## 何时使用

- 适用场景：实现完成后做最终 gate 校验，或修复完成后验证回归。
- 不适用场景：想看工程卫生问题时，优先用 `hx-clean`；想做 diff 审查时，优先用 `hx-review`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：无
- 默认值：无
- 依赖输入：`.hx/config.yaml` 中的 `gates.*`

## 执行步骤

1. 读取 `.hx/config.yaml` 中的 `gates`。
2. 过滤掉值为空的 gate。
3. 按顺序执行 `lint -> build -> type -> test`。
4. 任一步骤的命令 `exit code != 0` 时立即停止并报告失败项。
5. 全部通过后输出质量校验结果。

## 成功结果

- 输出实际执行的 gate 顺序和通过结论。

## 失败边界

- 没有可执行的 gate。
- 任一 gate 返回非零 exit code。

## 下一步

- 全部通过后运行 `hx-clean` 或 `hx-mr`；失败时先修复后重试。

## 约束

- 质量门命令只来自 `config.gates`
- 只读取当前项目的结构化配置
- 至少需要一个 gate，缺失时直接报错
- **gate 失败的唯一判断标准是 exit code != 0**，不依赖输出内容中是否包含 `ERROR`、`FAILED` 等关键字
- exit code = 0 视为通过，无论输出内容是什么
