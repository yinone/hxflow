---
name: hx-doctor
description: 检测 Harness Workflow 环境健康状态
usage: hx-doctor
claude: /hx-doctor
codex: hx-doctor
protected: true
---

# 检测 Harness Workflow 环境健康状态

参数: `$ARGUMENTS`（无参数）

## 执行步骤

### Step 1: 执行健康检测

运行以下命令，捕获完整输出（stdout + stderr）：

```bash
hx doctor
```

---

### Step 2: 解读检测结果

根据输出中 `✓`、`⚠`、`✗` 标记分类展示结果：

- `✓`（正常）：直接列出，无需额外说明
- `⚠`（警告）：说明含义，提供修复建议
- `✗`（失败）：说明原因，提供具体修复步骤

**常见警告/失败及处置：**

| 检测项 | 修复方式 |
|--------|---------|
| `~/.claude/commands/ 缺失` 或无 `hx-*.md` 命令 | 运行 `/hx-setup` |
| `~/.codex/skills/ 中未找到 hx-* skill 目录` | 运行 `/hx-setup` |
| `.hx/config.yaml 不存在（未初始化）` | 运行 `/hx-init` |
| `.hx/config.yaml 格式错误` | 检查并修复 YAML 语法 |
| `gates 未配置` | 编辑 `.hx/config.yaml`，补充 lint/test/build 等 gate 命令 |
| `.hx/rules/*.md 缺失` | 运行 `/hx-init` 或 `/hx-rules update` 重新生成固定规则文件 |
| `node v<版本>（需要 >= 18）` | 升级 Node.js 到 18 或以上 |
| `~/.hx/commands/` / `~/.hx/hooks/` / `~/.hx/pipelines/` 缺失 | 运行 `/hx-setup` 修复全局目录骨架 |

---

### Step 3: 若 exit code 非 0，询问是否需要帮助修复

列出所有 `✗` 项，询问用户：

> 检测到 N 个问题，是否需要逐项协助修复？

若用户同意，按照 Step 2 的修复建议逐项引导；涉及 setup/upgrade 操作时，直接调用对应的 `/hx-setup` 或 `/hx-upgrade` 命令。

---

### Step 4: 判断是否为框架 bug（仅当出现非预期报错时）

以下情况提示用户通过 `/hx-issue` 提交 Bug：

- `hx doctor` 命令本身崩溃（非 exit code 1 的正常失败，而是未捕获异常）
- 模块加载失败（`resolve-context.js` / `config-utils.js` / `rule-context.js` 内部错误）
- 检测逻辑抛出与文件系统/网络无关的内部异常

询问用户是否提交（Y/n），确认后调用 `/hx-issue`，预填：
- `--title`: `bug: hx doctor 崩溃 - {错误摘要，20字内}`
- `--body`: 完整错误输出、`node --version` 和 `hx version`

## 约束

- 执行 CLI 时必须同时捕获 stdout 和 stderr
- exit code 1 是正常的"检测到问题"，不视为框架 bug
- 不自动修改任何文件，修复步骤由用户确认后再执行
