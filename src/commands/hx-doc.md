---
name: hx-doc
description: Phase 01 · 获取需求并创建需求文档
usage: hx-doc [--type <feature|bugfix>]
hooks:
  - pre
  - post
---

# Phase 01 · 获取需求并创建需求文档

## 目标

- 把当前需求整理成稳定的 `requirementDoc`，并为后续主链路提供唯一的 feature 事实源。

## 何时使用

- 适用场景：开始处理一个新需求或新缺陷，或需要把外部详情沉淀为项目内文档。
- 不适用场景：只是继续已有 feature 的计划或实现时，优先用 `hx-go`、`hx-plan`、`hx-run`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`--type <feature|bugfix>`
- 默认值：`--type` 默认为 `feature`
- 依赖输入：当前会话中的需求上下文、外部来源（若已连接）、`.hx/config.yaml`、`rules/golden-rules.md`、`rules/requirement-template.md`、`rules/bugfix-requirement-template.md`、`src/contracts/feature-contract.md`

## 执行步骤

1. 判断需求来源：优先使用当前会话里的完整需求上下文；若已接入外部来源，则读取并转换成统一需求事实。
2. 读取 `src/contracts/feature-contract.md`、`rules/golden-rules.md`。
3. 根据 `--type` 选择模板：`feature` → `rules/requirement-template.md`；`bugfix` → `rules/bugfix-requirement-template.md`。
4. 按 feature contract 先复用已有 `feature`，仅在无法复用时首次生成 `feature`，并可额外生成 `displayName`。
5. 定位 `requirementDoc` 路径；缺省时使用 `docs/requirement/{feature}.md`。
6. 基于所选模板创建或续接 `requirementDoc`，固定写入 `Feature`、`Display Name`、`Source ID`、`Source Fingerprint` 四行头部元信息（含 `Type: feature` 或 `Type: bugfix`），并按模板整理事实。
7. 新开一个子 agent 评审 `requirementDoc` 的完整性、可执行性和头部格式；主 agent 必须根据子 agent 的评审结论修正后再输出。

## 成功结果

- 生成或更新 `requirementDoc`。
- 明确当前 `feature`，并在需要时附带 `displayName`。

## 失败边界

- 需求来源不足，无法整理出完整需求事实。
- `feature` 无法按 contract 复用或生成。
- 模板、规则缺失，或评审后仍不满足要求。

## 下一步

- 正常情况下继续运行 `hx-plan`；若想走整条主路径，也可以直接回到 `hx-go`。

## 约束

- 只读取当前项目规则与配置
- 缺少需求来源时停止，不能凭空补齐关键约束
- `displayName` 只用于展示，不参与路径与主链路定位
- 头部必须包含 `Type` 字段（`feature` 或 `bugfix`），用于后续命令识别文档类型
- 文档生成完成后，必须新开子 agent 评审一次，主 agent 根据评审结果修正后才能输出
