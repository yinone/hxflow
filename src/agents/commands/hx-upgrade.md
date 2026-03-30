---
name: hx-upgrade
description: 升级 Harness Workflow 框架
usage: hx-upgrade [--agent <claude|codex|all>] [--dry-run]
claude: /hx-upgrade
codex: hx-upgrade
protected: true
---

# 升级 Harness Workflow 框架

参数: `$ARGUMENTS`（可选: `[--agent <claude|codex|all>] [--dry-run]`）

## 执行步骤

### Step 1: 执行 CLI 升级命令

运行以下命令，捕获完整输出（stdout + stderr）：

```bash
hx upgrade $ARGUMENTS
```

若命令成功（exit code 0），向用户展示升级报告并结束。

---

### Step 2: 分析失败原因（仅在 Step 1 失败时执行）

对错误信息进行分类诊断：

#### A. 用户环境问题（非框架 bug，引导用户自行修复）

| 错误特征 | 原因 | 处置建议 |
|---------|------|---------|
| `git pull` 失败，含 `Authentication` / `Permission denied` | Git 认证未配置 | 检查 SSH key 或 HTTPS 凭证 |
| `git pull` 失败，含 `conflict` / `Your local changes` | 本地改动与远端冲突 | 进入 `FRAMEWORK_ROOT` 手动处理冲突后重试 |
| `npm install` 失败，含 `ENOTFOUND` / `network` / `timeout` | 网络不通或 registry 不可达 | 检查网络；确认 `https://npm.cdfsunrise.com/` 可访问 |
| `npm install` 失败，含 `EACCES` / `permission` | 全局 npm 目录权限不足 | 使用 `sudo` 或修复 npm prefix 权限 |
| `$GITLAB_TOKEN` 未设置（`hx-issue` 相关提示） | 环境变量缺失 | 在 `.claude/settings.local.json` 的 `env` 中配置 |
| `.hx/config.yaml 解析失败` | 用户自定义 YAML 语法错误 | 检查并修复 `.hx/config.yaml` 格式 |
| `CLAUDE.md 中未找到 harness 标记块` | 未运行过 `hx-init` | 先运行 `/hx-init` 初始化项目 |

若匹配上述任一情况，向用户说明原因和操作步骤，**不提 issue**，结束。

#### B. 疑似框架 bug（进入 Step 3）

以下特征提示框架本身存在问题：

- 命令脚本不存在（`命令脚本不存在: ...`）
- `hx setup` 内部抛出未预期异常（非网络/权限相关）
- `install-utils.js` / `config-utils.js` / `rule-context.js` / `resolve-context.js` 中的模块加载错误
- `buildHarnessBlock` / `parseSimpleYaml` 等内部函数抛出异常
- 错误信息含有 Node.js 内部堆栈但无明确用户操作可修复

---

### Step 3: 确认并提交框架 bug（仅在 Step 2 判断为框架 bug 时执行）

1. 向用户展示错误摘要，说明判断为框架 bug 的理由
2. 询问用户是否需要提交 Issue：

   > 这看起来是框架本身的问题。是否通过 `hx-issue` 提交 Bug？（Y/n）

3. 用户确认后，调用 `/hx-issue`，并预填以下信息：

   - `--title`：`bug: hx upgrade 失败 - {错误摘要，20字内}`
   - `--body`：包含以下内容
     - 触发命令：`hx upgrade $ARGUMENTS`
     - 错误信息（完整 stderr/stdout 输出）
     - 运行环境：`node --version`、`hx version` 的输出（若可获取）
     - 失败阶段：Step 1（系统层更新）/ Step 2（hx setup）/ Step 3（CLAUDE.md 更新）

## 约束

- 执行 CLI 时必须同时捕获 stdout 和 stderr
- 错误分类优先判断用户环境问题，避免将配置错误误报为框架 bug
- 不自动修改任何文件，诊断和修复建议仅供用户参考
- 若 `--dry-run` 已传入，分析输出时注意区分 dry-run 警告与真实失败
