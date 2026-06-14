#!/usr/bin/env bash
# 通过 CC Switch 深链接导入 Claude Code → DeepSeek（Anthropic 兼容 API）
#
# 用法（勿把 key 写进仓库）：
#   DEEPSEEK_API_KEY='sk-...' ./scripts/setup-deepseek-cc-switch.sh
set -euo pipefail

DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY:-}"
BASE_URL="${DEEPSEEK_BASE_URL:-https://api.deepseek.com/anthropic}"
MODEL="${DEEPSEEK_MODEL:-deepseek-chat}"

if [[ -z "${DEEPSEEK_API_KEY}" ]]; then
  echo "请设置环境变量 DEEPSEEK_API_KEY" >&2
  echo "示例: DEEPSEEK_API_KEY='sk-...' $0" >&2
  exit 1
fi

echo "==> 检查 CC Switch..."
if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ ! -d "/Applications/CC Switch.app" ]]; then
    echo "未找到 CC Switch.app，请安装: https://ccswitch.io 或 brew install --cask cc-switch" >&2
    exit 1
  fi
fi

echo "==> 检查 Claude Code..."
if ! command -v claude >/dev/null 2>&1; then
  echo "未找到 claude CLI。推荐: brew install --cask claude-code" >&2
  exit 1
fi
claude --version

DEEPLINK=$(DEEPSEEK_API_KEY="${DEEPSEEK_API_KEY}" MODEL="${MODEL}" BASE_URL="${BASE_URL}" python3 <<'PY'
import os
import urllib.parse

model = os.environ["MODEL"]
base = os.environ["BASE_URL"]
key = os.environ["DEEPSEEK_API_KEY"]
query = urllib.parse.urlencode(
    {
        "resource": "provider",
        "app": "claude",
        "name": "DeepSeek",
        "homepage": "https://platform.deepseek.com",
        "endpoint": base,
        "apiKey": key,
        "model": model,
        "haikuModel": model,
        "sonnetModel": model,
        "opusModel": model,
        "icon": "deepseek",
        "enabled": "false",
        "notes": "DeepSeek Anthropic 兼容端点；适合 routine coding / 低成本推理",
    }
)
print(f"ccswitch://v1/import?{query}")
PY
)

echo ""
echo "即将在 CC Switch 中导入供应商「DeepSeek」"
echo "  模型: ${MODEL}"
echo "  端点: ${BASE_URL}"
echo ""

if [[ "$(uname -s)" == "Darwin" ]]; then
  open "${DEEPLINK}" || open -a "CC Switch" "${DEEPLINK}"
else
  echo "请手动在 CC Switch 中使用此链接："
  echo "${DEEPLINK}"
fi

cat <<EOF

请在 CC Switch 弹窗中「确认导入」。

使用步骤：
  1. CC Switch → Claude Code → 启用「DeepSeek」
  2. 终端: claude  或  claude --model ${MODEL}

切回 Ollama：在 CC Switch 启用「Ollama Local」即可。

详细 workload 分层见 docs/setup-ollama-cc-switch.md
EOF
