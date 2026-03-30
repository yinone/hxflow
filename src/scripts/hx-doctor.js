#!/usr/bin/env node

/**
 * hx doctor — 健康检测
 *
 * 检测内容：
 *   1. 运行环境（node 版本、hx 安装）
 *   2. 全局安装（~/.hx/commands、hooks、pipelines、Claude/Codex 适配层）
 *   3. 当前项目（.hx/config.yaml、.hx/rules/*.md、需求/计划目录）
 *   4. gate 健康（至少存在一个可执行 gate）
 */

import { existsSync, readFileSync, readdirSync } from 'fs'
import { homedir } from 'os'
import { resolve } from 'path'
import { createRequire } from 'module'

import { FRAMEWORK_ROOT } from './lib/resolve-context.js'
import { parseSimpleYaml } from './lib/config-utils.js'
import {
  DEFAULT_PLAN_DOC,
  DEFAULT_PROGRESS_FILE,
  DEFAULT_REQUIREMENT_DOC,
  RULE_FILE_NAMES,
  listConfiguredGates
} from './lib/rule-context.js'

const require = createRequire(import.meta.url)

const issues = []
const div = '─'.repeat(48)

function ok(msg)   { console.log(`  ✓ ${msg}`) }
function fail(msg) { console.log(`  ✗ ${msg}`); issues.push(msg) }
function warn(msg) { console.log(`  ⚠ ${msg}`) }
function section(title) { console.log(`\n── ${title} ${div.slice(title.length + 4)}`) }

section('环境')

const nodeVersion = process.versions.node.split('.').map(Number)
if (nodeVersion[0] >= 18) {
  ok(`node v${process.versions.node}`)
} else {
  fail(`node v${process.versions.node}（需要 >= 18）`)
}

try {
  const pkg = require(resolve(FRAMEWORK_ROOT, '..', 'package.json'))
  ok(`hx v${pkg.version}`)
} catch {
  warn('无法读取版本信息')
}

section('全局安装')

const HX_DIR = resolve(homedir(), '.hx')
const CLAUDE_DIR = resolve(homedir(), '.claude')
const CODEX_DIR = resolve(homedir(), '.codex')

for (const dirName of ['commands', 'hooks', 'pipelines']) {
  const absolute = resolve(HX_DIR, dirName)
  existsSync(absolute) ? ok(`~/.hx/${dirName}/`) : warn(`~/.hx/${dirName}/ 缺失`)
}

let hasAgentAdapter = false

const claudeCommandsDir = resolve(CLAUDE_DIR, 'commands')
if (existsSync(claudeCommandsDir)) {
  const commands = readdirSync(claudeCommandsDir).filter((file) => file.startsWith('hx-') && file.endsWith('.md'))
  if (commands.length > 0) {
    ok(`~/.claude/commands/（${commands.length} 个命令）`)
    hasAgentAdapter = true
  } else {
    warn('~/.claude/commands/ 存在但无 hx-*.md 命令')
  }
} else {
  warn('~/.claude/commands/ 缺失')
}

const codexSkillsDir = resolve(CODEX_DIR, 'skills')
const codexHxDirs = existsSync(codexSkillsDir)
  ? readdirSync(codexSkillsDir).filter((entry) => entry.startsWith('hx-') && existsSync(resolve(codexSkillsDir, entry, 'SKILL.md')))
  : []
if (codexHxDirs.length > 0) {
  ok(`~/.codex/skills/（Codex skill 已安装，共 ${codexHxDirs.length} 个命令）`)
  hasAgentAdapter = true
} else {
  warn('~/.codex/skills/ 中未找到 hx-* skill 目录，建议运行 hx setup 修复')
}

if (!hasAgentAdapter) {
  fail('未检测到任何 agent 适配层，运行 hx setup 修复')
}

section('当前项目')

const ROOT = process.cwd()
const hxConfig = resolve(ROOT, '.hx', 'config.yaml')

if (!existsSync(hxConfig)) {
  warn('.hx/config.yaml 不存在（未初始化，可在 Claude 中运行 /hx-init，或在 Codex 中运行 hx-init）')
} else {
  ok('.hx/config.yaml')

  let config = {}
  try {
    config = parseSimpleYaml(readFileSync(hxConfig, 'utf8'))
    ok(`.hx/config.yaml · schemaVersion: ${config.schemaVersion || '未设置'}`)
  } catch {
    fail('.hx/config.yaml 格式错误')
  }

  for (const { path, label } of collectProjectPaths(config)) {
    existsSync(resolve(ROOT, path))
      ? ok(label)
      : warn(`${label} 缺失`)
  }

  for (const fileName of RULE_FILE_NAMES) {
    const absolute = resolve(ROOT, '.hx', 'rules', fileName)
    if (!existsSync(absolute)) {
      fail(`.hx/rules/${fileName} 缺失`)
      continue
    }

    const content = readFileSync(absolute, 'utf8').trim()
    if (content === '') {
      fail(`.hx/rules/${fileName} 为空`)
      continue
    }

    ok(`.hx/rules/${fileName}`)
  }

  section('Rules & Gates')
  const gates = listConfiguredGates({ gates: config.gates || {} })
  if (gates.length > 0) {
    ok(`gates: ${gates.map(({ name }) => name).join(', ')}`)
  } else {
    fail('gates 未配置，编辑 .hx/config.yaml 的 gates 字段')
  }
}

console.log(`\n${'─'.repeat(48)}`)
if (issues.length === 0) {
  console.log('  ✓ 一切正常\n')
} else {
  console.log(`  ${issues.length} 个问题需要修复\n`)
  process.exit(1)
}

function collectProjectPaths(config) {
  const seen = new Set()
  const result = []
  const candidates = [
    buildProjectPathCheck(config.paths?.requirementDoc || DEFAULT_REQUIREMENT_DOC),
    buildProjectPathCheck(config.paths?.planDoc || DEFAULT_PLAN_DOC),
    buildProjectPathCheck(config.paths?.progressFile || DEFAULT_PROGRESS_FILE),
    { path: '.hx/rules', label: '.hx/rules/' },
    { path: '.claude/commands', label: '.claude/commands/' },
  ]

  for (const candidate of candidates) {
    const dedupeKey = candidate ? `${candidate.path}::${candidate.label}` : ''
    if (!candidate || seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    result.push(candidate)
  }

  return result
}

function buildProjectPathCheck(template) {
  const directory = toDirectoryPath(template)
  if (!directory) return null

  const stablePrefix = toStablePrefixPath(directory)
  if (!stablePrefix) return null

  return {
    path: stablePrefix,
    label: ensureTrailingSlash(directory),
  }
}

function toDirectoryPath(template) {
  if (typeof template !== 'string') return null

  const normalized = template.trim().replace(/\\/g, '/')
  if (!normalized) return null

  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash === -1) {
    return normalized
  }

  return normalized.slice(0, lastSlash + 1)
}

function toStablePrefixPath(directory) {
  const segments = directory
    .replace(/\/$/, '')
    .split('/')
    .filter(Boolean)

  const stableSegments = []
  for (const segment of segments) {
    if (/\{[^}]+\}/.test(segment)) break
    stableSegments.push(segment)
  }

  if (stableSegments.length === 0) return null
  return stableSegments.join('/')
}

function ensureTrailingSlash(value) {
  return value.endsWith('/') ? value : `${value}/`
}
