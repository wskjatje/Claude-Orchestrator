/**
 * 内嵌浏览器 Bridge：Web 预览通过 browser-host（Electron overlay）统一渲染任意网站。
 */
import { broadcast } from './handlers.mjs'

/** @type {import('ws').WebSocket | null} */
let browserHost = null

/** @type {Map<string, { resolve: (v: unknown) => void, timer: ReturnType<typeof setTimeout> }>} */
const pending = new Map()
let nextId = 1

const EMBEDDED_BROWSER_CHANNELS = [
  'embedded-browser:navigated',
  'embedded-browser:dom-ready',
  'embedded-browser:loading-state',
  'embedded-browser:load-failed',
  'embedded-browser:title-updated',
  'embedded-browser:element-picked',
]

/** @param {import('ws').WebSocket} ws */
export function setBrowserHost(ws) {
  browserHost = ws
}

/** @param {import('ws').WebSocket} ws */
export function clearBrowserHost(ws) {
  if (browserHost !== ws) return
  browserHost = null
  for (const [id, entry] of pending) {
    clearTimeout(entry.timer)
    entry.resolve({ ok: false, error: 'browser-host-disconnected' })
    pending.delete(id)
  }
}

export function isBrowserHostConnected() {
  return !!browserHost && browserHost.readyState === 1
}

/**
 * @param {string} method
 * @param {unknown[]} args
 * @param {number} [timeoutMs]
 */
export async function invokeBrowserHost(method, args = [], timeoutMs = 15000) {
  if (!isBrowserHostConnected()) {
    return { ok: false, error: 'browser-host-unavailable' }
  }
  const id = String(nextId++)
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pending.delete(id)
      resolve({ ok: false, error: 'browser-host-timeout' })
    }, timeoutMs)
    pending.set(id, { resolve, timer })
    try {
      browserHost.send(
        JSON.stringify({
          type: 'embedded-browser:invoke',
          id,
          method,
          args,
        }),
      )
    } catch (e) {
      clearTimeout(timer)
      pending.delete(id)
      resolve({ ok: false, error: e instanceof Error ? e.message : String(e) })
    }
  })
}

/** @param {{ id?: string, result?: unknown }} msg */
export function handleBrowserHostResponse(msg) {
  const id = String(msg?.id || '')
  const entry = pending.get(id)
  if (!entry) return
  clearTimeout(entry.timer)
  pending.delete(id)
  entry.resolve(msg.result ?? { ok: false, error: 'empty response' })
}

export async function getWorkbenchBrowserCapabilities() {
  return {
    ok: true,
    engine: 'embedded',
    available: true,
    browserHostConnected: isBrowserHostConnected(),
    modes: ['embedded-tab'],
    hint: '项目内嵌浏览器使用 WebContentsView；Web 预览通过 Bridge 叠层渲染，桌面与 Web 共用同一套 API。',
  }
}

/** @param {import('ws').WebSocket} ws @param {object} msg */
export async function handleBrowserWebSocketMessage(ws, msg) {
  if (msg?.type === 'register' && msg?.role === 'browser-host') {
    setBrowserHost(ws)
    try {
      ws.send(JSON.stringify({ type: 'registered', role: 'browser-host' }))
    } catch {
      /* ignore */
    }
    return true
  }

  if (msg?.type === 'embedded-browser:response') {
    handleBrowserHostResponse(msg)
    return true
  }

  if (msg?.type === 'embedded-browser:event' && msg.channel) {
    broadcast(String(msg.channel), msg.detail ?? {})
    return true
  }

  return false
}

/** @param {import('ws').WebSocket} ws */
export function unsubscribeBrowserSession(ws) {
  clearBrowserHost(ws)
}

export async function shutdownWorkbenchBrowser() {
  if (!isBrowserHostConnected()) return
  await invokeBrowserHost('destroyAll', [], 3000).catch(() => {})
}

const RPC_METHODS = new Set([
  'ping',
  'create',
  'destroy',
  'setLayout',
  'focus',
  'loadURL',
  'reload',
  'goBack',
  'goForward',
  'canNav',
  'openDevTools',
  'setPickerActive',
])

/** @param {string} method @param {unknown[]} args */
export async function dispatchEmbeddedBrowser(method, args = []) {
  if (!RPC_METHODS.has(method)) {
    return { ok: false, error: `unknown embedded-browser method: ${method}` }
  }
  return invokeBrowserHost(method, args)
}

export { EMBEDDED_BROWSER_CHANNELS }
