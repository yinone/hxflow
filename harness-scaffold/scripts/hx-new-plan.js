#!/usr/bin/env node
// scripts/hx-new-plan.js
// 用法: npm run hx:plan <feature-name> [--role fe|be|both]
// 创建执行计划（TASK-XX 结构，JSON + Markdown 双格式）

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)
const featureName = args.find(a => !a.startsWith('--'))
const roleArg = args.find(a => a.startsWith('--role='))
const role = roleArg ? roleArg.split('=')[1] : 'both'

if (!featureName) {
  console.error('用法: npm run hx:plan <feature-name> [--role=fe|be|both]')
  console.error('示例: npm run hx:plan user-login --role=be')
  process.exit(1)
}

const plansDir = resolve(ROOT, 'docs/plans')
const mdPath = resolve(plansDir, `${featureName}.md`)
const jsonPath = resolve(plansDir, `${featureName}-progress.json`)

if (existsSync(mdPath)) {
  console.error(`✗ 执行计划已存在: docs/plans/${featureName}.md`)
  process.exit(1)
}

mkdirSync(plansDir, { recursive: true })

const today = new Date().toISOString().split('T')[0]

// ── 生成 Markdown 执行计划 ─────────────────────────────────────
const feTasks = role === 'fe' || role === 'both' ? `
### 前端任务

\`\`\`
TASK-FE-01: [组件名] 组件
  输出: src/components/[domain]/[ComponentName].tsx
  Props: { /* 在 docs/design/${featureName}.md 中定义 */ }
  AC: 满足 AC-001

TASK-FE-02: use[FeatureName] Hook
  输出: src/hooks/use[FeatureName].ts
  职责: 调用 API，管理 loading/error 状态

TASK-FE-03: [PageName] 页面集成
  输出: src/pages/[PageName].tsx
  职责: 组合组件 + Hook，处理路由跳转

TASK-FE-04: 单元测试
  输出: src/components/[domain]/[ComponentName].test.tsx
\`\`\`
` : ''

const beTasks = role === 'be' || role === 'both' ? `
### 后端任务

\`\`\`
TASK-BE-01: Types 层
  输出: src/types/[feature].ts
  内容: 请求体、响应体、错误类型定义

TASK-BE-02: Repo 层
  输出: src/repo/[entity]Repo.ts
  方法: 仅数据查询，不含业务逻辑

TASK-BE-03: Service 层
  输出: src/service/[feature]Service.ts
  方法: 核心业务逻辑，引用 Repo 层

TASK-BE-04: Runtime/Controller 层
  输出: src/runtime/[feature]Controller.ts
  职责: 参数校验、调用 Service、格式化响应

TASK-BE-05: 单元测试
  输出: src/service/[feature]Service.test.ts
\`\`\`
` : ''

const mdContent = `# 执行计划：${featureName}

> 创建于 ${today}｜关联设计文档: [docs/design/${featureName}.md](../design/${featureName}.md)

## 执行规则

- 每个 TASK 独立开 Agent 会话执行，不在同一会话中连续执行多个 TASK
- 每个 TASK 完成后运行 \`npm run hx:gate\`，通过后开 PR
- PR 合并后运行 \`npm run hx:done TASK-XX-NN\` 更新进度
${feTasks}${beTasks}
## 进度追踪

使用 \`${featureName}-progress.json\` 追踪各 TASK 状态。
运行 \`npm run hx:done TASK-BE-01\` 标记完成。
`

writeFileSync(mdPath, mdContent, 'utf8')

// ── 生成 JSON 进度追踪文件 ─────────────────────────────────────
const feBeTasks = []
if (role === 'fe' || role === 'both') {
  feBeTasks.push(
    { id: 'TASK-FE-01', name: '组件', status: 'pending', output: `src/components/...` },
    { id: 'TASK-FE-02', name: 'Hook', status: 'pending', output: `src/hooks/...` },
    { id: 'TASK-FE-03', name: '页面集成', status: 'pending', output: `src/pages/...` },
    { id: 'TASK-FE-04', name: '单元测试', status: 'pending', output: `src/components/...test.tsx` }
  )
}
if (role === 'be' || role === 'both') {
  feBeTasks.push(
    { id: 'TASK-BE-01', name: 'Types 层', status: 'pending', output: `src/types/${featureName}.ts` },
    { id: 'TASK-BE-02', name: 'Repo 层', status: 'pending', output: `src/repo/...Repo.ts` },
    { id: 'TASK-BE-03', name: 'Service 层', status: 'pending', output: `src/service/...Service.ts` },
    { id: 'TASK-BE-04', name: 'Controller 层', status: 'pending', output: `src/runtime/...Controller.ts` },
    { id: 'TASK-BE-05', name: '单元测试', status: 'pending', output: `src/service/...Service.test.ts` }
  )
}

const progressJson = {
  feature: featureName,
  createdAt: today,
  designDoc: `docs/design/${featureName}.md`,
  tasks: feBeTasks
}

writeFileSync(jsonPath, JSON.stringify(progressJson, null, 2), 'utf8')

console.log(`✓ 执行计划已创建:`)
console.log(`  docs/plans/${featureName}.md`)
console.log(`  docs/plans/${featureName}-progress.json`)
console.log(`\n下一步: 编辑计划填写具体任务，然后运行:`)
console.log(`  npm run hx:run be TASK-BE-01   # 执行第一个后端任务`)
console.log(`  npm run hx:run fe TASK-FE-01   # 执行第一个前端任务`)
