#!/usr/bin/env bash
# auto-fix-issues.sh — 每30分钟拉取 issues 并自动修复、创建 MR
set -euo pipefail

REPO_DIR="/Users/eleven/qiyuan-harness-workflow"
GITLAB_BASE="https://gitlab.cdfsunrise.com/api/v4"
GITLAB_PROJECT="frontend%2Fqybot%2Fqiyuan-harness-guide"
GITLAB_API="$GITLAB_BASE/projects/$GITLAB_PROJECT"
LOG_FILE="$REPO_DIR/scripts/auto-fix.log"
CLAUDE_BIN="/Users/eleven/.local/bin/claude"
REVIEWER_EMAIL="yinone@cdfsunrise.com"
REVIEWER_USERNAME="yinone"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG_FILE"
}

# 若环境变量未设置，尝试从 Claude Code settings.local.json 读取
if [[ -z "${GITLAB_TOKEN:-}" ]]; then
  SETTINGS_FILE="$HOME/.claude/settings.local.json"
  if [[ -f "$SETTINGS_FILE" ]]; then
    GITLAB_TOKEN=$(python3 -c "
import json, sys
with open('$SETTINGS_FILE') as f:
    d = json.load(f)
print(d.get('env', {}).get('GITLAB_TOKEN', ''))
" 2>/dev/null || echo "")
  fi
fi

if [[ -z "${GITLAB_TOKEN:-}" ]]; then
  log "ERROR: GITLAB_TOKEN 未设置，请在 ~/.claude/settings.local.json 的 env 中配置"
  exit 1
fi

# 查找 reviewer 的 GitLab user ID（按用户名精确匹配）
REVIEWER_ID=$(curl -sf \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_BASE/users?username=$REVIEWER_USERNAME" \
  | python3 -c "
import sys, json
users = json.load(sys.stdin)
print(users[0]['id'] if users else '')
" 2>/dev/null || echo "")

if [[ -z "$REVIEWER_ID" ]]; then
  log "WARNING: 未找到 reviewer $REVIEWER_EMAIL 的用户 ID，MR 将不设置 reviewer"
fi

log "===== 开始拉取 issues ====="

# 获取所有开放 issue（不限 label）
ISSUES=$(curl -sf \
  --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
  "$GITLAB_API/issues?state=opened&per_page=20")

ISSUE_COUNT=$(echo "$ISSUES" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))")
log "发现 $ISSUE_COUNT 个待修复 issue"

if [[ "$ISSUE_COUNT" -eq 0 ]]; then
  log "无待处理 issue，退出"
  exit 0
fi

cd "$REPO_DIR"

# 将每个 issue 写入临时文件，避免管道中 IFS 分割问题
TMPDIR_ISSUES=$(mktemp -d)
trap 'rm -rf "$TMPDIR_ISSUES"' EXIT

echo "$ISSUES" | python3 -c "
import sys, json, os
issues = json.load(sys.stdin)
tmpdir = sys.argv[1]
for i in issues:
    path = os.path.join(tmpdir, str(i['iid']) + '.json')
    with open(path, 'w') as f:
        json.dump({'iid': i['iid'], 'title': i['title'], 'description': i['description'] or ''}, f)
" "$TMPDIR_ISSUES"

for ISSUE_FILE in "$TMPDIR_ISSUES"/*.json; do
  IID=$(python3 -c "import json; d=json.load(open('$ISSUE_FILE')); print(d['iid'])")
  TITLE=$(python3 -c "import json; d=json.load(open('$ISSUE_FILE')); print(d['title'])")
  DESCRIPTION=$(python3 -c "import json; d=json.load(open('$ISSUE_FILE')); print(d['description'])")

  log "处理 issue #$IID: $TITLE"

  # git flow 规范：bug 修复用 bugfix/，功能用 feature/
  TITLE_LOWER=$(echo "$TITLE" | tr '[:upper:]' '[:lower:]')
  if echo "$TITLE_LOWER" | grep -qE "^(bug|fix|修复|错误|异常|报错)"; then
    BRANCH="bugfix/issue-$IID"
  else
    BRANCH="feature/issue-$IID"
  fi

  # 若分支已存在则跳过
  if git ls-remote --exit-code --heads origin "$BRANCH" &>/dev/null; then
    log "分支 $BRANCH 已存在，跳过"
    continue
  fi

  # 从最新 main 创建分支
  git fetch origin main --quiet
  git checkout -B "$BRANCH" origin/main --quiet

  PROMPT="你正在处理 GitLab Issue #${IID}。

当前分支：${BRANCH}（已从 main 创建，请严格在此分支上操作，禁止切换到 main 或其他分支）

标题：${TITLE}

描述：
${DESCRIPTION}

任务：
1. 确认当前分支为 ${BRANCH}（运行 git branch --show-current 验证）
2. 分析问题，找到相关源码
3. 在当前分支上实现修复，确保不破坏现有功能
4. 运行测试（pnpm vitest run）确认通过
5. git add <修改的文件>，然后 git commit -m 'fix: #${IID} ${TITLE}'
6. git push origin ${BRANCH}

重要约束：
- 所有修改必须在 ${BRANCH} 分支上进行，不得在 main 分支上直接修改
- 不得执行 git checkout main 或新建其他分支

完成后输出 DONE。"

  log "启动 Claude 修复 issue #$IID ..."
  (cd "$REPO_DIR" && "$CLAUDE_BIN" --dangerously-skip-permissions -p "$PROMPT") \
    >> "$LOG_FILE" 2>&1 \
    && log "issue #$IID Claude 修复完成" \
    || { log "issue #$IID 修复失败，跳过 MR 创建"; git checkout main --quiet; continue; }

  # 检查分支是否已推送
  if ! git ls-remote --exit-code --heads origin "$BRANCH" &>/dev/null; then
    log "issue #$IID 分支未推送，跳过 MR 创建"
    git checkout main --quiet
    continue
  fi

  # 使用 GitLab API 创建 MR
  log "创建 MR for issue #$IID ..."
  MR_PAYLOAD=$(python3 -c "
import json
payload = {
    'source_branch': '$BRANCH',
    'target_branch': 'main',
    'title': 'fix: #${IID} ${TITLE}',
    'description': 'Close #${IID}\n\n## 变更说明\n\n自动修复 Issue #${IID}：${TITLE}',
    'remove_source_branch': True
}
if '$REVIEWER_ID':
    payload['reviewer_ids'] = [int('$REVIEWER_ID')]
print(json.dumps(payload))
")

  MR_RESPONSE=$(curl -sf -X POST \
    --header "PRIVATE-TOKEN: $GITLAB_TOKEN" \
    --header "Content-Type: application/json" \
    --data "$MR_PAYLOAD" \
    "$GITLAB_API/merge_requests" 2>&1 || echo "ERROR")

  if echo "$MR_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('iid',''))" 2>/dev/null | grep -q .; then
    MR_IID=$(echo "$MR_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['iid'])")
    MR_URL=$(echo "$MR_RESPONSE" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d['web_url'])")
    log "MR !$MR_IID 创建成功：$MR_URL"
    [[ -n "$REVIEWER_ID" ]] && log "已指定 reviewer: $REVIEWER_EMAIL"
  else
    log "MR 创建失败：$MR_RESPONSE"
  fi

  # 切回 main 准备下一个
  git checkout main --quiet
done

log "===== 本轮处理完成 ====="
