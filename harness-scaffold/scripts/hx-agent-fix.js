#!/usr/bin/env node
// scripts/hx-agent-fix.js
// 用法: npm run hx:fix [--log=<log-snippet>] [--file=<file-path>]
// 根据错误日志生成标准化的 Bug 修复 Prompt

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { execSync } from 'child_process'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const args = process.argv.slice(2)

const logArg = args.find(a => a.startsWith('--log='))
const fileArg = args.find(a => a.startsWith('--file='))

let logContent = ''

if (fileArg) {
  const logFile = fileArg.split('=')[1]
  const logPath = resolve(ROOT, logFile)
  if (!existsSync(logPath)) {
    console.error(`✗ 日志文件不存在: ${logFile}`)
    process.exit(1)
  }
  logContent = readFileSync(logPath, 'utf8').trim()
} else if (logArg) {
  logContent = logArg.split('=').slice(1).join('=')
} else {
  // 尝试读取最近的测试失败输出
  try {
    const testOutput = execSync('npm run hx:test 2>&1 | tail -40', {
      cwd: ROOT, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe']
    })
    logContent = testOutput
  } catch (e) {
    logContent = e.stdout || e.stderr || ''
  }
}

const divider = '═'.repeat(60)

console.log(`\n${divider}`)
console.log('  Bug 修复 Prompt 生成器')
console.log(divider)
console.log()
console.log('将以下内容复制给 Claude：')
console.log()

const prompt = `修复以下错误。

**在开始前，请先读取：**
- AGENTS.md
- docs/golden-principles.md
- 报错涉及的源文件（见下方）

**错误信息：**
\`\`\`
${logContent || '[请在此粘贴错误日志或测试失败输出]'}
\`\`\`

**修复要求：**
1. 不修改任何已有接口的签名（不改变函数参数和返回类型）
2. 不修改现有测试的期望值（测试是行为契约）
3. 修复后补充一个能复现此 Bug 的回归测试
4. 错误处理使用 AppError，不使用裸 throw new Error（GP-003）

**完成标准：**
1. 运行 \`npm run hx:gate\` — 全部通过
2. 新增的回归测试能捕获此类错误
3. 开 PR，标题格式：\`fix(<模块>): <一句话描述>\``

console.log(prompt)
console.log()
console.log(divider)
console.log()
console.log('提示：')
console.log('  --log="错误文本"    直接传入日志片段')
console.log('  --file=logs/err.txt 从文件读取日志')
console.log('  不传参数则尝试读取最近测试失败输出')
