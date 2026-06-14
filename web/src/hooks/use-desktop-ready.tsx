import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { installDesktopBridge } from "@/lib/install-desktop-bridge";
import { hasDesktopRuntime, markDesktopHydrated } from "@/lib/desktop-api";

const DesktopReadyContext = createContext(false);

/** SSR / hydration 完成后再注入 window.desktop，避免与 SSR HTML 不一致 */
export function DesktopHydrationProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // 推迟到 hydration 完成之后，避免 flushPassiveEffects 期间同步重渲染触发 mismatch
    const id = window.setTimeout(() => {
      installDesktopBridge();
      markDesktopHydrated();
      setReady(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  return <DesktopReadyContext.Provider value={ready}>{children}</DesktopReadyContext.Provider>;
}

export function useDesktopReady(): boolean {
  return useContext(DesktopReadyContext);
}

/** 渲染/UI 门控：hydration 完成且 window.desktop 可用 */
export function useHasDesktop(): boolean {
  const ready = useDesktopReady();
  return ready && hasDesktopRuntime();
}
