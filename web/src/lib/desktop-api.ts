import type { DesktopApi } from '@/types/desktop'

export type { DesktopApi }

declare global {
  interface Window {
    /** Web Bridge 垫片注入时标记，区别于 Electron preload */
    __WEB_BRIDGE__?: boolean
    /** Electron 桌面客户端 preload 注入 */
    __ELECTRON_DESKTOP__?: boolean
    /** window.desktop 只读锁死时的旁路（install-desktop-bridge） */
    __DESKTOP_API_FALLBACK__?: DesktopApi
  }
}

/** SSR / 首屏 hydration 完成前为 false，避免 window.desktop 注入导致 DOM 不一致 */
let desktopHydrated = false

/** 在根组件 useEffect 中调用，解锁 hasDesktop / isWebBridge 的客户端探测 */
export function markDesktopHydrated() {
  desktopHydrated = true
}

export function hasDesktop(): boolean {
  if (typeof window === 'undefined' || !desktopHydrated) return false
  return !!(window.desktop || window.__DESKTOP_API_FALLBACK__)
}

/** 事件处理器、useEffect 内需要真实 desktop 时调用（不受 hydration 门控） */
export function hasDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && !!(window.desktop || window.__DESKTOP_API_FALLBACK__)
}

/** 浏览器 + 本机 Web Bridge RPC（非 Electron） */
export function isWebBridge(): boolean {
  return hasDesktop() && !!window.__WEB_BRIDGE__
}

/** Electron 桌面客户端 preload */
export function isElectronDesktop(): boolean {
  return hasDesktop() && (!!window.__ELECTRON_DESKTOP__ || !window.__WEB_BRIDGE__)
}

export function getDesktop(): DesktopApi | null {
  if (typeof window === 'undefined') return null
  return window.desktop ?? window.__DESKTOP_API_FALLBACK__ ?? null
}
