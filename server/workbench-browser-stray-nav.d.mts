/** @see workbench-browser-stray-nav.mjs */
export const WORKBENCH_APP_ROUTE_PREFIXES: readonly string[];
export function isWorkbenchAppShellPathname(pathname: string): boolean;
export function isBrowserProxyPathname(pathname: string): boolean;
export function recoverUpstreamFromStrayAppPath(
  strayPath: string,
  logicalUpstream: string,
): string | null;
/** 误落 App 路由时返回应 302 的代理 Location；否则 null */
export function resolveStrayBrowserNavFromProxyReferer(
  requestUrl: string | undefined,
  refererHeader: string | string[] | undefined,
  proxyPublicPath: string,
): string | null;
