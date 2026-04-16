# User Profile Management Implementation Plan

## 输入事实

- 需求文档: docs/requirement/user-profile.md
- 项目事实: HXFlow Agent Skill 仓库，TypeScript + Bun 运行时
- 关键约束:
  - 仅使用 Node.js 内置模块
  - 覆盖率要求：80% (statements/functions/lines), 75% (branches)
  - 遵循 2 空格、ES Module、无分号编码规范

## 实施策略

- 总体方案: 实现轻量级用户配置文件服务，包含读取、更新、持久化三个核心功能
- 边界控制:
  - 不实现多用户管理或权限控制
  - 不引入新的第三方依赖
  - 配置文件路径固定为 ~/.hx/user-profile.json
- 风险控制:
  - 文件读写异常处理
  - JSON 解析容错处理
  - 并发写入保护

## 任务拆分

### TASK-01: 实现核心服务模块

- 目标: 实现 UserProfileService 类，提供配置文件的 CRUD 操作
- 修改范围:
  - 新增 hxflow/scripts/lib/user-profile.ts
- 实施要点:
  - 实现 `loadProfile()` 读取配置文件
  - 实现 `saveProfile(data)` 保存配置文件
  - 实现 `updateProfile(updates)` 更新部分配置
  - 实现 `getProfilePath()` 获取配置文件路径
  - 所有操作支持同步和异步两种模式
  - 完善的错误处理和类型定义
- 验收标准:
  - 代码符合 TypeScript strict 模式
  - 遵循现有编码规范
  - 导出的 API 清晰易用
- 验证方式:
  - 类型检查通过
  - 代码 review 通过

### TASK-02: 实现单元测试

- 目标: 为 UserProfileService 编写全面的单元测试
- 修改范围:
  - 新增 tests/unit/user-profile.test.ts
- 实施要点:
  - 测试文件读取功能（正常场景、文件不存在、JSON 格式错误）
  - 测试文件写入功能（正常场景、目录不存在、权限错误）
  - 测试配置更新功能（部分更新、深度合并）
  - 测试路径解析功能
  - 使用临时目录隔离测试环境
  - Mock 文件系统操作避免副作用
- 验收标准:
  - 覆盖率达到 80% (statements/functions/lines), 75% (branches)
  - 所有测试用例通过
  - 测试用例覆盖正常和异常场景
- 验证方式:
  - npm run hx:test:unit 通过
  - 覆盖率报告符合要求

### TASK-03: 实现集成测试

- 目标: 验证用户配置文件的完整读写流程
- 修改范围:
  - 新增 tests/integration/user-profile.spec.ts
- 实施要点:
  - 测试完整的配置文件生命周期（创建、读取、更新、删除）
  - 测试多次读写的数据一致性
  - 测试并发场景（如果实现了锁机制）
  - 使用真实文件系统但隔离在临时目录
- 验收标准:
  - 所有集成测试用例通过
  - 测试后环境清理干净
  - 测试结果稳定可重复
- 验证方式:
  - npm run hx:test:integration 通过
  - 连续运行多次结果一致

### TASK-04: 全量测试验证

- 目标: 执行全量测试确保没有破坏现有功能
- 修改范围: 无（验证阶段）
- 实施要点:
  - 运行 npm run hx:test 执行所有测试
  - 检查测试报告和覆盖率报告
  - 确认没有引入新的失败测试
- 验收标准:
  - 所有测试通过（单元测试 + 集成测试）
  - 覆盖率符合项目要求
  - 没有破坏现有测试
- 验证方式:
  - npm run hx:test 通过
  - CI 流水线（如果有）通过

## 验证方案

- 本地验证:
  - 运行 npm run hx:test:unit 验证单元测试
  - 运行 npm run hx:test:integration 验证集成测试
  - 运行 npm run hx:test 验证全量测试
  - 检查覆盖率报告
- 集成验证:
  - 手动创建配置文件并验证读取功能
  - 手动修改配置并验证更新功能
  - 验证配置文件格式符合 JSON 规范
- 人工验收:
  - 代码符合编码规范
  - 测试覆盖率达标
  - 所有验收标准满足

## 风险与回退

- 主要风险:
  - 文件系统操作可能因权限问题失败
  - JSON 解析可能因格式问题失败
  - 测试环境隔离不当可能影响测试结果
- 回退方式:
  - 代码在独立模块中，不影响现有功能
  - 删除新增文件即可完全回退
  - 测试失败不影响主干代码
