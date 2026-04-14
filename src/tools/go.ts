#!/usr/bin/env node

/**
 * go.ts — 流水线事实工具
 *
 * 用法：
 *   bun src/tools/go.ts next <feature> [--from <step>]    返回下一步及对应裸脚本
 *   bun src/tools/go.ts state <feature>                   返回流水线完整状态
 *   bun src/tools/go.ts hooks <command>                   返回命令的 hook 链
 *   bun src/tools/go.ts resolve <command>                 返回命令的三层解析结果
 *
 * AI 读取结果后自行调用对应裸脚本。
 */

import { parseArgs } from '../lib/config-utils.ts'
import { findProjectRoot, getSafeCwd } from '../lib/resolve-context.ts'
import { getPipelineFullState, resolveStartStep, commandToToolScript } from '../lib/pipeline-runner.ts'
import { discoverHooks } from '../lib/hook-runner.ts'
import { resolveCommand } from '../lib/command-resolver.ts'

const argv = process.argv.slice(2)
const [sub, ...rest] = argv
const { positional, options } = parseArgs(rest)
const [feature] = positional

function out(data: unknown) {
  console.log(JSON.stringify(data, null, 2))
}

function err(message: string): never {
  console.error(JSON.stringify({ ok: false, error: message }))
  process.exit(1)
}

const projectRoot = findProjectRoot(getSafeCwd())

switch (sub) {
  case 'next': {
    if (!feature) err('用法：bun src/tools/go.ts next <feature> [--from <step>]')

    const fromStep = (options.from as string) ?? null

    let result: { stepId: string; toolScript: string; pipeline: string }
    try {
      result = resolveStartStep(projectRoot, feature, fromStep)
    } catch (error) {
      err(error instanceof Error ? error.message : String(error))
    }

    const state = getPipelineFullState(projectRoot, feature)

    out({
      ok: true,
      feature,
      nextStep: result.stepId,
      toolScript: result.toolScript,
      pipeline: result.pipeline,
      steps: state?.steps.map((s) => ({
        id: s.id,
        name: s.name,
        status: s.status,
        toolScript: s.toolScript,
      })),
    })
    break
  }

  case 'state': {
    if (!feature) err('用法：bun src/tools/go.ts state <feature>')

    const state = getPipelineFullState(projectRoot, feature)
    if (!state) err('Pipeline "default" 未找到')

    out({ ok: true, ...state })
    break
  }

  case 'hooks': {
    if (!feature) err('用法：bun src/tools/go.ts hooks <command>')
    const hookInfo = discoverHooks(feature, projectRoot)
    out({ ok: true, ...hookInfo })
    break
  }

  case 'resolve': {
    if (!feature) err('用法：bun src/tools/go.ts resolve <command>')
    const cmd = resolveCommand(feature, projectRoot)
    if (!cmd) err(`命令 "${feature}" 未找到（三层均不存在）`)
    out({
      ok: true,
      name: cmd.name,
      layer: cmd.layer,
      filePath: cmd.filePath,
    })
    break
  }

  default:
    err(`未知子命令 "${sub ?? ''}"，可用：next / state / hooks / resolve`)
}
