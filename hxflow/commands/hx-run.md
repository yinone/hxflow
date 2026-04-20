# 执行需求

## 执行步骤

1. 执行 `bun scripts/tools/run.ts next <feature>`，读取当前批次任务。
2. 只实现当前批次或显式指定的 task，完成后通过 `bun scripts/lib/progress.ts` 回写状态。
3. 根据返回结果继续当前阶段、恢复中断任务，或结束当前阶段。

## 下一步

- `hx check <feature>`

## 约束

- 未显式指定时只处理脚本返回的当前批次任务
- 不自行扩展额外 task、依赖或状态
