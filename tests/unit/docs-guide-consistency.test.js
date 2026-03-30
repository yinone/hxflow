import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const README_PATH = resolve(ROOT, 'README.md')
const CLAUDE_PATH = resolve(ROOT, 'CLAUDE.md')

describe('docs consistency', () => {
  it('README reflects the project-rules runtime model', () => {
    const content = readFileSync(README_PATH, 'utf8')

    expect(content).toContain('.hx/rules/*.md')
    expect(content).toContain('hx-rules [update]')
    expect(content).toContain('不再有运行时 `profile`')
    expect(content).not.toContain('--profile base')
  })

  it('CLAUDE.md references the new rule-generation modules', () => {
    const content = readFileSync(CLAUDE_PATH, 'utf8')

    expect(content).toContain('config-utils.js')
    expect(content).toContain('scan-project.js')
    expect(content).toContain('render-rule-templates.js')
    expect(content).toContain('不再有运行时 `profile`')
  })
})
