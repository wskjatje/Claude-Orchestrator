/**
 * 工作台内嵌浏览器反向代理：剥离 frame 限制头、跟随客户端跳转、重写导航链接。
 * 公开入口：UI /api/workbench-browser/proxy → Bridge /workbench-browser/proxy
 */
import {
  getWorkbenchBrowserProxyPublicPath,
} from './bridge-constants.mjs'
import {
  resolveStrayBrowserNavFromProxyReferer,
} from './workbench-browser-stray-nav.mjs'
import {
  buildBrowserNavigationShimScript,
  buildBrowserProxyTopFrameGuardScript,
} from './browser-navigation-shim.mjs'

const BLOCKED_RESPONSE_HEADERS = new Set([
  'x-frame-options',
  'content-security-policy',
  'content-security-policy-report-only',
  'permissions-policy',
  'cross-origin-opener-policy',
  'cross-origin-embedder-policy',
  'cross-origin-resource-policy',
  'content-encoding',
  'content-length',
  'transfer-encoding',
])

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

const MAX_BODY_BYTES = 15 * 1024 * 1024
const MAX_CLIENT_REDIRECTS = 6
const FETCH_TIMEOUT_MS = 30_000

/** @param {string} raw */
export function validateBrowserProxyTarget(raw) {
  const trimmed = String(raw || '').trim()
  if (!trimmed) throw new Error('missing url')
  let parsed
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new Error('invalid url')
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('unsupported protocol')
  }
  return parsed.href
}

/**
 * @param {string} html
 * @returns {string | null}
 */
export function extractClientRedirectUrl(html) {
  const text = String(html || '')
  const withoutNoScript = text.replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, '')
  const meta =
    withoutNoScript.match(
      /<meta[^>]+http-equiv\s*=\s*["']refresh["'][^>]+content\s*=\s*["'][^"']*url=([^"']+)["']/i,
    ) ||
    withoutNoScript.match(
      /<meta[^>]+content\s*=\s*["'][^"']*url=([^"']+)["'][^>]+http-equiv\s*=\s*["']refresh["']/i,
    )
  if (meta?.[1]) return meta[1].trim()

  const js =
    withoutNoScript.match(/location\.(?:replace|assign)\(\s*["'](https?:\/\/[^"']+)["']\s*\)/i) ||
    withoutNoScript.match(/location\.href\s*=\s*["'](https?:\/\/[^"']+)["']/i)
  if (js?.[1]) return js[1].trim()

  return null
}

/**
 * @param {string} value
 * @param {string} pageUrl
 */
function resolveAbsoluteUrl(value, pageUrl) {
  const trimmed = String(value || '').trim()
  if (!trimmed || trimmed.startsWith('#')) return null
  if (/^(javascript:|data:|blob:|mailto:|tel:)/i.test(trimmed)) return null
  try {
    return new URL(trimmed, pageUrl).href
  } catch {
    return null
  }
}

/** 子资源 URL 解析为上游绝对地址（不经代理，由浏览器直连） */
function absolutizeSubresourceUrl(value, pageUrl) {
  return resolveAbsoluteUrl(value, pageUrl)
}

/**
 * @param {string} srcset
 * @param {string} pageUrl
 */
function absolutizeSrcset(srcset, pageUrl) {
  return String(srcset || '')
    .split(',')
    .map((part) => {
      const pieces = part.trim().split(/\s+/)
      if (!pieces[0]) return part.trim()
      const abs = absolutizeSubresourceUrl(pieces[0], pageUrl)
      if (abs) pieces[0] = abs
      return pieces.join(' ')
    })
    .join(', ')
}

const SUBRESOURCE_URL_ATTRS = [
  'src',
  'poster',
  'data-src',
  'data-original',
  'data-lazy-src',
  'data-url',
]

/**
 * 代理页 document 位于 UI 源，相对 img/src 会落到 127.0.0.1；改写为上游绝对 URL 供浏览器直连。
 * @param {string} html
 * @param {string} pageUrl
 */
function rewriteSubresourceUrlsInHtml(html, pageUrl) {
  let out = String(html || '')
  for (const attr of SUBRESOURCE_URL_ATTRS) {
    const re = new RegExp(`(${attr}\\s*=\\s*)(["'])([^"']*)\\2`, 'gi')
    out = out.replace(re, (match, pre, quote, value) => {
      const abs = absolutizeSubresourceUrl(value, pageUrl)
      if (!abs) return match
      return `${pre}${quote}${abs}${quote}`
    })
  }
  out = out.replace(/(\ssrcset\s*=\s*)(["'])([^"']*)\2/gi, (match, pre, quote, value) => {
    const rewritten = absolutizeSrcset(value, pageUrl)
    return `${pre}${quote}${rewritten}${quote}`
  })
  return out
}

/** 上游请求 Referer：优先沿用浏览器 Referer 中的逻辑页，否则用目标站 origin */
function pickBrowserProxyReferer(refererHeader, targetUrl) {
  const referer = Array.isArray(refererHeader) ? refererHeader[0] : refererHeader
  const proxyPublicPath = getWorkbenchBrowserProxyPublicPath()
  if (referer) {
    try {
      const ref = new URL(String(referer))
      const logical = ref.searchParams.get('url')
      if (logical) {
        const logicalUrl = new URL(logical)
        return logicalUrl.origin + '/'
      }
      if (ref.pathname === proxyPublicPath) {
        return new URL(targetUrl).origin + '/'
      }
    } catch {
      /* fall through */
    }
  }
  try {
    return new URL(targetUrl).origin + '/'
  } catch {
    return undefined
  }
}

/**
 * @param {string} html
 * @param {string} pageUrl
 * @param {string} proxyPublicPath
 * @param {string} appShellUrl
 */
export function rewriteBrowserProxyHtml(html, pageUrl, proxyPublicPath, appShellUrl) {
  const proxify = (raw) => {
    const abs = resolveAbsoluteUrl(raw, pageUrl)
    if (!abs) return raw
    return `${proxyPublicPath}?url=${encodeURIComponent(abs)}`
  }

  let out = String(html || '')

  out = out.replace(
    /<meta[^>]+http-equiv\s*=\s*["']content-security-policy["'][^>]*>/gi,
    '',
  )
  out = out.replace(
    /<meta[^>]+content\s*=\s*["'][^"']*["'][^>]+http-equiv\s*=\s*["']content-security-policy["'][^>]*>/gi,
    '',
  )

  out = out.replace(
    /(<meta[^>]+content\s*=\s*["'][^"']*url=)([^"']+)(["'][^>]*http-equiv\s*=\s*["']refresh["'][^>]*>)/gi,
    (_, pre, url, post) => `${pre}${proxify(url)}${post}`,
  )
  out = out.replace(
    /(<meta[^>]+http-equiv\s*=\s*["']refresh["'][^>]+content\s*=\s*["'][^"']*url=)([^"']+)(["'])/gi,
    (_, pre, url, post) => `${pre}${proxify(url)}${post}`,
  )

  for (const attr of ['href', 'action']) {
    const re = new RegExp(`(${attr}\\s*=\\s*)(["'])([^"']*)\\2`, 'gi')
    out = out.replace(re, (match, pre, quote, value) => {
      const abs = resolveAbsoluteUrl(value, pageUrl)
      if (!abs) return match
      return `${pre}${quote}${proxify(value)}${quote}`
    })
  }

  out = rewriteSubresourceUrlsInHtml(out, pageUrl)

  // 子资源不经 HTML 代理拉取；导航仍走 href/action + shim。

  const topGuard = `<script data-workbench-browser-top-guard>${buildBrowserProxyTopFrameGuardScript(appShellUrl)}</script>`
  const shim = `<script data-workbench-browser-shim>${buildBrowserNavigationShimScript(proxyPublicPath, pageUrl)}</script>`
  if (/<head[^>]*>/i.test(out)) {
    out = out.replace(/<head[^>]*>/i, (m) => `${m}${topGuard}${shim}`)
  } else {
    out = topGuard + shim + out
  }

  return out
}

/**
 * @param {string} url
 * @param {import('node:http').IncomingHttpHeaders} reqHeaders
 * @param {{ method?: string, body?: Buffer, extraSearch?: URLSearchParams }} [opts]
 */
async function fetchBrowserPage(url, reqHeaders = {}, opts = {}) {
  const method = opts.method || 'GET'
  let current = validateBrowserProxyTarget(url)
  if (opts.extraSearch) {
    const parsed = new URL(current)
    for (const [key, value] of opts.extraSearch.entries()) {
      if (key !== 'url') parsed.searchParams.append(key, value)
    }
    current = parsed.href
  }
  let lastResponse = null
  let lastBody = ''

  for (let i = 0; i < MAX_CLIENT_REDIRECTS; i++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS)
    let response
    try {
      /** @type {RequestInit} */
      const init = {
        method,
        redirect: 'follow',
        signal: ctrl.signal,
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: reqHeaders.accept || 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': reqHeaders['accept-language'] || 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'identity',
          Referer: pickBrowserProxyReferer(reqHeaders.referer, current),
        },
      }
      if (method !== 'GET' && method !== 'HEAD' && opts.body?.byteLength) {
        init.body = opts.body
        if (reqHeaders['content-type']) {
          init.headers['Content-Type'] = reqHeaders['content-type']
        }
      }
      response = await fetch(current, init)
    } finally {
      clearTimeout(timer)
    }

    const contentType = response.headers.get('content-type') || ''
    const buf = Buffer.from(await response.arrayBuffer())
    if (buf.byteLength > MAX_BODY_BYTES) {
      throw new Error('response too large')
    }

    lastResponse = response
    lastBody = buf.toString('utf8')
    const finalUrl = response.url || current

    if (!/text\/html/i.test(contentType)) {
      return { response, body: buf, pageUrl: finalUrl, contentType }
    }

    const next = extractClientRedirectUrl(lastBody)
    if (!next) {
      return { response, body: buf, pageUrl: finalUrl, contentType }
    }

    const resolved = resolveAbsoluteUrl(next, finalUrl)
    if (!resolved || resolved === current) {
      return { response, body: buf, pageUrl: finalUrl, contentType }
    }
    current = resolved
  }

  if (!lastResponse) throw new Error('upstream fetch failed')
  return {
    response: lastResponse,
    body: Buffer.from(lastBody, 'utf8'),
    pageUrl: lastResponse.url || current,
    contentType: lastResponse.headers.get('content-type') || 'text/html',
  }
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @returns {Promise<Buffer>}
 */
function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    /** @type {Buffer[]} */
    const chunks = []
    req.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    req.on('end', () => resolve(Buffer.concat(chunks)))
    req.on('error', reject)
  })
}

/**
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 */
export async function handleWorkbenchBrowserProxy(req, res) {
  const reqUrl = new URL(req.url || '/', 'http://127.0.0.1')
  const target = reqUrl.searchParams.get('url')
  if (!target) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('missing url')
    return
  }

  let pageUrl
  try {
    pageUrl = validateBrowserProxyTarget(target)
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(e instanceof Error ? e.message : 'invalid url')
    return
  }

  const method = req.method || 'GET'
  if (method !== 'GET' && method !== 'POST' && method !== 'HEAD') {
    res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('method not allowed')
    return
  }

  // 仅拦截主窗口顶层 document。iframe 导航同样带 Sec-Fetch-Mode: navigate，不能据此重定向。
  const fetchDest = String(req.headers['sec-fetch-dest'] || '').toLowerCase()
  const proxyPublicPath = getWorkbenchBrowserProxyPublicPath()
  const strayRecovery = resolveStrayBrowserNavFromProxyReferer(
    req.url,
    req.headers.referer,
    proxyPublicPath,
  )
  // 相对路径，换机/换 host 也能回到当前 UI，不写死 127.0.0.1
  const appShellUrl = '/'
  if (strayRecovery && (fetchDest === 'document' || fetchDest === 'iframe')) {
    res.writeHead(302, { Location: strayRecovery })
    res.end()
    return
  }
  if (fetchDest === 'document') {
    res.writeHead(302, { Location: appShellUrl })
    res.end()
    return
  }

  try {
    // iframe 始终经 UI 同源路径加载，shim 内导航必须用公开 /api 路径，不能用 Bridge 侧路径
    const body = method === 'POST' ? await readRequestBody(req) : undefined
    const { response, body: responseBody, pageUrl: resolvedUrl, contentType } = await fetchBrowserPage(
      pageUrl,
      req.headers,
      { method, body, extraSearch: reqUrl.searchParams },
    )

    /** @type {Record<string, string | string[]>} */
    const headers = {}
    for (const [key, value] of response.headers.entries()) {
      if (BLOCKED_RESPONSE_HEADERS.has(key.toLowerCase())) continue
      if (key.toLowerCase() === 'set-cookie') continue
      headers[key] = value
    }

    let outBody = responseBody
    if (/text\/html/i.test(contentType)) {
      const html = responseBody.toString('utf8')
      const rewritten = rewriteBrowserProxyHtml(html, resolvedUrl, proxyPublicPath, appShellUrl)
      outBody = Buffer.from(rewritten, 'utf8')
      headers['content-type'] = contentType.includes('charset')
        ? contentType
        : 'text/html; charset=utf-8'
    }

    headers['content-length'] = String(outBody.byteLength)
    headers['X-Workbench-Browser-Proxy'] = '1'
    res.writeHead(response.status, headers)
    res.end(outBody)
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end(`browser proxy error: ${message}`)
  }
}
