import { existsSync, readdirSync } from 'fs'
import { resolve } from 'path'

import {
  DEFAULT_PLAN_DOC,
  DEFAULT_PROGRESS_FILE,
  DEFAULT_REQUIREMENT_DOC
} from './rule-context.js'

const FRAMEWORK_HINTS = [
  'react',
  'vue',
  'next',
  'nuxt',
  'svelte',
  'express',
  'koa',
  'fastify',
  'nestjs',
  'vite'
]

const TEST_HINTS = ['vitest', 'jest', 'playwright', 'cypress', 'mocha']
const LINT_HINTS = ['eslint', 'biome', 'oxlint', 'stylelint']
const BUILD_HINTS = ['vite', 'webpack', 'rollup', 'tsup', 'turbo']

export function deriveProjectFacts(scan) {
  const requirementDoc = detectRequirementDocPath(scan)
  const planDoc = detectPlanDocPath(scan)
  const progressFile = detectProgressFilePath(scan, planDoc)
  const sourceRoot = scan.existingConfig.rawConfig?.paths?.src || scan.sourceRoot || 'src'

  return {
    schemaVersion: 2,
    stack: {
      language: detectLanguage(scan),
      runtime: detectRuntime(scan),
      frameworks: detectNamedTools(scan.dependencies, FRAMEWORK_HINTS),
      testFrameworks: detectNamedTools(scan.dependencies, TEST_HINTS),
      lintTools: detectNamedTools(scan.dependencies, LINT_HINTS),
      buildTools: detectNamedTools(scan.dependencies, BUILD_HINTS)
    },
    paths: {
      src: sourceRoot,
      requirementDoc,
      planDoc,
      progressFile
    },
    gates: detectGates(scan),
    architecture: detectArchitecture(scan, sourceRoot),
    conventions: {
      packageManager: detectPackageManager(scan.lockfiles),
      moduleStyle: scan.packageJson?.type === 'module' ? 'esm' : null,
      testLocation: detectTestLocation(scan)
    },
    docs: {
      hasDocsDir: scan.docsDir === 'docs' || scan.docsDir === 'doc',
      requirementPatternSource: detectPatternSource(requirementDoc, scan.markdownFiles),
      planPatternSource: detectPatternSource(planDoc, scan.markdownFiles)
    }
  }
}

function detectLanguage(scan) {
  if (existsPath(scan.manifests.tsconfig)) return 'typescript'
  if (scan.packageJson) return 'javascript'
  if (existsPath(scan.manifests.goMod)) return 'go'
  if (existsPath(scan.manifests.pubspec)) return 'dart'
  return null
}

function detectRuntime(scan) {
  if (scan.packageJson) return 'node'
  if (existsPath(scan.manifests.goMod)) return 'go'
  if (existsPath(scan.manifests.pubspec)) return 'flutter'
  return null
}

function detectRequirementDocPath(scan) {
  return (
    scan.existingConfig.rawConfig?.paths?.requirementDoc ||
    inferDocPattern(scan.markdownFiles, ['requirement', '需求']) ||
    `${scan.docsDir}/requirement/{feature}.md` ||
    DEFAULT_REQUIREMENT_DOC
  )
}

function detectPlanDocPath(scan) {
  return (
    scan.existingConfig.rawConfig?.paths?.planDoc ||
    inferDocPattern(scan.markdownFiles, ['plan', '执行计划', '任务执行']) ||
    `${scan.docsDir}/plans/{feature}.md` ||
    DEFAULT_PLAN_DOC
  )
}

function detectProgressFilePath(scan, planDoc) {
  return (
    scan.existingConfig.rawConfig?.paths?.progressFile ||
    planDoc.replace(/\.md$/i, '-progress.json') ||
    DEFAULT_PROGRESS_FILE
  )
}

function detectGates(scan) {
  const scripts = scan.packageScripts || {}

  return {
    lint: pickFirstScript(scripts, ['lint', 'check:lint']),
    test: pickFirstScript(scripts, ['test', 'test:unit', 'vitest']),
    type: pickFirstScript(scripts, ['typecheck', 'check:type', 'type']),
    build: pickFirstScript(scripts, ['build'])
  }
}

function pickFirstScript(scripts, keys) {
  for (const key of keys) {
    if (typeof scripts[key] === 'string' && scripts[key].trim() !== '') {
      return `npm run ${key}`
    }
  }

  return null
}

function detectArchitecture(scan, sourceRoot) {
  const directoryHints = scan.topLevelDirs.includes(sourceRoot)
    ? listSourceSubdirs(scan, sourceRoot)
    : []

  const layers = directoryHints.slice(0, 6).map((dir) => ({
    id: dir,
    label: humanizeLabel(dir),
    path: `${sourceRoot}/${dir}`,
    confidence: 'medium'
  }))

  const notes = [
    `主源码目录推断为 ${sourceRoot}`,
    layers.length > 0
      ? `检测到典型子目录：${layers.map((layer) => layer.path).join('、')}`
      : '未检测到稳定分层线索，规则以保守约束为主'
  ]

  return {
    codeRoots: [sourceRoot],
    layers,
    notes
  }
}

function listSourceSubdirs(scan, sourceRoot) {
  const sourceEntry = scan.topLevelDirs.find((dir) => dir === sourceRoot)
  if (!sourceEntry) return []

  const absolute = resolve(scan.projectRoot, sourceRoot)
  try {
    return readdirSync(absolute, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => entry.name)
  } catch {
    return []
  }
}

function detectPackageManager(lockfiles) {
  if (lockfiles.includes('pnpm-lock.yaml')) return 'pnpm'
  if (lockfiles.includes('yarn.lock')) return 'yarn'
  if (lockfiles.includes('package-lock.json')) return 'npm'
  if (lockfiles.includes('bun.lock') || lockfiles.includes('bun.lockb')) return 'bun'
  return null
}

function detectTestLocation(scan) {
  if (scan.topLevelDirs.includes('tests')) return 'tests/'
  if (scan.sourceRootCandidates.includes('__tests__')) return '__tests__/'
  return null
}

function detectNamedTools(dependencies, candidates) {
  return candidates.filter((name) => dependencies.includes(name))
}

function inferDocPattern(files, keywords) {
  const match = files.find((file) => {
    const lower = file.toLowerCase()
    return keywords.some((keyword) => lower.includes(keyword.toLowerCase()))
  })

  if (!match) return null

  if (match.includes('/requirement/')) {
    return match.replace(/\/[^/]+\.md$/, '/{feature}.md')
  }

  if (match.includes('/plans/')) {
    return match.replace(/\/[^/]+\.md$/, '/{feature}.md')
  }

  return match
}

function detectPatternSource(pattern, markdownFiles) {
  if (markdownFiles.includes(pattern)) {
    return pattern
  }

  return null
}

function humanizeLabel(value) {
  return value
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function existsPath(value) {
  return typeof value === 'string' && value.length > 0 && existsSync(value)
}
