#!/usr/bin/env node
// scripts/hx-agent-run.js
// 用法: npm run hx:run <fe|be> <TASK-ID>
// 读取执行计划，生成 Agent Prompt 并输出到终端（复制后粘贴给 Claude）

import { readFileSync, readdirSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const [roleArg, taskIdArg] = process.argv.slice(2)

if (!roleArg || !taskIdArg) {
  console.error('用法: npm run hx:run <fe|be> <TASK-ID>')
  console.error('示例: npm run hx:run be TASK-BE-03')
  process.exit(1)
}

const role = roleArg.toLowerCase()
if (!['fe', 'be'].includes(role)) {
  console.error('✗ role 必须是 fe 或 be')
  process.exit(1)
}

if (!/^TASK-(FE|BE)-\d{2}$/.test(taskIdArg)) {
  console.error(`✗ TASK ID 格式不正确: ${taskIdArg}`)
  console.error('  正确格式: TASK-FE-01 或 TASK-BE-01')
  process.exit(1)
}

// ── 读取所有执行计划，找到对应 TASK ───────────────────────────
const plansDir = resolve(ROOT, 'docs/plans')
let taskData = null
let featureName = null
let planJsonPath = null

try {
  const jsonFiles = readdirSync(plansDir).filter(f => f.endsWith('-progress.json'))
  for (const f of jsonFiles) {
    const data = JSON.parse(readFileSync(resolve(plansDir, f), 'utf8'))
    const task = data.tasks?.find(t => t.id === taskIdArg)
    if (task) {
      taskData = task
      featureName = data.feature
      planJsonPath = `docs/plans/${f}`
      break
    }
  }
} catch { /* skip */ }

if (!taskData) {
  console.error(`✗ 未找到任务 ${taskIdArg}`)
  console.error('  请先运行 npm run hx:plan 创建执行计划')
  process.exit(1)
}

if (taskData.status === 'done') {
  console.log(`ℹ  ${taskIdArg} 已完成（${taskData.completedAt}）`)
  console.log('  如需重新执行，先将状态改回 pending')
  process.exit(0)
}

// ── 读取设计文档概要 ──────────────────────────────────────────
const designPath = resolve(ROOT, `docs/design/${featureName}.md`)
const planMdPath = resolve(ROOT, `docs/plans/${featureName}.md`)
const goldenPath = resolve(ROOT, 'docs/golden-principles.md')

const contextFiles = []
if (existsSync(designPath)) contextFiles.push(`docs/design/${featureName}.md`)
if (existsSync(planMdPath)) contextFiles.push(`docs/plans/${featureName}.md`)
if (existsSync(goldenPath)) contextFiles.push('docs/golden-principles.md')
contextFiles.push('AGENTS.md')

// ── 生成 Agent Prompt ─────────────────────────────────────────
const roleLabel = role === 'fe' ? '前端' : '后端'
const divider = '═'.repeat(60)

console.log(`\n${divider}`)
console.log(`  Agent Prompt — ${taskIdArg} (${roleLabel})`)
console.log(`  复制下方内容，粘贴给 Claude 执行`)
console.log(divider)
console.log()

const prompt = `按照 ${planMdPath ? `docs/plans/${featureName}.md` : `docs/plans/`} 中的 **${taskIdArg}** 执行。

在开始前，请依次读取以下文件获取上下文：
${contextFiles.map(f => `- ${f}`).join('\n')}

**任务信息：**
- 任务 ID：${taskIdArg}
- 特性：${featureName}
- 描述：${taskData.name}
- 预期输出：${taskData.output}

**执行要求：**
1. 严格按照 docs/design/${featureName}.md 中的验收标准（AC）实现
2. 类型定义使用 src/types/ 中已定义的类型，不要自行推断接口形态
3. ${role === 'be' ? '遵守架构层级规则：只导入当前层及左侧层的模块' : '组件通过 Props 暴露接口，数据获取通过 Hook，不在组件内直接调用 API'}
4. 错误处理遵循 docs/golden-principles.md 中的 GP-003
5. 日志字段遵循 GP-002

**完成标准：**
1. 运行 \`npm run hx:gate\` — lint + typecheck + test 全部通过
2. 无 console.log、无 : any 类型、无裸 throw new Error
3. 开 PR，标题格式：\`${role === 'fe' ? 'feat' : 'feat'}(${featureName}): ${taskData.name} [${taskIdArg}]\`
4. PR 合并后运行 \`npm run hx:done ${taskIdArg}\` 更新进度

如果执行过程中遇到歧义，先读取相关文档后再决定，不要自行猜测。`

console.log(prompt)
console.log()
console.log(divider)
console.log()
