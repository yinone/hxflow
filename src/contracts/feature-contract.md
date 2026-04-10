# Feature Contract

`feature` 是单个需求在项目内的稳定标识。

- `feature` 用于文件命名、路径模板、命令续接
- `feature` 一旦写入需求文档，就成为事实源
- 后续命令只允许续接，不允许重算
- `displayName` 仅用于展示与辅助查找，不参与主链路定位

## 单需求场景

本 contract 仅描述单需求主路径：

- 同一时刻只处理一个需求
- 自动续接只在当前需求上下文无歧义时成立
- 不讨论多需求并行调度

## 字段定义

### feature

- 用于 `docs/requirement/{feature}.md`
- 用于 `docs/plans/{feature}.md`
- 用于 `docs/plans/{feature}-progress.json`
- 用于 `hx-plan` / `hx-run` / `hx-mr` 的续接

### displayName

- 用于需求文档头部展示
- 用于列表展示
- 用于辅助搜索与候选提示

`displayName` 不用于：

- 路径模板
- 文件命名
- progress 文件定位
- 自动续接主键

## 生成与复用规则

- 先复用，后生成
- 首次写入后冻结
- 后续只读取，不重算

### 复用优先级

1. 若当前需求文档已存在，直接复用文档头部已有 `feature`
2. 若来源中存在稳定 `sourceId`，优先用 `sourceId` 匹配已有需求文档并复用其中的 `feature`
3. 若没有 `sourceId`，则计算 `sourceFingerprint`，匹配已有需求文档并复用其中的 `feature`
4. 只有以上都无法命中时，才允许首次生成 `feature`

## 首次生成算法

### 输入优先级

1. `sourceId`
2. 需求标题
3. 需求正文或结构化需求内容

### 生成规则

- 有 `sourceId`：取其数字部分，加前缀 `req-`（`TS-46318 -> req-46318`；`REQ-1024 -> req-1024`）
- 无 `sourceId` 但有标题：去除空格、标点、括号及无意义词（需求、功能、支持、实现、优化、改造），保留核心中文词序并截断到固定长度；若结果为空则回退内容指纹方案
- 无标题：`feat-<fingerprint8>`

### 冲突处理

若首次生成的 `feature` 与当前项目已有需求文档冲突，则追加固定后缀：

```text
-2
-3
```

## sourceFingerprint

`sourceFingerprint` 是对需求来源做标准化后的稳定指纹。

- 推荐输入：`sourceId`、来源链接、需求标题、业务背景、核心目标、验收标准
- 推荐用途：在没有标题或没有稳定标题时复用已有需求文档；作为 `feature` 回退生成的依据

## 文档头部固定模板

需求文档头部必须固定保留以下四行：

```text
> Feature: req-46318
> Display Name: 用户登录
> Source ID: TS-46318
> Source Fingerprint: 8f3a2c1d
```

规则：

- `Feature` 必须有值
- `Display Name`、`Source ID`、`Source Fingerprint` 可以为空
- 即使对应值为空，也保留字段标签，不允许删除整行
- 后续命令读取需求文档时，优先以这四行头部元信息作为事实来源

## 文档头部解析规则

1. 只识别以下四个字段标签，且标签名大小写必须完全一致：
   - `Feature`
   - `Display Name`
   - `Source ID`
   - `Source Fingerprint`
2. 四个字段必须按固定顺序出现，不允许换序。
3. 四行头部必须出现在文档标题下方、正文 `##` 小节之前。
4. 字段值取冒号后的原始文本，并执行首尾空白裁剪。
5. 空值表示为冒号后留空，不使用 `null`、`N/A`、`-` 等占位词。
6. `Feature` 解析后若为空，视为无效需求文档，必须停止后续续接。
7. 若存在重复字段、缺失字段、字段换序或未知头部字段，视为头部格式非法，必须停止并返回结构错误。
8. 后续命令只允许使用这四行头部元信息作为需求主元数据来源；正文中的自然语言描述不能覆盖头部字段值。

## 自动续接规则

- 当前会话中最近一次已明确绑定到某个 `feature`
- 或当前打开的需求文档头部已明确写出 `Feature`
- 且当前需求上下文无歧义

若无法唯一定位，必须停止并要求用户显式补充 `feature`。

## 约束

- 不允许把 `displayName` 当作主键写入路径
- 不允许在 `hx-doc` 之外生成或重算 `feature`
- 不允许后续命令基于自由总结重新命名 `feature`
- `feature` 一旦写入需求文档，即视为项目内事实源
