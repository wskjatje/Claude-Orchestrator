#!/usr/bin/env node
/**
 * 打包版 UI：静态资源 + /api → Bridge 反向代理（替代 Vite dev server）
 */
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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
  return abs
}

const server = http.createServer((req, res) => {
  const url = req.url || '/'

  if (url.startsWith('/api')) {
    const bridgePath = url.replace(/^\/api/, '') || '/'
    proxyToBridge(req, res, bridgePath)
    return
  }

  let abs = resolveStatic(url)
  if (abs && fs.existsSync(abs) && fs.statSync(abs).isFile()) {
    sendFile(res, abs)
    return
  }

  const ext = path.extname(url.split('?')[0]).toLowerCase()
  if (ext && ext !== '.html') {
    res.writeHead(404)
    res.end('not found')
    return
  }

  const index = path.join(STATIC_DIR, 'index.html')
  if (fs.existsSync(index)) {
    sendFile(res, index)
    return
  }

  res.writeHead(404)
  res.end('not found')
})

server.listen(UI_PORT, '127.0.0.1', () => {
  console.log(`[ui] static http://127.0.0.1:${UI_PORT}/ (${STATIC_DIR})`)
})
