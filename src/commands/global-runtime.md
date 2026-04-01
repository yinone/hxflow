# Global Runtime Rules

- 这份文件是所有 `hx-*` workflow skill 的全局运行规则。
- 每个命令先继承这里的规则，再执行各自的业务正文。

## Command

- skill 实体按三层顺序解析：
  - 项目层 `<project>/.hx/commands/`
  - 用户层 `~/.hx/commands/`
  - 框架层 `src/commands/`
- 同名文件命中即停止，不做多层 merge。
- `protected: true` 的命令只允许读取框架层实体文件。

## Hooks

- 命令是否支持 Hook，只看 frontmatter 的 `hooks` 字段。
- Hook 来源固定为：
  - 框架层 `src/hooks/`
  - 用户层 `~/.hx/hooks/`
  - 项目层 `.hx/hooks/`
- `pre_*` 顺序：框架层 -> 用户层 -> 项目层
- `post_*` 顺序：项目层 -> 用户层 -> 框架层
- Hook 以中间件链执行，不是覆盖规则。

## Pipelines

- pipeline 只定义流程编排，不承载命令正文。
- pipeline 文件按三层顺序解析：
  - 项目层 `.hx/pipelines/`
  - 用户层 `~/.hx/pipelines/`
  - 框架层 `src/pipelines/`
- 同名文件命中即停止，不做多层 merge。

## Boundary

- 命令正文只描述业务步骤、输入输出和领域约束。
- `command / hook / pipeline` 的解析顺序与运行方式属于框架全局规则，不由单个命令重复定义。
