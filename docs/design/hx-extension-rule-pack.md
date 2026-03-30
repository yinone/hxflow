# HX Extension Rule Pack 设计方案

> 状态：proposal
> 日期：2026-03-30
> 设计类型：增量扩展

---

## 背景

当前 HX 运行时已经收敛为项目本地事实：

- `.hx/config.yaml`
- `.hx/rules/*.md`
- `.hx/hooks/`
- `.hx/commands/`
- `.hx/pipelines/`

这次重构的核心目标是删除 runtime profile，避免运行时再做多来源查找、继承和 merge。

在这个前提下，团队仍然需要共享规则资产：

- 某个同学沉淀的 React 审查规则，希望跨项目复用
- 某个团队沉淀的 GitLab 交付规范，希望统一下发
- 某个技术栈的测试约束，希望多个项目按版本复用

如果直接引入“运行时插件系统”，会重新带回以下问题：

- 运行时行为依赖外部插件状态
- 插件升级导致项目规则漂移
- 需要重新设计 runtime plugin host 和生命周期
- 很容易把 `config.yaml` 或执行器重新膨胀成旧的 profile 替身

因此，正确落点不是 runtime plugin，而是 **extension rule pack**：

- 中心化发布共享规则包
- 项目只声明依赖哪些 pack
- `hx-init` / `hx-rules update` 在生成期把 pack 编译进项目本地 `.hx/rules/*.md`
- 运行时仍然只读项目本地事实

这套模型更接近 ESLint shareable config，而不是 VS Code plugin。

---

## 目标

1. 支持将个人或团队规则沉淀为可共享的 rule pack
2. 支持中心化管理、审查、发布和版本控制
3. 支持项目按精确版本启用一个或多个 rule pack
4. 支持在生成期将 pack 贡献编译进 `.hx/rules/*.md`
5. 保持 runtime 继续只读取项目本地事实

---

## 非目标

1. 不实现运行时动态插件加载
2. 不支持 JS 可执行插件
3. 不支持插件在运行时改写 CLI 或 Agent 执行逻辑
4. 不支持复杂依赖解析、版本范围、自动跟随 latest
5. 不支持 pack 间任意继承和深度 merge

---

## 核心原则

### 1. pack 只参与生成期，不参与运行时

pack 的职责是提供规则片段；运行时不直接读取 pack 目录。

### 2. 项目始终拥有最终规则事实

无论启用了哪些共享 pack，最终运行时行为都来自项目自己的：

- `.hx/config.yaml`
- `.hx/rules/*.md`

### 3. pack 是可共享配置资产，不是插件宿主

pack 的性质更接近：

- ESLint shared config
- stylelint config package
- review checklist pack

而不是：

- VS Code plugin
- webpack loader
- runtime hook SDK

### 4. 固定骨架 + section 级注入

pack 不允许整文件覆盖；只能把内容追加到固定 target / section。

### 5. 版本必须精确且不可变

项目侧必须锁定精确版本，例如 `1.2.0`，不支持 `latest`、`^1.2.0`。

---

## 术语

### Extension Rule Pack

一个可共享、可版本化、可安装的规则包，包含：

- `pack.yaml`
- 若干 markdown rule fragment

### Registry

中心化 pack 索引，管理：

- 包名
- 版本
- 路径
- 是否废弃
- checksum

### Store

用户本地缓存目录，保存已安装 pack 的只读副本。

### Enable

把某个 pack 记录到项目 `.hx/config.yaml` 的 `extensions` 字段。

### Compile

将已启用 pack 的 contribution 渲染进项目 `.hx/rules/*.md` 的 `hx:auto` 区。

---

## 总体架构

### 中心化仓库

```text
hx-rule-packs/
  registry/
    index.yaml
    schemas/
      pack.schema.yaml
  packs/
    team/
      react-web/
        1.0.0/
          pack.yaml
          rules/
            golden-rules.architecture.md
            golden-rules.testing.md
            review-checklist.react.md
```

### 用户本地缓存

```text
~/.hx/
  registry/
    index.yaml
  store/
    @team/
      react-web/
        1.0.0/
          pack.yaml
          rules/
            ...
```

### 项目本地事实

```text
.hx/
  config.yaml
  rules/
    golden-rules.md
    review-checklist.md
    requirement-template.md
    plan-template.md
```

### 数据流

```text
registry -> local store -> project config.extensions -> render rules auto block
```

---

## 项目配置模型

在 `.hx/config.yaml` 中新增：

```yaml
schemaVersion: 2

extensions:
  - name: "@team/react-web"
    version: "1.1.0"
  - name: "@eleven/code-review"
    version: "0.1.0"
```

约束：

- `extensions` 是结构化硬变量，允许进入 `config.yaml`
- 每项必须是对象，不使用字符串简写
- `version` 必须是精确 semver
- 同一 `name` 在同一项目中只能出现一次

---

## Pack 目录结构

```text
<pack-root>/
  pack.yaml
  rules/
    golden-rules.architecture.md
    golden-rules.testing.md
    review-checklist.react.md
```

第一阶段只支持 markdown fragment，不支持 commands/hooks/pipelines。

后续若需要扩展 commands/hooks/pipelines，应作为 Phase 2 能力单独设计，不在本方案首版范围内。

---

## `pack.yaml` Schema

示例：

```yaml
schemaVersion: 1

name: "@team/react-web"
version: "1.1.0"
displayName: "React Web Rules"
description: "React + Vite 项目的实现与审查规则"

owners:
  - team-frontend

compat:
  hxSchema:
    - 2

contributes:
  golden-rules:
    - section: architecture
      title: React Web 架构约束
      file: rules/golden-rules.architecture.md
      priority: 50
    - section: testing
      title: React Web 测试要求
      file: rules/golden-rules.testing.md
      priority: 50

  review-checklist:
    - section: stack-specific
      title: React Web 专项检查
      file: rules/review-checklist.react.md
      priority: 50

  requirement-template: []
  plan-template: []

meta:
  tags:
    - react
    - vite
    - frontend
  deprecated: false
```

字段约束：

- `schemaVersion`：当前固定为 `1`
- `name`：必须匹配 `@scope/name`
- `version`：必须匹配精确 semver
- `compat.hxSchema`：当前仅支持包含 `2`
- `contributes.*`：只能声明追加片段
- `file`：必须是 pack 目录内相对路径
- `priority`：默认 `50`，范围 `0..100`

---

## Registry Schema

`registry/index.yaml`：

```yaml
schemaVersion: 1

packages:
  - name: "@team/react-web"
    latest: "1.1.0"
    owners:
      - team-frontend
    versions:
      - version: "1.1.0"
        path: "packs/team/react-web/1.1.0"
        deprecated: false
        checksum: "sha256:xxxxx"
      - version: "1.0.0"
        path: "packs/team/react-web/1.0.0"
        deprecated: false
        checksum: "sha256:yyyyy"
```

约束：

- `name` 全局唯一
- `latest` 必须指向已存在版本
- `path` 指向中心仓库内不可变目录
- 已发布版本目录不可改，只能新增版本
- `deprecated` 仅作提示，不阻止消费

---

## 允许注入的 Target 与 Section

### Target

当前只允许 4 个 target：

- `golden-rules`
- `review-checklist`
- `requirement-template`
- `plan-template`

### Section 白名单

#### `golden-rules`

- `project-facts`
- `implementation-boundaries`
- `architecture`
- `error-handling`
- `testing`
- `change-constraints`

#### `review-checklist`

- `scope`
- `architecture`
- `errors`
- `testing`
- `stack-specific`

#### `requirement-template`

- `background`
- `goals`
- `non-goals`
- `scope`
- `acceptance`
- `constraints`
- `open-questions`

#### `plan-template`

- `input-facts`
- `strategy`
- `tasks`
- `order`
- `verification`
- `risk-rollback`

不允许 pack 自定义 section。

---

## 渲染模型

### 基础骨架

先由 `render-rule-templates` 生成系统默认规则骨架。

### Pack 注入

再读取项目启用的 extension packs，把 contribution 注入对应 target / section。

### 输出形式

渲染后的规则文件仍然保持：

```md
<!-- hx:auto:start -->
... 自动生成内容 ...
<!-- hx:auto:end -->

<!-- hx:manual:start -->
... 人工维护内容 ...
<!-- hx:manual:end -->
```

pack 片段只进入 `hx:auto` 区。

### Pack Block 呈现建议

```md
### [@team/react-web@1.1.0] React Web 架构约束

- 组件状态优先就近收敛
- 页面级副作用放在边界层处理
```

这样可以保证来源可追踪。

---

## 排序与冲突规则

### 排序规则

同一个 target / section 内，按以下顺序排序：

1. `priority ASC`
2. `pack name ASC`
3. `version ASC`

### 冲突原则

第一阶段不做语义冲突检测，只做结构性冲突控制：

- 不允许非法 target
- 不允许非法 section
- 不允许缺失 fragment 文件
- 不允许重复启用同名不同版本 pack

### 不支持的行为

- pack 覆盖系统骨架
- pack 覆盖其他 pack 片段
- pack 写入 manual 区
- pack 改写 `config.gates`

---

## 本地缓存模型

### Registry Cache

```text
~/.hx/registry/index.yaml
```

### Pack Store

```text
~/.hx/store/@scope/name/version/
```

### Store 行为

- `hx-rules registry sync` 更新 registry cache
- `hx-rules install` 把 pack 拉到本地 store
- `hx-rules update` 只从本地 store 读取，不在 update 时直接联网

这样可以避免生成期对网络可用性产生强依赖。

---

## 命令设计

### `hx-rules`

显示当前项目规则状态：

- `.hx/config.yaml` 概要
- 固定 rules 文件状态
- 当前启用的 extensions
- 当前本地 store 安装情况

### `hx-rules registry sync`

行为：

1. 从中心仓库同步最新 registry 索引
2. 写入 `~/.hx/registry/index.yaml`
3. 输出新增/更新条目数量

### `hx-rules list`

行为：

1. 列出本地已安装 pack
2. 若在项目中运行，额外显示项目当前已启用 pack

### `hx-rules install <pack[@version]>`

行为：

1. 解析 pack specifier
2. 从 registry 查找版本
3. 下载或复制 pack 到本地 store
4. 校验 pack schema 和文件完整性
5. 不修改项目配置

### `hx-rules enable <pack[@version]>`

行为：

1. 校验本地 store 已安装该版本
2. 将其写入项目 `.hx/config.yaml` 的 `extensions`
3. 不直接更新 rules

### `hx-rules disable <pack>`

行为：

1. 从项目 `.hx/config.yaml` 的 `extensions` 中移除该 pack
2. 不删除本地缓存

### `hx-rules update`

行为：

1. 读取项目 `.hx/config.yaml`
2. 读取项目 `extensions`
3. 从本地 store 加载对应 pack
4. 校验兼容性
5. 重渲染 `.hx/rules/*.md` 的 `hx:auto` 区
6. 不覆盖 `hx:manual` 区

---

## 核心模块设计

### `src/scripts/lib/pack-constants.js`

职责：

- target 白名单
- section 白名单
- target 到文件名映射

### `src/scripts/lib/validate-pack.js`

职责：

- 读取 `pack.yaml`
- 校验 schema、section、compat、文件存在性

### `src/scripts/lib/pack-registry.js`

职责：

- 读取 registry
- 解析 pack specifier
- 查找包和版本

### `src/scripts/lib/pack-store.js`

职责：

- 本地 store 路径管理
- 检查 pack 是否已安装
- 读取本地 manifest

### `src/scripts/lib/load-rule-packs.js`

职责：

- 从项目 `extensions` 加载本地 pack
- 读取 contribution fragment 内容
- 产出统一 contribution 列表

### `src/scripts/lib/render-rule-templates.js`

扩展职责：

- 在基础骨架渲染后，注入 pack contribution
- 按 target / section / priority 排序
- 仅写回 auto 区

---

## 发布流程

### 中心化管理原则

所有 pack 统一进入中心仓库 `hx-rule-packs` 管理。

发布动作不是直接“上传一个包”，而是：

1. 新增或修改 `packs/<scope>/<name>/<version>/`
2. 更新 `registry/index.yaml`
3. 提 MR
4. CI 校验
5. merge 后视为发布成功

### CI 校验项

- `pack.yaml` schema 合法
- `name/version` 与目录一致
- 所有 fragment 文件存在
- section 合法
- checksum 正确
- 新版本不可覆盖旧版本目录

### 生命周期

支持状态：

- active
- deprecated
- archived

第一阶段只需要 `deprecated: true|false`。

---

## 兼容性与版本策略

### Pack 版本

使用 semver：

- `major`：行为语义变化、默认约束变化、删除规则
- `minor`：新增规则片段或新增检查项
- `patch`：错别字、文案修正、非语义修复

### 项目依赖版本

必须锁精确版本：

```yaml
extensions:
  - name: "@team/react-web"
    version: "1.1.0"
```

### Hx Config 兼容性

pack 通过 `compat.hxSchema` 声明兼容的 HX schema 版本。

当前默认：

```yaml
compat:
  hxSchema:
    - 2
```

---

## 安全与治理边界

### 首版禁止

1. JS 可执行逻辑
2. shell 片段
3. runtime 直接加载远程 pack
4. pack 在 update 时动态联网执行
5. pack 改写 CLI 代码路径

### 原因

一旦支持执行型插件，就会重新引入：

- runtime 漂移
- 安全风险
- 调试复杂度
- 行为不可预测

这与当前 rules-first 重构目标冲突。

---

## 实施顺序

### Phase 1：数据结构与校验

1. 新增 `pack-constants.js`
2. 新增 `validate-pack.js`
3. 新增 `pack-registry.js`
4. 新增 `pack-store.js`

### Phase 2：项目配置接入

1. 扩展 `rule-context.js`，支持 `extensions`
2. 增加 config 读取与写回逻辑

### Phase 3：渲染接入

1. 新增 `load-rule-packs.js`
2. 扩展 `render-rule-templates.js`
3. 支持 section 级注入

### Phase 4：命令接入

1. 扩展 `hx-rules.md`
2. 补充 `registry sync`
3. 补充 `install / enable / disable / update`

### Phase 5：中心仓库落地

1. 建立 `hx-rule-packs` 仓库
2. 固化 CI 校验
3. 发布第一批团队 pack

---

## 测试要求

至少补充以下测试：

### 单元测试

- `validate-pack`：
  - 合法 manifest 通过
  - 非法 name/version 拒绝
  - 非法 section 拒绝
  - 文件缺失拒绝
- `pack-registry`：
  - 可查找 package
  - 可解析 latest
  - 可解析精确版本
- `pack-store`：
  - 路径映射正确
  - 已安装检测正确
- `render-rule-templates`：
  - contribution 正确注入 target / section
  - 多 pack 按 priority 排序
  - manual 区不被覆盖

### 集成测试

- `hx-rules enable` 能正确写入 `.hx/config.yaml`
- `hx-rules disable` 能正确移除 pack
- `hx-rules update` 能生成带 pack 内容的 `.hx/rules/*.md`
- pack 未安装时 `hx-rules update` 明确报错

---

## 风险与控制

### 风险 1：pack 过度膨胀，变成新 profile

控制：

- 仅允许 target / section 级注入
- 不允许写入 `config.gates`
- 不允许任意字段扩展

### 风险 2：共享规则漂移影响项目稳定性

控制：

- 项目锁精确版本
- update 只从本地 store 读取
- 运行时只读项目本地事实

### 风险 3：pack 冲突导致规则混乱

控制：

- 固定 section 白名单
- priority 排序规则固定
- 第一阶段不支持互相覆盖

---

## 结论

对当前 HX 架构而言，正确的共享规则扩展模型是：

- 不做 runtime plugin host
- 做中心化管理的 extension rule pack registry
- 项目通过 `config.extensions` 精确声明依赖
- 生成期将共享规则包编译进项目 `.hx/rules/*.md`
- 运行时继续只读项目本地事实

这既保留了共享能力，也不会破坏当前 `config + rules + hooks/commands/pipelines` 的收敛方向。
