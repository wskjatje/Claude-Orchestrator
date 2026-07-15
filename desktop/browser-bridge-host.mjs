/**
 * Electron 主进程：向 Bridge WebSocket 注册 browser-host，供 Web 预览远程驱动 overlay 内嵌浏览器。
 */
import { createRequire } from 'node:module'
import { getWorkbenchWsPort } from '../server/bridge-constants.mjs'

const require = createRequire(import.meta.url)
const WS_PORT = getWorkbenchWsPort()

/** @param {import('./embedded-browser.mjs').EmbeddedBrowserManager} mgr */
export function connectBrowserBridgeHost(mgr) {
  let ws = null
  let reconnectTimer = null
  let stopped = false

  mgr.setBridgeEventSink((_tabId, channel, detail) => {
    if (!ws || ws.readyState !== 1) return
    try {
      ws.send(
        JSON.stringify({
          type: 'embedded-browser:event',
          channel,
          detail,
        }),
      )
    } catch {
      /* ignore */
    }
  })

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 2000)
  }

  function connect() {
    if (stopped) return
    let WebSocketImpl
    try {
      WebSocketImpl = require('ws')
    } catch {
      try {
        WebSocketImpl = require('../node_modules/ws')
      } catch {
        console.warn('[browser-host] 未找到 ws 模块，Web 预览内嵌浏览器不可用')
        scheduleReconnect()
        return
      }
    }

    try {
      ws = new WebSocketImpl(`ws://127.0.0.1:${WS_PORT}`)
    } catch (e) {
      console.warn('[browser-host] WebSocket 连接失败:', e?.message || e)
      scheduleReconnect()
      return
    }

    ws.on('open', () => {
      console.log('[browser-host] 已连接 Bridge，注册 overlay 内嵌浏览器')
      ws.send(JSON.stringify({ type: 'register', role: 'browser-host' }))
    })

    ws.on('message', (raw) => {
      void (async () => {
        let msg
        try {
          msg = JSON.parse(String(raw))
        } catch {
          return
        }
        if (msg?.type !== 'embedded-browser:invoke') return
        const id = msg.id
        const method = String(msg.method || '')
        const args = Array.isArray(msg.args) ? msg.args : []
        let result
        try {
          result = await mgr.invoke(method, args)
        } catch (e) {
          result = { ok: false, error: e instanceof Error ? e.message : String(e) }
        }
        if (ws?.readyState === 1) {
          ws.send(JSON.stringify({ type: 'embedded-browser:response', id, result }))
        }
      })()
    })

    ws.on('close', () => {
      ws = null
      scheduleReconnect()
    })

    ws.on('error', () => {
      /* close 会触发重连 */
    })
  }

  connect()

  return () => {
    stopped = true
    if (reconnectTimer) clearTimeout(reconnectTimer)
    try {
      ws?.close()
    } catch {
      /* ignore */
    }
  }
}
