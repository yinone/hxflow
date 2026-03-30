# Profile 体系重构：模板 + 项目规则

> 状态：设计中（未实现）
> 日期：2026-03-30

---

## 背景与动机

当前框架的 profile 体系存在以下问题：

- **概念复杂**：三层覆盖（命令侧 + 规则侧）、`extends` 继承、`deepMerge` 合并，新用户理解成本高
- **规则质量差**：框架 base 是通用模板，与项目实际情况无关，AI 执行时使用的是无意义的默认规则
- **框架越权**：框架既管流程又管规则内容，升级框架可能影响规则行为

---

## 核心变化

**框架层从"运行时兜底"变成"初始化种子"**，规则侧三层覆盖消失，规则完全归项目所有。

### 三层体系变化

**命令侧**（保留，不变）：
```
框架层  src/agents/commands/hx-*.md
用户层  ~/.hx/commands/
项目层  .hx/commands/
```

**规则侧**（三层消失，只剩项目层）：
```
框架层  src/templates/          ← 种子模板，仅 hx-init 时读取一次
项目层  .hx/rules/              ← 唯一运行时来源，由 hx-init 生成
```

---

## 目录结构

### 框架层（`src/`）

```
src/
  agents/commands/     # 命令定义（不变）
  pipelines/           # 流水线定义（不变）
  templates/           # 种子模板（原 src/profiles/base/）
    config.yaml        # config.yaml 字段 schema + 注释示例
    golden-rules.md
    review-checklist.md
    requirement-template.md
    plan-template.md
```

### 项目层（`.hx/`）

```
.hx/
  config.yaml          # 结构化配置（路径 + 门控 + 提交规范 + 架构层级）
  rules/               # AI 执行时读取的规则文档（原 .hx/profiles/<name>/）
    golden-rules.md
    review-checklist.md
    requirement-template.md
    plan-template.md
  commands/            # 项目级命令覆盖（不变）
  pipelines/           # 项目级流水线覆盖（不变）
```

---

## `config.yaml` 字段 Schema

所有结构化配置统一到 `.hx/config.yaml`，字段明确约束：

```yaml
# ── 路径配置（必填）──
paths:
  src: src
  requirementDoc: docs/requirement/{feature}.md
  planDoc: docs/plans/{feature}.md
  progressFile: docs/plans/{feature}-progress.json

# ── 门控命令（必填）──
gates:
  lint: pnpm lint
  test: pnpm vitest run
  type: pnpm tsc --noEmit    # 可选
  build: pnpm build          # 可选

# ── 提交规范（选填，有默认值）──
commit:
  format: "<type>: <message>"
  types: [feat, fix, docs, refactor, test, chore]

# ── 架构层级（选填，hx-plan 拆分任务的依据）──
architecture:
  layers:
    - id: api
      name: API 层
      path: src/api
```

**必填字段**：`paths`、`gates`（缺失时 `hx-doctor` 报错）

**选填字段**：`commit`、`architecture`（缺失时使用默认值，不报错）

---

## 新增命令：`hx-rules`

解决 `hx-init` 是一次性的问题，支持随时迭代项目规则：

```
/hx-rules              # 查看当前规则摘要（列出 .hx/rules/ 各文件概要）
/hx-rules update       # 重新分析项目，增量更新规则
/hx-rules edit <file>  # 针对某个规则文件交互式修改
```

典型场景：
- 项目引入新技术栈 → `hx-rules update` 补充相关约定
- 代码审查发现某类问题反复出现 → `hx-rules edit review-checklist` 把它加进去
- 团队规范变了 → `hx-rules edit golden-rules`

---

## `hx-init` 职责升级

从"生成配置骨架"变成"生成完整的项目规则"：

1. 分析项目（技术栈、目录结构、gate commands）
2. 以 `src/templates/` 为结构参考
3. 用分析结果**填充** `.hx/rules/` 下每个文件（不是复制模板）
4. 将结构化字段写入 `.hx/config.yaml`

生成的内容是项目专属的，不是通用模板的复制。

---

## 消失的东西

| 内容 | 原因 |
|------|------|
| `profile` 概念和命名 | 改为 `rules`（模板）+ `config`（结构化配置） |
| `extends` 字段和继承逻辑 | 规则是项目的，不需要继承 |
| `loadProfile()` | 删除 |
| `loadProfileWithInheritance()` | 删除 |
| `deepMerge()` | 删除 |
| `findProfileRoot()` | 删除 |
| `buildProfileSearchRoots()` | 删除 |
| `~/.hx/profiles/` 用户层 | 规则不跨项目共享，用户层只剩 `commands/` |
| `config.yaml` 的 `defaultProfile` 字段 | 删除 |

**保留**：`parseSimpleYaml()`、`parseArgs()`（纯工具函数）

---

## 实现影响范围

| 文件/模块 | 变化 |
|-----------|------|
| `src/profiles/base/` | 重命名为 `src/templates/` |
| `src/scripts/lib/profile-utils.js` | 删除 profile 相关函数，只保留工具函数 |
| `src/scripts/lib/resolve-context.js` | 删除 `buildProfileSearchRoots()` |
| `src/scripts/hx-setup.js` | 停止创建 `~/.hx/profiles/` |
| `src/scripts/hx-doctor.js` | 重写健康检查逻辑，检查 `.hx/rules/` 和 `config.yaml` 字段 |
| `src/scripts/hx-upgrade.js` | 新增迁移检测和模板更新提示 |
| `src/agents/commands/hx-init.md` | 重写生成逻辑 |
| `src/agents/commands/hx-rules.md` | 新增 |
| `src/agents/commands/*.md`（所有） | 更新规则文件路径引用 |
| `tests/unit/profile-utils.test.js` | 删除继承相关测试，补充新逻辑测试 |
| `CLAUDE.md` | 更新架构说明 |

---

## 待解决问题

### 迁移（高优先级）
已有项目的 `.hx/profiles/` 如何迁移？

方案：`hx-upgrade` 检测到旧结构时，提示用户运行 `/hx-init` 重新生成，或提供半自动迁移（读取旧 `profile.yaml` 的 `gate_commands` 等字段，写入新 `config.yaml`）。

### 规则文件缺失时的错误体验（高优先级）
改完后项目层是唯一来源，缺失直接报错。需要错误信息明确引导：

```
.hx/rules/golden-rules.md 不存在。
请运行 /hx-init 初始化项目规则，或 /hx-rules update 补充缺失文件。
```

### 模板版本演进（低优先级）
框架升级后 `src/templates/` 改进了，已有项目的 `.hx/rules/` 不会自动更新。`hx-upgrade` 提示用户对比差异即可，不强制更新。

### 测试补充（中优先级）
删除 profile 继承测试后，需要补充：
- `hx-init` 生成内容的正确性测试
- `config.yaml` 字段校验逻辑的测试
- 规则文件缺失时的报错行为测试
