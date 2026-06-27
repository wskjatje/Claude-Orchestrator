#!/usr/bin/env node
/**
 * 打包版 UI：结合 TanStack Start SSR + 静态资源 + /api → Bridge 反向代理
 *
 * 构建后的 dist-electron 结构（TanStack Start v1 SSR 输出）：
 *   server/          ← SSR 服务端入口
 *   client/          ← 客户端 hydration 资源
 *   index.html       ← 由 patch 脚本生成的回退入口
 *
 * 未匹配到静态文件时，调用 SSR 服务端渲染页面，替换 Vite dev server 功能。
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UI_PORT = Number(process.env.WORKBENCH_UI_PORT || 5188)
const BRIDGE_PORT = Number(process.env.WORKBENCH_HTTP_PORT || 18790)
const STATIC_DIR = process.env.WEB_STATIC_DIR?.trim()
  ? path.resolve(process.env.WEB_STATIC_DIR.trim())
  : path.join(__dirname, '..', 'web', 'dist-electron')

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
}

/** 缓存 SSR handler，首次请求时懒加载 */
let ssrHandlerCache = null

async function getSsrHandler() {
  if (ssrHandlerCache) return ssrHandlerCache
  // SSR 入口位于 STATIC_DIR/server/index.js
  const serverDir = path.join(STATIC_DIR, 'server')
  const entryPath = path.join(serverDir, 'index.js')
  if (!fs.existsSync(entryPath)) {
    console.log('[ui] SSR entry not found, fallback to static SPA')
    return null
  }
  try {
    // 以 serverDir 作为 import base，使其中相对路径（./assets/worker-*）正确解析
    const mod = await import(pathToFileURL(entryPath).href)
    // TanStack Start SSR 输出为 Cloudflare Worker 风格：
    //   export default { fetch(request, env, ctx) { ... } }
    // 或 export const createServerEntry = () => { fetch: ... }
    const handler = (mod.default && typeof mod.default.fetch === 'function')
      ? { fetch: mod.default.fetch }
      : (typeof mod.createServerEntry === 'function'
          ? mod.createServerEntry()
          : null)
    if (handler && typeof handler.fetch === 'function') {
      ssrHandlerCache = handler
      console.log('[ui] SSR handler loaded')
      return ssrHandlerCache
    }
    console.log('[ui] SSR entry has no valid fetch handler, fallback to static')
    return null
  } catch (err) {
    console.error('[ui] Failed to load SSR handler:', err?.message || err)
    return null
  }
}

function proxyToBridge(req, res, targetPath) {
  const opts = {
    hostname: '127.0.0.1',
    port: BRIDGE_PORT,
    path: targetPath,
    method: req.method,
    headers: { ...req.headers, host: `127.0.0.1:${BRIDGE_PORT}` },
    timeout: 600_000,
  }
  const upstream = http.request(opts, (up) => {
    res.writeHead(up.statusCode || 502, up.headers)
    up.pipe(res)
  })
  upstream.on('error', (e) => {
    res.writeHead(502, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: false, error: e.message }))
  })
  req.pipe(upstream)
}

function sendFile(res, absPath) {
  const ext = path.extname(absPath).toLowerCase()
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' })
  fs.createReadStream(absPath).pipe(res)
}

function resolveStatic(urlPath) {
  const safe = path.normalize(decodeURIComponent(urlPath.split('?')[0])).replace(/^(\.\.(\/|\\|$))+/, '')
  const rel = safe.startsWith('/') ? safe.slice(1) : safe
  const abs = path.join(STATIC_DIR, rel)
  if (!abs.startsWith(STATIC_DIR)) return null
  if (fs.existsSync(abs) && fs.statSync(abs).isFile()) return abs

  // 补丁：TanStack Start SSR 输出的路径为 /assets/xxx，但实际文件在 client/assets/xxx
  const clientFallback = path.join(STATIC_DIR, 'client', rel)
  if (clientFallback.startsWith(STATIC_DIR) && fs.existsSync(clientFallback) && fs.statSync(clientFallback).isFile()) {
    return clientFallback
  }
  return null
}

/**
 * 将 Node.js IncomingMessage 转为 Web 标准 Request
 */
function nodeReqToWebRequest(req, bodyBuffer) {
  const proto = req.socket?.encrypted ? 'https' : 'http'
  const host = req.headers.host || '127.0.0.1:5188'
  const url = new URL(req.url || '/', `${proto}://${host}`)

  return new Request(url, {
    method: req.method,
    headers: req.headers,
    body: (req.method !== 'GET' && req.method !== 'HEAD') ? bodyBuffer.toString() : undefined,
  })
}

/**
 * 将 Web 标准 Response 写回 Node.js ServerResponse
 */
async function webResponseToNodeRes(res, webResp) {
  const headers = {}
  webResp.headers.forEach((value, key) => {
    headers[key] = value
  })

  // 处理重定向
  if (
    webResp.status >= 300 &&
    webResp.status < 400 &&
    headers.location
  ) {
    res.writeHead(webResp.status, headers)
    res.end()
    return
  }

  res.writeHead(webResp.status, headers)

  if (webResp.body) {
    const reader = webResp.body.getReader()
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        res.write(value)
      }
    } finally {
      reader.releaseLock()
    }
  }
  res.end()
}

const server = http.createServer(async (req, res) => {
  const url = req.url || '/'

  // 1. API 请求 → 反向代理到 Bridge
  if (url.startsWith('/api')) {
    const bridgePath = url.replace(/^\/api/, '') || '/'
    proxyToBridge(req, res, bridgePath)
    return
  }

  // 2. 有扩展名的静态文件请求
  const ext = path.extname(url.split('?')[0]).toLowerCase()
  if (ext && ext !== '.html') {
    const abs = resolveStatic(url)
    if (abs) {
      sendFile(res, abs)
      return
    }
    res.writeHead(404)
    res.end('not found')
    return
  }

  // 3. 尝试 SSR 渲染
  const handler = await getSsrHandler()
  if (handler) {
    try {
      // 收集请求 body
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const bodyBuffer = Buffer.concat(chunks)

      const webReq = nodeReqToWebRequest(req, bodyBuffer)
      // Cloudflare Worker 风格：handler.fetch(request, env, ctx)
      const webResp = await handler.fetch(webReq)

      if (webResp) {
        await webResponseToNodeRes(res, webResp)
        return
      }
    } catch (err) {
      console.error('[ui] SSR handler error:', err?.message || err)
      // SSR 失败 → 降级到静态 index.html
    }
  }

  // 4. 降级：返回静态 index.html（SPA fallback）
  const index = path.join(STATIC_DIR, 'index.html')
  if (fs.existsSync(index)) {
    sendFile(res, index)
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(UI_PORT, '127.0.0.1', () => {
  console.log(`[ui] http://127.0.0.1:${UI_PORT}/ (SSR + static, dir=${STATIC_DIR})`)
})
