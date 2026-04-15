---
name: hx-go
description: 全自动流水线 · 从需求到交付
usage: bun src/tools/go.ts <next|state> <feature> [--from <step-id>]
---

# 全自动流水线 · 从需求到交付

## 目标

检测流水线当前阶段，返回下一步及对应裸脚本路径。

## 约束

- 自动恢复不得跳过最早未完成 step
- `--from <step>` 必须是有效 step 名称
- `bun src/tools/go.ts next <feature>` 返回下一步和 `toolScript`
- `bun src/tools/go.ts state <feature>` 返回完整流水线状态
- `bun src/tools/go.ts hooks <command>` 返回命令的 hook 链
- `bun src/tools/go.ts resolve <command>` 返回命令的三层解析结果
- 流水线顺序：`doc` → `plan` → `run` → `check` → `mr`
