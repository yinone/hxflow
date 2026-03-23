# 全自动流水线 · 从需求到交付

参数: $ARGUMENTS（feature-name，kebab-case）

你是 Harness Engineering 自动化流水线的编排器。收到 feature-name 后，按顺序驱动 Phase 01 → 07 的完整流程。每个 TASK 使用 Agent 子进程执行以隔离上下文。在需要人工确认的节点暂停等待用户输入。

---

## 阶段 0 · 参数校验

- 如果 $ARGUMENTS 为空，提示用法 `/hx-go user-login` 并停止
- 将 feature-name 存为变量 `FEAT`，后续所有路径使用它
- 基础路径：`harness-scaffold/`

---

## 阶段 1 · Phase 01 需求文档（需人工确认）

1. 检查 `docs/design/${FEAT}.md` 是否已存在
   - **已存在**：读取并展示摘要（背景 + AC 列表），询问用户：「需求文档已存在，是否直接使用？(y) / 需要修改？(n)」
   - **不存在**：读取 `docs/design/_template.md`，创建 `docs/design/${FEAT}.md`，填入日期和 feature-name
2. 交互式引导用户填写：
   - 背景（1-3 句话）
   - 验收标准 AC（逐条，每条检查是否可量化，模糊的主动建议改写）
   - 影响的架构层级（勾选）
   - 边界约束（不做什么）
   - 依赖文档
3. 写入文件后展示完整文档，请用户确认：**「需求文档是否确认？确认后进入自动执行阶段。(y/n)」**
4. 用户确认后继续，否则回到编辑

**⏸ 检查点 1：用户确认需求文档后才继续**

---

## 阶段 2 · Phase 02 执行计划（自动）

1. 读取已确认的 `docs/design/${FEAT}.md`
2. 分析 AC 和架构层级，自动拆分任务：
   - 后端：按 Types → Repo → Service → Runtime → Test 顺序
   - 前端：按 Component → Hook → Page → Test 顺序
   - 每个 TASK 填入：输出文件路径、关联 AC、依赖的已有模块
3. 生成 `docs/plans/${FEAT}.md` 和 `docs/plans/${FEAT}-progress.json`
4. 更新 `AGENTS.md`「当前活跃特性」区块
5. 展示任务列表摘要，询问用户：**「执行计划是否确认？确认后开始自动执行所有 TASK。(y/n)」**

**⏸ 检查点 2：用户确认执行计划后才继续**

---

## 阶段 3 · Phase 03 上下文校验（自动）

1. 校验 AGENTS.md ≤ 100 行
2. 校验所有 `→` 引用的文档路径存在
3. 校验设计文档 AC 非空
4. 校验黄金原则和架构地图文件存在
5. **全部通过 → 自动继续；任一失败 → 自动修复（补链接/精简行数）后重试，最多 2 次，仍失败则暂停报告**

---

## 阶段 4 · Phase 04 逐任务执行（自动，Agent 隔离）

读取 `docs/plans/${FEAT}-progress.json`，按依赖顺序遍历所有 status 为 `pending` 的 TASK。

**对每个 TASK 执行以下循环：**

### 4.1 启动 Agent 子进程
使用 Agent 工具为每个 TASK 启动独立子进程，传入以下 Prompt：

```
你正在执行 Harness Engineering 项目中的 ${TASK_ID}。

先读取以下文件（必须全部读完再动手写代码）：
1. harness-scaffold/AGENTS.md
2. harness-scaffold/docs/golden-principles.md
3. harness-scaffold/docs/design/${FEAT}.md
4. harness-scaffold/docs/plans/${FEAT}.md

然后按照执行计划中 ${TASK_ID} 的描述，生成代码：
- 输出到：${OUTPUT_PATH}
- 满足的 AC：${AC_LIST}
- 使用已有类型/模块：${DEPS}
- 遵循黄金原则 GP-001 ~ GP-012
- 架构约束：${LAYER_RULES}
- 禁止：console.log、: any、裸 throw new Error、跨层导入

完成后检查自己的产出是否有以上违规，如有则自行修复。
```

### 4.2 验证产出
Agent 子进程完成后：
- 读取生成的文件，快速扫描是否有明显违规（console.log、any、跨层 import）
- 如果发现问题，再启动一个 Agent 子进程做修复
- 修复最多重试 2 次

### 4.3 更新进度
- 将该 TASK 在 progress.json 中标记为 `done`
- 输出单行进度：`✓ TASK-BE-01 done (1/5)`

### 4.4 继续下一个 TASK

**后端和前端任务可以并行执行**：如果后端 TASK-BE-03（Service）和前端 TASK-FE-01（Component）无依赖关系，使用并行 Agent 同时执行。

---

## 阶段 5 · Phase 05 代码审查（自动）

所有 TASK 完成后：

1. 对本次所有新增/修改的文件执行全量审查：
   - 架构合规（跨层导入）
   - 黄金原则逐条检查（GP-001 ~ GP-012）
   - AI Slop 检测（过度抽象、冗余注释、不必要的类型断言）
   - 文档同步（AC 与实现是否一致）
2. 输出分级报告（🔴 必须修复 / 🟡 建议修复 / ⚪ 观察项）
3. **如果有 🔴 项**：自动启动 Agent 子进程修复，修复后重新审查，最多 2 轮
4. **如果只剩 🟡 和 ⚪**：展示报告，询问用户：**「是否接受当前状态？(y) / 需要继续修复？(n)」**

**⏸ 检查点 3：用户确认审查结果**

---

## 阶段 6 · Phase 06 质量门控（自动）

按顺序执行（在 harness-scaffold 目录下）：

1. `npm run hx:lint`（如果 script 存在）
2. `npm run hx:type`（如果 script 存在）
3. `npm run hx:test`（如果 script 存在）
4. `npm run hx:arch`（如果 script 存在）

- 全部通过 → 继续
- 任一失败 → 自动启动 Agent 子进程修复 → 重跑门控 → 最多 3 轮
- 3 轮后仍失败 → 暂停，展示错误详情请用户介入

---

## 阶段 7 · 收尾

1. 确认所有 TASK 在 progress.json 中均为 `done`
2. 生成变更摘要：
   - 新增/修改的文件列表
   - 通过的 AC 列表
   - 门控检查结果
3. 询问用户：**「是否将所有变更提交 git？(y/n)」**
   - y → 生成 commit message（格式：`feat(${FEAT}): 完成 [AC 摘要]`），执行 git add + commit
   - n → 保持当前状态

4. 输出最终报告：

```
══════════════════════════════════════════
  ✓ Harness Pipeline 完成
══════════════════════════════════════════
  特性: ${FEAT}
  任务: X/X 完成
  文件: Y 个新增，Z 个修改
  门控: lint ✓ | type ✓ | test ✓ | arch ✓
  AC:   AC-001 ✓ | AC-002 ✓ | AC-003 ✓
══════════════════════════════════════════
```

---

## 错误处理策略

| 场景 | 处理 |
|------|------|
| Agent 子进程执行失败 | 检查文档是否完整 → 补充后重试（最多 2 次） |
| 门控失败 | Agent 自动修复 → 重跑门控（最多 3 轮） |
| 重试耗尽 | 暂停流水线，展示错误详情，等待用户指令 |
| 用户在检查点说 n | 回到对应阶段重新编辑 |

## 并行策略

- 同一架构层级内的多个独立文件：可并行
- 后端 TASK-BE-01~03（有依赖）：串行
- 前端 TASK-FE-01（无后端依赖时）：与后端并行
- 后端 TASK-BE-04（Controller，依赖 Service）：等 Service 完成后执行
