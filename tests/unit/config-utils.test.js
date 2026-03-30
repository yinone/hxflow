import { describe, expect, it } from 'vitest'

import {
  parseArgs,
  parseSimpleYaml
} from '../../src/scripts/lib/config-utils.js'

// ─── parseArgs ────────────────────────────────────────────────────────────────

describe('parseArgs', () => {
  it('解析位置参数和长选项', () => {
    const { positional, options } = parseArgs(['feature-login', '--skip', '--task=123'])
    expect(positional).toEqual(['feature-login'])
    expect(options).toEqual({ skip: true, task: '123' })
  })

  it('解析短标志 -y 为布尔值 true', () => {
    const { options } = parseArgs(['-y'])
    expect(options.yes).toBe(true)
  })

  it('解析短标志 -h 为布尔值 true', () => {
    const { options } = parseArgs(['-h'])
    expect(options.help).toBe(true)
  })

  it('解析短标志 -t 为 target', () => {
    const { options } = parseArgs(['-t', '/tmp/project'])
    expect(options.target).toBe('/tmp/project')
  })

  it('解析无值的布尔标志', () => {
    const { options } = parseArgs(['--dry-run', '--verbose'])
    expect(options['dry-run']).toBe(true)
    expect(options.verbose).toBe(true)
  })

  it('--key=value 形式', () => {
    const { options } = parseArgs(['--pipeline=custom'])
    expect(options.pipeline).toBe('custom')
  })

  it('--key value 形式', () => {
    const { options } = parseArgs(['--from', 'run'])
    expect(options.from).toBe('run')
  })

  it('空数组返回空结果', () => {
    const { positional, options } = parseArgs([])
    expect(positional).toEqual([])
    expect(options).toEqual({})
  })

  it('多个位置参数', () => {
    const { positional } = parseArgs(['a', 'b', 'c'])
    expect(positional).toEqual(['a', 'b', 'c'])
  })

  it('未识别的短标志当作位置参数', () => {
    const { positional } = parseArgs(['-z'])
    expect(positional).toContain('-z')
  })
})

// ─── parseSimpleYaml · 标量 ───────────────────────────────────────────────────

describe('parseSimpleYaml · 标量', () => {
  it('字符串', () => {
    expect(parseSimpleYaml('key: hello')).toEqual({ key: 'hello' })
  })

  it('双引号字符串', () => {
    expect(parseSimpleYaml('key: "hello world"')).toEqual({ key: 'hello world' })
  })

  it('单引号字符串', () => {
    expect(parseSimpleYaml("key: 'hello world'")).toEqual({ key: 'hello world' })
  })

  it('带斜杠的路径字符串', () => {
    expect(parseSimpleYaml('path: docs/requirement/{feature}.md')).toEqual({
      path: 'docs/requirement/{feature}.md'
    })
  })

  it('带引号的路径字符串', () => {
    expect(parseSimpleYaml('path: "docs/plans/{feature}.md"')).toEqual({
      path: 'docs/plans/{feature}.md'
    })
  })

  it('布尔值 true / false', () => {
    expect(parseSimpleYaml('a: true\nb: false')).toEqual({ a: true, b: false })
  })

  it('null 值', () => {
    expect(parseSimpleYaml('key: null')).toEqual({ key: null })
  })

  it('整数', () => {
    expect(parseSimpleYaml('count: 42')).toEqual({ count: 42 })
  })

  it('负整数', () => {
    expect(parseSimpleYaml('offset: -10')).toEqual({ offset: -10 })
  })

  it('浮点数', () => {
    expect(parseSimpleYaml('ratio: 1.5')).toEqual({ ratio: 1.5 })
  })

  it('科学计数法', () => {
    expect(parseSimpleYaml('big: 1e10')).toEqual({ big: 1e10 })
    expect(parseSimpleYaml('small: 2.5E-3')).toEqual({ small: 2.5e-3 })
  })

  it('空字符串值', () => {
    expect(parseSimpleYaml('key: ')).toEqual({ key: '' })
  })

  it('schemaVersion 解析为数字', () => {
    expect(parseSimpleYaml('schemaVersion: 2')).toEqual({ schemaVersion: 2 })
  })
})

// ─── parseSimpleYaml · 注释 ───────────────────────────────────────────────────

describe('parseSimpleYaml · 注释', () => {
  it('整行注释被忽略', () => {
    expect(parseSimpleYaml('# only comments\n')).toEqual({})
  })

  it('行尾注释被剥离', () => {
    expect(parseSimpleYaml('name: base # trailing comment')).toEqual({ name: 'base' })
  })

  it('引号内的 # 不被当作注释', () => {
    expect(parseSimpleYaml('key: "value # not a comment"')).toEqual({
      key: 'value # not a comment'
    })
  })

  it('单引号内的 # 不被当作注释', () => {
    expect(parseSimpleYaml("key: 'value # not a comment'")).toEqual({
      key: 'value # not a comment'
    })
  })
})

// ─── parseSimpleYaml · 嵌套结构 ───────────────────────────────────────────────

describe('parseSimpleYaml · 嵌套结构', () => {
  it('两层嵌套 map', () => {
    const yaml = [
      'paths:',
      '  src: src',
      '  requirementDoc: docs/requirement/{feature}.md',
    ].join('\n')
    expect(parseSimpleYaml(yaml)).toEqual({
      paths: {
        src: 'src',
        requirementDoc: 'docs/requirement/{feature}.md'
      }
    })
  })

  it('三层嵌套（hooks.run.pre）', () => {
    const yaml = [
      'hooks:',
      '  run:',
      '    pre: []',
      '    post: []',
    ].join('\n')
    expect(parseSimpleYaml(yaml)).toEqual({
      hooks: { run: { pre: [], post: [] } }
    })
  })

  it('gates 包含 null 值', () => {
    const yaml = [
      'gates:',
      '  lint: "npm run lint"',
      '  test: null',
      '  type: null',
      '  build: null',
    ].join('\n')
    expect(parseSimpleYaml(yaml)).toEqual({
      gates: {
        lint: 'npm run lint',
        test: null,
        type: null,
        build: null
      }
    })
  })
})

// ─── parseSimpleYaml · 数组 ───────────────────────────────────────────────────

describe('parseSimpleYaml · 数组', () => {
  it('内联空数组', () => {
    expect(parseSimpleYaml('list: []')).toEqual({ list: [] })
  })

  it('内联非空数组', () => {
    expect(parseSimpleYaml('list: [a, b, c]')).toEqual({ list: ['a', 'b', 'c'] })
  })

  it('块状字符串数组', () => {
    const yaml = [
      'items:',
      '  - one',
      '  - two',
      '  - three',
    ].join('\n')
    expect(parseSimpleYaml(yaml)).toEqual({ items: ['one', 'two', 'three'] })
  })

  it('hooks pre 填写了实际 hook 文件', () => {
    const yaml = [
      'hooks:',
      '  run:',
      '    pre:',
      '      - run-pre.md',
      '    post:',
      '      - run-post.md',
    ].join('\n')
    expect(parseSimpleYaml(yaml)).toEqual({
      hooks: {
        run: {
          pre: ['run-pre.md'],
          post: ['run-post.md']
        }
      }
    })
  })
})

// ─── parseSimpleYaml · 换行与空白 ─────────────────────────────────────────────

describe('parseSimpleYaml · 换行与空白', () => {
  it('Windows CRLF 换行', () => {
    expect(parseSimpleYaml('name: base\r\nversion: 1\r\n')).toEqual({
      name: 'base',
      version: 1
    })
  })

  it('空字符串返回空对象', () => {
    expect(parseSimpleYaml('')).toEqual({})
  })

  it('仅空白行返回空对象', () => {
    expect(parseSimpleYaml('   \n   \n')).toEqual({})
  })
})

// ─── parseSimpleYaml · 完整 config.yaml 结构 ──────────────────────────────────

describe('parseSimpleYaml · 完整 config.yaml 结构', () => {
  it('能完整解析框架生成的 config.yaml 样本', () => {
    const yaml = `
# Harness Workflow 项目级配置
schemaVersion: 2

paths:
  src: "src"
  requirementDoc: "docs/requirement/{feature}.md"
  planDoc: "docs/plans/{feature}.md"
  progressFile: "docs/plans/{feature}-progress.json"

gates:
  lint: "npm run lint"
  test: "npm run test"
  type: null
  build: null

hooks:
  doc:
    pre: []
    post: []
  plan:
    pre: []
    post: []
  run:
    pre:
      - run-pre.md
    post: []
  review:
    pre: []
    post: []
  fix:
    pre: []
    post: []
  clean:
    pre: []
    post: []
  mr:
    pre: []
    post: []
`.trim()

    const result = parseSimpleYaml(yaml)

    expect(result.schemaVersion).toBe(2)
    expect(result.paths.src).toBe('src')
    expect(result.paths.requirementDoc).toBe('docs/requirement/{feature}.md')
    expect(result.paths.progressFile).toBe('docs/plans/{feature}-progress.json')
    expect(result.gates.lint).toBe('npm run lint')
    expect(result.gates.type).toBeNull()
    expect(result.hooks.doc.pre).toEqual([])
    expect(result.hooks.run.pre).toEqual(['run-pre.md'])
    expect(result.hooks.mr.post).toEqual([])
  })
})
