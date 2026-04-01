# Resolution Contract

- 定义 command / hook / pipeline 的来源、优先级和代理适配规则。

## Commands

- 解析顺序固定为：
  1. 项目层 `<project>/.hx/commands/`
  2. 用户层 `~/.hx/commands/`
  3. 框架层 `src/commands/`
- 普通 command 命中第一个存在的实体文件即停止，不做多层 merge。
- `protected: true` 的 command 只允许读取框架层实体文件。

## Hooks

- Hook 来源固定为：
  - 框架层 `src/hooks/`
  - 用户层 `~/.hx/hooks/`
  - 项目层 `.hx/hooks/`
- Hook 不是覆盖规则，而是中间件链。
- `pre_*` 执行顺序：框架层 -> 用户层 -> 项目层
- `post_*` 执行顺序：项目层 -> 用户层 -> 框架层

## Pipelines

- pipeline 解析顺序固定为：
  1. 项目层 `.hx/pipelines/`
  2. 用户层 `~/.hx/pipelines/`
  3. 框架层 `src/pipelines/`
- 同名 pipeline 命中第一个存在的文件即停止，不做多层 merge。

## 代理适配层

- `hx setup` 会生成：
  - `~/.claude/skills/*/SKILL.md`
  - `~/.agents/skills/*/SKILL.md`
- 这些文件只负责加载 `src/contracts/runtime-contract.md`，再把请求转发到最终命中的实体文件。
- 适配层不承载业务逻辑。

## 失败处理

- 三层都找不到 command 或 pipeline 实体文件时，直接报错。
- `protected` command 若框架层文件缺失，也直接报错。
