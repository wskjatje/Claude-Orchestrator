#!/usr/bin/env node
/**
 * 桌面静态 UI 构建完成后处理：
 * 1. 若 dist-electron 下无 index.html，则生成一份
 * 2. 将客户端 CSS link 注入 <head>
 *
 * TanStack Start SSR 构建不会自动产生 index.html（专为 Cloudflare Worker 设计），
 * 因此打包为 Electron 桌面前需要补一份静态 HTML。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DIST = path.join(ROOT, 'web', 'dist-electron')
const INDEX = path.join(DIST, 'index.html')
const CLIENT_ASSETS = path.join(DIST, 'client', 'assets')
const LEGACY_ASSETS = path.join(DIST, 'assets')

/**
 * 查找 CSS 文件（兼容新旧输出结构）
 * 新结构：client/assets/index-<hash>.css
 * 旧结构：assets/styles-<hash>.css
 */
function findStylesheetHref() {
  // 新结构
  if (fs.existsSync(CLIENT_ASSETS)) {
    const css = fs
      .readdirSync(CLIENT_ASSETS)
      .filter((name) => /^(index|styles)-.+\.css$/.test(name))
      .sort()
    if (css.length) return `client/assets/${css[0]}`
  }
  // 旧结构兜底
  if (fs.existsSync(LEGACY_ASSETS)) {
    const css = fs
      .readdirSync(LEGACY_ASSETS)
      .filter((name) => /^(index|styles)-.+\.css$/.test(name))
      .sort()
    if (css.length) return `assets/${css[0]}`
  }
  return null
}

/**
 * 查找客户端入口 JS chunk（取最大的 index-*.js 作为主入口）
 */
function findClientEntry() {
  if (!fs.existsSync(CLIENT_ASSETS)) return null
  const entries = fs
    .readdirSync(CLIENT_ASSETS)
    .filter((name) => name.startsWith('index-') && name.endsWith('.js'))
    .sort()
    // 取最后一个（通常 hash 最大 = 最新）
    .reverse()
  if (!entries.length) return null
  return `client/assets/${entries[0]}`
}

/** 生成最小 index.html */
function generateIndexHtml(cssHref, entryHref) {
  const cssLink = cssHref
    ? `    <link rel="stylesheet" crossorigin href="${cssHref}" />\n`
    : ''
  const scriptTag = entryHref
    ? `    <script type="module" crossorigin src="${entryHref}"></script>\n`
    : ''

  const themeScript = `    <script>
      (function(){try{var dark=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=document.documentElement;r.classList.toggle('dark',dark);r.style.colorScheme=dark?'dark':'light';}catch(e){}})();
    </script>\n`

  return `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Claude Orchestrator</title>
    <meta name="description" content="桌面编排、任务链与 Claude Code" />
    <link rel="icon" href="/favicon.png" type="image/png" />
${themeScript}${cssLink}  </head>
  <body>
    <div id="root"></div>
${scriptTag}  </body>
</html>
`
}

function copyPublicAssets() {
  const clientDir = path.join(DIST, 'client')
  if (!fs.existsSync(clientDir)) return
  for (const name of ['favicon.png', 'logo.png', 'logo-mark.png']) {
    const src = path.join(clientDir, name)
    const dst = path.join(DIST, name)
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst)
      console.log(`  ├─ public: ${name}`)
    }
  }
}

function main() {
  copyPublicAssets()

  const cssHref = findStylesheetHref()
  if (!cssHref) {
    console.error('patch-electron-index-html: 未在 dist-electron 找到 CSS 文件')
    process.exit(1)
  }

  const entryHref = findClientEntry()

  // 若已存在，尝试注入 CSS link
  if (fs.existsSync(INDEX)) {
    let html = fs.readFileSync(INDEX, 'utf8')
    if (html.includes(`href="${cssHref}"`)) {
      console.log(`patch-electron-index-html: 已包含 ${cssHref}`)
      return
    }
    const linkTag = `    <link rel="stylesheet" crossorigin href="${cssHref}" />\n`
    html = html.replace('</head>', `${linkTag}  </head>`)
    fs.writeFileSync(INDEX, html)
    console.log(`patch-electron-index-html: 已注入 ${cssHref}`)
    return
  }

  // 不存在 → 生成完整 index.html
  const html = generateIndexHtml(cssHref, entryHref)
  fs.writeFileSync(INDEX, html, 'utf8')
  console.log(`patch-electron-index-html: 已生成 ${INDEX}`)
  if (cssHref) console.log(`  ├─ CSS:  ${cssHref}`)
  if (entryHref) console.log(`  └─ JS:   ${entryHref}`)
}

main()
