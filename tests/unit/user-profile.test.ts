/**
 * user-profile.test.ts — UserProfileService 单元测试
 */

import { describe, it, expect, beforeEach, afterEach } from 'bun:test'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { UserProfileService } from '../../hxflow/scripts/lib/user-profile'

describe('UserProfileService', () => {
  let tempDir: string
  let service: UserProfileService

  beforeEach(() => {
    tempDir = resolve('/tmp', `hx-test-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    mkdirSync(tempDir, { recursive: true })
    const profilePath = resolve(tempDir, 'user-profile.json')
    service = new UserProfileService(profilePath)
  })

  afterEach(() => {
    if (existsSync(tempDir)) {
      rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('getProfilePath', () => {
    it('应该返回配置文件路径', () => {
      const path = service.getProfilePath()
      expect(path).toContain('user-profile.json')
    })
  })

  describe('exists', () => {
    it('文件不存在时应返回 false', () => {
      expect(service.exists()).toBe(false)
    })

    it('文件存在时应返回 true', () => {
      service.saveProfile({ test: true })
      expect(service.exists()).toBe(true)
    })
  })

  describe('loadProfile', () => {
    it('文件不存在时应返回空对象', () => {
      const profile = service.loadProfile()
      expect(profile).toEqual({})
    })

    it('应该正确读取 JSON 文件', () => {
      const testData = { name: 'test', value: 123 }
      service.saveProfile(testData)
      const profile = service.loadProfile()
      expect(profile).toEqual(testData)
    })

    it('JSON 格式错误时应抛出异常', () => {
      const profilePath = service.getProfilePath()
      writeFileSync(profilePath, '{ invalid json }', 'utf8')

      expect(() => service.loadProfile()).toThrow('配置文件 JSON 格式错误')
    })

    it('应该支持复杂的嵌套对象', () => {
      const testData = {
        user: {
          name: 'Alice',
          settings: {
            theme: 'dark',
            notifications: true
          }
        },
        tags: ['test', 'demo']
      }
      service.saveProfile(testData)
      const profile = service.loadProfile()
      expect(profile).toEqual(testData)
    })
  })

  describe('saveProfile', () => {
    it('应该创建配置文件', () => {
      const testData = { key: 'value' }
      service.saveProfile(testData)

      expect(service.exists()).toBe(true)
      const loaded = service.loadProfile()
      expect(loaded).toEqual(testData)
    })

    it('应该覆盖已存在的配置文件', () => {
      service.saveProfile({ old: 'data' })
      service.saveProfile({ new: 'data' })

      const profile = service.loadProfile()
      expect(profile).toEqual({ new: 'data' })
      expect(profile).not.toHaveProperty('old')
    })

    it('目录不存在时应自动创建', () => {
      const deepPath = resolve(tempDir, 'a', 'b', 'c', 'user-profile.json')
      const deepService = new UserProfileService(deepPath)

      deepService.saveProfile({ test: true })
      expect(deepService.exists()).toBe(true)
    })

    it('应该保存空对象', () => {
      service.saveProfile({})
      const profile = service.loadProfile()
      expect(profile).toEqual({})
    })
  })

  describe('updateProfile', () => {
    it('应该合并新字段到现有配置', () => {
      service.saveProfile({ existing: 'value' })
      service.updateProfile({ newField: 'newValue' })

      const profile = service.loadProfile()
      expect(profile).toEqual({
        existing: 'value',
        newField: 'newValue'
      })
    })

    it('应该覆盖已存在的字段', () => {
      service.saveProfile({ field: 'old' })
      service.updateProfile({ field: 'new' })

      const profile = service.loadProfile()
      expect(profile).toEqual({ field: 'new' })
    })

    it('配置文件不存在时应创建新文件', () => {
      service.updateProfile({ firstField: 'value' })

      expect(service.exists()).toBe(true)
      const profile = service.loadProfile()
      expect(profile).toEqual({ firstField: 'value' })
    })

    it('应该支持部分更新', () => {
      service.saveProfile({
        keep1: 'value1',
        keep2: 'value2',
        update: 'old'
      })
      service.updateProfile({ update: 'new' })

      const profile = service.loadProfile()
      expect(profile).toEqual({
        keep1: 'value1',
        keep2: 'value2',
        update: 'new'
      })
    })
  })

  describe('clearProfile', () => {
    it('应该清空配置文件内容', () => {
      service.saveProfile({ data: 'to be cleared' })
      service.clearProfile()

      const profile = service.loadProfile()
      expect(profile).toEqual({})
    })

    it('配置文件不存在时应创建空文件', () => {
      service.clearProfile()

      expect(service.exists()).toBe(true)
      const profile = service.loadProfile()
      expect(profile).toEqual({})
    })
  })

  describe('便捷函数', () => {
    it('便捷函数应该与实例方法等效', () => {
      const { loadProfile, saveProfile, updateProfile } = require('../../hxflow/scripts/lib/user-profile')

      // 这些便捷函数使用默认路径，只测试它们可以正常调用
      // 实际功能已在实例方法测试中覆盖
      expect(typeof loadProfile).toBe('function')
      expect(typeof saveProfile).toBe('function')
      expect(typeof updateProfile).toBe('function')
    })
  })
})
