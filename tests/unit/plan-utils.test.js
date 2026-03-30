import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { loadCommandSpecs } from '../../src/scripts/lib/install-utils.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const COMMANDS_DIR = resolve(ROOT, 'src/agents/commands')
const PLAN_COMMAND_PATH = resolve(COMMANDS_DIR, 'hx-plan.md')

describe('hx-plan command contract', () => {
  it('暴露 canonical metadata', () => {
    const specs = loadCommandSpecs(COMMANDS_DIR)
    const planSpec = specs.find((spec) => spec.name === 'hx-plan')

    expect(planSpec).toMatchObject({
      name: 'hx-plan',
      usage: 'hx-plan [<feature-key>]',
      claude: '/hx-plan',
      codex: 'hx-plan',
    })
    expect(planSpec?.description).toContain('Phase 02')
  })

  it('要求从需求文档生成计划和 progress 文件，并提示下一步 hx-run', () => {
    const content = readFileSync(PLAN_COMMAND_PATH, 'utf8')

    expect(content).toContain('paths.requirementDoc')
    expect(content).toContain('paths.planDoc')
    expect(content).toContain('paths.progressFile')
    expect(content).toContain('写入 `planDoc`')
    expect(content).toContain('写入 `progressFile`')
    expect(content).toContain('默认提示下一步 `hx-run`')
  })

  it('约束 progress schemaVersion 和 TASK 格式', () => {
    const content = readFileSync(PLAN_COMMAND_PATH, 'utf8')

    expect(content).toContain('"schemaVersion": 2')
    expect(content).toContain('"id": "TASK-01"')
    expect(content).toContain('不再记录 profile 字段')
  })
})
