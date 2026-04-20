# HX Evals

这是一套可持续迭代的 agent evals 骨架，不是一次性 `evals.json`。

## 目录

- `datasets/*.jsonl`：样本池，按 `core / edge / regressions` 分层
- `specs/default.json`：当前默认评测组合
- `runs/history.json`：历次跑分趋势
- `../../scripts/lib/evals.ts`：校验、评分、趋势报告、失败样本提取、OpenAI Evals payload 导出

## 推荐节奏

1. 日常开发后先跑 `validate`
2. 有真实 agent 输出后跑 `score`
3. 重要分支或每周把结果 `record` 到 `runs/history.json`
4. 从失败 run 中提取候选样本，再人工整理进 `regressions.jsonl`

## 本地命令

```bash
bun hxflow/scripts/lib/evals.ts validate
bun hxflow/scripts/lib/evals.ts score tests/fixtures/evals/sample-results.json --write-run /tmp/hx-eval-run.json
bun hxflow/scripts/lib/evals.ts report
bun hxflow/scripts/lib/evals.ts extract-failures /tmp/hx-eval-run.json --output /tmp/hx-eval-candidates.jsonl
```

推荐手动流程：

1. 先运行你的 agent，产出一个结果文件，格式参考 `tests/fixtures/evals/sample-results.json`
2. 用 `score` 对结果文件打分
3. 用 `report` 查看历史趋势
4. 用 `extract-failures` 提取失败样本候选，再人工整理进 `datasets/regressions.jsonl`

## OpenAI Evals 对接

官方文档建议持续评测，并把生产失败样本持续回灌到回归集：

- https://platform.openai.com/docs/guides/evals?api-mode=responses
- https://platform.openai.com/docs/guides/evaluation-best-practices
- https://platform.openai.com/docs/api-reference/evals/getRuns

本仓库的 `openai-payload` 子命令只负责把本地数据集整理成一个可提交给 OpenAI Evals API 的 payload 草稿。真实接入时，需要按你的 agent 输出 schema 把 `sample.output_text`、tool call 字段和 grader 规则接到实际运行结果上。
