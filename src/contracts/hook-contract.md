# Hook Contract

- Hook 是命令前后可插入的轻量扩展点。
- skill 是否支持 Hook，取决于 frontmatter 中的 `hooks` 字段，见 `src/contracts/command-contract.md`。
- Hook 的来源、优先级和跨层执行顺序由 `src/contracts/resolution-contract.md` 定义。

## 命名

- `pre_<command>.md`
- `post_<command>.md`
- 示例：`hx-doc` -> `pre_doc.md` / `post_doc.md`
- 示例：`hx-mr` -> `pre_mr.md` / `post_mr.md`

## 输入

- Hook 输入共享同一组基础字段，`pre_*` 与 `post_*` 只在固定参数上有差异。

### 基础公共字段

- `command`: 当前命令名，例如 `hx-doc`
- `projectRoot`: 当前项目根目录
- `feature`: 当前需求标识；若尚未生成可为空
- `arguments`: 当前命令参数对象，固定包含：
  - `raw`: 原始参数字符串
  - `positional`: 位置参数数组
  - `options`: 选项参数对象，key 为选项名，value 为字符串或布尔值
- `paths`: 当前解析后的 `paths.*`
- `gates`: 当前解析后的 `gates.*`
- `context`: 当前命令共享上下文

### `pre_*` Hook 输入

- 固定字段：基础公共字段、`phase: "pre"`
- `pre_*` 不接收 `result`，因为主命令尚未执行。

### `post_*` Hook 输入

- 固定字段：基础公共字段、`phase: "post"`、`result`: 主命令结构化结果
- `result` 固定字段顺序与 `src/contracts/command-contract.md` 中的命令结构化结果完全一致：
  - `status`
  - `command`
  - `feature`
  - `summary`
  - `artifacts`
  - `issues`
  - `nextAction`
- `result.artifacts`、`result.issues`、`result.nextAction` 的内部结构也必须与 `src/contracts/command-contract.md` 中的固定约定保持一致。

## 输出

- Hook 只能返回结构化结果。
- 固定字段：
  - `patch`: 追加到共享上下文的补丁对象
  - `warnings`: 非阻断告警列表
  - `abort`: 是否中止后续执行
  - `message`: 对用户的说明
  - `artifacts`: 产出的外部结果，例如 URL、ID、记录信息
- 规则：
  - `patch` 会合并进上下文，再传给后续 Hook 或主命令
  - `abort: true` 时必须同时返回 `message`
  - `pre_*` 中断后，主命令不再继续
  - `post_*` 中断后，后续 `post_*` 不再继续，但主命令结果已产生
  - `patch` 只允许补充或修正 `context`、`paths`、`gates`、`feature`，不直接重写 `result`

## 边界

- Hook 负责扩展，不负责改写主命令核心语义。
- Hook 不应：
  - 重算已确定的 `feature`
  - 直接覆盖主命令核心输出格式
  - 让命令依赖隐式副作用才能成立

## 建议

- 需要补输入，用 `patch.context`
- 需要做交付、通知、回写，放在 `post_*`
- 业务系统特有字段放在 `context` 的自定义 key 下，不放进框架公共字段
