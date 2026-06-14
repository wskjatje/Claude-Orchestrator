#!/usr/bin/env bash
# 修复 npm 安装的 Claude Code：补全 darwin-arm64 原生包并重新 link。
set -euo pipefail

NODE_BIN="$(dirname "$(command -v node)")"
PKG_ROOT="$(npm root -g)/@anthropic-ai/claude-code"

echo "==> Node: $(node --version)"
echo "==> 重新安装 Claude Code（含 darwin-arm64 原生包）..."
npm install -g @anthropic-ai/claude-code @anthropic-ai/claude-code-darwin-arm64

echo "==> 运行 postinstall..."
PKG_ROOT="$(npm root -g)/@anthropic-ai/claude-code"
cd "$PKG_ROOT"
node install.cjs
chmod +x "$PKG_ROOT/bin/claude.exe" 2>/dev/null || true

echo "==> 验证..."
"$NODE_BIN/claude" --version
echo "完成。请重启 CC Switch 后再从 Ollama Local 启动 Claude Code。"
