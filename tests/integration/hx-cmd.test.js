import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { resolve } from 'path'
import { spawnSync } from 'child_process'

import { afterEach, describe, expect, it } from 'vitest'

const HX_BIN = resolve(process.cwd(), 'bin', 'hx.js')
const tempDirs = []

function createTempDir(prefix) {
  const dir = mkdtempSync(resolve(tmpdir(), prefix))
  tempDirs.push(dir)
  return dir
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop(), { recursive: true, force: true })
  }
})

function runCmd(args, { cwd = process.cwd(), env = {} } = {}) {
  return spawnSync(process.execPath, [HX_BIN, 'cmd', ...args], {
    cwd,
    encoding: 'utf8',
    env: { ...process.env, ...env },
  })
}

describe('hx cmd', () => {
  it('prints help', () => {
    const result = runCmd(['--help'])
    expect(result.status).toBe(0)
    expect(result.stdout).toContain('hx cmd <subcommand>')
    expect(result.stdout).toContain('new')
    expect(result.stdout).toContain('list')
    expect(result.stdout).toContain('validate')
    expect(result.stdout).toContain('remove')
  })

  it('reports unknown subcommand', () => {
    const result = runCmd(['unknown'])
    expect(result.status).toBe(1)
    expect(result.stderr).toContain('未知子命令: unknown')
  })

  describe('new', () => {
    it('creates a project-level custom command with dry-run', () => {
      const projectDir = createTempDir('hx-cmd-new-project-')
      mkdirSync(resolve(projectDir, '.git'), { recursive: true })

      const result = runCmd(['new', 'deploy', '--description', '部署到生产', '--dry-run'], { cwd: projectDir })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('[dry-run]')
      expect(result.stdout).toContain('hx-deploy')
      expect(result.stdout).toContain('name: hx-deploy')
      expect(result.stdout).toContain('description: 部署到生产')
    })

    it('auto-prefixes hx- when name does not start with it', () => {
      const projectDir = createTempDir('hx-cmd-new-prefix-')
      mkdirSync(resolve(projectDir, '.git'), { recursive: true })

      const result = runCmd(['new', 'deploy', '--dry-run'], { cwd: projectDir })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('name: hx-deploy')
    })

    it('includes hooks in frontmatter when --hooks flag is set', () => {
      const projectDir = createTempDir('hx-cmd-new-hooks-')
      mkdirSync(resolve(projectDir, '.git'), { recursive: true })

      const result = runCmd(['new', 'deploy', '--hooks', '--dry-run'], { cwd: projectDir })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('hooks:')
      expect(result.stdout).toContain('- pre')
      expect(result.stdout).toContain('- post')
    })

    it('errors if name is missing', () => {
      const result = runCmd(['new'])
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('用法')
    })

    it('errors if command already exists', () => {
      const projectDir = createTempDir('hx-cmd-new-exists-')
      const commandsDir = resolve(projectDir, '.hx', 'commands')
      mkdirSync(commandsDir, { recursive: true })
      writeFileSync(resolve(commandsDir, 'hx-deploy.md'), '---\nname: hx-deploy\ndescription: test\n---\n')

      const result = runCmd(['new', 'deploy', '--dry-run'], { cwd: projectDir })

      expect(result.status).toBe(1)
      expect(result.stderr).toContain('命令已存在')
    })
  })

  describe('list', () => {
    it('shows empty message when no custom commands exist', () => {
      const projectDir = createTempDir('hx-cmd-list-empty-')
      mkdirSync(resolve(projectDir, '.git'), { recursive: true })
      const userHxDir = createTempDir('hx-cmd-list-user-')

      const result = runCmd(['list'], { cwd: projectDir, env: { HOME: userHxDir } })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('暂无自定义命令')
    })

    it('lists project-level custom commands', () => {
      const projectDir = createTempDir('hx-cmd-list-project-')
      const commandsDir = resolve(projectDir, '.hx', 'commands')
      mkdirSync(commandsDir, { recursive: true })
      writeFileSync(
        resolve(commandsDir, 'hx-deploy.md'),
        '---\nname: hx-deploy\ndescription: 部署到生产\n---\n'
      )
      const userHxDir = createTempDir('hx-cmd-list-user-')

      const result = runCmd(['list'], { cwd: projectDir, env: { HOME: userHxDir } })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('项目级')
      expect(result.stdout).toContain('hx-deploy')
      expect(result.stdout).toContain('部署到生产')
    })
  })

  describe('validate', () => {
    it('passes valid custom command', () => {
      const projectDir = createTempDir('hx-cmd-validate-pass-')
      const commandsDir = resolve(projectDir, '.hx', 'commands')
      mkdirSync(commandsDir, { recursive: true })
      writeFileSync(
        resolve(commandsDir, 'hx-deploy.md'),
        '---\nname: hx-deploy\ndescription: 部署到生产\nusage: hx-deploy [env]\n---\n\n# hx-deploy\n'
      )

      const result = runCmd(['validate', 'deploy'], { cwd: projectDir })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('✓ hx-deploy')
    })

    it('fails command missing description', () => {
      const projectDir = createTempDir('hx-cmd-validate-fail-')
      const commandsDir = resolve(projectDir, '.hx', 'commands')
      mkdirSync(commandsDir, { recursive: true })
      writeFileSync(
        resolve(commandsDir, 'hx-deploy.md'),
        '---\nname: hx-deploy\n---\n\n# hx-deploy\n'
      )

      const result = runCmd(['validate', 'deploy'], { cwd: projectDir })

      expect(result.status).toBe(1)
      expect(result.stdout).toContain('✗ hx-deploy')
      expect(result.stdout).toContain('description')
    })

    it('fails command with mismatched name', () => {
      const projectDir = createTempDir('hx-cmd-validate-mismatch-')
      const commandsDir = resolve(projectDir, '.hx', 'commands')
      mkdirSync(commandsDir, { recursive: true })
      writeFileSync(
        resolve(commandsDir, 'hx-deploy.md'),
        '---\nname: hx-other\ndescription: test\n---\n\n# hx-other\n'
      )

      const result = runCmd(['validate', 'deploy'], { cwd: projectDir })

      expect(result.status).toBe(1)
      expect(result.stdout).toContain('✗ hx-deploy')
      expect(result.stdout).toContain('不一致')
    })

    it('fails command with protected: true', () => {
      const projectDir = createTempDir('hx-cmd-validate-protected-')
      const commandsDir = resolve(projectDir, '.hx', 'commands')
      mkdirSync(commandsDir, { recursive: true })
      writeFileSync(
        resolve(commandsDir, 'hx-deploy.md'),
        '---\nname: hx-deploy\ndescription: test\nprotected: true\n---\n\n# hx-deploy\n'
      )

      const result = runCmd(['validate', 'deploy'], { cwd: projectDir })

      expect(result.status).toBe(1)
      expect(result.stdout).toContain('✗ hx-deploy')
      expect(result.stdout).toContain('protected')
    })
  })

  describe('remove', () => {
    it('shows preview without --force', () => {
      const projectDir = createTempDir('hx-cmd-remove-preview-')
      const commandsDir = resolve(projectDir, '.hx', 'commands')
      mkdirSync(commandsDir, { recursive: true })
      writeFileSync(
        resolve(commandsDir, 'hx-deploy.md'),
        '---\nname: hx-deploy\ndescription: test\n---\n'
      )

      const result = runCmd(['remove', 'deploy'], { cwd: projectDir })

      expect(result.status).toBe(0)
      expect(result.stdout).toContain('hx-deploy.md')
      expect(result.stdout).toContain('--force')
    })

    it('errors if command not found', () => {
      const projectDir = createTempDir('hx-cmd-remove-notfound-')
      mkdirSync(resolve(projectDir, '.git'), { recursive: true })
      const userHxDir = createTempDir('hx-cmd-remove-user-')

      const result = runCmd(['remove', 'nonexistent'], { cwd: projectDir, env: { HOME: userHxDir } })

      expect(result.status).toBe(1)
      expect(result.stderr).toContain('命令文件未找到')
    })

    it('errors if name is missing', () => {
      const result = runCmd(['remove'])
      expect(result.status).toBe(1)
      expect(result.stderr).toContain('用法')
    })
  })
})
