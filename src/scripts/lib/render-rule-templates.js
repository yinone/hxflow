import { readFileSync } from 'fs'
import { resolve } from 'path'

import { FRAMEWORK_ROOT } from './resolve-context.js'
import { createDefaultProjectConfig, mergeMissingConfig } from './rule-context.js'

const TEMPLATE_DIR = resolve(FRAMEWORK_ROOT, 'templates')
const AUTO_START = '<!-- hx:auto:start -->'
const AUTO_END = '<!-- hx:auto:end -->'
const MANUAL_START = '<!-- hx:manual:start -->'
const MANUAL_END = '<!-- hx:manual:end -->'

export function renderRuleTemplates(projectFacts, existingConfig = {}) {
  const mergedConfig = mergeMissingConfig(
    buildProjectConfigFromFacts(projectFacts),
    createDefaultProjectConfig()
  )
  const context = buildTemplateContext(projectFacts, mergedConfig)

  return {
    configYaml: renderConfigYaml(mergeMissingConfig(existingConfig, mergedConfig)),
    rules: {
      'golden-rules.md': wrapManagedMarkdown(renderTemplate('golden-rules.md', context)),
      'review-checklist.md': wrapManagedMarkdown(renderTemplate('review-checklist.md', context)),
      'requirement-template.md': wrapManagedMarkdown(renderTemplate('requirement-template.md', context)),
      'plan-template.md': wrapManagedMarkdown(renderTemplate('plan-template.md', context))
    }
  }
}

export function updateManagedMarkdown(existingContent, nextAutoContent) {
  const wrapped = wrapManagedMarkdown(nextAutoContent)
  if (!existingContent) {
    return wrapped
  }

  if (!existingContent.includes(AUTO_START) || !existingContent.includes(AUTO_END)) {
    return wrapped
  }

  return existingContent.replace(
    new RegExp(`${escapeRegExp(AUTO_START)}[\\s\\S]*?${escapeRegExp(AUTO_END)}`),
    `${AUTO_START}\n${nextAutoContent.trim()}\n${AUTO_END}`
  )
}

export function buildProjectConfigFromFacts(projectFacts) {
  const base = createDefaultProjectConfig()
  return {
    ...base,
    schemaVersion: projectFacts.schemaVersion,
    paths: {
      ...base.paths,
      ...projectFacts.paths
    },
    gates: {
      ...base.gates,
      ...projectFacts.gates
    }
  }
}

function wrapManagedMarkdown(autoContent) {
  return [
    AUTO_START,
    autoContent.trim(),
    AUTO_END,
    '',
    MANUAL_START,
    '- 在这里补充项目人工规则或长期沉淀。',
    MANUAL_END,
    ''
  ].join('\n')
}

function readTemplate(name) {
  const templatePath = resolve(TEMPLATE_DIR, name)
  try {
    return readFileSync(templatePath, 'utf8')
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`框架模板文件缺失：${templatePath}，请运行 /hx-upgrade 修复安装。`)
    }
    throw err
  }
}

function renderTemplate(name, context) {
  const template = readTemplate(name)
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? '')
}

function renderConfigYaml(config) {
  const template = readTemplate('config.yaml')

  return template
    .replace('{{SCHEMA_VERSION}}', String(config.schemaVersion))
    .replace('{{SRC_PATH}}', yamlScalar(config.paths.src))
    .replace('{{REQUIREMENT_DOC}}', yamlScalar(config.paths.requirementDoc))
    .replace('{{PLAN_DOC}}', yamlScalar(config.paths.planDoc))
    .replace('{{PROGRESS_FILE}}', yamlScalar(config.paths.progressFile))
    .replace('{{GATE_LINT}}', yamlScalar(config.gates.lint))
    .replace('{{GATE_TEST}}', yamlScalar(config.gates.test))
    .replace('{{GATE_TYPE}}', yamlScalar(config.gates.type))
    .replace('{{GATE_BUILD}}', yamlScalar(config.gates.build))
}

function buildTemplateContext(projectFacts, config) {
  return {
    STACK_SUMMARY: renderStackSummary(projectFacts),
    PATH_SUMMARY: renderPathSummary(config),
    GATE_SUMMARY: renderGateSummary(config),
    PROJECT_FACTS: renderProjectFacts(projectFacts, config),
    IMPLEMENTATION_BOUNDARIES: renderImplementationBoundaries(projectFacts),
    ARCHITECTURE_RULES: renderArchitectureRules(projectFacts),
    ERROR_HANDLING_RULES: renderErrorHandlingRules(projectFacts),
    TEST_RULES: renderTestRules(config),
    CHANGE_CONSTRAINTS: renderChangeConstraints(projectFacts),
    REVIEW_SCOPE: renderReviewScope(projectFacts),
    REVIEW_ARCH: renderReviewArchitecture(projectFacts),
    REVIEW_ERRORS: renderReviewErrors(),
    REVIEW_TESTS: renderReviewTests(config),
    REVIEW_STACK: renderReviewStack(projectFacts),
    REQUIREMENT_TEMPLATE_BODY: renderRequirementTemplateBody(),
    PLAN_TEMPLATE_BODY: renderPlanTemplateBody(config)
  }
}

function renderStackSummary(projectFacts) {
  const stack = projectFacts.stack
  return [
    `- 语言 / 运行时：${compactValues([stack.language, stack.runtime]).join(' / ') || '未识别'}`,
    `- 框架：${stack.frameworks.join('、') || '未识别'}`,
    `- 测试工具：${stack.testFrameworks.join('、') || '未识别'}`,
    `- Lint / Build：${compactValues([
      stack.lintTools.join('、'),
      stack.buildTools.join('、')
    ]).join(' / ') || '未识别'}`
  ].join('\n')
}

function renderPathSummary(config) {
  return [
    `- 主源码目录：\`${config.paths.src}\``,
    `- 需求文档：\`${config.paths.requirementDoc}\``,
    `- 执行计划：\`${config.paths.planDoc}\``,
    `- 进度文件：\`${config.paths.progressFile}\``
  ].join('\n')
}

function renderGateSummary(config) {
  const gates = Object.entries(config.gates)
    .filter(([, command]) => command)
    .map(([name, command]) => `- ${name}: \`${command}\``)

  if (gates.length === 0) {
    return '- 尚未识别到可直接执行的 gate，补充后再用于 hx-qa。'
  }

  return gates.join('\n')
}

function renderProjectFacts(projectFacts, config) {
  return [renderStackSummary(projectFacts), renderPathSummary(config)].join('\n')
}

function renderImplementationBoundaries(projectFacts) {
  const sourceRoot = projectFacts.paths.src
  return [
    `- 默认只修改与当前需求直接相关的目录，主代码根为 \`${sourceRoot}\`。`,
    '- 不因为一次需求顺手重写无关模块；需要额外重构时单独说明理由与影响面。',
    '- 优先沿用项目现有脚手架、脚本命名和目录职责。'
  ].join('\n')
}

function renderArchitectureRules(projectFacts) {
  const layerLines = projectFacts.architecture.layers.map((layer) => `- ${layer.label}：\`${layer.path}\``)
  const notes = projectFacts.architecture.notes.map((note) => `- ${note}`)

  return [...layerLines, ...notes].join('\n') || '- 未识别到稳定架构分层，保持最小改动并遵循就近修改。'
}

function renderErrorHandlingRules(projectFacts) {
  return [
    '- 新增逻辑必须补齐异常路径和空数据分支，不依赖调用方“默认不会出错”。',
    `- 若项目运行时为 ${projectFacts.stack.runtime || '当前栈'}，优先沿用现有错误边界、返回值约定和日志方式。`,
    '- 对外部依赖失败要给出明确可诊断信息，避免吞错。'
  ].join('\n')
}

function renderTestRules(config) {
  const gates = Object.entries(config.gates)
    .filter(([, command]) => command)
    .map(([name, command]) => `- ${name}: \`${command}\``)

  return [
    ...(gates.length > 0 ? gates : ['- 当前未配置 gate，提交前至少补一项基础校验。']),
    '- 涉及行为改动时，同时检查回归路径和失败路径。'
  ].join('\n')
}

function renderChangeConstraints(projectFacts) {
  return [
    `- 路径模板和规则事实以 \`${projectFacts.paths.requirementDoc}\` / \`${projectFacts.paths.planDoc}\` / \`${projectFacts.paths.progressFile}\` 为准。`,
    '- `config.yaml` 仅保存硬变量；解释性规则统一维护在 `rules/*.md`。',
    '- 更新规则时只重算自动区，不覆盖人工区。'
  ].join('\n')
}

function renderReviewScope(projectFacts) {
  return [
    '- 改动是否严格覆盖当前需求范围，没有顺手引入无关重构。',
    `- 是否与 \`${projectFacts.paths.requirementDoc}\` 和 \`${projectFacts.paths.planDoc}\` 中的目标一致。`,
    '- 输出、命名、目录位置是否符合项目现有习惯。'
  ].join('\n')
}

function renderReviewArchitecture(projectFacts) {
  if (projectFacts.architecture.layers.length === 0) {
    return '- 未识别到稳定层级时，重点检查是否在正确目录内最小修改。'
  }

  return projectFacts.architecture.layers
    .map((layer) => `- ${layer.label} 相关改动应留在 \`${layer.path}\` 附近，不跨层乱放文件。`)
    .join('\n')
}

function renderReviewErrors() {
  return [
    '- 失败分支是否有明确处理，不出现静默失败或吞错。',
    '- 新增分支是否补了边界条件、防空值和回退行为。'
  ].join('\n')
}

function renderReviewTests(config) {
  const gates = Object.entries(config.gates)
    .filter(([, command]) => command)
    .map(([name]) => `- 是否执行并通过 ${name} gate。`)

  return [...gates, '- 是否补了最小必要测试或人工验证说明。'].join('\n')
}

function renderReviewStack(projectFacts) {
  const hints = compactValues([
    projectFacts.stack.frameworks.join('、'),
    projectFacts.stack.testFrameworks.join('、')
  ])

  return [
    `- 结合当前技术栈（${hints.join(' / ') || '未识别'}）检查是否违反框架常规约束。`,
    '- 若项目已有固定脚本、目录或约束命名，优先检查是否保持一致。'
  ].join('\n')
}

function renderRequirementTemplateBody() {
  return [
    '## 背景',
    '',
    '## 目标',
    '',
    '## 非目标',
    '',
    '## 范围',
    '',
    '## 验收标准',
    '',
    '## 约束与依赖',
    '',
    '## 待确认问题'
  ].join('\n')
}

function renderPlanTemplateBody(config) {
  return [
    '## 输入事实',
    '',
    '- 需求文档：`' + config.paths.requirementDoc + '`',
    '- 进度文件：`' + config.paths.progressFile + '`',
    '',
    '## 实施策略',
    '',
    '## 任务拆分',
    '',
    '### TASK-01 任务名称',
    '',
    '- 目标：',
    '- 修改范围：',
    '- 实施要点：',
    '- 验收标准：',
    '- 验证方式：',
    '',
    '## 执行顺序',
    '',
    '## 验证方案',
    '',
    '## 风险与回退'
  ].join('\n')
}

function compactValues(values) {
  return values.filter((value) => value && value !== ' / ')
}

function yamlScalar(value) {
  if (value === null || value === undefined || value === '') {
    return 'null'
  }

  return JSON.stringify(value)
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
