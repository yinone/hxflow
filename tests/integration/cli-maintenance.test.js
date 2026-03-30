import { afterEach, describe, expect, it } from 'vitest'
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

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

function runHx(args, cwd = ROOT) {
  return spawnSync(process.execPath, [BIN_PATH, ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '0' }
  })
}

describe('hx setup', () => {
  it('--help 打印帮助并以 0 退出', () => {
    const result = runHx(['setup', '--help'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('hx setup')
    expect(result.stdout).toContain('hx-init')
    expect(result.stdout).toContain('~/.hx/')
    expect(result.stdout).toContain('~/.claude/commands/')
    expect(result.stdout).toContain('~/.codex/skills/')
  })

  it('创建 ~/.hx/ 目录结构和 config.yaml', () => {
    const hxDir = makeTempDir('setup-hx-')
    const claudeDir = makeTempDir('setup-claude-')
    const codexDir = makeTempDir('setup-codex-')

    const result = runHx([
      'setup',
      '--user-hx-dir', hxDir,
      '--user-claude-dir', claudeDir,
      '--user-codex-dir', codexDir
    ])

    expect(result.status).toBe(0)
    expect(existsSync(resolve(hxDir, 'config.yaml'))).toBe(true)
    expect(existsSync(resolve(hxDir, 'commands'))).toBe(true)
    expect(existsSync(resolve(hxDir, 'hooks'))).toBe(true)
    expect(existsSync(resolve(hxDir, 'pipelines'))).toBe(true)
  })
})

describe('hx upgrade', () => {
  it('--help 打印帮助并以 0 退出', () => {
    const result = runHx(['upgrade', '--help'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('hx upgrade')
    expect(result.stdout).toContain('--agent <name>')
    expect(result.stdout).toContain('--dry-run')
  })

  it('未找到 harness 标记块时提示使用 hx-init 重新安装', () => {
    const projectDir = makeTempDir('upgrade-hx-init-project-')
    const claudeDir = makeTempDir('upgrade-hx-init-claude-')
    const codexDir = makeTempDir('upgrade-hx-init-codex-')
    writeFileSync(resolve(projectDir, 'CLAUDE.md'), '# Project\n', 'utf8')

    const result = runHx([
      'upgrade',
      '--dry-run',
      '--user-claude-dir', claudeDir,
      '--user-codex-dir', codexDir
    ], projectDir)

    expect(result.status).toBe(0)
    expect(result.stdout).toContain('hx-init')
  })
})

describe('hx uninstall', () => {
  it('--help 打印帮助并以 0 退出', () => {
    const result = runHx(['uninstall', '--help'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('hx uninstall')
    expect(result.stdout).toContain('--yes')
    expect(result.stdout).toContain('--dry-run')
  })

  it('--yes 删除全局安装产物，同时保留 ~/.hx/ 下的自定义内容', () => {
    const targetDir = makeTempDir('uninstall-global-target-')
    const hxDir = makeTempDir('uninstall-global-hx-')
    const claudeDir = makeTempDir('uninstall-global-claude-')
    const codexDir = makeTempDir('uninstall-global-codex-')

    mkdirSync(resolve(hxDir, 'commands'), { recursive: true })
    writeFileSync(resolve(hxDir, 'config.yaml'), 'frameworkRoot: /tmp/fw\n', 'utf8')
    writeFileSync(resolve(hxDir, 'commands', 'keep.md'), '# custom command\n', 'utf8')

    mkdirSync(resolve(claudeDir, 'commands'), { recursive: true })
    writeFileSync(resolve(claudeDir, 'commands', 'hx-run.md'), '# generated\n', 'utf8')

    mkdirSync(resolve(codexDir, 'skills', 'hx-run'), { recursive: true })
    writeFileSync(resolve(codexDir, 'skills', 'hx-run', 'SKILL.md'), '# skill\n', 'utf8')

    const result = runHx([
      'uninstall',
      '--target', targetDir,
      '--yes',
      '--user-hx-dir', hxDir,
      '--user-claude-dir', claudeDir,
      '--user-codex-dir', codexDir
    ])

    expect(result.status).toBe(0)
    expect(existsSync(resolve(hxDir, 'config.yaml'))).toBe(false)
    expect(existsSync(resolve(hxDir, 'commands', 'keep.md'))).toBe(true)
    expect(existsSync(resolve(claudeDir, 'commands', 'hx-run.md'))).toBe(false)
    expect(existsSync(resolve(codexDir, 'skills', 'hx-run'))).toBe(false)
  })
})

describe('hx doctor', () => {
  it('输出包含框架版本信息和 Node 版本检查结果', () => {
    const result = runHx(['doctor'])
    const output = result.stdout + result.stderr

    expect(output).toContain('hx v')
    expect(output.toLowerCase()).toMatch(/node|版本/)
  })

  it('按 .hx/config.yaml 的自定义 paths 检查目录与 rules', () => {
    const projectDir = makeTempDir('doctor-custom-paths-')
    mkdirSync(resolve(projectDir, '.hx', 'rules'), { recursive: true })
    mkdirSync(resolve(projectDir, '业务线/香港/需求/资料'), { recursive: true })
    mkdirSync(resolve(projectDir, '业务线/香港/需求/任务'), { recursive: true })
    mkdirSync(resolve(projectDir, '.claude/commands'), { recursive: true })

    for (const fileName of ['golden-rules.md', 'review-checklist.md', 'requirement-template.md', 'plan-template.md']) {
      writeFileSync(resolve(projectDir, '.hx', 'rules', fileName), '# ok\n', 'utf8')
    }

    writeFileSync(resolve(projectDir, '.hx/config.yaml'), [
      'schemaVersion: 2',
      'paths:',
      '  requirementDoc: 业务线/香港/需求/{feature}/资料/需求.md',
      '  planDoc: 业务线/香港/需求/{feature}/任务/{taskId}/任务执行.md',
      '  progressFile: 业务线/香港/需求/{feature}/任务/{taskId}/progress.json',
      'gates:',
      '  lint: npm run lint',
    ].join('\n'), 'utf8')

    const result = runHx(['doctor'], projectDir)
    const output = result.stdout + result.stderr

    expect(output).toContain('业务线/香港/需求/{feature}/资料/')
    expect(output).toContain('业务线/香港/需求/{feature}/任务/{taskId}/')
    expect(output).toContain('.hx/rules/golden-rules.md')
    expect(output).toContain('gates: lint')
  })
})
