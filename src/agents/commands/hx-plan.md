---
name: hx-plan
description: Phase 02 · 生成执行计划
usage: hx-plan [<feature-key>]
claude: /hx-plan
codex: hx-plan
---

# Phase 02 · 生成执行计划

参数: `$ARGUMENTS`（格式: `[<feature-key>]`）

## 执行步骤

1. 解析参数并确定目标 `feature key`
2. 读取 `.hx/config.yaml` 中的：
   - `paths.requirementDoc`
   - `paths.planDoc`
   - `paths.progressFile`
   - `hooks.plan`
3. 读取 `rules/golden-rules.md`
4. 读取 `rules/plan-template.md`
5. 从需求文档提取输入事实、验收标准和约束
6. 写入 `planDoc`
7. 写入 `progressFile`

## `progressFile` 约束

```json
{
  "schemaVersion": 2,
  "feature": "<feature-key>",
  "generatedAt": "<ISO 8601 date>",
  "updatedAt": "<ISO 8601 date>",
  "lastRun": null,
  "tasks": [
    {
      "id": "TASK-01",
      "name": "任务名称",
      "status": "pending",
      "completedAt": null
    }
  ]
}
```

## 约束

- 不覆盖已存在的计划文件（提示用户确认）
- 每个 TASK 必须包含目标、修改范围、实施要点、验收标准、验证方式
- `progress.json` 只描述执行状态，不再记录 profile 字段
- 默认提示下一步 `hx-run`
