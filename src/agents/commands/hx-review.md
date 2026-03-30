---
name: hx-review
description: Phase 05 · 代码审查
usage: hx-review
claude: /hx-review
codex: hx-review
---

# Phase 05 · 代码审查

参数: `$ARGUMENTS`（本命令不接受额外参数）

## 执行步骤

1. 读取 `config.hooks.review`
2. 获取当前变更 diff：优先 `git diff HEAD`，无暂存时回退 `git diff`
3. 读取 `rules/golden-rules.md`
4. 读取 `rules/review-checklist.md`
5. 逐项对照 checklist 审查：
   - 范围与一致性
   - 架构与分层检查
   - 错误处理与健壮性
   - 测试与质量门
   - 技术栈专项检查

## 约束

- 不解析 profile
- 审查结论以实际 diff 为准，不以口头描述代替
