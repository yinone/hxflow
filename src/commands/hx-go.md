---
name: hx-go
description: 全自动流水线 · 从需求到交付
usage: hx-go [<feature>] [--from <step-id>] [--pipeline <name>]
---

# 全自动流水线 · 从需求到交付

参数: `$ARGUMENTS`（格式: `[<feature>] [--from <step-id>] [--pipeline <name>]`）

## 执行步骤

1. 解析参数：
   - `<feature>`
   - `--from <step-id>`
   - `--pipeline <name>`
2. 按全局 pipeline 规则查找目标流水线定义。
3. 按全局命令解析规则确定每一步对应的命令实体。
4. 按 pipeline 顺序调度子命令。
5. 若未显式传入 `<feature>`，优先从最近一次需求上下文自动续接。

## 约束

- `hx-go` 自身不定义 command / hook / pipeline 的运行规则
- `hx-go` 只负责调度子命令与遵守 pipeline 定义
