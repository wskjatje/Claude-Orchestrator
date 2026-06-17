#!/usr/bin/env bash
# 清除 macOS 隔离属性，修复经微信/AirDrop 传输后「已损坏，无法打开」。
set -euo pipefail
APP="${1:-/Applications/Claude Orchestrator.app}"
if [[ ! -d "$APP" ]]; then
  echo "找不到应用: $APP"
  echo "用法: $0 [/Applications/Claude Orchestrator.app]"
  exit 1
fi
xattr -cr "$APP"
echo "已清除隔离属性: $APP"
echo "请再次打开；若仍被拦截，请右键该应用 →「打开」一次。"
