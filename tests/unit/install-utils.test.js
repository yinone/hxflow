import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { resolve } from 'path'

import {
  HARNESS_MARKER_END,
  HARNESS_MARKER_START,
  buildHarnessBlock,
  escapeRegExp,
  generateCodexSkillFiles,
  generateForwarderFiles,
  loadCommandSpecs,
  resolveAgentTargets,
} from '../../src/scripts/lib/install-utils.js'

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

describe('buildHarnessBlock', () => {
  it('包含开始和结束标记', () => {
    const block = buildHarnessBlock()
    expect(block).toContain(HARNESS_MARKER_START)
    expect(block).toContain(HARNESS_MARKER_END)
  })

  it('展示 config 与 rules 目录，而不是 profile', () => {
    const block = buildHarnessBlock({
      requirementDoc: '业务线/香港/需求/{feature}/资料/需求.md',
      planDoc: '业务线/香港/需求/{feature}/任务/{taskId}/任务执行.md',
    })

    expect(block).toContain('配置: `.hx/config.yaml`')
    expect(block).toContain('规则目录: `.hx/rules/`')
    expect(block).toContain('需求文档: `业务线/香港/需求/{feature}/资料/`')
    expect(block).toContain('执行计划: `业务线/香港/需求/{feature}/任务/{taskId}/`')
    expect(block).not.toContain('Profile:')
  })
})

describe('escapeRegExp', () => {
  it('marker 字符串可以安全用于 RegExp', () => {
    const escaped = escapeRegExp(HARNESS_MARKER_START)
    expect(() => new RegExp(escaped)).not.toThrow()
  })
})

describe('resolveAgentTargets', () => {
  it('默认返回全部 agent', () => {
    expect(resolveAgentTargets()).toEqual(['claude', 'codex'])
  })

  it('支持单个 agent 和逗号分隔 agent', () => {
    expect(resolveAgentTargets('claude')).toEqual(['claude'])
    expect(resolveAgentTargets('codex')).toEqual(['codex'])
    expect(resolveAgentTargets('claude,codex')).toEqual(['claude', 'codex'])
  })
})

describe('loadCommandSpecs', () => {
  it('解析命令 frontmatter', () => {
    const sourceDir = makeTempDir('spec-src-')
    writeFileSync(resolve(sourceDir, 'hx-run.md'), [
      '---',
      'name: hx-run',
      'description: Phase 04 · 执行任务',
      'usage: hx-run [<feature-key>] [--task <task-id>]',
      'claude: /hx-run',
      'codex: hx-run',
      '---',
      '',
      '# hx-run',
      ''
    ].join('\n'), 'utf8')

    const specs = loadCommandSpecs(sourceDir)
    expect(specs[0]).toMatchObject({
      name: 'hx-run',
      usage: 'hx-run [<feature-key>] [--task <task-id>]',
      claude: '/hx-run',
      codex: 'hx-run',
    })
  })
})

describe('generateForwarderFiles', () => {
  it('为 sourceDir 中每个 hx-*.md 创建转发器文件', () => {
    const sourceDir = makeTempDir('gen-src-')
    const targetDir = makeTempDir('gen-dst-')
    writeFileSync(resolve(sourceDir, 'hx-run.md'), '# hx-run entity', 'utf8')
    writeFileSync(resolve(sourceDir, 'hx-plan.md'), '# hx-plan entity', 'utf8')

    const summary = { created: [], updated: [], skipped: [], warnings: [] }
    generateForwarderFiles(sourceDir, targetDir, '/fw', '/user-hx', summary, {})

    expect(existsSync(resolve(targetDir, 'hx-run.md'))).toBe(true)
    expect(existsSync(resolve(targetDir, 'hx-plan.md'))).toBe(true)
    expect(summary.created).toContain('~/.claude/commands/hx-run.md')
  })

  it('转发器内容包含项目层、用户层和系统层路径', () => {
    const sourceDir = makeTempDir('gen-content-src-')
    const targetDir = makeTempDir('gen-content-dst-')
    writeFileSync(resolve(sourceDir, 'hx-run.md'), '# hx-run', 'utf8')

    const summary = { created: [], updated: [], skipped: [], warnings: [] }
    generateForwarderFiles(sourceDir, targetDir, '/framework', '/user-hx', summary, {})

    const content = readFileSync(resolve(targetDir, 'hx-run.md'), 'utf8')
    expect(content).toContain('.hx/commands/hx-run.md')
    expect(content).toContain('/user-hx/commands/hx-run.md')
    expect(content).toContain('/framework')
  })
})

describe('generateCodexSkillFiles', () => {
  it('生成 codex skill 文件，并指向三层命令来源', () => {
    const sourceDir = makeTempDir('skill-src-')
    const targetDir = makeTempDir('skill-dst-')
    writeFileSync(resolve(sourceDir, 'hx-run.md'), [
      '---',
      'name: hx-run',
      'description: Phase 04 · 执行任务',
      'usage: hx-run [<feature-key>] [--task <task-id>]',
      'claude: /hx-run',
      'codex: hx-run',
      '---'
    ].join('\n'), 'utf8')

    const summary = { created: [], updated: [], skipped: [], warnings: [] }
    generateCodexSkillFiles(sourceDir, targetDir, '/framework', '/user-hx', summary, {
      createDir: true
    })

    const content = readFileSync(resolve(targetDir, 'hx-run', 'SKILL.md'), 'utf8')
    expect(content).toContain('/user-hx/commands/hx-run.md')
    expect(content).toContain('/framework/agents/commands/hx-run.md')
  })
})
