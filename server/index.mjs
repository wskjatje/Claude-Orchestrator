#!/usr/bin/env node
/**
 * Claude Orchestrator Web Bridge
 * - HTTP RPC → window.desktop 垫片（WORKBENCH_HTTP_PORT）
 * - WebSocket → Bridge 状态 + 事件推送（WORKBENCH_WS_PORT）
 */
import http from 'node:http'
import { WebSocketServer } from 'ws'
import { createRequire } from 'node:module'
import { broadcast, dispatchRpc } from './handlers.mjs'
import { runStartupMcpHealthCheck } from './mcp-health-persist.mjs'
import { getWorkbenchHttpPort, getWorkbenchWsPort } from './bridge-constants.mjs'
import { handleWorkbenchBrowserProxy } from './workbench-browser-proxy.mjs'
import {
  getWorkbenchBrowserCapabilities,
  handleBrowserWebSocketMessage,
  unsubscribeBrowserSession,
  EMBEDDED_BROWSER_CHANNELS,
} from './workbench-browser-native.mjs'

const require = createRequire(import.meta.url)
const { attachTerminalToWebSocket } = require('./workspace-terminal.cjs')
const { loadWorkspace } = await import('./store.mjs')

const HTTP_PORT = getWorkbenchHttpPort()
const WS_PORT = getWorkbenchWsPort()
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
for (const ch of ['workspace:changed', 'chat-sessions:changed', 'chat-settings:changed', 'scheduler:toast', 'scheduled-tasks:changed', 'orchestration:chain-status', 'workspace:preview-changed', 'agent-exec:changed', 'mcp-health:changed', 'message_delta', ...EMBEDDED_BROWSER_CHANNELS]) {
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

  if (req.method === 'GET' && req.url === '/workbench-browser/capabilities') {
    const caps = await getWorkbenchBrowserCapabilities()
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify(caps))
    return
  }

  if (req.method === 'GET' && req.url?.startsWith('/workbench-browser/proxy')) {
    await handleWorkbenchBrowserProxy(req, res)
    return
  }

  if (req.method === 'POST' && req.url?.startsWith('/workbench-browser/proxy')) {
    await handleWorkbenchBrowserProxy(req, res)
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

/** @param {import('node:http').Server | import('node:net').Server} server */
function listenWithRetry(server, port, host, label) {
  const maxAttempts = Number(process.env.BRIDGE_BIND_RETRIES || 40)
  const delayMs = Number(process.env.BRIDGE_BIND_RETRY_MS || 250)

  return new Promise((resolve, reject) => {
    let attempt = 0

    const tryListen = () => {
      attempt++

      const onListening = () => {
        cleanup()
        resolve(undefined)
      }

      const onError = (err) => {
        cleanup()
        if (err?.code === 'EADDRINUSE' && attempt < maxAttempts) {
          if (attempt === 1) {
            console.warn(`[bridge] ${label} 端口 ${port} 占用，等待释放…`)
          }
          server.close(() => {
            setTimeout(tryListen, delayMs)
          })
          return
        }
        reject(err)
      }

      const cleanup = () => {
        server.removeListener('listening', onListening)
        server.removeListener('error', onError)
      }

      server.once('listening', onListening)
      server.once('error', onError)
      server.listen(port, host)
    }

    tryListen()
  })
}

await listenWithRetry(httpServer, HTTP_PORT, '127.0.0.1', 'HTTP')
console.log(`[bridge] HTTP RPC http://127.0.0.1:${HTTP_PORT}/rpc`)
scheduleStartupMcpHealthCheck()

const wss = new WebSocketServer({ host: '127.0.0.1', port: WS_PORT })
wss.on('error', (err) => {
  console.error('[bridge] WebSocket 服务错误:', err?.message || err)
  process.exit(1)
})

wss.on('connection', (ws) => {
  wsClients.add(ws)
  attachTerminalToWebSocket(ws, () => loadWorkspace())
  ws.on('message', (raw) => {
    void (async () => {
      let msg
      try {
        msg = JSON.parse(String(raw))
      } catch {
        return
      }
      await handleBrowserWebSocketMessage(ws, msg)
    })()
  })
  ws.send(
    JSON.stringify({
      type: 'hello',
      payload: { version: VERSION, account: 'local', subscription: 'web-bridge' },
    }),
  )
  ws.on('close', () => {
    wsClients.delete(ws)
    unsubscribeBrowserSession(ws)
  })
})

console.log(`[bridge] WebSocket ws://127.0.0.1:${WS_PORT}`)
