# @hxflow/cli 开发指南（Copilot 补充）

> 核心编码规范、测试要求、提交格式见 AGENTS.md（CLAUDE.md 为其软链）。本文件仅补充架构细节和开发工作流，避免重复。

## 架构概览

### 三层优先级

1. **系统层** `src/`（commands/contracts/hooks/pipelines/scripts/templates）→ 可被覆盖
2. **用户层** `~/.hx/`（`hx setup` 初始化）→ 覆盖系统层
3. **项目层** `.hx/`（config.yaml + rules/ + hooks/ + commands/ + pipelines/）→ 最高优先

### 契约系统

命令只读取明确引用的契约，不要预加载 `src/contracts/` 全目录。

| 契约 | 职责 |
|------|------|
| runtime-contract | 命令执行入口、默认读取 vs 按需读取 |
| command-contract | `hx-*.md` 前置元数据 + 节点顺序 |
| resolution-contract | 三层解析优先级 |
| feature-contract | `feature` 对象结构 |
| progress-contract | `progressFile` 多步骤跟踪 |
| hook-contract | pre/post Hook 规则 |
| pipeline-contract | 多命令工作流 |
| ownership-contract | 写权限边界 |

### 命令定义结构

`src/commands/hx-*.md` 固定节点顺序：frontmatter → 目标 → 何时使用 → 输入 → 执行步骤 → 成功结果 → 失败边界 → 下一步。不省略、不重排。共享规则放契约，不在命令中重复。

## 开发工作流

1. 编辑 `src/commands/hx-*.md` 或 `src/contracts/*.md`
2. 有新逻辑则补 `tests/unit/` 单元测试；涉及文件 I/O 或命令链则补 `tests/integration/`
3. `npm run hx:test` 全量验证
4. `npm run pack:dry-run` 检查发包内容
5. Conventional Commits 提交
