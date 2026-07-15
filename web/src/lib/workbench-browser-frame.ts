/**
 * 浏览器 URL 归一化（桌面 WebContentsView / Web 预览 in-pane iframe 共用）
 */
import { BROWSER_PROXY_UI_PATH } from "@/lib/workbench-app-shell-guard";

export function isBlankBrowserUrl(url: string): boolean {
  const u = String(url || "").trim();
  return !u || u === "about:blank";
}

export function sanitizeBrowserNavigationUrl(input: string): string {
  const trimmed = String(input || "").trim();
  if (!trimmed) return "about:blank";
  if (/^(https?:|blob:|data:|about:)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

/** 比较两个 URL 是否指向同一页面（忽略尾斜杠等差异） */
export function browserUrlsEquivalent(a: string, b: string): boolean {
  const na = sanitizeBrowserNavigationUrl(a);
  const nb = sanitizeBrowserNavigationUrl(b);
  if (na === nb) return true;
  if (isBlankBrowserUrl(na) && isBlankBrowserUrl(nb)) return true;
  try {
    const ua = new URL(na);
    const ub = new URL(nb);
    const pathA = ua.pathname.replace(/\/+$/, "") || "/";
    const pathB = ub.pathname.replace(/\/+$/, "") || "/";
    return (
      ua.protocol === ub.protocol &&
      ua.hostname === ub.hostname &&
      ua.port === ub.port &&
      pathA === pathB &&
      ua.search === ub.search
    );
  } catch {
    return false;
  }
}

export function isInspectableBrowserUrl(url: string): boolean {
  const u = String(url || "").trim();
  if (isBlankBrowserUrl(u)) return false;
  if (/^(blob:|data:)/i.test(u)) return true;
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function isLocalBrowserHost(hostname: string): boolean {
  const h = String(hostname || "").trim().toLowerCase();
  return h === "localhost" || h === "127.0.0.1" || h === "[::1]" || h.endsWith(".local");
}

/** 外网 http(s) 经工作台代理加载（剥离 X-Frame-Options 并注入导航 shim） */
export function shouldUseBrowserProxy(logicalUrl: string): boolean {
  if (isBlankBrowserUrl(logicalUrl)) return false;
  if (/^(blob:|data:)/i.test(logicalUrl)) return false;
  try {
    const parsed = new URL(sanitizeBrowserNavigationUrl(logicalUrl));
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return false;
    if (isLocalBrowserHost(parsed.hostname)) return false;
    if (typeof window !== "undefined" && parsed.origin === window.location.origin) return false;
    return true;
  } catch {
    return false;
  }
}

/** iframe / 代理帧实际加载的 src（逻辑 URL → 展示 URL） */
export function resolveBrowserFrameSrc(logicalUrl: string): string {
  const resolved = sanitizeBrowserNavigationUrl(logicalUrl);
  if (isBlankBrowserUrl(resolved)) return "about:blank";
  if (/^(blob:|data:)/i.test(resolved)) return resolved;
  if (!shouldUseBrowserProxy(resolved)) return resolved;
  return `${BROWSER_PROXY_UI_PATH}?url=${encodeURIComponent(resolved)}`;
}
