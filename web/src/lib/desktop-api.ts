import type { DesktopApi } from '@/types/desktop'

declare global {
  interface Window {
    /** Web Bridge 垫片注入时标记，区别于 Electron preload */
    __WEB_BRIDGE__?: boolean
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
  return !!window.desktop
}

/** 事件处理器、useEffect 内需要真实 desktop 时调用（不受 hydration 门控） */
export function hasDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && !!window.desktop
}

/** 浏览器 + 本机 Web Bridge RPC（非 Electron） */
export function isWebBridge(): boolean {
  return hasDesktop() && !!window.__WEB_BRIDGE__
}

/** Electron 桌面客户端 preload */
export function isElectronDesktop(): boolean {
  return hasDesktop() && !window.__WEB_BRIDGE__
}

export function getDesktop(): DesktopApi | null {
  if (typeof window === 'undefined') return null
  return window.desktop ?? null
}
