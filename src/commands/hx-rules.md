---
name: hx-rules
description: 查看或更新项目规则事实
usage: bun src/tools/rules.ts [update]
---

# 项目规则事实

## 目标

查看当前项目规则概况，或刷新规则自动区和缺失配置。

## 何时使用

- 检查 `.hx/config.yaml` 和规则文件是否齐全，或需刷新自动生成内容。
- 首次接入时优先用 `bun src/tools/init.ts`。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：`update`
- 默认值：未传 `update` 时只读查看
- 依赖输入：`.hx/config.yaml`、`.hx/rules/*.md`、`src/templates/`

## 执行步骤

1. 默认模式：读取配置和规则文件，输出 `paths.*`、`gates.*` 及目录概况。
2. `update` 模式：扫描项目信号，刷新规则 `hx:auto` 区，补齐 `.hx/config.yaml` 缺失字段。
3. 缺失文件按骨架创建；旧文件不含双区块时迁入 `hx:manual` 区。

## 成功结果

- 默认模式输出当前规则概况；`update` 模式输出刷新结果和保留情况。

## 失败边界

- 配置不可读，或模板缺失。

## 下一步

- 发现缺失时运行 `bun src/tools/rules.ts update`。

## 约束

- 默认模式只读不写
- `update` 只刷新自动区与缺失配置
- `hx:manual` 区内容永久保留
- `.hx/config.yaml` 缺失字段按 `src/templates/config.yaml` 补齐
- 规则骨架来自 `src/templates/rules/`
- 允许"不确定"，不允许虚构项目事实
