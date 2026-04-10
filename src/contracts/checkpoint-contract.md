# Checkpoint Contract

- 定义 pipeline step 执行到 checkpoint 时，通过子 agent 评审确认的机制。
- checkpoint 用于在关键节点引入 AI 评审，确保质量门控。

## 触发时机

- pipeline step 执行完毕，且该 step 包含 `checkpoint.message`。
- 触发时，hx-go 必须新开一个子 agent 执行评审。

## 评审输入

子 agent 评审时必须接收以下信息：

| 字段 | 来源 | 说明 |
|------|------|------|
| `feature` | 当前需求标识 | |
| `step.id` | pipeline step id | |
| `step.name` | pipeline step name | |
| `step.phase` | pipeline step phase | 可为空 |
| `message` | `checkpoint.message` | checkpoint 提示语，引导评审方向 |
| `summary` | 当前 step 命令结构化结果的 `summary` | 评审依据 |

## 评审要求

- 子 agent 必须基于 `summary` 和 `message`，判断当前 step 输出是否满足预期。
- 评审结论分为两类：
  - **通过**：当前 step 输出符合预期，继续执行下一个 step
  - **需修改**：当前 step 输出存在问题，需要重新执行当前 step
- 子 agent 评审时，主 agent 不得干预其独立判断。
- 同一 step 的 checkpoint 最多允许 2 轮“需修改 -> 重跑当前 step”的重试。

## 评审输出格式

子 agent 应输出：
- 评审结论（通过 / 需修改）
- 修改意见（若需修改）：具体的问题描述和改进建议

## 判定规则

| 子 agent 评审结论 | 判定 | 后续动作 |
|------------------|------|---------|
| 通过 | 确认 | 继续执行下一个 step |
| 需修改 | 修改意见 | 将修改意见注入 `context.checkpointFeedback`，重新执行当前 step |
| 连续第 3 次仍为需修改 | 失败 | 停止 pipeline，并要求人工介入或显式重试 |

## 边界

- checkpoint 评审是质量门控的一部分，不写任何耐久产物。
- 修改意见注入 `context.checkpointFeedback` 后，由当前 step 命令自行决定如何处理。
- 重新执行当前 step 并再次触发 checkpoint 时，子 agent 重新评审。
- 连续 2 轮重跑后仍未通过时，不再自动循环，直接停止当前 pipeline。
- 子 agent 评审超时或异常时，中止 pipeline 并报错。
