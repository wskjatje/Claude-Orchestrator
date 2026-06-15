#!/usr/bin/env bash
# 同时启动 Web Bridge 后端 + Vite 前端（项目优先，MCP 待 Web 就绪后再检查）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

# Bridge 不阻塞于 MCP 探测；Web 就绪后由本脚本 RPC 触发
export MCP_STARTUP_HEALTH=defer

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
VITE_PID=""

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

wait_vite_ready() {
  for _ in $(seq 1 160); do
    if curl -sf -o /dev/null "http://127.0.0.1:5188/" 2>/dev/null; then
      return 0
    fi
    sleep 0.25
  done
  return 1
}

trigger_mcp_startup_health() {
  echo "[dev] 项目已就绪，后台执行 MCP 健康检查…"
  curl -sf -X POST "http://127.0.0.1:18790/rpc" \
    -H "Content-Type: application/json" \
    -d '{"channel":"mcp:healthCheckAll","args":[]}' >/dev/null 2>&1 &
}

start_bridge
npm run web:dev &
VITE_PID=$!
echo "[dev] Vite PID ${VITE_PID}"

if wait_bridge_ready; then
  echo "[dev] Bridge 已就绪 http://127.0.0.1:18790"
else
  echo "[dev] 警告：Bridge 未在 :18790 就绪，请检查 node server/index.mjs 日志" >&2
fi

if wait_vite_ready; then
  echo "[dev] Web 已就绪 http://127.0.0.1:5188"
  trigger_mcp_startup_health
else
  echo "[dev] 警告：Vite 未在 :5188 就绪，跳过 MCP 启动检查" >&2
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
  [[ -n "$VITE_PID" ]] && kill "$VITE_PID" 2>/dev/null || true
  if [[ -f "$BRIDGE_PID_FILE" ]]; then
    pid=$(cat "$BRIDGE_PID_FILE" 2>/dev/null || true)
    [[ -n "$pid" ]] && kill "$pid" 2>/dev/null || true
    rm -f "$BRIDGE_PID_FILE"
  fi
}
trap cleanup EXIT INT TERM

wait "$VITE_PID"
