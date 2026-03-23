# AGENTS.md — 代理上下文目录
# 保持在 100 行以内。这是 Agent 每次会话启动时读取的索引文件。
# 详细规则在下方链接的文档中，不要内联到这里。

## 架构与依赖规则

依赖方向（单向，不可逆）：
Types → Config → Repo → Service → Runtime → UI

- 每一层只能导入其左侧的层
- 禁止跨层导入，违反由 CI 自动阻断
- Auth / Telemetry / Feature Flags 通过 Providers 接口注入

→ 详细层级定义：docs/map.md

## 黄金原则（必读）

→ docs/golden-principles.md

执行任何任务前必须读取黄金原则，违反原则的代码不允许合并。

## 当前活跃特性

（无）— 开始新特性时在此处添加：
→ docs/plans/[feature-name].md（状态：进行中）

## 核心文档索引

→ docs/map.md               系统架构全图
→ docs/golden-principles.md 团队黄金原则（Lint 规则来源）
→ docs/quality-grades.md    模块质量评级（双周更新）
→ docs/design/              特性设计文档（每特性一个文件）
→ docs/plans/               执行计划（TASK-XX 结构）
→ docs/api/                 API 接口文档（由 api-docs skill 生成）

## 执行规则

1. 所有代码必须通过 npm run hx:gate（lint + typecheck + test）
2. Service 层函数必须有对应单元测试，无测试的 PR 不允许合并
3. 禁止在 Service 层直接导入 Runtime / UI 层模块
4. 所有错误使用 AppError 类，不允许 throw new Error('raw string')
5. 禁止 console.log 进入 src/，使用结构化 logger
6. 完成任务后更新 docs/plans/ 中对应 TASK 的状态为 done
