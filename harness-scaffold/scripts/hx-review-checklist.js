#!/usr/bin/env node
// scripts/hx-review-checklist.js
// 用法: npm run hx:review [--role=fe|be|all]
// 打印当前项目的 Review 清单

const roleArg = process.argv.find(a => a.startsWith('--role='))
const role = roleArg ? roleArg.split('=')[1] : 'all'

const divider = '─'.repeat(60)

console.log(`\n${divider}`)
console.log('  PR Review 清单  |  Harness Engineering v2.0')
console.log(divider)

// ── 全员必检 ──────────────────────────────────────────────────
console.log('\n🔴 全员必检（任一不通过则阻断合并）\n')
const shared = [
  'CI 全部通过：lint + typecheck + test + arch-test',
  '无 console.log 进入 src/（GP-001）',
  '无裸 throw new Error(\'...\')，使用 AppError（GP-003）',
  '无 : any 类型泄漏（TYPE-001）',
  '文档与代码一致：改动的接口/类型已更新 docs/design/',
  'PR 描述包含 TASK-ID，格式: [feat|fix] TASK-XX: 描述'
]
shared.forEach((item, i) => console.log(`  ${i + 1}. [ ] ${item}`))

// ── 前端专项 ──────────────────────────────────────────────────
if (role === 'fe' || role === 'all') {
  console.log('\n🔵 前端专项\n')
  const fe = [
    '【必须】Props 接口与 docs/design/ 中定义一致，未自行扩展',
    '【必须】未绕过 src/components/ui/ 的已有组件重复实现',
    '【必须】组件文件未直接调用 fetch/axios（GP-005），通过 Hook',
    '【必须】无 useEffect 依赖数组遗漏（会导致无限循环）',
    '【建议】状态管理符合约定（本地 state / Context / Store 边界清晰）',
    '【建议】单文件 ≤ 200 行（GP-006），超出已拆分',
    '【建议】表单元素有 aria-label 或关联 label（a11y 基础）',
    '【建议】过度抽象检查：只用一次的逻辑未被不必要地提取为 Hook'
  ]
  fe.forEach((item, i) => console.log(`  ${i + 1}. [ ] ${item}`))
}

// ── 后端专项 ──────────────────────────────────────────────────
if (role === 'be' || role === 'all') {
  console.log('\n🟣 后端专项\n')
  const be = [
    '【必须】架构层级合规：Service 层未导入 Runtime/UI 层（hx:arch）',
    '【必须】Repo 层无业务逻辑，只做数据查询/写入',
    '【必须】错误码使用 docs/design/error-codes.md 中定义的体系',
    '【必须】Service 层函数有对应单元测试',
    '【必须】结构化日志字段完整（userId, action, durationMs — GP-002）',
    '【建议】网络调用有超时配置和重试策略（GP-004）',
    '【建议】过度错误处理：正常业务流程未被不必要的 try-catch 包裹',
    '【建议】无硬编码配置值，提取到 src/config/（GP-007）'
  ]
  be.forEach((item, i) => console.log(`  ${i + 1}. [ ] ${item}`))
}

// ── AI 代码特征检查 ────────────────────────────────────────────
console.log('\n⚡ AI 代码特征检查（人工识别，无法自动化）\n')
const ai = [
  '过度抽象：是否为只用一次的逻辑创建了独立函数/类？',
  '冗余注释：注释是否只是在重复代码本身说的事？',
  '保守错误处理：是否在本不需要 try-catch 的地方添加了防御性代码？',
  '文档漂移：函数签名或行为是否与注释/文档描述不一致？',
  '模式复制：是否盲目复制了仓库中已有的不良模式？'
]
ai.forEach((item, i) => console.log(`  ${i + 1}. [ ] ${item}`))

console.log(`\n${divider}`)
console.log('  发现问题？在 PR 评论中写明：文件:行号 + 违反规则（GP-XXX）')
console.log('  重复问题？更新 docs/golden-principles.md + 新增 Lint 规则')
console.log(divider + '\n')
