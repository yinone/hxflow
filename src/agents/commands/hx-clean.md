---
name: hx-clean
description: Phase 07 · 工程清理扫描
usage: hx-clean
claude: /hx-clean
codex: hx-clean
---

# Phase 07 · 工程清理扫描

参数: `$ARGUMENTS`（本命令不接受额外参数）

## 执行步骤

1. 读取 `config.paths`
2. 读取 `config.hooks.clean`
3. 扫描主源码目录（排除测试文件）：
   - `console.log / warn / error / debug / info`
   - 裸 `throw new Error(...)`
   - `: any`
   - 可疑类型断言
   - 空 `catch`
   - `TODO / FIXME / HACK / XXX`
4. 检查文档一致性：
   - `progressFile` 是否有对应需求文档
   - 已完成任务与当前代码是否明显脱节
5. 输出分类报告
