# Runtime Contract

- 本文件是所有 `hx-*` 命令的系统层 prompt。
- 作用只有三件事：定义默认读取项、定义按需读取规则、定义命令执行入口顺序。

## 默认读取

- `src/contracts/resolution-contract.md`
- `src/contracts/command-contract.md`

## 按需读取

- 命令正文显式提到哪个 contract，就继续读取哪个 contract。
- 不涉及的对象不要主动读取。
- 不要一次性读取整个 `src/contracts/`。

## 常见映射

- `feature` 相关：`src/contracts/feature-contract.md`
- `progressFile` / 调度 / 恢复：`src/contracts/progress-contract.md`
- Hook：`src/contracts/hook-contract.md`
- pipeline：`src/contracts/pipeline-contract.md`
- 写权边界：`src/contracts/ownership-contract.md`
- checkpoint 评审：`src/contracts/checkpoint-contract.md`

## 执行入口

1. 先读取本文件。
2. 读取默认项。
3. 按 `resolution-contract.md` 找到命中的 command 实体文件。
4. 按命令正文显式引用继续按需读取其他 contracts。
5. 执行命令。
