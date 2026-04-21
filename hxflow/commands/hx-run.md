# 执行需求

## 执行步骤

1. 执行 `bun scripts/tools/run.ts next <feature>`，读取当前批次任务。
2. 实现当前批次任务，完成后通过 `bun scripts/lib/progress.ts` 回写状态。
3. 继续读取下一批任务并执行，直到所有 task 完成或遇到明确阻塞。

## 下一步

- `hx check <feature>`

## 约束

- run 阶段默认连续执行，不因单个 task 完成就停下来等待额外确认
- 只处理脚本返回的 task、依赖和状态
