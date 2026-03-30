# @hxflow/cli

Project-rules-driven AI engineering workflow framework for Claude Code and Codex. Zero-disruption installer for existing projects.

## 简介

`@hxflow/cli` 是面向团队工程师的 AI-first 工作流框架，核心理念：**工程师不直接写业务代码，而是通过结构化文档 + Agent 执行的方式交付**。

运行时事实已经收敛为：

- `.hx/config.yaml`
- `.hx/rules/*.md`
- `.hx/hooks/`
- `.hx/commands/`
- `.hx/pipelines/`

不再有运行时 `profile`、`defaultProfile`、`--profile`、继承链和 merge 逻辑。

## 安装

```bash
npm install -g @hxflow/cli --registry https://npm.cdfsunrise.com/
```

## 快速开始

```bash
# 1. 全局安装框架文件（首次使用必跑）
hx setup

# 2. 在项目目录中初始化
# Claude: /hx-init
# Codex:  hx-init

# 3. 开始开发
# Claude: /hx-go --task 12345
# Codex:  hx-go --task 12345
```

## CLI 命令

| 命令 | 用途 |
|------|------|
| `hx setup [--agent <claude|codex|all>]` | 全局安装，生成 Claude/Codex 适配层并初始化 `~/.hx/` |
| `hx upgrade [--dry-run]` | 升级系统层并同步自定义命令 |
| `hx uninstall [--yes]` | 移除全部安装痕迹 |
| `hx doctor` | 健康检测（环境、安装、项目配置） |
| `hx version` | 查看版本号 |

## 工作流命令

Canonical command contract 统一为 `hx-*`。Claude 使用 `/hx-*`，Codex 使用 `hx-*`。

### 一键自动化

| 命令 | 用途 |
|------|------|
| `hx-go [feature-key] [--task <id>] [--from <step>] [--pipeline <name>]` | 全自动流水线，默认串起 `doc -> plan -> run -> qa -> mr` |

### 核心链路命令

| 命令 | 阶段 | 用途 |
|------|------|------|
| `hx-init` | Init | 扫描项目并生成 `.hx/config.yaml` 与 `.hx/rules/*.md` |
| `hx-rules [update]` | Rules | 查看或更新项目规则事实 |
| `hx-doc [feature-key\|标题] [--task <id>]` | Phase 01 | 获取需求并创建需求文档 |
| `hx-plan [feature-key]` | Phase 02 | 生成执行计划与 `progress.json` |
| `hx-ctx [feature-key]` | Phase 03 | 当前需求执行前预检（可选诊断） |
| `hx-run [feature-key] [--task <id>]` | Phase 04 | 默认执行整个需求；`--task` 仅用于调试/恢复 |
| `hx-qa` | Phase 06 | 运行质量校验 |
| `hx-mr [feature-key]` | Phase 08 | 输出 Merge Request 创建上下文 |

### 辅助命令

| 命令 | 用途 |
|------|------|
| `hx-review` | 代码审查 |
| `hx-fix [--log <text>] [--file <path>]` | Phase 05 | 修复 Review 意见 |
| `hx-clean` | Phase 07 | 工程清理扫描 |
| `hx-status [feature-key]` | 查看任务进度 |

说明：

- `feature key` 是系统内部主键，正常情况下由 `hx-doc` 自动生成并由后续命令自动续接
- 主路径优先使用 `hx-doc -> hx-plan -> hx-run -> hx-qa -> hx-mr`
- `hx-ctx`、`hx-review`、`hx-fix`、`hx-clean` 都属于按需使用的辅助能力

## 三层架构

```text
系统层  <frameworkRoot>/src/agents/   命令实体、templates、pipelines
用户层  ~/.hx/                        用户自定义 commands/hooks/pipelines（跨项目共享）
项目层  <project>/.hx/               项目 config/rules 与专属覆盖（最高优先级）
```

项目层核心骨架：

```text
.hx/
  config.yaml
  rules/
    golden-rules.md
    review-checklist.md
    requirement-template.md
    plan-template.md
  hooks/
  commands/
  pipelines/
```

Claude 转发器和 Codex skill bundle 由 `hx setup` / `hx upgrade` 生成；业务侧自定义 skill 仍由用户自行管理。

## 自定义工作流命令

在项目 `.hx/commands/<name>.md` 中编写 prompt-first 命令定义，运行 `hx upgrade` 后即可被 Claude/Codex 适配层发现。同名文件自动覆盖框架内置命令。

## 环境要求

- Node.js >= 18.0.0
- Claude Code CLI 或 Codex

## 测试参考

- 测试流程说明：`docs/design/testing-reference.md`
- 全量回归：`./node_modules/.bin/vitest run`
- npm 脚本：`npm run hx:test` / `npm run hx:test:unit` / `npm run hx:test:integration`

## License

MIT
