# 批量执行所有待完成任务

参数: $ARGUMENTS（feature-name，对应 docs/plans/ 中已有的执行计划）

跳过 Phase 01-02（假设需求文档和执行计划已就绪），直接从 Phase 03 开始执行所有 pending 的 TASK。

---

## 步骤

### 1. 加载计划
- 读取 `harness-scaffold/docs/plans/${FEAT}-progress.json`
- 不存在则报错：「未找到执行计划，请先运行 /hx-plan $ARGUMENTS」
- 列出所有 TASK 及其状态，过滤出 `pending` 的任务

### 2. 上下文校验
- 执行 /hx-ctx 的所有检查项
- 失败则停止

### 3. 确定执行顺序
读取执行计划，构建依赖图：
```
后端串行链: TASK-BE-01 → BE-02 → BE-03 → BE-04 → BE-05
前端串行链: TASK-FE-01 → FE-02 → FE-03 → FE-04
并行关系:   后端链 ∥ 前端链（无交叉依赖时）
```

### 4. 逐 TASK 执行
对每个 pending TASK，使用 Agent 子进程执行（与 /hx-go 阶段 4 相同的逻辑）：

- 传入完整上下文（AGENTS.md + 黄金原则 + 设计文档 + 计划）
- 指定输出路径、关联 AC、架构约束
- 完成后自检违规
- 更新 progress.json

后端和前端链在无依赖时并行启动。

### 5. 全量审查 + 门控
所有 TASK 完成后：
- 执行 /hx-review 逻辑（扫描所有变更）
- 🔴 项自动修复（最多 2 轮）
- 执行 /hx-gate 逻辑（lint + type + test + arch）
- 失败自动修复（最多 3 轮）

### 6. 输出报告

```
── 批量执行完成 ──────────────────────
特性: $ARGUMENTS
执行: X 个 TASK（Y 个后端 + Z 个前端）
耗时: ~N 个 Agent 子进程

进度:
  ✓ TASK-BE-01  Types 层
  ✓ TASK-BE-02  Repo 层
  ✓ TASK-BE-03  Service 层
  ✓ TASK-FE-01  LoginForm 组件
  ✓ TASK-FE-02  useLogin Hook
  ...

门控: lint ✓ | type ✓ | test ✓ | arch ✓
审查: 0 🔴 | 2 🟡 | 1 ⚪
```
