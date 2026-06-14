#!/usr/bin/env bash
# 同时启动 Web Bridge 后端 + Vite 前端
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -d web/node_modules ]]; then
  npm run web:install
fi
if [[ ! -d node_modules/ws ]]; then
  npm install
fi
node scripts/fix-node-pty-perms.mjs
if [[ ! -d server/vendor/cad/node_modules/@modelcontextprotocol ]]; then
  npm run vendor:install
fi

BRIDGE_PID_FILE="${TMPDIR:-/tmp}/claudecode-bridge.pid"
WATCHDOG_PID=""

free_port() {
  local port="$1"
  command -v lsof >/dev/null 2>&1 || return 0
  local old_pids
  old_pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  [[ -z "${old_pids}" ]] && return 0
  echo "[dev] 释放端口 ${port}（PID ${old_pids})"
  kill ${old_pids} 2>/dev/null || true
  sleep 0.4
  old_pids=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [[ -n "${old_pids}" ]]; then
    echo "[dev] 端口 ${port} 仍占用，SIGKILL ${old_pids}"
    kill -9 ${old_pids} 2>/dev/null || true
    sleep 0.3
  fi
}

start_bridge() {
  for port in 18790 18789; do
    free_port "$port"
  done
  # --watch：server/*.mjs 变更时自动重启，避免「未知 RPC」
  node --watch server/index.mjs &
  echo $! >"$BRIDGE_PID_FILE"
  echo "[dev] Bridge PID $(cat "$BRIDGE_PID_FILE") (watch mode)"
}

wait_bridge_ready() {
  for _ in $(seq 1 30); do
    if curl -sf "http://127.0.0.1:18790/health" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.15
  done
  return 1
}

start_bridge
if ! wait_bridge_ready; then
  echo "[dev] 警告：Bridge 未在 :18790 就绪，请检查 node server/index.mjs 日志" >&2
fi

# Bridge 意外退出时自动重启（Vite 仍在前台运行）
(
  while true; do
    sleep 2
    pid=""
    [[ -f "$BRIDGE_PID_FILE" ]] && pid=$(cat "$BRIDGE_PID_FILE" 2>/dev/null || true)
    if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
      echo "[dev] Bridge 未运行，正在重启…" >&2
      start_bridge
      wait_bridge_ready || echo "[dev] 警告：Bridge 重启后仍未就绪" >&2
    fi
  done
) &
WATCHDOG_PID=$!

cleanup() {
  [[ -n "$WATCHDOG_PID" ]] && kill "$WATCHDOG_PID" 2>/dev/null || true
  if [[ -f "$BRIDGE_PID_FILE" ]]; then
    pid=$(cat "$BRIDGE_PID_FILE" 2>/dev/null || true)
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
    rm -f "$BRIDGE_PID_FILE"
  fi
}
trap cleanup EXIT INT TERM

npm run web:dev
