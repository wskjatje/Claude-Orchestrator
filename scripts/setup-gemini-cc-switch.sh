#!/usr/bin/env bash
# 通过 CC Switch 深链接导入：
#   1) Claude Code → Google Gemini（经本机 claude-code-router 转 Anthropic 协议）
#   2) Gemini CLI  → Google AI Studio（直连，使用 GEMINI_API_KEY）
#
# 用法（勿把 key 写进仓库）：
#   GEMINI_API_KEY='AIza...' ./scripts/setup-gemini-cc-switch.sh
set -euo pipefail

GEMINI_API_KEY="${GEMINI_API_KEY:-}"
ROUTER_PORT="${GEMINI_ROUTER_PORT:-3456}"
MODEL="${GEMINI_MODEL:-gemini-2.5-flash}"
ROUTER_BASE="http://127.0.0.1:${ROUTER_PORT}"

if [[ -z "${GEMINI_API_KEY}" ]]; then
  echo "请设置环境变量 GEMINI_API_KEY（Google AI Studio 密钥，以 AIza 开头）" >&2
  echo "示例: GEMINI_API_KEY='AIza...' $0" >&2
  exit 1
fi

echo "==> 检查 CC Switch..."
if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ ! -d "/Applications/CC Switch.app" ]]; then
    echo "未找到 CC Switch.app，请安装: https://ccswitch.io 或 brew install --cask cc-switch" >&2
    exit 1
  fi
fi

echo "==> 安装 / 检查 claude-code-router（Claude Code 用 Gemini 必需）..."
if ! command -v ccr >/dev/null 2>&1; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "需要 Node.js/npm 以安装 @musistudio/claude-code-router" >&2
    exit 1
  fi
  npm install -g @musistudio/claude-code-router
fi
if ! command -v ccr >/dev/null 2>&1; then
  echo "安装后仍找不到 ccr，请确认 npm 全局 bin 在 PATH 中（nvm 用户可: hash -r）" >&2
  exit 1
fi

mkdir -p "${HOME}/.claude-code-router"
CONFIG="${HOME}/.claude-code-router/config.json"
cat >"${CONFIG}" <<EOF
{
  "LOG": true,
  "LOG_LEVEL": "info",
  "HOST": "127.0.0.1",
  "PORT": ${ROUTER_PORT},
  "API_TIMEOUT_MS": 600000,
  "Providers": [
    {
      "name": "gemini",
      "api_base_url": "https://generativelanguage.googleapis.com/v1beta/models/",
      "api_key": "${GEMINI_API_KEY}",
      "models": ["${MODEL}", "gemini-2.0-flash"],
      "transformer": { "use": ["gemini"] }
    }
  ],
  "Router": {
    "default": "gemini,${MODEL}",
    "background": "gemini,${MODEL}",
    "think": "gemini,${MODEL}"
  }
}
EOF
chmod 600 "${CONFIG}"
echo "已写入 ${CONFIG}（权限 600）"

import_provider() {
  local label="$1"
  local deeplink="$2"
  echo ""
  echo ">>> 导入: ${label}"
  echo "${deeplink}"
  if [[ "$(uname -s)" == "Darwin" ]]; then
    open "${deeplink}" || open -a "CC Switch" "${deeplink}"
  fi
}

# Claude Code：供应商名「Google Gemini」
DEEPLINK_CLAUDE=$(GEMINI_API_KEY="${GEMINI_API_KEY}" MODEL="${MODEL}" ROUTER_BASE="${ROUTER_BASE}" python3 <<'PY'
import os
import urllib.parse

model = os.environ["MODEL"]
base = os.environ["ROUTER_BASE"]
query = urllib.parse.urlencode(
    {
        "resource": "provider",
        "app": "claude",
        "name": "Google Gemini",
        "homepage": "https://aistudio.google.com",
        "endpoint": base,
        "apiKey": "gemini",
        "model": model,
        "haikuModel": model,
        "sonnetModel": model,
        "opusModel": model,
        "icon": "gemini",
        "enabled": "true",
        "notes": "经本机 claude-code-router 转发；使用前请执行: ccr start",
    }
)
print(f"ccswitch://v1/import?{query}")
PY
)

# Gemini CLI：同一密钥，直连 Google（在 CC Switch 的 Gemini 应用页也会出现）
DEEPLINK_GEMINI_CLI=$(GEMINI_API_KEY="${GEMINI_API_KEY}" MODEL="${MODEL}" python3 <<'PY'
import os
import urllib.parse

key = os.environ["GEMINI_API_KEY"]
model = os.environ["MODEL"]
query = urllib.parse.urlencode(
    {
        "resource": "provider",
        "app": "gemini",
        "name": "Google AI Studio",
        "homepage": "https://aistudio.google.com",
        "endpoint": "https://generativelanguage.googleapis.com",
        "apiKey": key,
        "model": model,
        "icon": "gemini",
        "enabled": "false",
        "notes": "AI Studio API Key；用于 gemini 命令行，非 claude",
    }
)
print(f"ccswitch://v1/import?{query}")
PY
)

import_provider "Claude Code → Google Gemini" "${DEEPLINK_CLAUDE}"
sleep 1
import_provider "Gemini CLI → Google AI Studio" "${DEEPLINK_GEMINI_CLI}"

cat <<EOF

请在 CC Switch 弹窗中分别「确认导入」。

Claude Code 使用 Gemini 的步骤：
  1. 终端执行: ccr start          # 保持运行或后台
  2. CC Switch → Claude Code → 启用「Google Gemini」
  3. 终端: claude  或  claude --model ${MODEL}

切回 Ollama：在 CC Switch 启用「Ollama Local」即可。

若已在聊天中泄露 API Key，请到 AI Studio 轮换密钥后重新运行本脚本。
EOF
