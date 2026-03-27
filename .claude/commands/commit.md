# 提交代码

参数: `$ARGUMENTS`（可选: `<type>` 和/或 `<message>`）

## 执行步骤

### 1. 运行 scan-docs.sh

```bash
bash scan-docs.sh
```

### 2. 检查工作区

```bash
git status --short
git diff --stat HEAD
```

若无任何改动，输出提示并停止：
> 工作区无改动，无需提交。

### 3. 确定 commit type

从参数中提取 type，若未提供则根据变更内容自动判断：

| type | 适用场景 |
|------|---------|
| `feat` | 新增功能 |
| `fix` | 修复 bug |
| `docs` | 仅文档变更 |
| `test` | 新增或修改测试 |
| `refactor` | 重构，不新增功能也不修复 bug |
| `chore` | 构建、配置、依赖、工具变更 |
| `style` | 仅格式调整，不影响逻辑 |

若变更跨多个类型，选最主要的一个。

### 4. 生成提交信息

格式：
```
<type>: <简洁描述>
```

- 描述使用中文，25 字以内
- 若参数中已提供 message，直接使用；否则根据变更摘要自动生成
- 不关联任何 task ID

### 5. 暂存并提交

```bash
git add -A
git commit -m "<生成的提交信息>"
```

### 6. 输出结果

```
✓ 已提交：<type>: <message>
  变更文件 N 个
```

## 说明

- 不自动 push，仅本地提交
- 若用户明确提供了 type 或 message，优先使用
