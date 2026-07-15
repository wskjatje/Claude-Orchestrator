#!/usr/bin/env bash
# 兼容旧入口：Bridge + Vite + 应用壳（与 desktop 相同）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
exec node "$ROOT/desktop/run-dev.mjs"
