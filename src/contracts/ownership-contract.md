# Ownership Contract

- 定义框架内核心事实对象的命令写权与职责边界。
- 这里回答“谁负责创建、读取、更新什么”，不重复定义对象 schema。

## Feature 写权

| 命令 | 写权 |
|------|------|
| `hx-doc` | 唯一允许首次生成 `feature` 的命令。必须先按 `src/contracts/feature-contract.md` 复用已有 `feature`，只有无法命中时才首次生成；负责写入 `Feature`、`Display Name`、`Source ID`、`Source Fingerprint`。 |
| `hx-plan` | 只允许从需求文档读取已有 `feature`；不允许生成、改写或重算 `feature`。 |
| `hx-run` | 只允许从需求文档、计划文件、`progressFile` 续接已有 `feature`；不允许生成、改写或重算 `feature`。 |
| `hx-mr` | 只允许续接已有 `feature`；自动续接失败时必须要求用户显式补充；不允许在 MR 阶段生成或重算 `feature`。 |
| `hx-go` | 只负责透传显式传入的 `<feature>`，或按 `feature-contract` 的自动续接规则恢复当前需求上下文；不拥有 `feature` 的首次生成写权。 |

## Progress 写权

| 命令 | 写权 |
|------|------|
| `hx-plan` | 唯一负责创建 `planDoc` 和 `progressFile` 骨架的命令。必须基于 `src/templates/progress.json` 和 `src/templates/progress.schema.json` 初始化固定字段；不负责写真实运行结果。 |
| `hx-run` | 唯一负责更新 `progressFile` 运行态字段的命令。进入调度前必须执行 `validateProgressFile(progressFile)`；校验失败时立即停止。负责维护 `updatedAt`、`completedAt`、`lastRun`、`tasks[].status`、`tasks[].output`、`tasks[].startedAt`、`tasks[].completedAt`、`tasks[].durationSeconds`；只允许更新固定 schema 内已存在字段的值，不允许扩写结构；恢复 `recoverable` task 时必须保留原有 `startedAt`，不得重写阶段一。 |
| 只读命令 | `hx-check`、`hx-mr` 只允许读取 `progressFile` 和相关产物，不拥有写权。 |

## 边界

- requirement 文档头部元信息只允许由 `hx-doc` 首次写入。
- `planDoc` / `progressFile` 骨架只允许由 `hx-plan` 初始化。
- 运行态执行结果只允许由 `hx-run` 回写。
- `hx-go` 负责编排，不负责篡改子阶段产物的事实源。
