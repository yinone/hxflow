---
name: hx-uninstall
description: 卸载 Harness Workflow 安装痕迹
usage: hx-uninstall [--target <dir>] [--dry-run]
claude: /hx-uninstall
codex: hx-uninstall
protected: true
---

# 卸载 Harness Workflow 安装痕迹

参数: `$ARGUMENTS`（可选: `[--target <dir>] [--dry-run]`）

## 执行步骤

### Step 1: dry-run 预览

先以 `--dry-run` 运行，展示将要删除的内容：

```bash
hx uninstall $ARGUMENTS --dry-run
```

向用户展示完整预览输出，并明确说明：
- 将要移除的全局文件（`~/.hx/config.yaml`、`~/.claude/commands/hx-*.md`、`~/.codex/skills/hx-*/`）
- 将要移除的项目文件（`.hx/config.yaml`、`CLAUDE.md` 中的标记块等）
- **保留内容**：用户自定义的 `~/.hx/commands/`、`~/.hx/profiles/`、源码、git history 等均不受影响

若 dry-run 输出 "未发现 Harness Workflow 安装痕迹"，直接告知用户无需卸载，结束。

---

### Step 2: 用户确认

询问用户：

> 以上文件将被删除，确认继续卸载吗？（Y/n）

若用户拒绝，取消操作，结束。

---

### Step 3: 执行卸载

用户确认后，使用 `--yes` 跳过 CLI 内部的交互提示（避免 AI 环境中 stdin 挂起）：

```bash
hx uninstall $ARGUMENTS --yes
```

展示卸载报告，结束。

---

### Step 4: 分析失败原因（仅在 Step 3 失败时执行）

#### A. 用户环境问题（非框架 bug）

| 错误特征 | 原因 | 处置建议 |
|---------|------|---------|
| `EACCES` / `permission denied` | 文件权限不足 | 手动删除对应文件，或使用 `sudo` |
| `ENOENT` | 文件已被删除 | 忽略，安装痕迹已不存在 |

#### B. 疑似框架 bug（进入 Step 5）

- 模块加载失败
- `collectGlobalRemoveList` / `collectProjectRemoveList` 内部异常
- 删除逻辑报出非权限类的未预期错误

---

### Step 5: 确认并提交框架 bug（仅在 Step 4 判断为框架 bug 时执行）

询问用户是否通过 `/hx-issue` 提交 Bug（Y/n），确认后预填：
- `--title`: `bug: hx uninstall 失败 - {错误摘要，20字内}`
- `--body`: 触发命令、完整错误输出、`node --version` 和 `hx version`

## 约束

- **必须先执行 dry-run，再向用户确认，最后才执行真正的卸载**，不允许跳过确认步骤
- 执行真正卸载时必须传入 `--yes`，避免 CLI 内部 stdin 读取在 AI 环境中挂起
- 执行 CLI 时必须同时捕获 stdout 和 stderr
