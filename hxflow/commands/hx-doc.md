# 获取需求并创建需求文档

## 执行步骤

1. 执行 `bun scripts/tools/doc.ts context <feature>`，读取需求来源、模板和现有文档事实。
2. 生成或续接 `docs/requirement/{feature}.md`，再执行 `bun scripts/tools/doc.ts validate <feature>`。
3. 校验失败时只修正文档本身。

## 下一步

- `hx plan <feature>`

## 约束

- 先复用后生成，已有 `displayName`、`sourceId`、`sourceFingerprint`、`Type` 优先沿用
- 只维护需求文档，不扩展额外契约
