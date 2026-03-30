---
name: hx-doc
description: Phase 01 · 获取需求并创建需求文档
usage: hx-doc [<feature-key-or-title>] [--task <task-id>]
claude: /hx-doc
codex: hx-doc
---

# Phase 01 · 获取需求并创建需求文档

参数: `$ARGUMENTS`（格式: `[<feature-key-or-title>] [--task <task-id>]`）

## 执行步骤

1. 解析参数：提取可选首个位置参数、`--task`（可选）
2. 解析需求来源模式：
   - 若传入 `--task <task-id>`，进入“任务拉取模式”
   - 若未传 `--task`，进入“手工整理模式”
3. 生成需求标题与 `feature key`
4. 读取 `.hx/config.yaml` 的 `paths.requirementDoc`
5. 加载 `config.hooks.doc`
6. 读取 `rules/golden-rules.md`
7. 读取 `rules/requirement-template.md`
8. 基于模板创建 `requirementDoc`
9. 输出创建结果，并默认提示下一步 `hx-plan`

## 约束

- 不读取或解析任何 profile
- 缺少需求来源时停止，不能凭空补齐关键约束
- `feature key` 仍是内部主键，但不是运行时 profile 的一部分
