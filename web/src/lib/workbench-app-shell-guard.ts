/** Bridge 浏览器代理路径（UI 与 Bridge 侧） */
export const BROWSER_PROXY_UI_PATH = "/api/workbench-browser/proxy";
export const BROWSER_PROXY_BRIDGE_PATH = "/workbench-browser/proxy";

/** 与 server/workbench-browser-stray-nav.mjs 保持一致 */
export const WORKBENCH_APP_ROUTE_PREFIXES = [
  "/editor",
  "/agents",
  "/skills",
  "/settings",
  "/comms",
  "/chains",
  "/workspaces",
  "/overview",
  "/logs",
  "/help",
  "/reports",
  "/scheduled",
  "/usage",
] as const;

export function isBrowserProxyShellPath(pathname: string): boolean {
  const p = String(pathname || "").trim();
  return p === BROWSER_PROXY_UI_PATH || p === BROWSER_PROXY_BRIDGE_PATH;
}

export function isWorkbenchAppShellPathname(pathname: string): boolean {
  const p = String(pathname || "").trim() || "/";
  if (p === "/") return true;
  return WORKBENCH_APP_ROUTE_PREFIXES.some(
    (prefix) => p === prefix || p.startsWith(`${prefix}/`),
  );
}

/** 代理 iframe 误导航到 Shell 同源、非工作台路由、非代理路径 */
export function isStrayEmbeddedBrowserAppUrl(raw: string, appOrigin: string): boolean {
  try {
    const parsed = new URL(raw, appOrigin);
    if (parsed.origin !== appOrigin) return false;
    if (isBrowserProxyShellPath(parsed.pathname)) return false;
    if (isWorkbenchAppShellPathname(parsed.pathname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** 将误落 Shell 的 path+search 回收为逻辑上游绝对 URL */
export function recoverUpstreamFromStrayAppPath(
  strayPath: string,
  logicalUpstream: string,
): string | null {
  const stray = String(strayPath || "").trim();
  const baseRaw = String(logicalUpstream || "").trim();
  if (!stray || !baseRaw) return null;
  try {
    const base = new URL(baseRaw);
    const upstream = new URL(stray, base.origin);
    if (upstream.origin !== base.origin) return null;
    return upstream.href;
  } catch {
    return null;
  }
}

/** 主应用 Shell 是否允许作为顶层 document 加载该 URL */
export function isAllowedAppShellUrl(raw: string, appOrigin: string): boolean {
  try {
    const parsed = new URL(raw);
    if (isBrowserProxyShellPath(parsed.pathname)) return false;
    return parsed.origin === appOrigin;
  } catch {
    return false;
  }
}
