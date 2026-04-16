/**
 * user-profile.ts — 用户配置文件管理服务
 *
 * 提供用户配置文件的读取、更新和持久化功能。
 * 配置文件存储在 ~/.hx/user-profile.json
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { homedir } from 'os'
import { resolve, dirname } from 'path'

export interface UserProfile {
  [key: string]: unknown
}

export class UserProfileService {
  private readonly profilePath: string

  constructor(customPath?: string) {
    this.profilePath = customPath ?? this.getDefaultProfilePath()
  }

  /**
   * 获取默认配置文件路径
   */
  getDefaultProfilePath(): string {
    return resolve(homedir(), '.hx', 'user-profile.json')
  }

  /**
   * 获取当前配置文件路径
   */
  getProfilePath(): string {
    return this.profilePath
  }

  /**
   * 加载用户配置文件
   * @returns 配置对象，文件不存在时返回空对象
   */
  loadProfile(): UserProfile {
    if (!existsSync(this.profilePath)) {
      return {}
    }

    try {
      const content = readFileSync(this.profilePath, 'utf8')
      return JSON.parse(content) as UserProfile
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`配置文件 JSON 格式错误: ${error.message}`)
      }
      throw new Error(`读取配置文件失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 保存用户配置文件
   * @param data 配置对象
   */
  saveProfile(data: UserProfile): void {
    try {
      const dir = dirname(this.profilePath)
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true })
      }

      const content = JSON.stringify(data, null, 2)
      writeFileSync(this.profilePath, content, 'utf8')
    } catch (error) {
      throw new Error(`保存配置文件失败: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * 更新用户配置文件（部分更新）
   * @param updates 要更新的字段
   */
  updateProfile(updates: Partial<UserProfile>): void {
    const current = this.loadProfile()
    const merged = { ...current, ...updates }
    this.saveProfile(merged)
  }

  /**
   * 清空配置文件
   */
  clearProfile(): void {
    this.saveProfile({})
  }

  /**
   * 检查配置文件是否存在
   */
  exists(): boolean {
    return existsSync(this.profilePath)
  }
}

/**
 * 默认实例（使用默认路径）
 */
export const defaultUserProfile = new UserProfileService()

/**
 * 便捷函数：加载配置
 */
export function loadProfile(): UserProfile {
  return defaultUserProfile.loadProfile()
}

/**
 * 便捷函数：保存配置
 */
export function saveProfile(data: UserProfile): void {
  defaultUserProfile.saveProfile(data)
}

/**
 * 便捷函数：更新配置
 */
export function updateProfile(updates: Partial<UserProfile>): void {
  defaultUserProfile.updateProfile(updates)
}
