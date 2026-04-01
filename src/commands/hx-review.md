---
name: hx-review
description: Phase 05 · 代码审查
usage: hx-review
hooks:
  - pre
  - post
---

# Phase 05 · 代码审查

## 目标

- 基于当前 diff 和项目规则输出一份可执行的审查结论。

## 何时使用

- 适用场景：实现完成后想单独做代码审查，或在提交前补一轮 review。
- 不适用场景：只是检查 gate 是否通过时，优先用 `hx-qa`；只是修复错误时，优先用 `hx-fix`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：无
- 默认值：无
- 依赖输入：当前 diff、`rules/golden-rules.md`、`rules/review-checklist.md`

## 执行步骤

1. 获取当前变更 diff，优先 `git diff HEAD`，无暂存时回退到 `git diff`。
2. 读取 `rules/golden-rules.md` 和 `rules/review-checklist.md`。
3. 先执行 checklist 中的机验项，如文件存在性、需求文档头部格式、`progressFile` schema、`.hx/config.yaml` 关键字段。
4. 再执行人工审查项，如范围与一致性、架构分层、错误处理、测试和技术栈专项检查。
5. 输出审查结论，并区分机验结果与人工审查结果。

## 成功结果

- 输出一份按问题级别整理的审查结论和问题列表。

## 失败边界

- 规则文件缺失。
- 当前 diff 无法读取，或机验阶段本身失败。

## 下一步

- 无阻断问题时运行 `hx-qa`；存在问题时先修复再重新审查。

## 约束

- 只依赖当前项目规则和实际 diff
- 审查结论以实际 diff 为准，不以口头描述代替
- 机验项必须优先通过工具执行，不允许全部退化为主观判断
