#!/usr/bin/env node
// scripts/hx-new-doc.js
// 用法: npm run hx:doc <feature-name>
// 从模板创建新需求文档

import { writeFileSync, existsSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const featureName = process.argv[2]

if (!featureName) {
  console.error('用法: npm run hx:doc <feature-name>')
  console.error('示例: npm run hx:doc user-login')
  process.exit(1)
}

// kebab-case 校验
if (!/^[a-z0-9-]+$/.test(featureName)) {
  console.error('✗ feature-name 必须为 kebab-case（小写字母、数字、连字符）')
  process.exit(1)
}

const designDir = resolve(ROOT, 'docs/design')
const outputPath = resolve(designDir, `${featureName}.md`)

if (existsSync(outputPath)) {
  console.error(`✗ 文档已存在: docs/design/${featureName}.md`)
  console.error('  如需重新创建，请先删除现有文件')
  process.exit(1)
}

mkdirSync(designDir, { recursive: true })

const today = new Date().toISOString().split('T')[0]

const template = `# 需求：${featureName}

> 创建于 ${today}｜状态：草稿

## 背景

<!-- 说明这个需求的来源和动机，1-3 句话 -->

## 验收标准（AC）

<!-- 每条 AC 必须可以被自动化测试验证，使用具体的 HTTP 方法、字段名、状态码 -->

- AC-001:
- AC-002:
- AC-003:

## 影响的架构层级

<!-- 勾选本次变更涉及的层级 -->

- [ ] Types    — src/types/
- [ ] Config   — src/config/
- [ ] Repo     — src/repo/
- [ ] Service  — src/service/
- [ ] Runtime  — src/runtime/
- [ ] UI       — src/components/ src/pages/ src/hooks/

## 边界约束（不做什么）

<!-- 明确排除项，防止范围蔓延 -->

- 本期不做：
- 本期不做：

## 依赖文档

<!-- 列出本需求依赖的其他设计文档或 Schema 定义 -->

- （无）

## 设计决策

<!-- 记录关键技术选择和原因，供后续参考 -->

| 决策 | 选项 | 原因 |
|------|------|------|
|      |      |      |

## 参考资料

<!-- 外部文档、RFC、相关 PR 等 -->
`

writeFileSync(outputPath, template, 'utf8')
console.log(`✓ 需求文档已创建: docs/design/${featureName}.md`)
console.log(`\n下一步: npm run hx:plan ${featureName}`)
