#!/usr/bin/env node
// scripts/hx-task-done.js
// 用法: npm run hx:done <TASK-ID>
// 示例: npm run hx:done TASK-BE-03

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { globSync } from 'fs'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const taskId = process.argv[2]

if (!taskId) {
  console.error('用法: npm run hx:done <TASK-ID>')
  console.error('示例: npm run hx:done TASK-BE-03')
  process.exit(1)
}

if (!/^TASK-(FE|BE)-\d{2}$/.test(taskId)) {
  console.error(`✗ TASK ID 格式不正确: ${taskId}`)
  console.error('  正确格式: TASK-FE-01 或 TASK-BE-01')
  process.exit(1)
}

// 扫描 docs/plans/*.json
const plansDir = resolve(ROOT, 'docs/plans')
let jsonFiles = []
try {
  const { readdirSync } = await import('fs')
  jsonFiles = readdirSync(plansDir)
    .filter(f => f.endsWith('.json'))
    .map(f => resolve(plansDir, f))
} catch {
  console.error('✗ docs/plans/ 目录不存在')
  process.exit(1)
}

if (jsonFiles.length === 0) {
  console.error('✗ docs/plans/ 中没有进度文件，请先运行 npm run hx:plan')
  process.exit(1)
}

let found = false

for (const filePath of jsonFiles) {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf8'))
    const task = data.tasks?.find(t => t.id === taskId)

    if (task) {
      const prevStatus = task.status

      if (prevStatus === 'done') {
        console.log(`ℹ  ${taskId} 已经是完成状态（${task.completedAt}）`)
        found = true
        break
      }

      task.status = 'done'
      task.completedAt = new Date().toISOString()

      writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')

      const featureName = data.feature || filePath.replace(/.*\//, '').replace('-progress.json', '')
      const total = data.tasks.length
      const done = data.tasks.filter(t => t.status === 'done').length

      console.log(`✓ ${taskId} 已标记为完成`)
      console.log(`  特性: ${featureName}  进度: ${done}/${total}`)

      if (done === total) {
        console.log(`\n🎉 特性 [${featureName}] 所有任务已完成！`)
        console.log(`  记得运行 npm run hx:entropy 检查是否有规律可提炼`)
      } else {
        const next = data.tasks.find(t => t.status === 'pending')
        if (next) {
          const role = next.id.includes('FE') ? 'fe' : 'be'
          console.log(`\n下一个任务: ${next.id} — ${next.name}`)
          console.log(`  npm run hx:run ${role} ${next.id}`)
        }
      }

      found = true
      break
    }
  } catch (e) {
    console.warn(`⚠  无法解析 ${filePath}: ${e.message}`)
  }
}

if (!found) {
  console.error(`✗ 未找到任务 ${taskId}`)
  console.error('  运行 npm run hx:plan 确认计划文件存在，或检查 TASK ID 是否正确')
  process.exit(1)
}
