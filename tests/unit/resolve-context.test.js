import { afterEach, describe, expect, it } from 'vitest'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { resolve } from 'path'

import {
  FRAMEWORK_ROOT,
  USER_HX_DIR,
  findProjectRoot,
} from '../../src/scripts/lib/resolve-context.js'

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

function writeHxConfig(root, content = 'schemaVersion: 2\n') {
  mkdirSync(resolve(root, '.hx'), { recursive: true })
  writeFileSync(resolve(root, '.hx', 'config.yaml'), content, 'utf8')
}

describe('常量', () => {
  it('FRAMEWORK_ROOT 是非空字符串', () => {
    expect(typeof FRAMEWORK_ROOT).toBe('string')
    expect(FRAMEWORK_ROOT.length).toBeGreaterThan(0)
  })

  it('USER_HX_DIR 是非空字符串，包含 .hx', () => {
    expect(typeof USER_HX_DIR).toBe('string')
    expect(USER_HX_DIR).toContain('.hx')
  })
})

describe('findProjectRoot', () => {
  it('从嵌套目录向上找到含 .hx/config.yaml 的根目录', () => {
    const root = makeTempDir('resolve-hx-config-')
    const nested = resolve(root, 'packages', 'app', 'src')
    mkdirSync(nested, { recursive: true })
    writeHxConfig(root)

    expect(findProjectRoot(nested)).toBe(root)
  })

  it('优先使用 .hx/config.yaml 而非 .git', () => {
    const root = makeTempDir('resolve-priority-')
    const sub = resolve(root, 'sub')
    mkdirSync(sub, { recursive: true })

    mkdirSync(resolve(root, '.git'), { recursive: true })
    writeHxConfig(sub)

    expect(findProjectRoot(resolve(sub, 'nested'))).toBe(sub)
  })

  it('无 .hx/config.yaml 时回退到 .git 所在目录', () => {
    const root = makeTempDir('resolve-git-fallback-')
    const nested = resolve(root, 'nested', 'path')
    mkdirSync(resolve(root, '.git'), { recursive: true })
    mkdirSync(nested, { recursive: true })

    expect(findProjectRoot(nested)).toBe(root)
  })

  it('两者均无时返回 startDir 本身', () => {
    const dir = makeTempDir('resolve-no-marker-')
    expect(findProjectRoot(dir)).toBe(dir)
  })
})
