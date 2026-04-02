---
name: hx-check
description: 核心检查入口
usage: hx-check [--scope <review|qa|clean|all>]
hooks:
  - pre
  - post
---

# 核心检查入口

## 目标

- 用一个命令统一承接审查、质量门和工程卫生扫描。

## 何时使用

- 适用场景：实现完成后集中做交付前检查，或需要单独执行审查、质量门、工程卫生扫描时使用。
- 不适用场景：需要直接继续实现时，优先运行 `hx-run` 或 `hx-fix`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`--scope <review|qa|clean|all>`
- 默认值：`--scope` 缺失时为 `all`
- 依赖输入：`.hx/config.yaml`、当前 diff、`rules/golden-rules.md`、`rules/review-checklist.md`、`gates.*`

## 执行步骤

1. 解析 `--scope`，确定本次要执行的检查范围。
2. `review`：读取当前 diff 和 `rules/review-checklist.md`，先执行机验项，再执行人工审查项。
3. `qa`：只按 `.hx/config.yaml` 的 `gates.*` 执行质量门，按 `lint -> build -> type -> test` 顺序运行。
4. `clean`：扫描工程卫生问题和文档一致性问题，但不修改文件。
5. 输出分组结果，明确通过项、失败项和推荐下一步。

## 成功结果

- 输出一份按检查范围分组的检查结果。
- 明确当前代码是否可以继续进入 `hx-run`、`hx-fix` 或 `hx-mr`。

## 失败边界

- 规则文件、检查清单或 `gates` 缺失。
- 当前 diff 无法读取，或任一 gate 返回非零 exit code。

## 下一步

- 存在失败项时运行 `hx-fix` 或人工修复后重试。
- 全部通过后继续运行 `hx-run` 或 `hx-mr`。

## 约束

- 只读取当前项目的配置、代码、文档和实际 diff。
- `qa` 的通过标准只看 exit code，不看命令输出文本。
- `review` 的机验项必须优先通过工具执行。
- `clean` 只做扫描和报告，不修改任何文件。
