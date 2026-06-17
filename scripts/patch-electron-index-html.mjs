#!/usr/bin/env node
/**
 * 桌面静态 UI：把 Tailwind 样式表写入 index.html 的 <head>。
 * TanStack Start 打包后用 createRoot(#root) 挂载，HeadContent 的 link 会落在无效的嵌套 <head> 内。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'web', 'dist-electron')
const INDEX = path.join(DIST, 'index.html')
const ASSETS = path.join(DIST, 'assets')

function findStylesheetHref() {
  if (!fs.existsSync(ASSETS)) return null
  const css = fs
    .readdirSync(ASSETS)
    .filter((name) => name.startsWith('styles-') && name.endsWith('.css'))
    .sort()
  if (!css.length) return null
  return `/assets/${css[0]}`
}

function patchIndexHtml() {
  if (!fs.existsSync(INDEX)) {
    console.error(`patch-electron-index-html: 缺少 ${INDEX}`)
    process.exit(1)
  }

  const href = findStylesheetHref()
  if (!href) {
    console.error('patch-electron-index-html: 未在 dist-electron/assets 找到 styles-*.css')
    process.exit(1)
  }

  let html = fs.readFileSync(INDEX, 'utf8')
  if (html.includes(`href="${href}"`)) {
    console.log(`patch-electron-index-html: 已包含 ${href}`)
    return
  }

  const linkTag = `    <link rel="stylesheet" crossorigin href="${href}" />\n`
  html = html.replace('</head>', `${linkTag}  </head>`)

  fs.writeFileSync(INDEX, html)
  console.log(`patch-electron-index-html: 已注入 ${href}`)
}

patchIndexHtml()
