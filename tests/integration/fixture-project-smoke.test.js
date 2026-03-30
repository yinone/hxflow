import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

import { parseSimpleYaml } from '../../src/scripts/lib/config-utils.js'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const BIN_PATH = resolve(ROOT, 'bin/hx.js')
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

function runHx(args, cwd, homeDir) {
  return spawnSync(process.execPath, [BIN_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: {
      ...process.env,
      FORCE_COLOR: '0',
      HOME: homeDir,
    },
  })
}

describe('fixture project smoke', () => {
  it('wires setup output, project config, pipeline override and command resolution together', () => {
    const homeDir = makeTempDir('hx-smoke-home-')
    const projectDir = makeTempDir('hx-smoke-project-')

    mkdirSync(resolve(projectDir, '.git'), { recursive: true })
    mkdirSync(resolve(projectDir, '.hx', 'commands'), { recursive: true })
    mkdirSync(resolve(projectDir, '.hx', 'rules'), { recursive: true })
    mkdirSync(resolve(projectDir, '.hx', 'pipelines'), { recursive: true })
    mkdirSync(resolve(projectDir, 'workflow', 'requirements'), { recursive: true })
    mkdirSync(resolve(projectDir, 'workflow', 'plans'), { recursive: true })
    mkdirSync(resolve(projectDir, '.claude', 'commands'), { recursive: true })

    writeFileSync(resolve(projectDir, '.hx', 'config.yaml'), [
      'schemaVersion: 2',
      'paths:',
      '  requirementDoc: workflow/requirements/{feature}.md',
      '  planDoc: workflow/plans/{feature}.md',
      '  progressFile: workflow/plans/{feature}-progress.json',
      'gates:',
      '  lint: npm run lint',
      '  test: npm run test',
    ].join('\n'), 'utf8')

    for (const fileName of ['golden-rules.md', 'review-checklist.md', 'requirement-template.md', 'plan-template.md']) {
      writeFileSync(resolve(projectDir, '.hx', 'rules', fileName), [
        '<!-- hx:auto:start -->',
        '# auto',
        '<!-- hx:auto:end -->',
        '',
        '<!-- hx:manual:start -->',
        '- manual',
        '<!-- hx:manual:end -->',
        ''
      ].join('\n'), 'utf8')
    }

    writeFileSync(resolve(projectDir, '.hx', 'commands', 'hx-run.md'), [
      '---',
      'name: hx-run',
      'description: Project override',
      'usage: hx-run [<feature-key>] [--task <task-id>]',
      'claude: /hx-run',
      'codex: hx-run',
      '---',
      '',
      '# project hx-run override',
    ].join('\n'), 'utf8')

    writeFileSync(resolve(projectDir, '.hx', 'pipelines', 'default.yaml'), [
      'name: 项目级 smoke pipeline',
      'steps:',
      '  - id: doc',
      '    phase: Phase 01',
      '    name: 需求文档',
      '    command: hx-doc',
      '  - id: run',
      '    phase: Phase 04',
      '    name: 执行需求',
      '    command: hx-run',
      '  - id: mr',
      '    phase: Phase 08',
      '    name: MR 描述',
      '    command: hx-mr',
    ].join('\n'), 'utf8')

    const setup = runHx(['setup'], projectDir, homeDir)
    expect(setup.status).toBe(0)

    const userHxDir = resolve(homeDir, '.hx')
    const userClaudeDir = resolve(homeDir, '.claude')
    const userCodexDir = resolve(homeDir, '.codex')

    expect(existsSync(resolve(userHxDir, 'config.yaml'))).toBe(true)
    expect(existsSync(resolve(userClaudeDir, 'commands', 'hx-run.md'))).toBe(true)
    expect(existsSync(resolve(userCodexDir, 'skills', 'hx-run', 'SKILL.md'))).toBe(true)

    const doctor = runHx(['doctor'], projectDir, homeDir)
    expect(doctor.status).toBe(0)
    const doctorOutput = doctor.stdout + doctor.stderr
    expect(doctorOutput).toContain('workflow/requirements/')
    expect(doctorOutput).toContain('workflow/plans/')
    expect(doctorOutput).toContain('.hx/rules/')
    expect(doctorOutput).toContain('gates: lint, test')
    expect(doctorOutput).toContain('~/.claude/commands/')
    expect(doctorOutput).toContain('~/.codex/skills/')

    const forwarder = readFileSync(resolve(userClaudeDir, 'commands', 'hx-run.md'), 'utf8')
    expect(forwarder).toContain('.hx/commands/hx-run.md')
    expect(forwarder).toContain(resolve(userHxDir, 'commands', 'hx-run.md'))

    const skillFile = readFileSync(resolve(userCodexDir, 'skills', 'hx-run', 'SKILL.md'), 'utf8')
    expect(skillFile).toContain(`${userHxDir}/commands/hx-run.md`)
    expect(skillFile).toContain(`${ROOT}/src/agents/commands/hx-run.md`)

    const projectPipeline = parseSimpleYaml(readFileSync(resolve(projectDir, '.hx', 'pipelines', 'default.yaml'), 'utf8'))
    expect(projectPipeline.steps.map((step) => step.command)).toEqual(['hx-doc', 'hx-run', 'hx-mr'])
    expect(readFileSync(resolve(projectDir, '.hx', 'commands', 'hx-run.md'), 'utf8')).toContain('project hx-run override')
  })
})
