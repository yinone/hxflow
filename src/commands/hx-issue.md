---
name: hx-issue
description: 向框架仓库提交 Bug Issue
usage: hx-issue [--title <title>] [--body <text>] [--no-ai]
protected: true
---

# 向框架仓库提交 Bug Issue

## 目标

- 把框架自身问题整理成结构化 issue 并提交到目标仓库。

## 何时使用

- 适用场景：判断为框架缺陷，需要向框架仓库提交可复现问题。
- 不适用场景：只是当前业务仓库代码问题时，不要滥用 `hx-issue`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`--title <title>`、`--body <text>`、`--no-ai`
- 默认值：未提供 `--title` 或 `--body` 时，交互式补充收集；未传 `--no-ai` 时默认附加 `ai-fix` label
- 依赖输入：Bug 描述、复现步骤、相关文件或错误信息、`$GITLAB_TOKEN`

## 执行步骤

1. 解析 `--title <title>`、`--body <text>`、`--no-ai`。
2. 若参数不足，补充收集 Bug 描述、复现步骤和相关文件、命令或错误信息。
3. 生成结构化 issue 内容，标题格式为 `bug: {简洁描述}`。
4. 调用 GitLab API 创建 issue，目标仓库为 `frontend/qybot/qiyuan-harness-guide`，默认附加 `ai-fix` label。
5. 输出 issue 编号和链接。

## 成功结果

- 输出 issue 标题、编号、链接和 label 信息。

## 失败边界

- 参数不足，无法形成可提交的 issue。
- `$GITLAB_TOKEN` 缺失，或 GitLab API 创建失败。

## 下一步

- 创建成功后保留 issue 链接跟踪；失败时补齐参数或环境变量后重试。

## 失败处理

- `$GITLAB_TOKEN` 缺失：提示用户先配置环境变量
- API 创建失败：输出错误信息，不自动重试

## 约束

- 不修改 issue 之外的任何仓库内容
- 不自动重试失败请求
