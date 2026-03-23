// vitest.config.ts
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      exclude: [
        'src/types/**',        // 类型文件无需测试
        'src/config/**',       // 配置文件无需测试
        'src/runtime/**',      // Controller 层通过集成测试覆盖
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/index.ts'
      ],
      thresholds: {
        // Service 层强制 80% 覆盖率
        'src/service': {
          statements: 80,
          branches: 75,
          functions: 80,
          lines: 80
        }
      }
    },
    // 测试文件命名规范
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // 全局 setup（如有需要）
    // setupFiles: ['src/__tests__/setup.ts']
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
