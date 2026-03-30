---
name: hx-rules
description: 查看或更新项目规则事实
usage: hx-rules [update]
claude: /hx-rules
codex: hx-rules
---

# 项目规则事实

参数: `$ARGUMENTS`（格式: `[update]`）

## 默认模式

1. 读取 `.hx/config.yaml`
2. 检查 `.hx/rules/golden-rules.md`、`.hx/rules/review-checklist.md`、`.hx/rules/requirement-template.md`、`.hx/rules/plan-template.md`
3. 输出当前项目的：
   - `schemaVersion`
   - `paths.*`
   - `gates.*`
   - hooks / commands / pipelines 目录概况
   - 固定 rules 文件是否齐全

## `hx-rules update`

1. 重新扫描项目结构和脚本
2. 归纳 `projectFacts`
3. 仅更新各个 rules 文件的 `hx:auto` 区
4. `.hx/config.yaml` 只补全缺失字段，不覆盖已有值
5. 输出更新摘要和差异说明

## 约束

- 不接受 `--profile`
- 不生成 `.hx/profiles/*`
- `hx:manual` 区内容永久保留
- 不做复杂 merge，只做固定骨架更新
