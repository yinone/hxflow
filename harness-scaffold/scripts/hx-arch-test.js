#!/usr/bin/env node
// scripts/hx-arch-test.js
// 检查架构层级依赖规则，禁止跨层导入
// CI 专用，本地可用 npm run hx:arch 调用

import { readFileSync, readdirSync, statSync } from 'fs'
import { resolve, dirname, relative } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

// ── 禁止的跨层导入规则 ─────────────────────────────────────────
const FORBIDDEN_IMPORTS = [
  {
    layer: 'Types',
    from: 'src/types',
    forbids: ['src/config', 'src/repo', 'src/service', 'src/runtime', 'src/components', 'src/pages', 'src/hooks'],
    reason: 'Types 层是最底层，不允许导入任何其他层'
  },
  {
    layer: 'Config',
    from: 'src/config',
    forbids: ['src/repo', 'src/service', 'src/runtime', 'src/components', 'src/pages', 'src/hooks'],
    reason: 'Config 层只能导入 Types 层'
  },
  {
    layer: 'Repo',
    from: 'src/repo',
    forbids: ['src/service', 'src/runtime', 'src/components', 'src/pages', 'src/hooks'],
    reason: 'Repo 层不能导入 Service 层或更上层'
  },
  {
    layer: 'Service',
    from: 'src/service',
    forbids: ['src/runtime', 'src/components', 'src/pages'],
    reason: 'Service 层不能导入 Runtime 或 UI 层'
  },
  {
    layer: 'Runtime',
    from: 'src/runtime',
    forbids: ['src/components', 'src/pages'],
    reason: 'Runtime 层不能导入 UI 层'
  }
]

// ── 递归收集 .ts/.tsx 文件 ──────────────────────────────────────
function collectFiles(dir) {
  const files = []
  try {
    for (const entry of readdirSync(resolve(ROOT, dir))) {
      const fullPath = resolve(ROOT, dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
        files.push(...collectFiles(`${dir}/${entry}`))
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        if (!entry.endsWith('.test.ts') && !entry.endsWith('.test.tsx') && !entry.endsWith('.spec.ts')) {
          files.push(`${dir}/${entry}`)
        }
      }
    }
  } catch { /* dir doesn't exist, skip */ }
  return files
}

// ── 从文件内容提取导入路径 ──────────────────────────────────────
function extractImports(content) {
  const imports = []
  const patterns = [
    /from\s+['"]([^'"]+)['"]/g,
    /import\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
    /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g
  ]
  for (const pattern of patterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      imports.push(match[1])
    }
  }
  return imports
}

// ── 主检查逻辑 ─────────────────────────────────────────────────
let violations = 0
const report = []

for (const rule of FORBIDDEN_IMPORTS) {
  const files = collectFiles(rule.from)

  for (const filePath of files) {
    const fullPath = resolve(ROOT, filePath)
    let content
    try { content = readFileSync(fullPath, 'utf8') } catch { continue }

    const imports = extractImports(content)

    for (const importPath of imports) {
      // 只检查相对路径和 @ 别名路径中的层级引用
      const normalised = importPath
        .replace(/^@\//, 'src/')
        .replace(/^\.\.\/\.\.\//, '')
        .replace(/^\.\//, `${rule.from}/`)

      for (const banned of rule.forbids) {
        if (normalised.startsWith(banned) || importPath.includes(`/${banned.replace('src/', '')}/`)) {
          const relFile = relative(ROOT, fullPath)
          report.push({
            file: relFile,
            import: importPath,
            layer: rule.layer,
            banned,
            reason: rule.reason
          })
          violations++
          break
        }
      }
    }
  }
}

// ── 输出报告 ───────────────────────────────────────────────────
if (violations > 0) {
  console.error(`\n✗ 架构合规检查失败：发现 ${violations} 个违规\n`)
  for (const v of report) {
    console.error(`  [${v.layer}层违规] ${v.file}`)
    console.error(`    导入了: ${v.import}`)
    console.error(`    违规原因: ${v.reason}\n`)
  }
  console.error('请修复架构违规后重试。参考 docs/map.md 确认正确的依赖方向。')
  process.exit(1)
}

console.log(`✓ 架构合规检查通过（检查了 ${FORBIDDEN_IMPORTS.reduce((n, r) => n + collectFiles(r.from).length, 0)} 个文件）`)
