import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import { parseArgs } from './config-utils.ts'
import { exitWithJsonError as err, printJson as out } from './json-cli.ts'
import { getSafeCwd } from './resolve-context.ts'

type JsonObject = Record<string, unknown>

export interface EvalToolCall {
  name: string
  args?: Record<string, unknown>
}

export interface EvalCaseExpectation {
  exact?: string
  mustInclude?: string[]
  mustNotInclude?: string[]
  requiredToolCalls?: EvalToolCall[]
  forbiddenToolCalls?: string[]
}

export interface EvalCase {
  id: string
  input: string
  expected: EvalCaseExpectation
  tags?: string[]
  notes?: string
}

export interface EvalSpec {
  name: string
  datasets: string[]
  thresholds?: {
    passRate?: number
    regressionPassRate?: number
  }
}

export interface EvalResultItem {
  id: string
  output: string
  toolCalls?: EvalToolCall[]
  metadata?: Record<string, unknown>
}

export interface EvalRunCaseResult {
  id: string
  passed: boolean
  dataset: string
  tags: string[]
  checks: {
    exactMatch: boolean | null
    requiredFragments: {
      passed: boolean
      missing: string[]
    }
    forbiddenFragments: {
      passed: boolean
      found: string[]
    }
    requiredToolCalls: {
      passed: boolean
      missing: EvalToolCall[]
    }
    forbiddenToolCalls: {
      passed: boolean
      found: string[]
    }
  }
  output: string
}

export interface EvalRunSummary {
  ok: true
  spec: string
  runLabel: string
  createdAt: string
  datasetTotals: Array<{
    dataset: string
    total: number
    passed: number
    failed: number
    passRate: number
  }>
  totals: {
    total: number
    passed: number
    failed: number
    passRate: number
    regressionPassRate: number | null
  }
  failures: EvalRunCaseResult[]
  cases: EvalRunCaseResult[]
}

export interface EvalThresholdCheck {
  ok: boolean
  checks: Array<{
    metric: 'passRate' | 'regressionPassRate'
    actual: number | null
    expected: number
    passed: boolean
  }>
}

interface LoadedDataset {
  name: string
  path: string
  cases: EvalCase[]
}

interface EvalWorkspace {
  rootDir: string
  evalsDir: string
  datasetsDir: string
  specsDir: string
  runsDir: string
  historyPath: string
}

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function readJson<T>(filePath: string): T {
  return JSON.parse(readFileSync(filePath, 'utf8')) as T
}

function readJsonl(filePath: string): unknown[] {
  const lines = readFileSync(filePath, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  return lines.map((line, index) => {
    try {
      return JSON.parse(line)
    } catch (error) {
      throw new Error(`JSONL 解析失败: ${filePath} 第 ${index + 1} 行`)
    }
  })
}

function ensureStringArray(value: unknown, field: string, caseId: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error(`样本 ${caseId} 的 ${field} 必须是 string[]`)
  }

  return value
}

function parseEvalToolCall(value: unknown, field: string, caseId: string): EvalToolCall {
  if (!isObject(value) || typeof value.name !== 'string') {
    throw new Error(`样本 ${caseId} 的 ${field} 条目必须包含 name:string`)
  }

  if (value.args !== undefined && !isObject(value.args)) {
    throw new Error(`样本 ${caseId} 的 ${field}.args 必须是对象`)
  }

  return {
    name: value.name,
    args: value.args as Record<string, unknown> | undefined,
  }
}

function parseEvalCase(value: unknown, filePath: string, lineNumber: number): EvalCase {
  if (!isObject(value)) {
    throw new Error(`样本文件 ${filePath} 第 ${lineNumber} 行必须是对象`)
  }

  const caseId = value.id
  if (typeof caseId !== 'string' || caseId.trim() === '') {
    throw new Error(`样本文件 ${filePath} 第 ${lineNumber} 行缺少 id`)
  }

  if (typeof value.input !== 'string' || value.input.trim() === '') {
    throw new Error(`样本 ${caseId} 缺少 input`)
  }

  if (!isObject(value.expected)) {
    throw new Error(`样本 ${caseId} 缺少 expected 对象`)
  }

  const expected = value.expected
  const parsed: EvalCase = {
    id: caseId,
    input: value.input,
    expected: {},
  }

  if (expected.exact !== undefined) {
    if (typeof expected.exact !== 'string') {
      throw new Error(`样本 ${caseId} 的 expected.exact 必须是字符串`)
    }
    parsed.expected.exact = expected.exact
  }

  if (expected.mustInclude !== undefined) {
    parsed.expected.mustInclude = ensureStringArray(expected.mustInclude, 'expected.mustInclude', caseId)
  }

  if (expected.mustNotInclude !== undefined) {
    parsed.expected.mustNotInclude = ensureStringArray(expected.mustNotInclude, 'expected.mustNotInclude', caseId)
  }

  if (expected.requiredToolCalls !== undefined) {
    if (!Array.isArray(expected.requiredToolCalls)) {
      throw new Error(`样本 ${caseId} 的 expected.requiredToolCalls 必须是数组`)
    }
    parsed.expected.requiredToolCalls = expected.requiredToolCalls.map((item) =>
      parseEvalToolCall(item, 'expected.requiredToolCalls', caseId),
    )
  }

  if (expected.forbiddenToolCalls !== undefined) {
    parsed.expected.forbiddenToolCalls = ensureStringArray(expected.forbiddenToolCalls, 'expected.forbiddenToolCalls', caseId)
  }

  if (
    parsed.expected.exact === undefined
    && parsed.expected.mustInclude === undefined
    && parsed.expected.mustNotInclude === undefined
    && parsed.expected.requiredToolCalls === undefined
    && parsed.expected.forbiddenToolCalls === undefined
  ) {
    throw new Error(`样本 ${caseId} 至少需要一个 expected 约束`)
  }

  if (value.tags !== undefined) {
    parsed.tags = ensureStringArray(value.tags, 'tags', caseId)
  }

  if (value.notes !== undefined) {
    if (typeof value.notes !== 'string') {
      throw new Error(`样本 ${caseId} 的 notes 必须是字符串`)
    }
    parsed.notes = value.notes
  }

  return parsed
}

function parseEvalSpec(value: unknown, filePath: string): EvalSpec {
  if (!isObject(value)) {
    throw new Error(`Spec 文件 ${filePath} 必须是对象`)
  }

  if (typeof value.name !== 'string' || value.name.trim() === '') {
    throw new Error(`Spec 文件 ${filePath} 缺少 name`)
  }

  if (!Array.isArray(value.datasets) || value.datasets.some((item) => typeof item !== 'string')) {
    throw new Error(`Spec 文件 ${filePath} 的 datasets 必须是 string[]`)
  }

  const spec: EvalSpec = {
    name: value.name,
    datasets: value.datasets,
  }

  if (value.thresholds !== undefined) {
    if (!isObject(value.thresholds)) {
      throw new Error(`Spec 文件 ${filePath} 的 thresholds 必须是对象`)
    }
    const { passRate, regressionPassRate } = value.thresholds

    if (passRate !== undefined && typeof passRate !== 'number') {
      throw new Error(`Spec 文件 ${filePath} 的 thresholds.passRate 必须是数字`)
    }

    if (regressionPassRate !== undefined && typeof regressionPassRate !== 'number') {
      throw new Error(`Spec 文件 ${filePath} 的 thresholds.regressionPassRate 必须是数字`)
    }

    spec.thresholds = {
      passRate: passRate as number | undefined,
      regressionPassRate: regressionPassRate as number | undefined,
    }
  }

  return spec
}

export function resolveEvalWorkspace(cwd = getSafeCwd()): EvalWorkspace {
  const rootDir = cwd
  const evalsDir = resolve(rootDir, 'hxflow', 'evals')

  return {
    rootDir,
    evalsDir,
    datasetsDir: resolve(evalsDir, 'datasets'),
    specsDir: resolve(evalsDir, 'specs'),
    runsDir: resolve(evalsDir, 'runs'),
    historyPath: resolve(evalsDir, 'runs', 'history.json'),
  }
}

export function loadEvalSpec(specName = 'default', workspace = resolveEvalWorkspace()): EvalSpec {
  const specPath = resolve(workspace.specsDir, `${specName}.json`)
  if (!existsSync(specPath)) {
    throw new Error(`未找到 eval spec: ${specPath}`)
  }

  return parseEvalSpec(readJson(specPath), specPath)
}

export function loadDataset(datasetName: string, workspace = resolveEvalWorkspace()): LoadedDataset {
  const datasetPath = resolve(workspace.datasetsDir, `${datasetName}.jsonl`)
  if (!existsSync(datasetPath)) {
    throw new Error(`未找到数据集: ${datasetPath}`)
  }

  const rawItems = readJsonl(datasetPath)
  const cases = rawItems.map((item, index) => parseEvalCase(item, datasetPath, index + 1))

  const ids = new Set<string>()
  for (const item of cases) {
    if (ids.has(item.id)) {
      throw new Error(`数据集 ${datasetName} 中存在重复 id: ${item.id}`)
    }
    ids.add(item.id)
  }

  return {
    name: datasetName,
    path: datasetPath,
    cases,
  }
}

export function loadSpecDatasets(specName = 'default', workspace = resolveEvalWorkspace()): {
  spec: EvalSpec
  datasets: LoadedDataset[]
} {
  const spec = loadEvalSpec(specName, workspace)
  const datasets = spec.datasets.map((datasetName) => loadDataset(datasetName, workspace))
  const caseIds = new Set<string>()

  for (const dataset of datasets) {
    for (const item of dataset.cases) {
      if (caseIds.has(item.id)) {
        throw new Error(`Spec ${spec.name} 存在跨数据集重复 id: ${item.id}`)
      }
      caseIds.add(item.id)
    }
  }

  return { spec, datasets }
}

function partialArgsMatch(expected: Record<string, unknown> | undefined, actual: Record<string, unknown> | undefined) {
  if (!expected) return true
  if (!actual) return false

  for (const [key, value] of Object.entries(expected)) {
    if (!(key in actual) || actual[key] !== value) {
      return false
    }
  }

  return true
}

function matchToolCall(expected: EvalToolCall, actual: EvalToolCall): boolean {
  return expected.name === actual.name && partialArgsMatch(expected.args, actual.args)
}

function scoreCase(item: EvalCase, datasetName: string, result: EvalResultItem | undefined): EvalRunCaseResult {
  const output = result?.output ?? ''
  const toolCalls = result?.toolCalls ?? []

  const exactMatch = item.expected.exact === undefined ? null : output === item.expected.exact
  const missing = (item.expected.mustInclude ?? []).filter((fragment) => !output.includes(fragment))
  const foundForbidden = (item.expected.mustNotInclude ?? []).filter((fragment) => output.includes(fragment))
  const missingToolCalls = (item.expected.requiredToolCalls ?? []).filter((expectedCall) =>
    !toolCalls.some((actualCall) => matchToolCall(expectedCall, actualCall)),
  )
  const foundForbiddenToolCalls = (item.expected.forbiddenToolCalls ?? []).filter((forbiddenName) =>
    toolCalls.some((actualCall) => actualCall.name === forbiddenName),
  )

  const passed = (exactMatch ?? true)
    && missing.length === 0
    && foundForbidden.length === 0
    && missingToolCalls.length === 0
    && foundForbiddenToolCalls.length === 0

  return {
    id: item.id,
    passed,
    dataset: datasetName,
    tags: item.tags ?? [],
    checks: {
      exactMatch,
      requiredFragments: {
        passed: missing.length === 0,
        missing,
      },
      forbiddenFragments: {
        passed: foundForbidden.length === 0,
        found: foundForbidden,
      },
      requiredToolCalls: {
        passed: missingToolCalls.length === 0,
        missing: missingToolCalls,
      },
      forbiddenToolCalls: {
        passed: foundForbiddenToolCalls.length === 0,
        found: foundForbiddenToolCalls,
      },
    },
    output,
  }
}

function parseResultsFile(filePath: string): EvalResultItem[] {
  const raw = readJson<unknown>(filePath)
  const list = Array.isArray(raw)
    ? raw
    : isObject(raw) && Array.isArray(raw.results)
      ? raw.results
      : null

  if (!list) {
    throw new Error(`结果文件必须是数组，或包含 results 数组: ${filePath}`)
  }

  return list.map((item, index) => {
    if (!isObject(item) || typeof item.id !== 'string' || typeof item.output !== 'string') {
      throw new Error(`结果文件 ${filePath} 第 ${index + 1} 条必须包含 id/output`)
    }

    if (item.toolCalls !== undefined) {
      if (!Array.isArray(item.toolCalls)) {
        throw new Error(`结果文件 ${filePath} 第 ${index + 1} 条的 toolCalls 必须是数组`)
      }
    }

    return {
      id: item.id,
      output: item.output,
      toolCalls: (item.toolCalls ?? []).map((toolCall) => parseEvalToolCall(toolCall, 'toolCalls', String(item.id))),
      metadata: isObject(item.metadata) ? item.metadata as Record<string, unknown> : undefined,
    }
  })
}

export function scoreEvalResults(
  resultsFilePath: string,
  specName = 'default',
  workspace = resolveEvalWorkspace(),
): EvalRunSummary {
  const { spec, datasets } = loadSpecDatasets(specName, workspace)
  const results = parseResultsFile(resultsFilePath)
  const resultsById = new Map(results.map((item) => [item.id, item]))
  const cases = datasets.flatMap((dataset) =>
    dataset.cases.map((item) => scoreCase(item, dataset.name, resultsById.get(item.id))),
  )

  const datasetTotals = datasets.map((dataset) => {
    const scopedCases = cases.filter((item) => item.dataset === dataset.name)
    const passed = scopedCases.filter((item) => item.passed).length
    const total = scopedCases.length

    return {
      dataset: dataset.name,
      total,
      passed,
      failed: total - passed,
      passRate: total === 0 ? 1 : passed / total,
    }
  })

  const passed = cases.filter((item) => item.passed).length
  const regressionDataset = datasetTotals.find((item) => item.dataset === 'regressions')

  return {
    ok: true,
    spec: spec.name,
    runLabel: resultsFilePath,
    createdAt: new Date().toISOString(),
    datasetTotals,
    totals: {
      total: cases.length,
      passed,
      failed: cases.length - passed,
      passRate: cases.length === 0 ? 1 : passed / cases.length,
      regressionPassRate: regressionDataset ? regressionDataset.passRate : null,
    },
    failures: cases.filter((item) => !item.passed),
    cases,
  }
}

export function checkEvalThresholds(summary: EvalRunSummary, specName = 'default', workspace = resolveEvalWorkspace()): EvalThresholdCheck {
  const spec = loadEvalSpec(specName, workspace)
  const checks: EvalThresholdCheck['checks'] = []

  if (spec.thresholds?.passRate !== undefined) {
    checks.push({
      metric: 'passRate',
      actual: summary.totals.passRate,
      expected: spec.thresholds.passRate,
      passed: summary.totals.passRate >= spec.thresholds.passRate,
    })
  }

  if (spec.thresholds?.regressionPassRate !== undefined) {
    const actual = summary.totals.regressionPassRate
    checks.push({
      metric: 'regressionPassRate',
      actual,
      expected: spec.thresholds.regressionPassRate,
      passed: actual !== null && actual >= spec.thresholds.regressionPassRate,
    })
  }

  return {
    ok: checks.every((item) => item.passed),
    checks,
  }
}

function ensureDir(filePath: string) {
  mkdirSync(dirname(filePath), { recursive: true })
}

export function appendRunHistory(summary: EvalRunSummary, historyPath: string) {
  ensureDir(historyPath)
  const history = existsSync(historyPath) ? readJson<unknown>(historyPath) : []

  if (!Array.isArray(history)) {
    throw new Error(`历史文件必须是数组: ${historyPath}`)
  }

  history.push({
    createdAt: summary.createdAt,
    runLabel: summary.runLabel,
    spec: summary.spec,
    totals: summary.totals,
    datasetTotals: summary.datasetTotals,
  })

  writeFileSync(historyPath, JSON.stringify(history, null, 2), 'utf8')
}

export function buildTrendReport(historyPath: string) {
  const history = existsSync(historyPath) ? readJson<unknown>(historyPath) : []
  if (!Array.isArray(history)) {
    throw new Error(`历史文件必须是数组: ${historyPath}`)
  }

  const entries = history.filter(isObject)
  const latest = entries.at(-1)
  const previous = entries.length >= 2 ? entries.at(-2) : undefined

  const latestPassRate = isObject(latest?.totals) && typeof latest.totals.passRate === 'number'
    ? latest.totals.passRate
    : null
  const previousPassRate = isObject(previous?.totals) && typeof previous.totals.passRate === 'number'
    ? previous.totals.passRate
    : null

  return {
    ok: true,
    historyFile: historyPath,
    totalRuns: entries.length,
    latest: latest ?? null,
    delta: latestPassRate !== null && previousPassRate !== null
      ? {
        passRate: latestPassRate - previousPassRate,
      }
      : null,
  }
}

export function buildMarkdownSummary(summary: EvalRunSummary, thresholdCheck?: EvalThresholdCheck) {
  const datasetLines = summary.datasetTotals.map((dataset) =>
    `| ${dataset.dataset} | ${dataset.total} | ${dataset.passed} | ${dataset.failed} | ${dataset.passRate.toFixed(2)} |`,
  )

  const failureLines = summary.failures.length === 0
    ? ['- 无']
    : summary.failures.slice(0, 10).map((failure) =>
      `- \`${failure.id}\` [${failure.dataset}] missing=${failure.checks.requiredFragments.missing.join(', ') || '-'} forbidden=${failure.checks.forbiddenFragments.found.join(', ') || '-'}`,
    )

  const thresholdLines = !thresholdCheck || thresholdCheck.checks.length === 0
    ? ['- 未配置 thresholds']
    : thresholdCheck.checks.map((item) =>
      `- ${item.metric}: actual=${item.actual === null ? 'null' : item.actual.toFixed(2)} expected=${item.expected.toFixed(2)} status=${item.passed ? 'pass' : 'fail'}`,
    )

  return [
    '# HX Evals Summary',
    '',
    `- Spec: \`${summary.spec}\``,
    `- Run: \`${summary.runLabel}\``,
    `- Total: ${summary.totals.total}`,
    `- Passed: ${summary.totals.passed}`,
    `- Failed: ${summary.totals.failed}`,
    `- Pass rate: ${summary.totals.passRate.toFixed(2)}`,
    `- Regression pass rate: ${summary.totals.regressionPassRate === null ? 'null' : summary.totals.regressionPassRate.toFixed(2)}`,
    '',
    '## Dataset Breakdown',
    '',
    '| Dataset | Total | Passed | Failed | Pass Rate |',
    '| --- | ---: | ---: | ---: | ---: |',
    ...datasetLines,
    '',
    '## Thresholds',
    '',
    ...thresholdLines,
    '',
    '## Failures',
    '',
    ...failureLines,
    '',
  ].join('\n')
}

export function extractFailureCandidates(runFilePath: string) {
  const run = readJson<EvalRunSummary>(runFilePath)
  if (!run || !Array.isArray(run.failures)) {
    throw new Error(`run 文件格式不正确: ${runFilePath}`)
  }

  return run.failures.map((failure) => ({
    id: `candidate.${failure.id}`,
    input: `回归候选：${failure.id}`,
    expected: {
      mustInclude: failure.checks.requiredFragments.missing,
      mustNotInclude: failure.checks.forbiddenFragments.found,
      requiredToolCalls: failure.checks.requiredToolCalls.missing,
      forbiddenToolCalls: failure.checks.forbiddenToolCalls.found,
    },
    notes: '从失败 run 自动提取，入库前需要人工校正 expected。',
    tags: ['candidate', 'regression'],
    actualOutput: failure.output,
  }))
}

export function writeJsonl(filePath: string, items: unknown[]) {
  ensureDir(filePath)
  const content = items.map((item) => JSON.stringify(item)).join('\n')
  writeFileSync(filePath, content === '' ? '' : `${content}\n`, 'utf8')
}

export function buildOpenAIEvalsPayload(specName = 'default', workspace = resolveEvalWorkspace()) {
  const { spec, datasets } = loadSpecDatasets(specName, workspace)
  const allCases = datasets.flatMap((dataset) =>
    dataset.cases.map((item) => ({
      item: {
        id: item.id,
        input: item.input,
        expected: item.expected,
        tags: item.tags ?? [],
        dataset: dataset.name,
        notes: item.notes ?? '',
      },
    })),
  )

  return {
    eval: {
      name: spec.name,
      data_source_config: {
        type: 'custom',
        schema: {
          type: 'object',
          properties: {
            item: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                input: { type: 'string' },
                expected: { type: 'object' },
                tags: { type: 'array', items: { type: 'string' } },
                dataset: { type: 'string' },
                notes: { type: 'string' },
              },
              required: ['id', 'input', 'expected', 'dataset'],
            },
          },
          required: ['item'],
        },
      },
      testing_criteria: [
        {
          type: 'label_model',
          name: 'instruction_following',
          input: [
            {
              role: 'developer',
              content:
                'Judge whether the sample output follows the expected constraints. Prefer pass/fail. Check mustInclude, mustNotInclude, and tool-call expectations against the sample output.',
            },
            {
              role: 'user',
              content:
                'Input: {{item.input}}\nExpected: {{item.expected}}\nOutput: {{sample.output_text}}',
            },
          ],
          passing_labels: ['pass'],
        },
      ],
    },
    run: {
      data_source: {
        type: 'jsonl',
        source: {
          type: 'file_content',
          content: allCases,
        },
      },
    },
    notes: [
      '官方文档建议持续评测，把生产失败样本回灌到 regressions 数据集。',
      '创建 eval 与运行 run 的接口见 platform.openai.com/docs/guides/evals 与 API reference。',
      '请根据你的真实 agent 输出结构，把 sample.output_text / tool call 字段映射到实际 schema。',
    ],
  }
}

function writeJsonFile(filePath: string, value: unknown) {
  ensureDir(filePath)
  writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf8')
}

function cli(argv = process.argv.slice(2)) {
  const cwd = getSafeCwd()
  const [sub, ...rest] = argv
  const { positional, options } = parseArgs(rest)
  const workspace = resolveEvalWorkspace(cwd)

  switch (sub) {
    case 'validate': {
      const specName = typeof options.spec === 'string' ? options.spec : 'default'
      const { spec, datasets } = loadSpecDatasets(specName, workspace)
      out({
        ok: true,
        spec: spec.name,
        datasets: datasets.map((dataset) => ({
          name: dataset.name,
          path: dataset.path,
          total: dataset.cases.length,
        })),
      })
      break
    }

    case 'score': {
      const [resultsFile] = positional
      if (!resultsFile) err('用法：bun hxflow/scripts/lib/evals.ts score <resultsFile> [--spec default] [--write-run <path>] [--record]')

      const specName = typeof options.spec === 'string' ? options.spec : 'default'
      const summary = scoreEvalResults(resolve(cwd, resultsFile), specName, workspace)
      const thresholdCheck = checkEvalThresholds(summary, specName, workspace)

      if (typeof options['write-run'] === 'string') {
        writeJsonFile(resolve(cwd, options['write-run']), summary)
      }

      if (typeof options['write-summary'] === 'string') {
        writeFileSync(resolve(cwd, options['write-summary']), buildMarkdownSummary(summary, thresholdCheck), 'utf8')
      }

      if (options.record) {
        appendRunHistory(summary, workspace.historyPath)
      }

      if (options['assert-thresholds'] && !thresholdCheck.ok) {
        console.log(JSON.stringify({
          ...summary,
          thresholdCheck,
        }, null, 2))
        process.exit(1)
      }

      out(summary)
      break
    }

    case 'report': {
      const historyPath = typeof options.history === 'string'
        ? resolve(cwd, options.history)
        : workspace.historyPath
      out(buildTrendReport(historyPath))
      break
    }

    case 'extract-failures': {
      const [runFile] = positional
      if (!runFile) err('用法：bun hxflow/scripts/lib/evals.ts extract-failures <runFile> [--output <path>]')

      const candidates = extractFailureCandidates(resolve(cwd, runFile))
      if (typeof options.output === 'string') {
        writeJsonl(resolve(cwd, options.output), candidates)
      }
      out({ ok: true, total: candidates.length, candidates })
      break
    }

    case 'openai-payload': {
      const specName = typeof options.spec === 'string' ? options.spec : 'default'
      const payload = buildOpenAIEvalsPayload(specName, workspace)
      if (typeof options.output === 'string') {
        writeJsonFile(resolve(cwd, options.output), payload)
      }
      out(payload)
      break
    }

    case undefined:
      err('用法：bun hxflow/scripts/lib/evals.ts <validate|score|report|extract-failures|openai-payload> ...')

    default:
      err(`未知子命令 "${sub}"`)
  }
}

if (import.meta.main) {
  try {
    cli()
  } catch (error) {
    err(error instanceof Error ? error.message : String(error))
  }
}
