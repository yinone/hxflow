// src/types/common.ts
// Types 层 — 通用类型定义
// 规则：只包含类型，不含任何运行时逻辑，不导入其他层

// ── 基础响应结构 ───────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T
  success: true
}

export interface ApiError {
  code: string
  message: string
  success: false
}

// ── 分页 ──────────────────────────────────────────────────────
export interface PaginationParams {
  page: number
  pageSize: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── 通用工具类型 ───────────────────────────────────────────────
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>
export type Nullable<T> = T | null
export type MaybePromise<T> = T | Promise<T>
