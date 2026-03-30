---
name: hx-setup
description: 全局安装 Harness Workflow 框架文件
usage: hx-setup [--agent <claude|codex|all>] [--dry-run]
claude: /hx-setup
codex: hx-setup
protected: true
---

# 全局安装 Harness Workflow 框架文件

参数: `$ARGUMENTS`（可选: `[--agent <claude|codex|all>] [--dry-run]`）

## 执行步骤

### Step 1: 执行 CLI 安装命令

运行以下命令，捕获完整输出（stdout + stderr）：

```bash
hx setup $ARGUMENTS
```

若命令成功（exit code 0），向用户展示安装报告并提示下一步运行 `/hx-init` 初始化项目，结束。

---

### Step 2: 分析失败原因（仅在 Step 1 失败时执行）

#### A. 用户环境问题（非框架 bug，引导用户自行修复）

| 错误特征 | 原因 | 处置建议 |
|---------|------|---------|
| `EACCES` / `permission denied` | 目录写入权限不足 | 检查 `~/.hx/`、`~/.claude/commands/`、`~/.codex/skills/` 的权限 |
| `ENOENT` / 路径不存在 | 依赖目录未创建 | 确认 `~/.claude/` 或 `~/.codex/` 目录是否存在，必要时手动创建 |
| `--agent` 参数值非法（如 `resolveAgentTargets` 报错） | 参数填写错误 | 仅支持 `claude`、`codex`、`all` |

若匹配上述情况，向用户说明原因和修复方式，**不提 issue**，结束。

#### B. 疑似框架 bug（进入 Step 3）

- 模块加载失败（`install-utils.js` / `resolve-context.js` / `config-utils.js`）
- `generateForwarderFiles` / `generateCodexSkillFiles` 内部抛出未预期异常
- 命令脚本不存在（`命令脚本不存在: ...`）

---

### Step 3: 确认并提交框架 bug（仅在 Step 2 判断为框架 bug 时执行）

1. 向用户展示错误摘要，说明判断为框架 bug 的理由
2. 询问是否通过 `hx-issue` 提交 Bug（Y/n）
3. 用户确认后，调用 `/hx-issue`，预填：
   - `--title`: `bug: hx setup 失败 - {错误摘要，20字内}`
   - `--body`: 触发命令、完整错误输出、`node --version` 和 `hx version`

## 约束

- 执行 CLI 时必须同时捕获 stdout 和 stderr
- 不自动修改任何文件
