---
name: hx-doctor
description: 检测 Harness Workflow 环境健康状态
usage: hx-doctor
protected: true
---

# 检测 Harness Workflow 环境健康状态

## 目标

- 检查全局安装、项目配置和 skill 入口是否处于健康状态。

## 何时使用

- 适用场景：安装异常、skill 入口缺失、项目配置可疑时做诊断。
- 不适用场景：正常研发主流程中不需要频繁运行。

## 输入

- 命令参数：`$ARGUMENTS`
- 必选参数：无
- 可选参数：无
- 默认值：无
- 依赖输入：全局安装目录、当前项目 `.hx/config.yaml` 与规则目录、用户级 skill 安装目录

## 执行步骤

1. 检查运行环境和全局安装，如 Node 版本、`~/.hx/settings.yaml`、用户级目录骨架和 skill 入口。
2. 检查当前项目，如 `.hx/config.yaml`、`.hx/rules/*.md`、`paths.*` 目录和 `gates.*` 配置。
3. 输出诊断结果，并按正常、警告、失败分类。
4. 若存在失败项，给出对应修复入口。

## 成功结果

- 输出一份环境健康报告，明确正常项、警告项和失败项。

## 失败边界

- 检测逻辑本身崩溃。
- 关键路径不可读，或环境不满足最小前提。

## 下一步

- 存在失败项时，优先运行 `hx setup`、`hx-init`、`hx-rules update` 或 `hx-issue`。

## 失败处理

- 全局适配层缺失：提示重新安装包或运行 `hx setup`
- 项目未初始化：提示运行 `hx-init`
- `~/.hx/settings.yaml` 或项目 `.hx/config.yaml` 格式错误：提示修复 YAML 语法
- `gates` 未配置：提示补充 lint / test / build 等命令
- 规则文件缺失：提示运行 `hx-init` 或 `hx-rules update`
- 若命令本身崩溃、模块加载失败或检测逻辑抛出内部异常，询问用户是否通过 `hx-issue` 提交 Bug

## 约束

- 不自动修改任何文件，修复步骤由用户确认后再执行
