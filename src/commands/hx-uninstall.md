---
name: hx-uninstall
description: 卸载 Harness Workflow 安装痕迹
usage: hx-uninstall [--target <dir>] [--dry-run]
protected: true
---

# 卸载 Harness Workflow 安装痕迹

## 目标

- 预览并移除当前项目或目标目录中的 HXFlow 安装痕迹。

## 何时使用

- 适用场景：要清理某个项目中的安装痕迹，或排查安装残留。
- 不适用场景：只是修复安装问题时，优先用 `hx setup` 或 `hx-doctor`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`--target <dir>`、`--dry-run`
- 默认值：未传 `--target` 时使用当前项目根；未传 `--dry-run` 时默认执行真实卸载流程，但仍需用户确认
- 依赖输入：目标目录、全局安装痕迹路径、项目内安装痕迹

## 执行步骤

1. 预览卸载范围：推导目标目录，列出将删除的安装痕迹和明确保留项。
2. 若未发现安装痕迹，直接说明“无需卸载”并结束。
3. 未确认前不执行删除；`--dry-run` 时只输出计划。
4. 用户确认后，逐项删除预览中的目标并输出结果。

## 成功结果

- 输出卸载预览或实际删除结果，包括删除项、保留项和目标目录。

## 失败边界

- 权限不足。
- 删除失败，或目标目录不可处理。

## 下一步

- `dry-run` 后确认是否执行真实卸载；卸载完成后按需重新运行 `hx setup`。

## 失败处理

- `EACCES` / `permission denied`：提示用户手动删除或调整权限
- `ENOENT`：目标已不存在，可忽略并继续
- 若判断为框架问题，询问用户是否通过 `hx-issue` 提交 Bug

## 约束

- 必须先预览，再确认，再删除
- 不删除 `~/.hx/commands/`、`~/.hx/hooks/`、`~/.hx/pipelines/` 及其用户内容
