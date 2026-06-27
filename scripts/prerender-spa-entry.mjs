#!/usr/bin/env node
/**
 * 构建后预渲染：启动 SSR 服务器，请求根路径 HTML，提取完整 SPA 入口。
 *
 * TanStack Start SSR 构建产物不含独立 SPA index.html，
 * 需要 SSR 渲染出包含路由 manifest 的 HTML 才能正确 hydration。
 *
 * 本脚本在 web:build 之后运行：
 * 1. 启动 packaged-ui-server.mjs（仅用于预渲染，无需 Bridge）
 * 2. 请求 http://127.0.0.1:<port>/
 * 3. 将服务端渲染好的 HTML 保存为 dist-electron/index.html
 * 4. 关闭临时服务器
 */
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'web', 'dist-electron')
const SERVER_SCRIPT = path.join(ROOT, 'server', 'packaged-ui-server.mjs')
const UI_PORT = 15189   // 临时端口，避免冲突
const INDEX_PATH = path.join(DIST, 'index.html')

/**
 * 等待 HTTP 服务器就绪
 */
function waitForServer(url, timeoutMs = 15_000) {
  const start = Date.now()
  return new Promise((resolve, reject) => {
    function poll() {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error(`预渲染服务器超时（${timeoutMs}ms）`))
      }
      http.get(url, (res) => {
        res.resume() // 消耗 body
        if (res.statusCode === 200) resolve()
        else setTimeout(poll, 200)
      }).on('error', () => setTimeout(poll, 200))
    }
    poll()
  })
}

/**
 * 从 SSR 服务器获取响应
 */
function fetchFromServer(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      const chunks = []
      res.on('data', (c) => chunks.push(c))
      res.on('end', () => resolve({
        status: res.statusCode,
        body: Buffer.concat(chunks).toString('utf8'),
      }))
    }).on('error', reject)
  })
}

async function main() {
  if (!fs.existsSync(DIST)) {
    console.log('[prerender] dist-electron 不存在，跳过预渲染')
    return
  }

  console.log(`[prerender] 启动 SSR 服务器 :${UI_PORT} …`)

  const child = spawn(process.execPath, [SERVER_SCRIPT], {
    env: {
      ...process.env,
      WEB_STATIC_DIR: DIST,
      WORKBENCH_UI_PORT: String(UI_PORT),
      // 不设 WORKBENCH_HTTP_PORT → 内部默认 18790；SSR 渲染根页面不依赖 Bridge
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  // 收集子进程日志用于调试
  const childLogs = []
  child.stdout?.on('data', (d) => childLogs.push(String(d)))
  child.stderr?.on('data', (d) => childLogs.push(String(d)))

  try {
    await waitForServer(`http://127.0.0.1:${UI_PORT}/`)

    const result = await fetchFromServer(`http://127.0.0.1:${UI_PORT}/`)

    if (result.status !== 200) {
      console.error(`[prerender] SSR 返回 ${result.status}，跳过`)
      return
    }

    // 将 SSR 输出的完整 HTML 保存为 SPA 入口
    fs.writeFileSync(INDEX_PATH, result.body, 'utf8')
    const sizeKb = (result.body.length / 1024).toFixed(1)
    console.log(`[prerender] ✓ 已生成 SSR 预渲染 index.html（${sizeKb} KB）`)
  } catch (err) {
    console.error(`[prerender] 失败：${err.message}`)
    console.log('[prerender] 使用 patch-electron-index-html 生成的 fallback index.html')
    // 如果已有 fallback 则保留
  } finally {
    // 确保清理子进程
    child.kill('SIGTERM')
    // 等待进程退出
    await new Promise((r) => {
      const timer = setTimeout(() => { child.kill('SIGKILL'); r() }, 3000)
      child.on('exit', () => { clearTimeout(timer); r() })
    })
  }
}

main()
