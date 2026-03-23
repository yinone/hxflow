// src/lib/AppError.ts
// 全局业务错误类（GP-003）
// 所有业务错误必须通过 AppError 抛出，不允许裸 throw new Error(...)

export class AppError extends Error {
  readonly code: string
  readonly statusCode: number
  readonly isOperational: boolean

  constructor(
    code: string,
    message: string,
    statusCode: number = 400,
    isOperational: boolean = true
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.isOperational = isOperational

    // 保持正确的 stack trace（Node.js 专用）
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  toJSON() {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode
    }
  }
}

// ── 常用错误工厂 ───────────────────────────────────────────────
export const Errors = {
  notFound: (resource: string) =>
    new AppError(`${resource.toUpperCase()}_NOT_FOUND`, `${resource} 不存在`, 404),

  unauthorized: () =>
    new AppError('UNAUTHORIZED', '未授权访问', 401),

  forbidden: () =>
    new AppError('FORBIDDEN', '无权限执行此操作', 403),

  validation: (message: string) =>
    new AppError('VALIDATION_ERROR', message, 400),

  conflict: (message: string) =>
    new AppError('CONFLICT', message, 409),

  internal: () =>
    new AppError('INTERNAL_ERROR', '服务器内部错误', 500, false)
} as const
