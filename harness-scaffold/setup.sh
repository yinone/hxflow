#!/bin/bash
# setup.sh — 一次性初始化脚本
# 用法: chmod +x setup.sh && ./setup.sh
# 在新项目或克隆后首次运行

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
RESET='\033[0m'

echo ""
echo -e "${BOLD}Harness Engineering 项目初始化${RESET}"
echo "════════════════════════════════════════"
echo ""

# ── 检查 Node.js 版本 ─────────────────────────────────────────
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ -z "$NODE_VERSION" ] || [ "$NODE_VERSION" -lt 18 ]; then
  echo -e "${RED}✗ 需要 Node.js >= 18，当前版本: $(node -v 2>/dev/null || echo '未安装')${RESET}"
  exit 1
fi
echo -e "${GREEN}✓${RESET} Node.js $(node -v)"

# ── 安装依赖 ─────────────────────────────────────────────────
echo ""
echo "▸ 安装项目依赖..."
npm install --silent
echo -e "${GREEN}✓${RESET} 依赖安装完成"

# ── 安装 Husky Git Hooks ──────────────────────────────────────
echo ""
echo "▸ 安装 Git Hooks..."
if [ -d ".git" ]; then
  npx husky install 2>/dev/null || true
  chmod +x .husky/commit-msg .husky/pre-commit .husky/pre-push 2>/dev/null || true
  echo -e "${GREEN}✓${RESET} Git Hooks 安装完成"
  echo "  已安装: commit-msg  pre-commit  pre-push"
else
  echo -e "${YELLOW}⚠  当前目录不是 Git 仓库，跳过 Hook 安装${RESET}"
  echo "  运行 git init 后重新执行 npx husky install"
fi

# ── 校验上下文 ────────────────────────────────────────────────
echo ""
echo "▸ 校验 AGENTS.md..."
npm run hx:ctx --silent && echo -e "${GREEN}✓${RESET} 上下文校验通过" || \
  echo -e "${YELLOW}⚠  AGENTS.md 校验发现问题，请检查上方提示${RESET}"

# ── 完成提示 ─────────────────────────────────────────────────
echo ""
echo "════════════════════════════════════════"
echo -e "${BOLD}初始化完成！${RESET}"
echo ""
echo "快速开始："
echo ""
echo -e "  ${BOLD}npm run hx:doc <feature-name>${RESET}"
echo "  从模板创建新需求文档"
echo ""
echo -e "  ${BOLD}npm run hx:plan <feature-name> --role=be${RESET}"
echo "  创建执行计划（后端）"
echo ""
echo -e "  ${BOLD}npm run hx:run be TASK-BE-01${RESET}"
echo "  生成 Agent 执行 Prompt"
echo ""
echo -e "  ${BOLD}npm run hx:gate${RESET}"
echo "  本地门控：lint + typecheck + test"
echo ""
echo "完整命令列表：cat package.json | grep 'hx:'"
echo ""
