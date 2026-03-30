# 规则运行时重构：移除 Profile Runtime，改为初始化生成 Project Rules

> 状态：设计中（未实现）
> 日期：2026-03-30
> 方案类型：breaking change（不提供运行时兼容）

---

## 背景

当前框架将大量规则能力绑定在 `profile` 运行时模型上，带来以下问题：

- 概念过重：`defaultProfile`、`--profile`、三层查找、`extends`、`deepMerge` 增加理解成本
- 运行时不稳定：同一命令的行为受项目层、用户层、框架层 profile 叠加影响
- 规则质量差：框架内置 base profile 只能提供通用模板，难以反映项目真实结构
- 职责混杂：`profile.yaml` 同时承载硬变量、策略规则、模板入口，边界不清
- 框架越权：升级框架可能改变项目规则行为，而项目本身没有真正拥有自己的运行时事实

本次重构的目标不是继续简化 profile，而是把 profile 原来承担的价值前移到初始化阶段：

- 初始化阶段分析项目并生成项目规则
- 运行时只读取项目内已经生成好的事实
- 删除 profile runtime，而不是删除项目规则生成能力

---

## 目标

1. 删除 profile 作为运行时配置模型
2. 由 `hx-init` / `hx-rules update` 基于项目实际情况生成项目规则
3. 将运行时事实收敛为项目级 `config + rules + 扩展点`
4. 明确 `config.yaml` 与 `rules/*.md` 的职责边界
5. 避免旧 profile 继承/merge 复杂度以其他形式回流

---

## 非目标

- 不保留 `--profile`
- 不保留 `defaultProfile`
- 不保留 profile 继承、查找、merge
- 不做 profile runtime 兼容层
- 不把策略类内容重新塞回 `config.yaml`

---

## 核心原则

### 1. 删除的是 Profile Runtime，不是初始化期的项目分析能力

初始化阶段仍然需要分析项目技术栈、目录结构、gates、文档路径，并生成项目自己的规则事实；删除的是运行时对 profile 的解析、继承和切换。

### 2. `config.yaml` 只放硬变量

`config.yaml` 只保存 hxflow 运行时必须精确读取的结构化变量，不放长文本规则，不放 profile 语义，不放纯策略描述。

### 3. 策略类内容统一进入 `rules`

凡是带解释性、审查性、架构约束、文档模板、执行原则的内容，一律进入 `.hx/rules/*.md`。

### 4. 扩展机制保留

`hooks`、`commands`、`pipelines` 与 profile 无关，继续保留为项目级扩展点。

### 5. 保守生成，固定骨架

规则生成采用“项目扫描 + 固定模板 + 条件片段”方式，不依赖自由文本生成。宁可少推断，也不虚构项目结构。

### 6. 更新不覆盖人工沉淀

`hx-rules update` 只更新自动生成区，不覆盖人工维护区，不重新引入复杂 merge。

---

## 新模型

### 初始化阶段

由 `hx-init` / `hx-rules update` 完成：

1. 扫描项目
2. 归纳项目事实
3. 生成 `.hx/config.yaml`
4. 生成 `.hx/rules/*.md`
5. 初始化或补全 `.hx/hooks/`、`.hx/commands/`、`.hx/pipelines/`

### 运行时阶段

所有 `hx-*` 命令只读取项目内已经生成好的事实：

- `.hx/config.yaml`
- `.hx/rules/*.md`
- `.hx/hooks/`
- `.hx/commands/`
- `.hx/pipelines/`

运行时不再有：

- profile 名称解析
- `--profile`
- `defaultProfile`
- `.hx/profiles/` / `~/.hx/profiles/` / `src/profiles/`
- 继承链和 merge 逻辑

---

## 运行时事实来源

### 结构化配置

```text
.hx/config.yaml
```

职责：运行时硬变量。

### 固定规则文件

```text
.hx/rules/golden-rules.md
.hx/rules/review-checklist.md
.hx/rules/requirement-template.md
.hx/rules/plan-template.md
```

职责：Agent 规则、审查清单、文档模板。

### 项目级扩展点

```text
.hx/hooks/
.hx/commands/
.hx/pipelines/
```

职责：保留现有扩展机制，不属于 profile 模型。

---

## 目录结构

### 框架层

```text
src/
  agents/commands/
  pipelines/
  templates/
    config.yaml
    golden-rules.md
    review-checklist.md
    requirement-template.md
    plan-template.md
```

### 项目层

```text
.hx/
  config.yaml
  rules/
    golden-rules.md
    review-checklist.md
    requirement-template.md
    plan-template.md
  hooks/
  commands/
  pipelines/
```

### 删除的目录

```text
src/profiles/
.hx/profiles/
~/.hx/profiles/
```

---

## `config.yaml` 边界

`config.yaml` 只保存 hxflow 运行时必须精确读取的变量。

建议 schema：

```yaml
schemaVersion: 2

paths:
  src: src
  requirementDoc: docs/requirement/{feature}.md
  planDoc: docs/plans/{feature}.md
  progressFile: docs/plans/{feature}-progress.json

gates:
  lint: pnpm lint
  test: pnpm vitest run
  type: pnpm tsc --noEmit

hooks:
  doc:
    pre: []
    post: []
  plan:
    pre: []
    post: []
  run:
    pre: []
    post: []
  review:
    pre: []
    post: []
  fix:
    pre: []
    post: []
  clean:
    pre: []
    post: []
  mr:
    pre: []
    post: []
```

### 进入 `config.yaml` 的字段

- `schemaVersion`
- `paths.*`
- `gates.*`
- `hooks.*`

### 不进入 `config.yaml` 的字段

- `defaultProfile`
- 任何 `profile` 名称或 label
- `extends`
- `task_prefix`
- `task_split`
- `architecture` 结构化字段
- `review_focus`
- `execution_rules`
- `qa`
- 长文本模板正文

这些内容全部迁移到 `rules`。

---

## `rules` 边界

### `golden-rules.md`

职责：

- 项目事实摘要
- 架构与目录约束
- 实现边界
- 错误处理原则
- 测试与验证要求
- 变更约束

### `review-checklist.md`

职责：

- 范围与一致性检查
- 架构与分层检查
- 错误处理与健壮性检查
- 测试与质量门检查
- 技术栈专项检查

### `requirement-template.md`

职责：需求文档骨架。

### `plan-template.md`

职责：执行计划骨架与 TASK 展示格式。

### 关于 architecture

architecture 不再作为 `config.yaml` 中的结构化字段存在，而是作为项目策略进入 `golden-rules.md`。原因如下：

- 其内容主要服务 Agent 理解项目分层与约束
- 带有较强解释性和项目语义
- 更适合通过自然语言表达目录职责和依赖方向

如未来某个命令确实需要精确消费分层路径，再单独设计狭窄的结构化字段，而不是整体回迁到 `config.yaml`。

---

## 规则文件固定骨架

### `golden-rules.md`

固定 section：

1. 项目事实
2. 实现边界
3. 架构与目录约束
4. 错误处理原则
5. 测试与验证要求
6. 变更约束

### `review-checklist.md`

固定 section：

1. 范围与一致性
2. 架构与分层检查
3. 错误处理与健壮性
4. 测试与质量门
5. 技术栈专项检查

### `requirement-template.md`

建议骨架：

1. 背景
2. 目标
3. 非目标
4. 范围
5. 验收标准
6. 约束与依赖
7. 待确认问题

### `plan-template.md`

建议骨架：

1. 输入事实
2. 实施策略
3. 任务拆分
4. 执行顺序
5. 验证方案
6. 风险与回退

TASK 段落建议固定格式：

```text
### TASK-01 任务名称

- 目标：
- 修改范围：
- 实施要点：
- 验收标准：
- 验证方式：
```

---

## 项目扫描与生成机制

### 新增模块

```text
src/scripts/lib/scan-project.js
src/scripts/lib/derive-project-facts.js
src/scripts/lib/render-rule-templates.js
src/scripts/lib/rule-context.js
```

### `scan-project.js`

职责：扫描原始信号，不生成规则。

建议扫描内容：

- 依赖文件：`package.json`、`tsconfig.json`、`go.mod`、`pubspec.yaml` 等
- 包管理器锁文件
- `package.json` scripts
- 顶层目录与主源码目录
- `docs/**/*.md`
- 主源码目录下的高频目录命名

扫描回答 5 个问题：

1. 主技术栈是什么
2. 主源码目录在哪
3. 可执行 gates 是什么
4. 文档路径模式是什么
5. 有没有明显的架构分层线索

### `derive-project-facts.js`

职责：将扫描结果归纳成统一的 `projectFacts`。

建议中间模型：

```ts
type ProjectFacts = {
  schemaVersion: 2
  stack: {
    language?: string
    runtime?: string
    frameworks: string[]
    testFrameworks: string[]
    lintTools: string[]
    buildTools: string[]
  }
  paths: {
    src: string
    requirementDoc: string
    planDoc: string
    progressFile: string
  }
  gates: {
    lint?: string
    test?: string
    type?: string
    build?: string
  }
  architecture: {
    codeRoots: string[]
    layers: Array<{
      id: string
      label: string
      path: string
      confidence: 'high' | 'medium' | 'low'
    }>
    notes: string[]
  }
  conventions: {
    packageManager?: string
    moduleStyle?: string
    testLocation?: string
  }
  docs: {
    hasDocsDir: boolean
    requirementPatternSource?: string
    planPatternSource?: string
  }
}
```

说明：

- `architecture` 仅用于生成 rules，不直接写入 config
- `confidence` 只存在于生成阶段
- 生成器必须允许“不确定”，不能为追求完整度虚构分层

### `render-rule-templates.js`

职责：基于 `projectFacts` 渲染：

- `config.yaml`
- `golden-rules.md`
- `review-checklist.md`
- `requirement-template.md`
- `plan-template.md`

渲染方式采用“固定模板 + 插槽替换”，不依赖自由文本生成。

---

## `hx-init`

`hx-init` 由“初始化 profile”改为“初始化项目规则事实”。

新行为：

1. 扫描项目
2. 归纳 `projectFacts`
3. 生成 `.hx/config.yaml`
4. 生成 `.hx/rules/*.md`
5. 初始化或补全 `.hx/hooks/`、`.hx/commands/`、`.hx/pipelines/`
6. 更新 `CLAUDE.md` / `AGENTS.md`

### 重要约束

- 不再接受 `--profile`
- 不再生成 `.hx/profiles/*`
- 生成的是项目规则，而不是 profile

---

## `hx-rules`

新增规则维护入口：

```text
hx-rules
hx-rules update
```

### `hx-rules`

显示当前项目规则摘要：

- config 概要
- 固定 rules 文件是否存在
- hooks / commands / pipelines 概况

### `hx-rules update`

行为：

1. 重新扫描项目
2. 重新归纳 `projectFacts`
3. 更新 rules 自动生成区
4. 补全 `config.yaml` 的缺失字段
5. 输出差异摘要

默认不做：

- 全文件重写
- config 强制覆盖
- 语义 merge

---

## 自动区与人工区

为避免更新覆盖项目沉淀，rules 文件采用双区块模型：

```md
<!-- hx:auto:start -->
...自动生成内容...
<!-- hx:auto:end -->

<!-- hx:manual:start -->
...人工维护内容...
<!-- hx:manual:end -->
```

更新原则：

- `hx-rules update` 只更新 `hx:auto` 区
- `hx:manual` 区永久保留
- 不做复杂 markdown merge

这样可以保证：

- 自动区可重算
- 手工区可长期沉淀
- 行为简单且可预测

---

## 命令读取矩阵

### `hx-doc`

- 读 `config.paths`
- 读 `config.hooks.doc`
- 读 `rules/golden-rules.md`
- 读 `rules/requirement-template.md`

### `hx-plan`

- 读 `config.paths`
- 读 `config.hooks.plan`
- 读 `rules/golden-rules.md`
- 读 `rules/plan-template.md`

### `hx-run`

- 读 `config.paths`
- 读 `config.gates`
- 读 `config.hooks.run`
- 读 `rules/golden-rules.md`

### `hx-review`

- 读 `config.hooks.review`
- 读 `rules/golden-rules.md`
- 读 `rules/review-checklist.md`

### `hx-qa`

- 只读 `config.gates`

### `hx-fix`

- 读 `config.gates`
- 读 `config.hooks.fix`
- 读 `rules/golden-rules.md`

### `hx-clean`

- 读 `config.paths`
- 读 `config.hooks.clean`
- 可选读 `rules/golden-rules.md`

### `hx-go`

- 自身不读规则正文
- 只负责调度各子命令

### `hx-ctx`

- 校验 `config.yaml`
- 校验固定 `rules/*.md`
- 校验 gates 至少存在一个

---

## `progress.json`

建议同步收敛 schema，去掉 `profile` 字段。

建议格式：

```json
{
  "schemaVersion": 2,
  "feature": "user-login",
  "generatedAt": "2026-03-30",
  "updatedAt": "2026-03-30",
  "lastRun": null,
  "tasks": [
    {
      "id": "TASK-01",
      "name": "补充登录接口",
      "status": "pending",
      "completedAt": null
    }
  ]
}
```

原则：

- `progress.json` 只描述执行状态
- 不再记录 profile 来源
- 如需记录规则代际，使用 `schemaVersion`

---

## 实现影响范围

### 新增

- `src/scripts/lib/scan-project.js`
- `src/scripts/lib/derive-project-facts.js`
- `src/scripts/lib/render-rule-templates.js`
- `src/scripts/lib/rule-context.js`
- `src/agents/commands/hx-rules.md`
- `src/templates/*`

### 重写

- `src/agents/commands/hx-init.md`
- `src/agents/commands/hx-doc.md`
- `src/agents/commands/hx-plan.md`
- `src/agents/commands/hx-run.md`
- `src/agents/commands/hx-review.md`
- `src/agents/commands/hx-qa.md`

### 后续迁移

- `src/agents/commands/hx-go.md`
- `src/agents/commands/hx-ctx.md`
- `src/agents/commands/hx-fix.md`
- `src/agents/commands/hx-clean.md`
- `src/scripts/hx-doctor.js`
- `src/scripts/hx-upgrade.js`
- `src/scripts/lib/install-utils.js`

### 删除

- `src/profiles/`
- profile 查找、继承、merge 相关逻辑
- `buildProfileSearchRoots()`
- `loadProfile()`
- `loadProfileWithInheritance()`
- `findProfileRoot()`
- 运行时 `defaultProfile`

---

## 实施顺序

建议按阶段推进：

### Phase 1：基础设施

1. 新增 `templates/`
2. 新增 `scan-project`
3. 新增 `derive-project-facts`
4. 新增 `render-rule-templates`
5. 新增 `rule-context`

### Phase 2：生成链路

1. 重写 `hx-init`
2. 新增 `hx-rules`

### Phase 3：主链命令切换

1. `hx-doc`
2. `hx-plan`
3. `hx-run`
4. `hx-review`
5. `hx-qa`

### Phase 4：辅助命令切换

1. `hx-go`
2. `hx-ctx`
3. `hx-fix`
4. `hx-clean`
5. `hx-doctor`
6. `hx-upgrade`

### Phase 5：删除旧 runtime

删除全部 profile runtime 逻辑与文档叙述。

---

## 测试要求

至少补以下测试：

### 生成链路

- `scan-project` 能识别 TS/JS/Go 等基本技术栈
- `scan-project` 能识别 scripts 和主源码目录
- `derive-project-facts` 能稳定归纳 facts
- `render-rule-templates` 能生成固定 4 个规则文件

### 初始化与更新

- `hx-init` 能生成 `.hx/config.yaml`
- `hx-init` 能生成 `.hx/rules/*.md`
- `hx-rules update` 只更新 auto 区
- `hx-rules update` 不覆盖 manual 区
- `config.yaml` 仅补全缺失字段

### 运行时契约

- 所有 `hx-*` usage 不再出现 `--profile`
- `hx-go` 不再透传 profile
- `hx-ctx` 检查新规则文件而非 profile
- `progress.json` 使用新 schema

### 文档一致性

- guide 中不再出现 `defaultProfile`
- guide 中不再出现 `--profile`
- guide 中不再描述 `src/profiles/*`

---

## 风险与控制

### 风险 1：生成器质量不足

控制：

- 只做保守识别
- 固定骨架 + 条件片段
- 不做自由生成

### 风险 2：更新覆盖人工规则

控制：

- auto/manual 双区块
- 只更新 auto 区
- config 默认不覆盖

### 风险 3：`config.yaml` 再次膨胀为 profile 替身

控制：

- config 只允许硬变量
- 任何策略性字段都进入 rules
- 不把 architecture/review/qa 重新结构化回 config

---

## 结论

本次重构的正确落点是：

- 删除 profile runtime
- 保留项目分析与规则生成能力
- 将原本由 profile 承载的价值前移到 `hx-init`
- 将运行时压缩为 `config + rules + hooks/commands/pipelines`

这能显著降低运行时复杂度，同时让项目真正拥有自己的规则事实。
