#!/usr/bin/env node
/**
 * Claude Workbench Web Bridge
 * - HTTP RPC :18790  → window.desktop 垫片
 * - WebSocket :18789 → Bridge 状态 + 事件推送
 */
import http from 'node:http'
import { WebSocketServer } from 'ws'
import { createRequire } from 'node:module'
import { broadcast, dispatchRpc } from './handlers.mjs'

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
for (const ch of ['workspace:changed', 'chat-sessions:changed', 'chat-settings:changed', 'scheduler:toast', 'scheduled-tasks:changed', 'orchestration:chain-status', 'workspace:preview-changed', 'agent-exec:changed']) {
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

httpServer.listen(HTTP_PORT, '127.0.0.1', () => {
  console.log(`[bridge] HTTP RPC http://127.0.0.1:${HTTP_PORT}/rpc`)
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
