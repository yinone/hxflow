import { existsSync, readdirSync, readFileSync, statSync } from 'fs'
import { basename, extname, relative, resolve } from 'path'

import { readProjectConfig } from './rule-context.js'

const MAX_DOC_SCAN = 200
const SOURCE_DIR_CANDIDATES = ['src', 'app', 'lib', 'server', 'packages']
const DOC_DIR_CANDIDATES = ['docs', 'doc']

export function scanProject(projectRoot) {
  const packageJsonPath = resolve(projectRoot, 'package.json')
  const tsconfigPath = resolve(projectRoot, 'tsconfig.json')
  const goModPath = resolve(projectRoot, 'go.mod')
  const pubspecPath = resolve(projectRoot, 'pubspec.yaml')

  const packageJson = existsSync(packageJsonPath)
    ? safeJsonParse(readFileSync(packageJsonPath, 'utf8'))
    : null
  const existingConfig = readProjectConfig(projectRoot)

  return {
    projectRoot,
    manifests: {
      packageJson: packageJsonPath,
      tsconfig: tsconfigPath,
      goMod: goModPath,
      pubspec: pubspecPath
    },
    packageJson,
    packageScripts: packageJson?.scripts || {},
    dependencies: collectPackageDependencies(packageJson),
    lockfiles: detectLockfiles(projectRoot),
    topLevelDirs: listDirectories(projectRoot),
    sourceRootCandidates: detectSourceRoots(projectRoot),
    sourceRoot: detectPrimarySourceRoot(projectRoot),
    docsDir: detectDocsDir(projectRoot),
    markdownFiles: collectMarkdownFiles(projectRoot),
    existingConfig
  }
}

function detectLockfiles(projectRoot) {
  return [
    'pnpm-lock.yaml',
    'package-lock.json',
    'yarn.lock',
    'bun.lockb',
    'bun.lock',
    'go.sum',
    'pubspec.lock'
  ].filter((file) => existsSync(resolve(projectRoot, file)))
}

function detectSourceRoots(projectRoot) {
  return SOURCE_DIR_CANDIDATES
    .map((dir) => resolve(projectRoot, dir))
    .filter(isDirectory)
    .map((dir) => basename(dir))
}

function detectPrimarySourceRoot(projectRoot) {
  const matched = detectSourceRoots(projectRoot)
  return matched[0] || 'src'
}

function detectDocsDir(projectRoot) {
  for (const candidate of DOC_DIR_CANDIDATES) {
    const absolute = resolve(projectRoot, candidate)
    if (isDirectory(absolute)) {
      return candidate
    }
  }

  return 'docs'
}

function listDirectories(projectRoot) {
  return readdirSync(projectRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
}

function collectMarkdownFiles(projectRoot) {
  const results = []

  for (const docsRoot of DOC_DIR_CANDIDATES.map((dir) => resolve(projectRoot, dir))) {
    if (!isDirectory(docsRoot)) continue
    walkMarkdownFiles(docsRoot, results, projectRoot)
    if (results.length >= MAX_DOC_SCAN) break
  }

  return results
}

function walkMarkdownFiles(dir, results, projectRoot) {
  if (results.length >= MAX_DOC_SCAN) return

  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (results.length >= MAX_DOC_SCAN) return
    if (entry.name.startsWith('.')) continue

    const absolute = resolve(dir, entry.name)
    if (entry.isDirectory()) {
      walkMarkdownFiles(absolute, results, projectRoot)
      continue
    }

    if (extname(entry.name).toLowerCase() === '.md') {
      results.push(relativeFromRoot(projectRoot, absolute))
    }
  }
}

function collectPackageDependencies(packageJson) {
  if (!packageJson) return []

  return [
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {})
  ]
}

function isDirectory(targetPath) {
  if (!existsSync(targetPath)) return false
  return statSync(targetPath).isDirectory()
}

function relativeFromRoot(projectRoot, absolutePath) {
  return relative(projectRoot, absolutePath)
}

function safeJsonParse(content) {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}
