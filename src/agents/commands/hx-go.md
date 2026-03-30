---
name: hx-go
description: 全自动流水线 · 从需求到交付
usage: hx-go [<feature-key>] [--task <task-id>] [--from <step-id>] [--pipeline <name>]
claude: /hx-go
codex: hx-go
---

# 全自动流水线 · 从需求到交付

参数: `$ARGUMENTS`（格式: `[<feature-key>] [--task <task-id>] [--from <step-id>] [--pipeline <name>]`）

## 执行步骤

1. 按优先级查找流水线定义：
   - `<项目根>/.hx/pipelines/<pipeline-name>.yaml`
   - `~/.hx/pipelines/<pipeline-name>.yaml`
   - `<frameworkRoot>/pipelines/<pipeline-name>.yaml`
2. 解析参数：
   - `<feature-key>`
   - `--task <task-id>`
   - `--from <step-id>`
   - `--pipeline <name>`
3. 逐步执行命令 contract：
   - `<项目根>/.hx/commands/<command>.md`
   - `~/.hx/commands/<command>.md`
   - `<frameworkRoot>/agents/commands/<command>.md`
4. `run` 步骤仅在显式传入 `--task` 时下钻到单任务

## 约束

- `hx-go` 自身不读取规则正文
- `hx-go` 不再透传 profile
- 只负责调度子命令和遵守 pipeline 定义
