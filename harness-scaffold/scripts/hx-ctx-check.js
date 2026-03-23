#!/usr/bin/env node
// scripts/hx-ctx-check.js
// 校验 AGENTS.md 行数 ≤100，以及所有文档链接有效

import { readFileSync, existsSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const agentsPath = resolve(ROOT, 'AGENTS.md')

let passed = true
const errors = []
const warnings = []

// ── 检查 AGENTS.md 存在 ────────────────────────────────────────
if (!existsSync(agentsPath)) {
  console.error('✗ AGENTS.md 不存在，请先创建')
  process.exit(1)
}

const content = readFileSync(agentsPath, 'utf8')
const lines = content.split('\n').length

// ── 规则 1：行数 ≤ 100 ────────────────────────────────────────
if (lines > 100) {
  errors.push(`AGENTS.md 超过 100 行（当前 ${lines} 行），请精简后再提交`)
  passed = false
} else if (lines > 80) {
  warnings.push(`AGENTS.md 已有 ${lines} 行，接近 100 行上限，注意精简`)
}

// ── 规则 2：所有 → 引用的文档必须存在 ──────────────────────────
const refs = [...content.matchAll(/→\s+([\w/\-.]+\.(?:md|json|js|ts))/g)]

for (const [, refPath] of refs) {
  const fullPath = resolve(ROOT, refPath)
  if (!existsSync(fullPath)) {
    errors.push(`文档引用不存在: ${refPath}`)
    passed = false
  }
}

// ── 规则 3：检查 docs/golden-principles.md 存在 ─────────────────
const goldenPath = resolve(ROOT, 'docs/golden-principles.md')
if (!existsSync(goldenPath)) {
  warnings.push('docs/golden-principles.md 不存在，建议创建黄金原则文档')
}

// ── 规则 4：检查 docs/map.md 存在 ──────────────────────────────
const mapPath = resolve(ROOT, 'docs/map.md')
if (!existsSync(mapPath)) {
  warnings.push('docs/map.md 不存在，建议创建系统架构地图')
}

// ── 输出结果 ───────────────────────────────────────────────────
if (warnings.length) {
  warnings.forEach(w => console.warn(`⚠  ${w}`))
}

if (!passed) {
  errors.forEach(e => console.error(`✗ ${e}`))
  console.error(`\n上下文校验失败，请修复后重试`)
  process.exit(1)
}

console.log(`✓ AGENTS.md 校验通过（${lines} 行，${refs.length} 个文档引用）`)
