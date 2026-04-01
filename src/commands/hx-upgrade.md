---
name: hx-upgrade
description: 升级 Harness Workflow 框架
usage: hx-upgrade [--dry-run]
protected: true
---

# 升级 Harness Workflow 框架

## 目标

- 升级框架本体，并同步安装产物和当前项目中的相关标记块。

## 何时使用

- 适用场景：需要把当前 HXFlow 升级到较新版本，或同步安装产物。
- 不适用场景：只是排查环境问题时，优先用 `hx-doctor`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`--dry-run`
- 默认值：未传 `--dry-run` 时执行真实升级
- 依赖输入：当前框架安装目录、`~/.hx/settings.yaml`、项目 `.hx/config.yaml`、`CLAUDE.md` / `AGENTS.md` 标记块

## 执行步骤

1. 更新系统层：若框架目录是 git 仓库则执行 `git pull`，否则走包管理器升级；`--dry-run` 时只输出计划。
2. 重跑安装逻辑，补齐 `~/.hx/` 目录骨架、`~/.claude/skills/`、`~/.agents/skills/`，并在项目目录中同步 `CLAUDE.md` / `AGENTS.md` 标记块。
3. 输出升级结果或 dry-run 计划。

## 成功结果

- 输出系统层升级结果、安装产物同步结果和项目级同步情况。

## 失败边界

- 升级命令失败。
- 配置不可解析，或安装产物无法更新。

## 下一步

- 升级完成后运行 `hx-doctor`；`dry-run` 时确认后再执行真实升级。

## 失败处理

- `git pull` 认证失败：提示检查 SSH key 或 HTTPS 凭证
- `git pull` 冲突或本地脏改动：提示先处理框架目录改动
- `npm install` 网络或权限错误：提示检查网络、registry 或 npm 权限
- `~/.hx/settings.yaml` 或项目 `.hx/config.yaml` 解析失败：提示修复 YAML 格式
- `CLAUDE.md` / `AGENTS.md` 缺少标记块：提示先运行 `hx-init`
- 若判断为框架问题，说明依据，并询问用户是否通过 `hx-issue` 提交 Bug

## 约束

- 不依赖 `hx upgrade` CLI 脚本
- 先判断用户环境问题，再判断框架问题
- 不自动修改任何文件，诊断和修复建议仅供用户参考
- 传入 `--dry-run` 时，区分计划输出与真实失败
