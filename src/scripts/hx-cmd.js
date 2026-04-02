#!/usr/bin/env node

/**
 * hx cmd — 自定义命令管理工具
 *
 * 子命令:
 *   hx cmd new <name> [--description <desc>] [--scope project|user] [--hooks] [--dry-run]
 *   hx cmd list
 *   hx cmd validate [<name>]
 *   hx cmd remove <name> [--force]
 */

import { execFileSync } from 'child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, resolve } from 'path'
import * as readline from 'readline'
import { fileURLToPath } from 'url'

import { parseArgs } from './lib/config-utils.js'
import { generateSkillFilesForAgent, getAgentSkillDir, loadCommandSpecs, SUPPORTED_AGENTS } from './lib/install-utils.js'
import { FRAMEWORK_ROOT, USER_HX_DIR, findProjectRoot, getSafeCwd } from './lib/resolve-context.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SETUP_SCRIPT = resolve(__dirname, 'hx-setup.js')
const runtimeCwd = getSafeCwd()
const projectRoot = findProjectRoot(runtimeCwd)

const { positional, options } = parseArgs(process.argv.slice(2))
const subcommand = positional[0]

if (!subcommand || options.help) {
  printHelp()
  process.exit(0)
}

switch (subcommand) {
  case 'new':
    await runNew(positional.slice(1), options)
    break
  case 'list':
    runList()
    break
  case 'validate':
    runValidate(positional.slice(1))
    break
  case 'remove':
    runRemove(positional.slice(1), options)
    break
  default:
    console.error(`  未知子命令: ${subcommand}`)
    console.error('  可用子命令: new, list, validate, remove')
    process.exit(1)
}

// ── 子命令实现 ────────────────────────────────────────────────────────────────

async function runNew(args, opts) {
  const rawName = args[0]
  if (!rawName) {
    console.error('  用法: hx cmd new <name> [--description <desc>] [--scope project|user] [--hooks]')
    process.exit(1)
  }

  const name = rawName.startsWith('hx-') ? rawName : `hx-${rawName}`
  const description = opts.description || opts.d || `${name} 自定义命令`
  const withHooks = Boolean(opts.hooks)
  const scope = await resolveScope(opts.scope)

  if (scope === 'project' && !isValidProjectRoot(projectRoot)) {
    console.error('  错误：未检测到项目根目录（需包含 .hx/config.yaml 或 .git）。')
    console.error('  请在项目根目录下运行此命令，或使用 --scope user 创建用户级命令。')
    process.exit(1)
  }

  const targetDir =
    scope === 'project'
      ? resolve(projectRoot, '.hx', 'commands')
      : resolve(USER_HX_DIR, 'commands')
  const filePath = resolve(targetDir, `${name}.md`)

  if (existsSync(filePath)) {
    console.error(`  命令已存在: ${filePath}`)
    console.error('  如需修改，直接编辑该文件后运行 hx setup 重新生成 Skill 入口。')
    process.exit(1)
  }

  const content = buildCommandTemplate(name, description, withHooks)

  if (opts['dry-run']) {
    console.log(`\n  [dry-run] 将创建 ${filePath}\n`)
    console.log(content)
    return
  }

  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true })
  }

  writeFileSync(filePath, content, 'utf8')
  console.log(`\n  已创建 ${filePath}`)
  console.log('  正在生成 Skill 入口...\n')

  const spec = { name, description, protected: false }
  const summary = { created: [], updated: [], removed: [], skipped: [], warnings: [] }

  const skillRoot = scope === 'project' ? projectRoot : homedir()

  for (const agent of SUPPORTED_AGENTS) {
    const skillDir = resolve(skillRoot, getAgentSkillDir(agent))
    generateSkillFilesForAgent(agent, [spec], skillDir, FRAMEWORK_ROOT, USER_HX_DIR, summary, { createDir: true })
  }

  for (const [title, items, marker] of [
    ['创建', summary.created, '+'],
    ['更新', summary.updated, '~'],
    ['跳过', summary.skipped, '-'],
    ['警告', summary.warnings, '!'],
  ]) {
    if (items.length === 0) continue
    console.log(`  ${title}:`)
    for (const item of items) console.log(`    ${marker} ${item}`)
  }
  console.log('\n  完成。\n')
}

function runList() {
  const userCommandDir = resolve(USER_HX_DIR, 'commands')
  const projectCommandDir = resolve(projectRoot, '.hx', 'commands')
  const userSpecs = loadCommandSpecs(userCommandDir)
  const projectSpecs = loadCommandSpecs(projectCommandDir)

  if (userSpecs.length === 0 && projectSpecs.length === 0) {
    console.log('\n  暂无自定义命令。')
    console.log('  使用 hx cmd new <name> 创建第一个自定义命令。\n')
    return
  }

  console.log('\n  自定义命令:\n')

  if (projectSpecs.length > 0) {
    console.log(`  项目级 (${projectCommandDir.replace(homedir(), '~')}):`)
    for (const spec of projectSpecs) {
      console.log(`    ${spec.name.padEnd(22)} ${spec.description}`)
    }
    console.log('')
  }

  if (userSpecs.length > 0) {
    console.log(`  用户级 (${userCommandDir.replace(homedir(), '~')}):`)
    for (const spec of userSpecs) {
      console.log(`    ${spec.name.padEnd(22)} ${spec.description}`)
    }
    console.log('')
  }
}

function runValidate(args) {
  const userCommandDir = resolve(USER_HX_DIR, 'commands')
  const projectCommandDir = resolve(projectRoot, '.hx', 'commands')
  const filesToCheck = []

  if (args.length > 0) {
    for (const rawName of args) {
      const name = rawName.startsWith('hx-') ? rawName : `hx-${rawName}`
      const projectFile = resolve(projectCommandDir, `${name}.md`)
      const userFile = resolve(userCommandDir, `${name}.md`)
      if (existsSync(projectFile)) {
        filesToCheck.push({ path: projectFile, name, scope: 'project' })
      } else if (existsSync(userFile)) {
        filesToCheck.push({ path: userFile, name, scope: 'user' })
      } else {
        console.error(`  命令文件未找到: ${name}（项目层和用户层均不存在）`)
        process.exit(1)
      }
    }
  } else {
    for (const [dir, scope] of [
      [userCommandDir, 'user'],
      [projectCommandDir, 'project'],
    ]) {
      if (!existsSync(dir)) continue
      for (const file of readdirSync(dir).filter((f) => f.startsWith('hx-') && f.endsWith('.md'))) {
        filesToCheck.push({ path: resolve(dir, file), name: file.replace(/\.md$/, ''), scope })
      }
    }
  }

  if (filesToCheck.length === 0) {
    console.log('\n  暂无自定义命令需要校验。\n')
    return
  }

  let hasErrors = false
  console.log('\n  校验自定义命令:\n')

  for (const { path, name, scope } of filesToCheck) {
    const errors = validateCommandFile(path, name)
    if (errors.length === 0) {
      console.log(`  ✓ ${name} (${scope})`)
    } else {
      hasErrors = true
      console.log(`  ✗ ${name} (${scope})`)
      for (const error of errors) {
        console.log(`      - ${error}`)
      }
    }
  }

  console.log('')
  if (hasErrors) process.exit(1)
}

function runRemove(args, opts) {
  const rawName = args[0]
  if (!rawName) {
    console.error('  用法: hx cmd remove <name> [--force]')
    process.exit(1)
  }

  const name = rawName.startsWith('hx-') ? rawName : `hx-${rawName}`
  const projectFile = resolve(projectRoot, '.hx', 'commands', `${name}.md`)
  const userFile = resolve(USER_HX_DIR, 'commands', `${name}.md`)

  const targets = [
    existsSync(projectFile) && { path: projectFile, scope: 'project' },
    existsSync(userFile) && { path: userFile, scope: 'user' },
  ].filter(Boolean)

  if (targets.length === 0) {
    console.error(`  命令文件未找到: ${name}（项目层和用户层均不存在）`)
    process.exit(1)
  }

  if (!opts.force) {
    console.log('\n  将要删除以下命令文件:')
    for (const { path, scope } of targets) {
      console.log(`    [${scope}] ${path}`)
    }
    console.log('\n  加 --force 参数确认删除。\n')
    return
  }

  for (const { path, scope } of targets) {
    rmSync(path, { force: true })
    console.log(`  已删除 [${scope}] ${path}`)
  }

  console.log('  正在重新生成 Skill 入口...\n')
  runSetup()
}

// ── 工具函数 ──────────────────────────────────────────────────────────────────

function isValidProjectRoot(dir) {
  return existsSync(resolve(dir, '.hx', 'config.yaml')) || existsSync(resolve(dir, '.git'))
}

async function resolveScope(scopeOption) {
  if (scopeOption === 'user') return 'user'
  if (scopeOption === 'project') return 'project'

  if (!process.stdin.isTTY) return 'project'

  return new Promise((resolvePromise) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
    rl.question('  安装范围 [p] 项目级  [u] 用户级 (默认: p): ', (answer) => {
      rl.close()
      resolvePromise(answer.trim().toLowerCase() === 'u' ? 'user' : 'project')
    })
  })
}

function buildCommandTemplate(name, description, withHooks) {
  const lines = [
    '---',
    `name: ${name}`,
    `description: ${description}`,
    `usage: ${name} [options]`,
  ]

  if (withHooks) {
    lines.push('hooks:')
    lines.push('  - pre')
    lines.push('  - post')
  }

  lines.push('---')
  lines.push('')
  lines.push(`# ${name}`)
  lines.push('')
  lines.push('## 目标')
  lines.push('')
  lines.push('（描述该命令的主要目标）')
  lines.push('')
  lines.push('## 执行步骤')
  lines.push('')
  lines.push('1. 读取当前上下文')
  lines.push('2. （执行业务逻辑）')
  lines.push('3. 输出结果')
  lines.push('')
  lines.push('## 约束')
  lines.push('')
  lines.push('- （添加约束条件）')
  lines.push('')

  return lines.join('\n')
}

export function validateCommandFile(filePath, expectedName) {
  let content
  try {
    content = readFileSync(filePath, 'utf8')
  } catch {
    return ['无法读取文件']
  }

  const match = content.match(/^---\n([\s\S]*?)\n---\n/)
  if (!match) {
    return ['缺少 YAML frontmatter（文件应以 --- 开头）']
  }

  const frontmatter = parseFrontmatter(match[1])
  const errors = []

  if (!frontmatter.name) {
    errors.push('frontmatter 缺少 name 字段')
  } else if (frontmatter.name !== expectedName) {
    errors.push(`name 字段 "${frontmatter.name}" 与文件名 "${expectedName}" 不一致`)
  }

  if (!frontmatter.description) {
    errors.push('frontmatter 缺少 description 字段')
  }

  if (frontmatter.protected === 'true') {
    errors.push('自定义命令不应设置 protected: true（该字段仅供框架内置命令使用）')
  }

  return errors
}

export function buildCommandTemplate_exported(name, description, withHooks) {
  return buildCommandTemplate(name, description, withHooks)
}

function parseFrontmatter(raw) {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((meta, line) => {
      const sep = line.indexOf(':')
      if (sep === -1) return meta
      meta[line.slice(0, sep).trim()] = line
        .slice(sep + 1)
        .trim()
        .replace(/^['"]|['"]$/g, '')
      return meta
    }, {})
}

function runSetup() {
  try {
    const output = execFileSync(process.execPath, [SETUP_SCRIPT], {
      cwd: runtimeCwd,
      encoding: 'utf8',
      env: process.env,
    })
    process.stdout.write(output)
  } catch (error) {
    if (error.stdout) process.stdout.write(error.stdout)
    if (error.stderr) process.stderr.write(error.stderr)
    process.exit(error.status || 1)
  }
}

function printHelp() {
  console.log(`
  用法: hx cmd <subcommand> [options]

  子命令:
    new <name>      创建自定义命令（并自动重新生成 Skill 入口）
    list            列出所有自定义命令
    validate        校验自定义命令 frontmatter 格式
    remove <name>   删除自定义命令（并自动重新生成 Skill 入口）

  hx cmd new <name> [选项]:
        --description, -d <desc>  命令描述（默认: <name> 自定义命令）
        --scope project|user      存储层级（默认: project）
        --hooks                   在 frontmatter 中声明 pre/post hooks
        --dry-run                 预览创建内容，不实际写入

  hx cmd validate [<name> ...]:
    不传 name 时校验全部自定义命令。

  hx cmd remove <name> [选项]:
        --force                   确认删除（不传则只显示预览）

  示例:
    hx cmd new deploy
    hx cmd new deploy --description "部署到生产环境" --hooks
    hx cmd new note --scope user
    hx cmd list
    hx cmd validate
    hx cmd validate deploy
    hx cmd remove deploy --force
  `)
}
