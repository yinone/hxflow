/**
 * user-profile.spec.ts — UserProfile 集成测试
 *
 * 验证用户配置文件的完整生命周期和真实文件系统交互
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { UserProfileService } from '../../hxflow/scripts/lib/user-profile'

describe('UserProfile Integration', () => {
  let tempDir: string
  let profilePath: string
  let service: UserProfileService

  beforeEach(() => {
    tempDir = resolve('/tmp', `hx-integration-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tempDir, { recursive: true })
    profilePath = resolve(tempDir, 'user-profile.json')
    service = new UserProfileService(profilePath)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('完整生命周期测试', () => {
    it('应该支持创建-读取-更新-删除的完整流程', () => {
      // 1. 初始状态：文件不存在
      expect(service.exists()).toBe(false)
      expect(service.loadProfile()).toEqual({})

      // 2. 创建配置文件
      const initialData = {
        username: 'alice',
        email: 'alice@example.com',
        preferences: {
          theme: 'dark',
          language: 'zh-CN'
        }
      }
      service.saveProfile(initialData)
      expect(service.exists()).toBe(true)

      // 3. 读取配置文件
      const loaded = service.loadProfile()
      expect(loaded).toEqual(initialData)

      // 4. 更新配置
      service.updateProfile({
        preferences: {
          theme: 'light',
          language: 'en-US'
        }
      })
      const updated = service.loadProfile()
      expect(updated.username).toBe('alice')
      expect(updated.email).toBe('alice@example.com')
      expect(updated.preferences).toEqual({
        theme: 'light',
        language: 'en-US'
      })

      // 5. 清空配置
      service.clearProfile()
      expect(service.loadProfile()).toEqual({})
      expect(service.exists()).toBe(true)
    })
  })

  describe('数据一致性测试', () => {
    it('多次读写应保持数据一致性', () => {
      const testRounds = 5
      let expectedData = {}

      for (let i = 0; i < testRounds; i++) {
        const newField = `field${i}`
        const newValue = `value${i}`
        expectedData = { ...expectedData, [newField]: newValue }

        service.updateProfile({ [newField]: newValue })
        const loaded = service.loadProfile()
        expect(loaded).toEqual(expectedData)
      }

      // 验证最终状态
      const finalData = service.loadProfile()
      expect(Object.keys(finalData)).toHaveLength(testRounds)
      for (let i = 0; i < testRounds; i++) {
        expect(finalData[`field${i}`]).toBe(`value${i}`)
      }
    })

    it('保存后的文件应该是有效的 JSON', () => {
      const testData = {
        string: 'text',
        number: 42,
        boolean: true,
        null: null,
        array: [1, 2, 3],
        object: { nested: 'value' }
      }

      service.saveProfile(testData)

      // 直接读取文件并解析 JSON
      const fileContent = readFileSync(profilePath, 'utf8')
      const parsed = JSON.parse(fileContent)
      expect(parsed).toEqual(testData)
    })
  })

  describe('文件系统交互测试', () => {
    it('应该在指定路径创建文件', () => {
      const customPath = resolve(tempDir, 'custom', 'path', 'profile.json')
      const customService = new UserProfileService(customPath)

      customService.saveProfile({ test: 'data' })

      expect(existsSync(customPath)).toBe(true)
      expect(customService.loadProfile()).toEqual({ test: 'data' })
    })

    it('应该处理包含特殊字符的数据', () => {
      const specialData = {
        unicode: '你好世界 🌍',
        quotes: 'He said "Hello"',
        newlines: 'Line 1\nLine 2',
        backslash: 'C:\\Users\\path'
      }

      service.saveProfile(specialData)
      const loaded = service.loadProfile()
      expect(loaded).toEqual(specialData)
    })

    it('应该保留 JSON 格式化（便于人工查看）', () => {
      service.saveProfile({ a: 1, b: 2 })
      const fileContent = readFileSync(profilePath, 'utf8')

      // 验证是否格式化（包含换行和缩进）
      expect(fileContent).toContain('\n')
      expect(fileContent).toContain('  ')
    })
  })

  describe('错误处理测试', () => {
    it('应该优雅处理损坏的 JSON 文件', () => {
      // 手动创建损坏的 JSON 文件
      const fs = require('fs')
      fs.writeFileSync(profilePath, '{ broken: json }', 'utf8')

      expect(() => service.loadProfile()).toThrow('配置文件 JSON 格式错误')
    })
  })

  describe('并发操作测试', () => {
    it('连续快速更新应保持最后一次写入的值', () => {
      service.saveProfile({ counter: 0 })

      // 快速连续更新
      for (let i = 1; i <= 10; i++) {
        service.updateProfile({ counter: i })
      }

      const final = service.loadProfile()
      expect(final.counter).toBe(10)
    })
  })

  describe('边界条件测试', () => {
    it('应该处理空对象', () => {
      service.saveProfile({})
      expect(service.loadProfile()).toEqual({})
    })

    it('应该处理大型配置对象', () => {
      const largeData: Record<string, number> = {}
      for (let i = 0; i < 1000; i++) {
        largeData[`key${i}`] = i
      }

      service.saveProfile(largeData)
      const loaded = service.loadProfile()
      expect(Object.keys(loaded)).toHaveLength(1000)
      expect(loaded.key999).toBe(999)
    })

    it('应该处理深层嵌套对象', () => {
      const deepData: any = { level: 0 }
      let current = deepData
      for (let i = 1; i < 10; i++) {
        current.nested = { level: i }
        current = current.nested
      }

      service.saveProfile(deepData)
      const loaded = service.loadProfile()
      expect(loaded).toEqual(deepData)
    })
  })
})
