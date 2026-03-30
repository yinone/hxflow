import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { resolve } from 'path'

import { scanProject } from '../../src/scripts/lib/scan-project.js'
import { deriveProjectFacts } from '../../src/scripts/lib/derive-project-facts.js'
import {
  renderRuleTemplates,
  updateManagedMarkdown
} from '../../src/scripts/lib/render-rule-templates.js'

const tempDirs = []

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

function makeTempDir(prefix) {
  const dir = mkdtempSync(resolve(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

function makeProject(structure) {
  const root = makeTempDir('hx-test-')
  for (const [relPath, content] of Object.entries(structure)) {
    const absPath = resolve(root, relPath)
    mkdirSync(resolve(absPath, '..'), { recursive: true })
    writeFileSync(absPath, typeof content === 'string' ? content : JSON.stringify(content), 'utf8')
  }
  return root
}

// ─── scanProject ─────────────────────────────────────────────────────────────

describe('scanProject', () => {
  it('识别 package scripts、源码目录和 markdown 文档', () => {
    const root = makeProject({
      'src/services/auth.ts': '',
      'docs/requirement/login.md': '# login\n',
      'package.json': {
        scripts: { lint: 'eslint .', test: 'vitest run', build: 'vite build' },
        dependencies: { react: '^18.0.0' },
        devDependencies: { vitest: '^2.0.0', eslint: '^9.0.0' }
      }
    })

    const scan = scanProject(root)
    expect(scan.sourceRoot).toBe('src')
    expect(scan.packageScripts).toMatchObject({ lint: 'eslint .', test: 'vitest run', build: 'vite build' })
    expect(scan.markdownFiles).toContain('docs/requirement/login.md')
  })

  it('无 src 目录时 sourceRoot 回退到 "src"', () => {
    const root = makeProject({ 'package.json': { name: 'test' } })
    const scan = scanProject(root)
    expect(scan.sourceRoot).toBe('src')
  })

  it('优先识别 app/ 目录', () => {
    const root = makeProject({
      'app/index.ts': '',
      'package.json': { name: 'test' }
    })
    const scan = scanProject(root)
    expect(scan.sourceRoot).toBe('app')
  })

  it('识别 pnpm lockfile', () => {
    const root = makeProject({
      'pnpm-lock.yaml': '',
      'package.json': { name: 'test' }
    })
    const scan = scanProject(root)
    expect(scan.lockfiles).toContain('pnpm-lock.yaml')
  })

  it('识别 yarn lockfile', () => {
    const root = makeProject({
      'yarn.lock': '',
      'package.json': { name: 'test' }
    })
    const scan = scanProject(root)
    expect(scan.lockfiles).toContain('yarn.lock')
  })

  it('识别 package-lock.json', () => {
    const root = makeProject({
      'package-lock.json': '',
      'package.json': { name: 'test' }
    })
    const scan = scanProject(root)
    expect(scan.lockfiles).toContain('package-lock.json')
  })

  it('识别 bun lockfile', () => {
    const root = makeProject({
      'bun.lock': '',
      'package.json': { name: 'test' }
    })
    const scan = scanProject(root)
    expect(scan.lockfiles).toContain('bun.lock')
  })

  it('扫描 doc/ 目录中的 markdown', () => {
    const root = makeProject({
      'doc/guide.md': '# guide\n',
      'package.json': { name: 'test' }
    })
    const scan = scanProject(root)
    expect(scan.markdownFiles).toContain('doc/guide.md')
  })

  it('不超过 200 个 markdown 文件', () => {
    const root = makeProject({ 'package.json': { name: 'test' } })
    mkdirSync(resolve(root, 'docs'), { recursive: true })
    for (let i = 0; i < 250; i++) {
      writeFileSync(resolve(root, 'docs', `file-${i}.md`), '')
    }
    const scan = scanProject(root)
    expect(scan.markdownFiles.length).toBeLessThanOrEqual(200)
  })

  it('路径使用正斜杠且不含 projectRoot 前缀', () => {
    const root = makeProject({
      'docs/requirement/login.md': '# login\n',
      'package.json': { name: 'test' }
    })
    const scan = scanProject(root)
    for (const file of scan.markdownFiles) {
      expect(file).not.toContain(root)
      expect(file).not.toContain('\\')
    }
  })

  it('读取已有 .hx/config.yaml', () => {
    const root = makeProject({
      '.hx/config.yaml': 'schemaVersion: 2\npaths:\n  src: lib\n',
      'package.json': { name: 'test' }
    })
    const scan = scanProject(root)
    expect(scan.existingConfig.exists).toBe(true)
    expect(scan.existingConfig.rawConfig.paths.src).toBe('lib')
  })
})

// ─── deriveProjectFacts ───────────────────────────────────────────────────────

describe('deriveProjectFacts', () => {
  it('生成 schemaVersion 2 的 facts', () => {
    const root = makeProject({
      'src/api/index.ts': '',
      'tsconfig.json': '{}',
      'package.json': {
        type: 'module',
        scripts: { lint: 'eslint .', test: 'vitest run', typecheck: 'tsc --noEmit' },
        dependencies: { react: '^18.0.0', vite: '^5.0.0' },
        devDependencies: { typescript: '^5.0.0', vitest: '^2.0.0', eslint: '^9.0.0' }
      }
    })

    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.schemaVersion).toBe(2)
    expect(facts.paths.src).toBe('src')
    expect(facts.gates.lint).toBe('npm run lint')
    expect(facts.gates.test).toBe('npm run test')
    expect(facts.gates.type).toBe('npm run typecheck')
    expect(facts.stack.frameworks).toContain('react')
  })

  it('tsconfig.json 存在时语言为 typescript', () => {
    const root = makeProject({
      'tsconfig.json': '{}',
      'package.json': { name: 'test' }
    })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.stack.language).toBe('typescript')
  })

  it('无 tsconfig 时语言为 javascript', () => {
    const root = makeProject({ 'package.json': { name: 'test' } })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.stack.language).toBe('javascript')
  })

  it('go.mod 存在时语言为 go', () => {
    const root = makeProject({ 'go.mod': 'module example.com/foo\n' })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.stack.language).toBe('go')
    expect(facts.stack.runtime).toBe('go')
  })

  it('pnpm lockfile → packageManager 为 pnpm', () => {
    const root = makeProject({
      'pnpm-lock.yaml': '',
      'package.json': { name: 'test' }
    })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.conventions.packageManager).toBe('pnpm')
  })

  it('yarn.lock → packageManager 为 yarn', () => {
    const root = makeProject({
      'yarn.lock': '',
      'package.json': { name: 'test' }
    })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.conventions.packageManager).toBe('yarn')
  })

  it('ESM 项目 moduleStyle 为 esm', () => {
    const root = makeProject({ 'package.json': { type: 'module', name: 'test' } })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.conventions.moduleStyle).toBe('esm')
  })

  it('无 type:module 时 moduleStyle 为 null', () => {
    const root = makeProject({ 'package.json': { name: 'test' } })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.conventions.moduleStyle).toBeNull()
  })

  it('gate 优先级：lint 取第一个匹配脚本', () => {
    const root = makeProject({
      'package.json': { scripts: { 'check:lint': 'eslint .' } }
    })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.gates.lint).toBe('npm run check:lint')
  })

  it('无匹配 gate 脚本时返回 null', () => {
    const root = makeProject({ 'package.json': { scripts: { start: 'node index.js' } } })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.gates.lint).toBeNull()
    expect(facts.gates.test).toBeNull()
  })

  it('已有 .hx/config.yaml 的 paths.src 优先于扫描结果', () => {
    const root = makeProject({
      'src/index.ts': '',
      '.hx/config.yaml': 'schemaVersion: 2\npaths:\n  src: lib\n',
      'package.json': { name: 'test' }
    })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.paths.src).toBe('lib')
  })

  it('识别 requirement 文档模式并生成 requirementDoc 路径', () => {
    const root = makeProject({
      'docs/requirement/login.md': '# login\n',
      'package.json': { name: 'test' }
    })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.paths.requirementDoc).toBe('docs/requirement/{feature}.md')
  })

  it('识别 plans 文档模式并生成 planDoc 路径', () => {
    const root = makeProject({
      'docs/plans/login.md': '# plan\n',
      'package.json': { name: 'test' }
    })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.paths.planDoc).toBe('docs/plans/{feature}.md')
  })

  it('src 下有子目录时 architecture.layers 不为空', () => {
    const root = makeProject({
      'src/services/auth.ts': '',
      'src/components/Button.tsx': '',
      'package.json': { name: 'test' }
    })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.architecture.layers.length).toBeGreaterThan(0)
    const ids = facts.architecture.layers.map((l) => l.id)
    expect(ids).toContain('services')
    expect(ids).toContain('components')
  })

  it('tests/ 目录存在时 testLocation 为 tests/', () => {
    const root = makeProject({
      'tests/unit/foo.test.js': '',
      'package.json': { name: 'test' }
    })
    const facts = deriveProjectFacts(scanProject(root))
    expect(facts.conventions.testLocation).toBe('tests/')
  })
})

// ─── renderRuleTemplates ──────────────────────────────────────────────────────

describe('renderRuleTemplates', () => {
  it('生成固定 4 个规则文件和 config.yaml', () => {
    const root = makeProject({
      'src/domain/foo.ts': '',
      'package.json': { scripts: { lint: 'eslint .' } }
    })

    const facts = deriveProjectFacts(scanProject(root))
    const rendered = renderRuleTemplates(facts)

    expect(rendered.configYaml).toContain('schemaVersion: 2')
    expect(Object.keys(rendered.rules).sort()).toEqual([
      'golden-rules.md',
      'plan-template.md',
      'requirement-template.md',
      'review-checklist.md'
    ])
  })

  it('规则文件包含 auto/manual 标记', () => {
    const root = makeProject({ 'package.json': { name: 'test' } })
    const { rules } = renderRuleTemplates(deriveProjectFacts(scanProject(root)))

    for (const content of Object.values(rules)) {
      expect(content).toContain('<!-- hx:auto:start -->')
      expect(content).toContain('<!-- hx:auto:end -->')
      expect(content).toContain('<!-- hx:manual:start -->')
      expect(content).toContain('<!-- hx:manual:end -->')
    }
  })

  it('config.yaml 包含扫描到的 gate 命令', () => {
    const root = makeProject({
      'package.json': { scripts: { lint: 'eslint .', test: 'vitest run' } }
    })
    const { configYaml } = renderRuleTemplates(deriveProjectFacts(scanProject(root)))
    expect(configYaml).toContain('npm run lint')
    expect(configYaml).toContain('npm run test')
  })

  it('未扫描到的 gate 在 config.yaml 中为 null', () => {
    const root = makeProject({ 'package.json': { name: 'test' } })
    const { configYaml } = renderRuleTemplates(deriveProjectFacts(scanProject(root)))
    expect(configYaml).toMatch(/lint:\s+null/)
  })

  it('config.yaml 包含正确的路径模板', () => {
    const root = makeProject({ 'package.json': { name: 'test' } })
    const { configYaml } = renderRuleTemplates(deriveProjectFacts(scanProject(root)))
    expect(configYaml).toContain('{feature}')
  })
})

// ─── updateManagedMarkdown ────────────────────────────────────────────────────

describe('updateManagedMarkdown', () => {
  it('只更新 auto 区，保留 manual 区', () => {
    const existing = [
      '<!-- hx:auto:start -->',
      'old auto content',
      '<!-- hx:auto:end -->',
      '',
      '<!-- hx:manual:start -->',
      'keep this manual note',
      '<!-- hx:manual:end -->',
      ''
    ].join('\n')

    const updated = updateManagedMarkdown(existing, 'new auto content')
    expect(updated).toContain('new auto content')
    expect(updated).toContain('keep this manual note')
    expect(updated).not.toContain('old auto content')
  })

  it('无 auto 标记时用新内容整体替换', () => {
    const existing = '# 旧内容\n没有标记'
    const updated = updateManagedMarkdown(existing, 'new auto')
    expect(updated).toContain('new auto')
    expect(updated).toContain('<!-- hx:auto:start -->')
  })

  it('existingContent 为空时生成完整骨架', () => {
    const updated = updateManagedMarkdown('', 'new auto')
    expect(updated).toContain('<!-- hx:auto:start -->')
    expect(updated).toContain('<!-- hx:manual:start -->')
  })

  it('existingContent 为 null/undefined 时生成完整骨架', () => {
    expect(updateManagedMarkdown(null, 'auto')).toContain('<!-- hx:auto:start -->')
    expect(updateManagedMarkdown(undefined, 'auto')).toContain('<!-- hx:auto:start -->')
  })

  it('多次更新后 manual 区始终保留', () => {
    const root = makeProject({ 'package.json': { name: 'test' } })
    const facts = deriveProjectFacts(scanProject(root))
    const { rules } = renderRuleTemplates(facts)

    // 第一次渲染结果作为"已有文件"，手动追加笔记
    const firstRender = rules['golden-rules.md']
    const withManual = firstRender.replace(
      '- 在这里补充项目人工规则或长期沉淀。',
      '- 禁止使用 any 类型'
    )

    // 第二次更新 auto 区
    const secondFacts = deriveProjectFacts(scanProject(root))
    const { rules: rules2 } = renderRuleTemplates(secondFacts)
    const updated = updateManagedMarkdown(withManual, rules2['golden-rules.md'].replace(
      /<!-- hx:auto:start -->[\s\S]*?<!-- hx:auto:end -->/,
      (m) => m.slice('<!-- hx:auto:start -->'.length, -'<!-- hx:auto:end -->'.length).trim()
    ))

    expect(updated).toContain('禁止使用 any 类型')
  })
})
