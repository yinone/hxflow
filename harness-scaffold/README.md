# Harness Engineering 工程脚手架

基于 OpenAI Harness Engineering 实践的团队开发规范脚手架。
克隆即用，包含完整文件夹结构、短命令体系、Git Hooks 和文档模板。

---

## 快速开始

```bash
# 1. 克隆后初始化（安装依赖 + Git Hooks）
chmod +x setup.sh && ./setup.sh

# 2. 开始第一个需求
npm run hx:doc user-login          # 创建需求文档
npm run hx:plan user-login --role=be  # 创建执行计划
npm run hx:run be TASK-BE-01       # 生成 Agent Prompt
```

---

## 目录结构

```
.
├── AGENTS.md                  ← Agent 上下文入口（≤100行）
├── setup.sh                   ← 一次性初始化脚本
├── package.json               ← 所有 hx: 命令定义
│
├── .husky/
│   ├── commit-msg             ← 强制 commit 消息格式
│   ├── pre-commit             ← lint-staged + console.log 检测
│   └── pre-push               ← typecheck + test + arch 完整门控
│
├── scripts/                   ← hx: 命令实现
│   ├── hx-ctx-check.js        ← hx:ctx  — 上下文校验
│   ├── hx-new-doc.js          ← hx:doc  — 创建需求文档
│   ├── hx-new-plan.js         ← hx:plan — 创建执行计划
│   ├── hx-agent-run.js        ← hx:run  — 生成 Agent Prompt
│   ├── hx-agent-fix.js        ← hx:fix  — 生成修复 Prompt
│   ├── hx-task-done.js        ← hx:done — 标记任务完成
│   ├── hx-arch-test.js        ← hx:arch — 架构合规测试
│   ├── hx-entropy-scan.js     ← hx:entropy — AI Slop 扫描
│   ├── hx-doc-freshness.js    ← hx:clean   — 文档新鲜度检查
│   └── hx-review-checklist.js ← hx:review  — 打印 Review 清单
│
├── docs/
│   ├── map.md                 ← 系统架构地图（必须维护）
│   ├── golden-principles.md   ← 黄金原则库（GP-001 ~ ）
│   ├── quality-grades.md      ← 模块质量评级（双周更新）
│   ├── design/                ← 特性设计文档（每特性一个文件）
│   ├── plans/                 ← 执行计划（TASK-XX 结构）
│   └── api/                   ← API 接口文档（自动生成）
│
└── src/
    ├── types/                 ← Types 层 — 接口和类型定义
    ├── config/                ← Config 层 — 环境变量和常量
    ├── repo/                  ← Repo 层 — 数据访问
    ├── service/               ← Service 层 — 业务逻辑
    ├── runtime/               ← Runtime 层 — HTTP 路由和控制器
    ├── components/
    │   └── ui/                ← 基础 UI 组件库
    ├── hooks/                 ← 自定义 Hook
    └── pages/                 ← 页面组件
```

---

## 命令速查

### 文档工具

| 命令 | 说明 |
|------|------|
| `npm run hx:doc <name>` | 从模板创建需求文档 `docs/design/<name>.md` |
| `npm run hx:plan <name> [--role=fe\|be\|both]` | 创建执行计划 + JSON 进度文件 |
| `npm run hx:ctx` | 校验 AGENTS.md ≤100行，所有链接有效 |

### Agent 工作流

| 命令 | 说明 |
|------|------|
| `npm run hx:run be TASK-BE-01` | 生成后端任务的 Agent Prompt，复制粘贴给 Claude |
| `npm run hx:run fe TASK-FE-01` | 生成前端任务的 Agent Prompt |
| `npm run hx:fix` | 读取最近测试失败，生成 Bug 修复 Prompt |
| `npm run hx:fix --log="错误文本"` | 指定错误内容生成修复 Prompt |
| `npm run hx:done TASK-BE-01` | 标记任务完成，更新进度 JSON，提示下一个任务 |

### 代码质量

| 命令 | 说明 |
|------|------|
| `npm run hx:lint` | ESLint，零容忍（warning 也视为错误） |
| `npm run hx:lint:fix` | ESLint 自动修复 |
| `npm run hx:type` | TypeScript 类型检查 |
| `npm run hx:test` | 全量测试，详细输出 |
| `npm run hx:test:w` | 测试 watch 模式 |
| `npm run hx:test:cov` | 测试 + 覆盖率报告 |
| `npm run hx:gate` | **本地门控**：lint + type + test（提交/推送前运行） |
| `npm run hx:check` | 完整检查：ctx + gate（执行前运行） |

### Review 与合规

| 命令 | 说明 |
|------|------|
| `npm run hx:review` | 打印完整 Review 清单（全员） |
| `npm run hx:review --role=fe` | 打印前端 Review 清单 |
| `npm run hx:review --role=be` | 打印后端 Review 清单 |
| `npm run hx:arch` | 架构层级合规测试（CI 专用，本地也可运行） |

### 熵管理（双周运行）

| 命令 | 说明 |
|------|------|
| `npm run hx:entropy` | 扫描 AI Slop 模式，输出需处理的问题列表 |
| `npm run hx:clean` | 检查文档与代码的新鲜度，列出可能过期的文档 |

### CI

| 命令 | 说明 |
|------|------|
| `npm run ci` | 完整 CI 流水线：lint + type + test + arch + ctx |

---

## 典型工作流

### 开始一个新需求

```bash
# Step 1：创建需求文档（填写 AC、影响层级、边界约束）
npm run hx:doc user-login

# Step 2：创建执行计划（拆分 TASK-XX 子任务）
npm run hx:plan user-login --role=both

# Step 3：校验上下文完整性
npm run hx:check

# Step 4：生成 Agent Prompt，复制给 Claude 执行
npm run hx:run be TASK-BE-01

# Step 5：Agent 开 PR 后，运行 Review 清单
npm run hx:review --role=be

# Step 6：PR 合并后标记完成
npm run hx:done TASK-BE-01
# → 自动提示下一个任务
```

### 修复 Bug

```bash
# 方式 1：让脚本读取最近测试失败
npm run hx:fix

# 方式 2：直接传入错误日志
npm run hx:fix --log="TypeError: Cannot read property 'email' of undefined"

# 方式 3：从日志文件读取
npm run hx:fix --file=logs/error.txt
```

### 双周清理

```bash
npm run hx:entropy   # 发现重复模式 → 更新 Lint 规则
npm run hx:clean     # 发现文档漂移 → 让 Agent 同步文档
```

---

## Git Hooks 说明

| Hook | 触发时机 | 检查内容 |
|------|----------|----------|
| `commit-msg` | `git commit` | commit 消息格式，TASK-ID 格式 |
| `pre-commit` | `git commit` | lint-staged，AGENTS.md 行数，console.log |
| `pre-push` | `git push` | typecheck，unit tests，arch 合规 |

**禁止直接 push 到 main/master/production**，必须通过 PR 流程。

---

## 架构层级规则

```
Types → Config → Repo → Service → Runtime → UI
```

每层只能导入其左侧的层。违规由 `hx:arch` 检测，CI 自动阻断。

详见 `docs/map.md`。

---

## 新成员 Onboarding

```bash
# 1. 克隆并初始化
git clone <repo-url> && cd <project>
chmod +x setup.sh && ./setup.sh

# 2. 必读文档
cat AGENTS.md
cat docs/golden-principles.md
cat docs/map.md

# 3. 验证本地环境
npm run hx:check
```

---

## 常见问题

**Q: `hx:gate` 失败了怎么办？**
按顺序检查：① `hx:lint:fix` 自动修复格式问题 → ② `hx:type` 查看类型错误 → ③ `hx:test:w` 调试测试

**Q: Agent 执行失败怎么办？**
先修复环境，再重开会话。检查：文档是否完整 → 类型定义是否准确 → AGENTS.md 链接是否有效 (`hx:ctx`)

**Q: 想跳过 Hook 怎么办？**
`git commit --no-verify`（仅限紧急情况，需在 PR 中说明原因）

**Q: AGENTS.md 超过 100 行怎么办？**
把详细规则移到 `docs/` 下对应文档，AGENTS.md 只留指针（`→ docs/xxx.md`）
