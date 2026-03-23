# 系统架构地图

> 最后更新：（填入日期）

## 依赖层级（单向，不可逆）

```
Types → Config → Repo → Service → Runtime → UI
```

| 层级    | 目录                                      | 职责                           | 可导入                      |
|---------|-------------------------------------------|--------------------------------|-----------------------------|
| Types   | `src/types/`                              | TypeScript 接口和类型定义      | 无                          |
| Config  | `src/config/`                             | 环境变量、常量配置             | Types                       |
| Repo    | `src/repo/`                               | 数据库查询/写入，无业务逻辑    | Types, Config               |
| Service | `src/service/`                            | 核心业务逻辑                   | Types, Config, Repo         |
| Runtime | `src/runtime/`                            | HTTP 路由、参数校验、响应格式  | Types, Config, Repo, Service |
| UI      | `src/components/` `src/pages/` `src/hooks/` | React 组件、Hook、页面         | Types, Config（通过 API）   |

## 横切关注点（通过 Providers 注入）

以下模块**不属于任何层级**，通过统一接口注入：

- **Auth**：鉴权中间件（后端）/ AuthContext（前端）
- **Telemetry**：结构化日志、指标、Trace
- **Feature Flags**：特性开关

禁止各层直接 import 底层实现，只允许通过 Providers 接口引用。

## 目录结构

```
src/
├── types/          # Types 层 — 接口定义
├── config/         # Config 层 — 配置常量
├── repo/           # Repo 层 — 数据访问
├── service/        # Service 层 — 业务逻辑
├── runtime/        # Runtime 层 — HTTP 接口
├── components/     # UI 层 — React 组件
│   └── ui/         # 基础 UI 组件库（Button, Input 等）
├── hooks/          # UI 层 — 自定义 Hook
├── pages/          # UI 层 — 页面组件
└── lib/            # 工具函数（不属于任何层，无副作用）
```

## 主要模块

（在此列出项目的核心业务模块，更新时间：每个 Sprint）

| 模块 | 层级 | 文件 | 说明 |
|------|------|------|------|
| 示例 | Service | src/service/exampleService.ts | 示例业务逻辑 |

## 外部依赖

| 依赖 | 用途 | 引入层级 |
|------|------|----------|
| （填入项目实际依赖） | | |
