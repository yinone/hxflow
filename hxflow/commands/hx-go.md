# 全自动流水线 · 从需求到交付

## 执行步骤

1. 执行 `bun scripts/tools/go.ts next <feature>` 或 `bun scripts/tools/go.ts state <feature>`，读取流水线下一步、完整状态和 `preHooks`。
2. 先读取 `preHooks`，再按返回的 `toolScript` 路由到对应脚本。
3. 遇到 `checkpoint.message` 时新开一个子 agent 评审，并按结论继续或重跑当前 step。
4. 重复直到流水线完成、被阻塞或显式停止。

## 约束

- 自动恢复不得跳过最早未完成 step
- 只按脚本返回的下一步推进
- `--from <step>` 只用于从该步重启
