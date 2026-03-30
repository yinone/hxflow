import { existsSync, readFileSync } from 'fs'

const SHORT_FLAGS = {
  t: 'target',
  y: 'yes',
  h: 'help',
}

export function parseArgs(argv) {
  const positional = []
  const options = {}

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]

    if (arg.startsWith('-') && !arg.startsWith('--') && arg.length === 2) {
      const longKey = SHORT_FLAGS[arg[1]]
      if (longKey) {
        const next = argv[index + 1]
        if (next && !next.startsWith('-')) {
          options[longKey] = next
          index += 1
        } else {
          options[longKey] = true
        }
      } else {
        positional.push(arg)
      }
      continue
    }

    if (!arg.startsWith('--')) {
      positional.push(arg)
      continue
    }

    const eqIndex = arg.indexOf('=')
    if (eqIndex !== -1) {
      const key = arg.slice(2, eqIndex)
      const value = arg.slice(eqIndex + 1)
      options[key] = value === '' ? true : value
      continue
    }

    const key = arg.slice(2)
    const next = argv[index + 1]
    if (next && !next.startsWith('-')) {
      options[key] = next
      index += 1
      continue
    }

    options[key] = true
  }

  return { positional, options }
}

export function readYamlFile(filePath, fallback = {}) {
  if (!existsSync(filePath)) {
    return fallback
  }

  return parseSimpleYaml(readFileSync(filePath, 'utf8'))
}

export function parseSimpleYaml(content) {
  const lines = preprocessYaml(content)
  if (lines.length === 0) return {}
  const [value] = parseBlock(lines, 0, lines[0].indent)
  return value
}

function preprocessYaml(content) {
  return content
    .split(/\r?\n/)
    .map((line) => stripYamlComment(line))
    .filter((line) => line.trim() !== '')
    .map((line) => ({
      indent: line.match(/^ */)?.[0].length || 0,
      text: line.trimStart()
    }))
}

function stripYamlComment(line) {
  let inSingle = false
  let inDouble = false

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    const previous = index > 0 ? line[index - 1] : ''

    if (char === "'" && !inDouble && previous !== '\\') { inSingle = !inSingle; continue }
    if (char === '"' && !inSingle && previous !== '\\') { inDouble = !inDouble; continue }
    if (char === '#' && !inSingle && !inDouble) {
      if (index === 0 || /\s/.test(previous)) return line.slice(0, index).trimEnd()
    }
  }

  return line
}

function parseBlock(lines, startIndex, indent) {
  const line = lines[startIndex]
  if (!line) return [undefined, startIndex]
  return line.text.startsWith('- ')
    ? parseSequence(lines, startIndex, indent)
    : parseMap(lines, startIndex, indent)
}

function parseMap(lines, startIndex, indent) {
  const result = {}
  let index = startIndex

  while (index < lines.length) {
    const line = lines[index]
    if (line.indent < indent || line.indent !== indent || line.text.startsWith('- ')) break

    const colonIndex = findUnquotedColon(line.text)
    if (colonIndex === -1) throw new Error(`无法解析 YAML 行: ${line.text}`)

    const key = line.text.slice(0, colonIndex).trim()
    const rawValue = line.text.slice(colonIndex + 1).trim()

    if (rawValue !== '') {
      result[key] = parseScalar(rawValue)
      index += 1
      continue
    }

    const nextLine = lines[index + 1]
    if (nextLine && nextLine.indent > indent) {
      const [child, nextIndex] = parseBlock(lines, index + 1, nextLine.indent)
      result[key] = child
      index = nextIndex
      continue
    }

    result[key] = ''
    index += 1
  }

  return [result, index]
}

function parseSequence(lines, startIndex, indent) {
  const result = []
  let index = startIndex

  while (index < lines.length) {
    const line = lines[index]
    if (line.indent < indent || line.indent !== indent || !line.text.startsWith('- ')) break

    const rawValue = line.text.slice(2).trim()
    if (rawValue === '') {
      const nextLine = lines[index + 1]
      if (nextLine && nextLine.indent > indent) {
        const [child, nextIndex] = parseBlock(lines, index + 1, nextLine.indent)
        result.push(child)
        index = nextIndex
      } else {
        result.push(null)
        index += 1
      }
      continue
    }

    const colonIndex = findUnquotedColon(rawValue)
    if (colonIndex === -1) {
      result.push(parseScalar(rawValue))
      index += 1
      continue
    }

    const key = rawValue.slice(0, colonIndex).trim()
    const inlineValue = rawValue.slice(colonIndex + 1).trim()
    const item = { [key]: inlineValue !== '' ? parseScalar(inlineValue) : '' }
    index += 1

    const nextLine = lines[index]
    if (nextLine && nextLine.indent > indent) {
      const [child, nextIndex] = parseBlock(lines, index, nextLine.indent)
      if (isPlainObject(child)) Object.assign(item, child)
      else if (item[key] === '') item[key] = child
      index = nextIndex
    }

    result.push(item)
  }

  return [result, index]
}

function findUnquotedColon(text) {
  let inSingle = false
  let inDouble = false

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]
    const previous = index > 0 ? text[index - 1] : ''

    if (char === "'" && !inDouble && previous !== '\\') { inSingle = !inSingle; continue }
    if (char === '"' && !inSingle && previous !== '\\') { inDouble = !inDouble; continue }
    if (char === ':' && !inSingle && !inDouble) return index
  }

  return -1
}

function parseScalar(value) {
  if (value.startsWith('"') && value.endsWith('"')) return value.slice(1, -1)
  if (value.startsWith("'") && value.endsWith("'")) return value.slice(1, -1)

  if (value.startsWith('[') && value.endsWith(']')) {
    const body = value.slice(1, -1).trim()
    if (!body) return []
    return splitInlineArray(body).map((item) => parseScalar(item.trim()))
  }

  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (/^-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(value)) return Number(value)
  return value
}

function splitInlineArray(value) {
  const items = []
  let current = ''
  let inSingle = false
  let inDouble = false

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const previous = index > 0 ? value[index - 1] : ''

    if (char === "'" && !inDouble && previous !== '\\') { inSingle = !inSingle; current += char; continue }
    if (char === '"' && !inSingle && previous !== '\\') { inDouble = !inDouble; current += char; continue }
    if (char === ',' && !inSingle && !inDouble) { items.push(current); current = ''; continue }
    current += char
  }

  if (current) items.push(current)
  return items
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value)
}
