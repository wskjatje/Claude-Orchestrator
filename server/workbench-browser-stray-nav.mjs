/**
 * 代理页内相对导航误落到应用 Shell 同源路径时的通用回收（不针对特定站点）。
 */
import {
  getWorkbenchBrowserProxyBridgePath,
  getWorkbenchBrowserProxyPublicPath,
} from './bridge-constants.mjs'

/** 与 web/src/lib/workbench-app-shell-guard.ts 中工作台路由保持一致 */
export const WORKBENCH_APP_ROUTE_PREFIXES = [
  '/editor',
  '/agents',
  '/skills',
  '/settings',
  '/comms',
  '/chains',
  '/workspaces',
  '/overview',
  '/logs',
  '/help',
  '/reports',
  '/scheduled',
  '/usage',
]

/** @param {string} pathname */
export function isWorkbenchAppShellPathname(pathname) {
  const p = String(pathname || '').trim() || '/'
  if (p === '/') return true
  return WORKBENCH_APP_ROUTE_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  )
}

/** @param {string} pathname */
export function isBrowserProxyPathname(pathname) {
  const p = String(pathname || '').trim()
  return p === getWorkbenchBrowserProxyPublicPath() || p === getWorkbenchBrowserProxyBridgePath()
}

/**
 * @param {string} strayPath 误落到 Shell 的 path+search+hash（如 /s?wd=1）
 * @param {string} logicalUpstream 代理帧逻辑上游 URL
 */
export function recoverUpstreamFromStrayAppPath(strayPath, logicalUpstream) {
  const stray = String(strayPath || '').trim()
  const baseRaw = String(logicalUpstream || '').trim()
  if (!stray || !baseRaw) return null
  try {
    const base = new URL(baseRaw)
    const upstream = new URL(stray, base.origin)
    if (upstream.origin !== base.origin) return null
    return upstream.href
  } catch {
    return null
  }
}

/**
 * @param {string} requestUrl
 * @param {string | string[] | undefined} refererHeader
 * @param {string} proxyPublicPath
 */
export function resolveStrayBrowserNavFromProxyReferer(
  requestUrl,
  refererHeader,
  proxyPublicPath,
) {
  const full = String(requestUrl || '')
  if (!full.startsWith('/')) return null

  const pathname = full.split('?')[0].split('#')[0]
  // UI 公开路径与 Bridge 路径都是合法代理入口，绝不能当成「误落」相对路径回收。
  // 否则 iframe 内带代理 Referer 的下一跳会被 302 成
  // https://上游主机/workbench-browser/proxy?...，页面空白；父页刷新因 Referer 是 Shell 可成功。
  if (isBrowserProxyPathname(pathname)) return null
  if (isWorkbenchAppShellPathname(pathname)) return null

  const referer = Array.isArray(refererHeader) ? refererHeader[0] : refererHeader
  if (!referer) return null

  try {
    const ref = new URL(String(referer))
    if (!isBrowserProxyPathname(ref.pathname)) return null
    const logical = ref.searchParams.get('url')
    if (!logical) return null
    const upstream = recoverUpstreamFromStrayAppPath(full, logical)
    if (!upstream) return null
    return `${proxyPublicPath}?url=${encodeURIComponent(upstream)}`
  } catch {
    return null
  }
}
