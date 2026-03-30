---
name: hx-init
description: 初始化项目规则事实
usage: hx-init
claude: /hx-init
codex: hx-init
---

# 初始化项目规则事实

参数: `$ARGUMENTS`（本命令不接受额外参数）

## 执行步骤

1. 扫描项目，识别主技术栈、源码目录、文档目录和可执行 gates
2. 归纳 `projectFacts`
3. 生成 `.hx/config.yaml`
4. 生成 `.hx/rules/golden-rules.md`
5. 生成 `.hx/rules/review-checklist.md`
6. 生成 `.hx/rules/requirement-template.md`
7. 生成 `.hx/rules/plan-template.md`
8. 初始化或补全：
   - `.hx/commands/README.md`
   - `.hx/commands/hx-your-command.md.example`
   - `.hx/hooks/README.md`
   - `.hx/hooks/run-pre.md.example`
   - `.hx/hooks/run-post.md.example`
   - `.hx/pipelines/default.yaml`
9. 在 `CLAUDE.md` 和 `AGENTS.md` 中注入或更新 harness 标记块

## `.hx/config.yaml` 约束

- 只写结构化硬变量，不写 profile 语义
- 必须包含：
  - `schemaVersion: 2`
  - `paths.src`
  - `paths.requirementDoc`
  - `paths.planDoc`
  - `paths.progressFile`
  - `gates.*`
  - `hooks.*`
- 即使使用默认值，也要显式写入

## `rules/*.md` 约束

- 所有固定规则文件都采用 `hx:auto` / `hx:manual` 双区块
- 固定标记必须为 `<!-- hx:auto:start -->` / `<!-- hx:auto:end -->` / `<!-- hx:manual:start -->` / `<!-- hx:manual:end -->`
- 自动区写入项目扫描结果和固定骨架
- 人工区预留给长期沉淀，不在 init 阶段覆盖

## 重要约束

- 不再接受 `--profile`
- 不再生成 `.hx/profiles/*`
- 生成的是项目规则，而不是 profile
- 写入已存在的 `.hx/config.yaml` 时只补全缺失字段，不覆盖已有值
