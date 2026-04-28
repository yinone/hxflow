import { parseArgs } from './config-utils.ts'
import { findProjectRoot, getSafeCwd } from './resolve-context.ts'

/**
 * 有子命令的工具入口（如 doc context / doc validate）。
 */
export function createToolContext(argv = process.argv.slice(2)) {
  const [sub, ...rest] = argv
  const { positional, options } = parseArgs(rest)
  const cwd = typeof options.cwd === 'string' ? options.cwd : getSafeCwd()

  return {
    cwd,
    sub,
    rest,
    positional,
    options,
    projectRoot: findProjectRoot(cwd),
  }
}

/**
 * 无子命令的工具入口（如 init）。
 */
export function createSimpleContext(argv = process.argv.slice(2)) {
  const { positional, options } = parseArgs(argv)
  const cwd = typeof options.cwd === 'string' ? options.cwd : getSafeCwd()

  return {
    cwd,
    positional,
    options,
    projectRoot: findProjectRoot(cwd),
  }
}
