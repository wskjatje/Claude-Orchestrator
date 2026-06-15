#!/usr/bin/env node
/**
 * Claude Orchestrator Web Bridge
 * - HTTP RPC :18790  → window.desktop 垫片
 * - WebSocket :18789 → Bridge 状态 + 事件推送
 */
import http from 'node:http'
import { WebSocketServer } from 'ws'
import { createRequire } from 'node:module'
import { broadcast, dispatchRpc } from './handlers.mjs'
import { runStartupMcpHealthCheck } from './mcp-health-persist.mjs'

const require = createRequire(import.meta.url)
const { attachTerminalToWebSocket } = require('./workspace-terminal.cjs')
const { loadWorkspace } = await import('./store.mjs')

const HTTP_PORT = Number(process.env.WORKBENCH_HTTP_PORT || 18790)
const WS_PORT = Number(process.env.WORKBENCH_WS_PORT || 18789)
const VERSION = 'claudecode-bridge/1.0.0'

/** @type {Set<import('ws').WebSocket>} */
const wsClients = new Set()

function sendWs(obj) {
  const data = JSON.stringify(obj)
  for (const c of wsClients) {
    if (c.readyState === 1) c.send(data)
  }
}

// 将 store 层 broadcast 桥接到 WebSocket
import { subscribeEvent } from './handlers.mjs'
for (const ch of ['workspace:changed', 'chat-sessions:changed', 'chat-settings:changed', 'scheduler:toast', 'scheduled-tasks:changed', 'orchestration:chain-status', 'workspace:preview-changed', 'agent-exec:changed', 'mcp-health:changed']) {
  subscribeEvent(ch, (detail) => {
    sendWs({ type: 'event', channel: ch, detail })
  })
}

const httpServer = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.writeHead(204)
    res.end()
    return
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, version: VERSION }))
    return
  }

  if (req.method === 'POST' && req.url === '/rpc') {
    let body = ''
    req.on('data', (c) => {
      body += c
    })
    req.on('end', async () => {
      try {
        const { channel, args } = JSON.parse(body || '{}')
        if (!channel || typeof channel !== 'string') {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ ok: false, error: 'missing channel' }))
          return
        }
        const result = await dispatchRpc(channel, Array.isArray(args) ? args : [])
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(result))
      } catch (e) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ ok: false, error: e.message }))
      }
    })
    return
  }

  res.writeHead(404)
  res.end('not found')
})

/** @param {Awaited<ReturnType<typeof runStartupMcpHealthCheck>>} r */
function logStartupMcpHealthResult(r) {
  if (r.skipped) return
  if (!r.ok) {
    console.warn('[bridge] MCP 启动健康检查失败:', r.error || '未知错误')
    return
  }
  if (r.missing) {
    console.log('[bridge] MCP 启动健康检查：尚无 MCP 配置，已写入空快照')
    return
  }
  console.log(
    `[bridge] MCP 启动健康检查完成：${r.okCount ?? 0}/${r.total ?? 0} 在线（已写入 .claudecode/workbench.db）`,
  )
  broadcast('mcp-health:changed', {
    configPath: r.configPath,
    okCount: r.okCount,
    total: r.total,
    source: 'startup',
  })
}

function runStartupMcpHealthCheckWithLog() {
  void runStartupMcpHealthCheck()
    .then(logStartupMcpHealthResult)
    .catch((e) => {
      console.warn('[bridge] MCP 启动健康检查异常:', e?.message || e)
    })
}

/**
 * MCP_STARTUP_HEALTH:
 * - immediate — Bridge 就绪后立即检查（旧行为）
 * - defer — 不自动检查，由 Web 就绪后 RPC 触发（web:dev:full 默认）
 * - delayed — Bridge 就绪后延迟 MCP_STARTUP_DELAY_MS（默认 8000ms），供单独 bridge 使用
 */
function scheduleStartupMcpHealthCheck() {
  const mode = process.env.MCP_STARTUP_HEALTH || 'defer'
  if (mode === 'immediate') {
    runStartupMcpHealthCheckWithLog()
    return
  }
  if (mode === 'delayed') {
    const delayMs = Number(process.env.MCP_STARTUP_DELAY_MS || 8000)
    console.log(`[bridge] MCP 启动健康检查将在 ${delayMs}ms 后执行`)
    setTimeout(runStartupMcpHealthCheckWithLog, delayMs)
    return
  }
  console.log('[bridge] MCP 启动健康检查已推迟（待 Web 就绪后触发）')
}

httpServer.listen(HTTP_PORT, '127.0.0.1', () => {
  console.log(`[bridge] HTTP RPC http://127.0.0.1:${HTTP_PORT}/rpc`)
  scheduleStartupMcpHealthCheck()
})

const wss = new WebSocketServer({ host: '127.0.0.1', port: WS_PORT })

wss.on('connection', (ws) => {
  wsClients.add(ws)
  attachTerminalToWebSocket(ws, () => loadWorkspace())
  ws.send(
    JSON.stringify({
      type: 'hello',
      payload: { version: VERSION, account: 'local', subscription: 'web-bridge' },
    }),
  )
  ws.on('close', () => wsClients.delete(ws))
})

console.log(`[bridge] WebSocket ws://127.0.0.1:${WS_PORT}`)
