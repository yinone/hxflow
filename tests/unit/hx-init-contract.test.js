import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { loadCommandSpecs } from '../../src/scripts/lib/install-utils.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const COMMANDS_DIR = resolve(ROOT, 'src/agents/commands')
const INIT_COMMAND_PATH = resolve(COMMANDS_DIR, 'hx-init.md')

describe('hx-init command contract', () => {
  it('exposes canonical metadata', () => {
    const specs = loadCommandSpecs(COMMANDS_DIR)
    const initSpec = specs.find((spec) => spec.name === 'hx-init')

    expect(initSpec).toMatchObject({
      name: 'hx-init',
      usage: 'hx-init',
      claude: '/hx-init',
      codex: 'hx-init',
    })
  })

  it('requires writing project scaffolding files and fixed rules', () => {
    const content = readFileSync(INIT_COMMAND_PATH, 'utf8')

    expect(content).toContain('`.hx/config.yaml`')
    expect(content).toContain('`.hx/rules/golden-rules.md`')
    expect(content).toContain('`.hx/rules/review-checklist.md`')
    expect(content).toContain('`.hx/rules/requirement-template.md`')
    expect(content).toContain('`.hx/rules/plan-template.md`')
    expect(content).toContain('`.hx/commands/README.md`')
    expect(content).toContain('`.hx/hooks/run-pre.md.example`')
    expect(content).toContain('`.hx/pipelines/default.yaml`')
  })

  it('keeps config/rules constraints and agent marker requirements', () => {
    const content = readFileSync(INIT_COMMAND_PATH, 'utf8')

    expect(content).toContain('schemaVersion: 2')
    expect(content).toContain('paths.requirementDoc')
    expect(content).toContain('paths.planDoc')
    expect(content).toContain('paths.progressFile')
    expect(content).toContain('不再接受 `--profile`')
    expect(content).toContain('<!-- hx:auto:start -->')
    expect(content).toContain('CLAUDE.md')
    expect(content).toContain('AGENTS.md')
  })
})
