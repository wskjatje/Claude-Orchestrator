#!/usr/bin/env bash
# 通过 CC Switch 深链接导入 Claude Code → Ollama 本地供应商，并做基础检查。
set -euo pipefail

MODEL="${OLLAMA_CLAUDE_MODEL:-qwen2.5-coder:latest}"
BASE_URL="${OLLAMA_BASE_URL:-http://localhost:11434}"

echo "==> 检查 Ollama..."
if ! command -v ollama >/dev/null 2>&1; then
  echo "未找到 ollama，请先安装: https://ollama.com" >&2
  exit 1
fi

if ! curl -sf "${BASE_URL%/}/api/tags" >/dev/null; then
  echo "Ollama 未响应 ${BASE_URL}，请先运行: ollama serve" >&2
  exit 1
fi

if ollama show "${MODEL}" >/dev/null 2>&1; then
  echo "模型已就绪: ${MODEL}"
else
  echo "正在拉取模型 ${MODEL}..."
  ollama pull "${MODEL}"
fi

echo "==> 检查 Claude Code..."
if ! command -v claude >/dev/null 2>&1; then
  echo "未找到 claude CLI。请安装: https://code.claude.com/docs/en/setup" >&2
  exit 1
fi
claude --version

echo "==> 检查 CC Switch..."
if [[ "$(uname -s)" == "Darwin" ]]; then
  if [[ ! -d "/Applications/CC Switch.app" ]]; then
    echo "未找到 CC Switch.app，可从 https://ccswitch.io 或 brew install --cask cc-switch 安装" >&2
    exit 1
  fi
fi

# CC Switch 深链接：导入 Claude 供应商并映射 haiku/sonnet/opus 到同一 Ollama 模型
DEEPLINK=$(MODEL="${MODEL}" BASE_URL="${BASE_URL}" python3 <<'PY'
import os
import urllib.parse

model = os.environ["MODEL"]
base = os.environ["BASE_URL"]
query = urllib.parse.urlencode(
    {
        "resource": "provider",
        "app": "claude",
        "name": "Ollama Local",
        "homepage": "http://127.0.0.1:11434",
        "endpoint": base,
        "apiKey": "ollama",
        "model": model,
        "haikuModel": model,
        "sonnetModel": model,
        "opusModel": model,
        "icon": "ollama",
        "enabled": "true",
    }
)
print(f"ccswitch://v1/import?{query}")
PY
)

echo ""
echo "即将在 CC Switch 中导入供应商「Ollama Local」"
echo "  模型: ${MODEL}"
echo "  端点: ${BASE_URL}"
echo ""
echo "请在 CC Switch 弹窗中：确认导入 → 切换到该供应商。"
echo ""

if [[ "$(uname -s)" == "Darwin" ]]; then
  open "${DEEPLINK}" || open -a "CC Switch" "${DEEPLINK}"
else
  echo "请手动在 CC Switch 中使用此链接："
  echo "${DEEPLINK}"
fi

cat <<EOF

完成后在终端测试（provider 回归 smoke test）：

  cd ~/claudecode
  claude --model ${MODEL} -p "你好" --tools "" < /dev/null

交互模式（首条可能 2–5 分钟）：

  cd /path/to/your/project
  claude --model ${MODEL}

详细说明与四路 provider 路由见 docs/setup-ollama-cc-switch.md
EOF
