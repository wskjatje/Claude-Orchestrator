import type { DomElementPayload } from "@/lib/dom-element-meta";

export type EmbeddedBrowserBounds = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type EmbeddedBrowserLayout = {
  bounds?: EmbeddedBrowserBounds;
  visible?: boolean;
  zoomFactor?: number;
  /** overlay 模式使用屏幕坐标 */
  coordinateSpace?: "screen" | "window";
};

export type EmbeddedBrowserApi = {
  create: (tabId: string) => Promise<{ ok: boolean; error?: string }>;
  destroy: (tabId: string) => Promise<{ ok: boolean }>;
  setLayout: (tabId: string, layout: EmbeddedBrowserLayout) => Promise<{ ok: boolean; error?: string }>;
  focus: (tabId: string) => Promise<{ ok: boolean; error?: string }>;
  loadURL: (tabId: string, url: string) => Promise<{ ok: boolean; error?: string }>;
  reload: (tabId: string) => Promise<{ ok: boolean }>;
  goBack: (tabId: string) => Promise<{ ok: boolean }>;
  goForward: (tabId: string) => Promise<{ ok: boolean }>;
  canNav: (tabId: string) => Promise<{ ok: boolean; back: boolean; forward: boolean }>;
  openDevTools: (tabId: string) => Promise<{ ok: boolean }>;
  setPickerActive: (tabId: string, active: boolean) => Promise<{ ok: boolean }>;
  onNavigated: (fn: (detail: { tabId: string; url: string }) => void) => () => void;
  onDomReady: (fn: (detail: { tabId: string }) => void) => () => void;
  onLoadingState: (fn: (detail: { tabId: string; loading: boolean }) => void) => () => void;
  onLoadFailed: (fn: (detail: { tabId: string; error: string; errorCode?: number }) => void) => () => void;
  onTitleUpdated: (fn: (detail: { tabId: string; title: string }) => void) => () => void;
  onElementPicked: (fn: (detail: { tabId: string; payload: DomElementPayload }) => void) => () => void;
};

declare global {
  interface Window {
    embeddedBrowser?: EmbeddedBrowserApi;
    /** Web 预览远程 overlay 内嵌浏览器（Bridge → Electron） */
    __EMBEDDED_BROWSER_REMOTE__?: boolean;
    /** 调试：强制使用 overlay browser-host 而非 in-pane iframe */
    __USE_OVERLAY_EMBEDDED_BROWSER__?: boolean;
  }
}

/** 应用壳 preload 注入 WebContentsView API；Web 预览与桌面共用 */
export function hasEmbeddedBrowserNative(): boolean {
  return typeof window !== "undefined" && !!window.embeddedBrowser;
}

/** Web 预览远程 overlay 内嵌浏览器（Bridge → Electron） */
export function isRemoteEmbeddedBrowser(): boolean {
  return typeof window !== "undefined" && !!window.__EMBEDDED_BROWSER_REMOTE__;
}

/** Electron 窗口内 preload 未注入 embeddedBrowser（异常） */
export function isElectronMissingEmbeddedBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return !!window.__ELECTRON_DESKTOP__ && !window.embeddedBrowser;
}

export function getEmbeddedBrowserNative(): EmbeddedBrowserApi | null {
  if (typeof window === "undefined") return null;
  return window.embeddedBrowser ?? null;
}

/** Electron 主窗口内 WebContentsView（非 overlay） */
export function isElectronInPaneBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return (
    !!window.__ELECTRON_DESKTOP__ &&
    hasEmbeddedBrowserNative() &&
    !window.__EMBEDDED_BROWSER_REMOTE__
  );
}

/** Web 预览：在编辑器内容区用 iframe 渲染（本地直连 / 外网代理） */
export function useInPaneIframeBrowser(): boolean {
  return !isElectronInPaneBrowser();
}

/** 内嵌浏览器后端是否已就绪（iframe 模式恒为 true） */
export function isEmbeddedBrowserReady(): boolean {
  return useInPaneIframeBrowser() || hasEmbeddedBrowserNative();
}

/** 桌面端 WebContentsView 原生嵌入；纯 Web 环境不可用 */
export function useNativeEmbeddedBrowser(): boolean {
  return isElectronInPaneBrowser();
}
