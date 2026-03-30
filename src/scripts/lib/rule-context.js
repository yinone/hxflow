import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

import { parseSimpleYaml } from './config-utils.js'

export const DEFAULT_REQUIREMENT_DOC = 'docs/requirement/{feature}.md'
export const DEFAULT_PLAN_DOC = 'docs/plans/{feature}.md'
export const DEFAULT_PROGRESS_FILE = 'docs/plans/{feature}-progress.json'

export const RULE_FILE_NAMES = [
  'golden-rules.md',
  'review-checklist.md',
  'requirement-template.md',
  'plan-template.md'
]

export const HOOK_STAGES = ['doc', 'plan', 'run', 'review', 'fix', 'clean', 'mr']

export function createDefaultHooks() {
  return Object.fromEntries(HOOK_STAGES.map((stage) => [stage, { pre: [], post: [] }]))
}

export function createDefaultProjectConfig() {
  return {
    schemaVersion: 2,
    paths: {
      src: 'src',
      requirementDoc: DEFAULT_REQUIREMENT_DOC,
      planDoc: DEFAULT_PLAN_DOC,
      progressFile: DEFAULT_PROGRESS_FILE
    },
    gates: {
      lint: null,
      test: null,
      type: null,
      build: null
    },
    hooks: createDefaultHooks()
  }
}

export function mergeMissingConfig(existing, defaults = createDefaultProjectConfig()) {
  if (Array.isArray(defaults)) {
    return Array.isArray(existing) ? existing : [...defaults]
  }

  if (!isPlainObject(defaults)) {
    return existing === undefined ? defaults : existing
  }

  const source = isPlainObject(existing) ? existing : {}
  const result = { ...source }

  for (const [key, value] of Object.entries(defaults)) {
    result[key] = mergeMissingConfig(source[key], value)
  }

  return result
}

export function readProjectConfig(projectRoot) {
  const configPath = resolve(projectRoot, '.hx', 'config.yaml')
  const base = createDefaultProjectConfig()

  if (!existsSync(configPath)) {
    return { configPath, config: base, rawConfig: {}, exists: false }
  }

  const rawContent = readFileSync(configPath, 'utf8')
  const rawConfig = parseSimpleYaml(rawContent)
  return {
    configPath,
    config: mergeMissingConfig(rawConfig, base),
    rawConfig,
    exists: true
  }
}

export function getRuleFileMap(projectRoot) {
  return Object.fromEntries(
    RULE_FILE_NAMES.map((name) => [name, resolve(projectRoot, '.hx', 'rules', name)])
  )
}

export function resolveTemplatePath(template, values) {
  if (typeof template !== 'string') return template

  return template.replace(/\{(\w+)\}/g, (_, key) => {
    return values[key] == null ? `{${key}}` : String(values[key])
  })
}

export function extractTemplateDir(template) {
  if (typeof template !== 'string' || template.trim() === '') {
    return ''
  }

  const normalized = template.replace(/\\/g, '/')
  const lastSlash = normalized.lastIndexOf('/')
  if (lastSlash === -1) {
    return normalized
  }

  return normalized.slice(0, lastSlash + 1)
}

export function listConfiguredGates(config) {
  return Object.entries(config?.gates || {})
    .filter(([, value]) => typeof value === 'string' && value.trim() !== '')
    .map(([name, command]) => ({ name, command }))
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
