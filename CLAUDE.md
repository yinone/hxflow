# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## 项目概述

`@hxflow/cli` 是一个 project-rules-driven 的 AI 工程工作流框架，作为 npm 全局包发布，供 Claude Code 和 Codex 使用。运行时事实已经收敛为：

- `.hx/config.yaml`
- `.hx/rules/*.md`
- `.hx/hooks/`
- `.hx/commands/`
- `.hx/pipelines/`

不再有运行时 `profile`、`defaultProfile`、`--profile`、继承链和 merge 逻辑。

## 常用命令

```bash
# 测试
pnpm vitest run                      # 运行所有测试
pnpm vitest run tests/unit/config-utils.test.js
pnpm vitest run tests/unit/rule-generation.test.js

# 打包（无构建步骤，直接使用源码）
npm run pack:dry-run
npm run release:pack

# 本地调试
node bin/hx.js setup
node bin/hx.js doctor
```

## 架构

### 三层覆盖体系

框架层 < 用户层 < 项目层，优先级由低到高：

```text
<frameworkRoot>/src/           # 框架内置（随 npm 包发布）
~/.hx/                         # 用户全局 commands/hooks/pipelines
<project>/.hx/                 # 项目 config/rules 与专属覆盖
```

### 核心模块

- `bin/hx.js`：CLI 入口，只路由 `setup/upgrade/uninstall/doctor/version`
- `src/scripts/`：内置命令实现脚本
- `src/scripts/lib/config-utils.js`：参数解析与轻量 YAML 解析
- `src/scripts/lib/scan-project.js`：扫描项目原始信号
- `src/scripts/lib/derive-project-facts.js`：归纳 `projectFacts`
- `src/scripts/lib/render-rule-templates.js`：渲染 `.hx/config.yaml` 与固定规则文件
- `src/scripts/lib/rule-context.js`：默认配置、固定规则文件、gate 辅助函数
- `src/scripts/lib/install-utils.js`：安装/升级/卸载的文件操作工具
- `src/agents/commands/`：工作流命令的 Prompt 定义（`.md` 文件）
- `src/templates/`：固定骨架模板
- `src/pipelines/default.yaml`：默认流水线定义（doc -> plan -> run -> qa -> mr）

### Agent 命令 Contract

所有工作流命令统一为 `hx-*`。Claude 使用 `/hx-*`，Codex 使用 `hx-*`。

## 发布

发布到内部私有 registry `https://npm.cdfsunrise.com/`。发布前用 `npm run pack:dry-run` 确认打包文件列表。

## 测试结构

- `tests/unit/`：对 `src/scripts/lib/` 的单元测试
- `tests/integration/`：对 `bin/hx.js` 的集成测试
