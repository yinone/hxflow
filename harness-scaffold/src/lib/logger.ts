// src/lib/logger.ts
// 结构化日志封装（GP-001, GP-002）
// 替换 console.log，输出 JSON 格式，便于 Agent 读取和告警系统解析

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  message: string
  timestamp: string
  [key: string]: unknown
}

function log(level: LogLevel, fields: Record<string, unknown>): void {
  const { message = '', ...rest } = fields
  const entry: LogEntry = {
    level,
    message: String(message),
    timestamp: new Date().toISOString(),
    ...rest
  }
  // 生产环境输出 JSON，开发环境可格式化输出
  const output = process.env.NODE_ENV === 'production'
    ? JSON.stringify(entry)
    : `[${level.toUpperCase()}] ${entry.timestamp} ${entry.message} ${
        Object.keys(rest).length ? JSON.stringify(rest) : ''
      }`

  if (level === 'error') {
    process.stderr.write(output + '\n')
  } else {
    process.stdout.write(output + '\n')
  }
}

export const logger = {
  debug: (fields: Record<string, unknown>) => log('debug', fields),
  info:  (fields: Record<string, unknown>) => log('info',  fields),
  warn:  (fields: Record<string, unknown>) => log('warn',  fields),
  error: (fields: Record<string, unknown>) => log('error', fields),
} as const

// ── 使用示例（GP-002 规范字段）─────────────────────────────────
// logger.info({ userId, action: 'login', durationMs, ip })
// logger.error({ userId, action: 'login_failed', error: err.message, code: err.code })
