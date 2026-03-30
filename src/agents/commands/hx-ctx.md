---
name: hx-ctx
description: Phase 03 · 当前需求执行前预检（可选）
usage: hx-ctx [<feature-key>]
claude: /hx-ctx
codex: hx-ctx
---

# Phase 03 · 当前需求执行前预检（可选）

参数: `$ARGUMENTS`（格式: `[<feature-key>]`）

## 执行步骤

1. 确定目标 `feature key`
2. 读取 `.hx/config.yaml`
3. 检查当前需求执行所需资源：
   - `requirementDoc`
   - `planDoc`
   - `progressFile`
4. 检查固定规则文件：
   - `.hx/rules/golden-rules.md`
   - `.hx/rules/review-checklist.md`
   - `.hx/rules/requirement-template.md`
   - `.hx/rules/plan-template.md`
5. 检查 `gates` 至少存在一个
6. 输出预检结果

## 约束

- 不读取 profile
- 正常主流程优先直接运行 `hx-run`；仅在排查输入问题时单独执行 `hx-ctx`
