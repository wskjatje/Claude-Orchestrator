import {
  createContext,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import { installDesktopBridge } from "@/lib/install-desktop-bridge";
import { hasDesktopRuntime, markDesktopHydrated } from "@/lib/desktop-api";
import {
  DESKTOP_HYDRATING,
  LOCAL_ONLY_HINT,
  MSG_API_NOT_READY,
} from "@/lib/ui-copy";

const DesktopReadyContext = createContext(false);

/** SSR / hydration 完成后再注入 window.desktop，避免与 SSR HTML 不一致 */
export function DesktopHydrationProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  // useLayoutEffect：hydration 后、浏览器绘制前注入，缩短「控件灰掉」窗口（仍晚于 SSR 首帧）
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    installDesktopBridge();
    markDesktopHydrated();
    setReady(true);
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

/** hydration → 离线 → 就绪；禁止用离线文案冒充「还在注入桥接」 */
export type DesktopGatePhase = "hydrating" | "offline" | "ready";

export function useDesktopGate(): {
  phase: DesktopGatePhase;
  desktopReady: boolean;
  hasDesktop: boolean;
} {
  const desktopReady = useDesktopReady();
  const hasDesktop = useHasDesktop();
  if (!desktopReady) {
    return { phase: "hydrating", desktopReady: false, hasDesktop: false };
  }
  if (!hasDesktop) {
    return { phase: "offline", desktopReady: true, hasDesktop: false };
  }
  return { phase: "ready", desktopReady: true, hasDesktop: true };
}

/** 主操作门控：phase 为 ready 且所需 API 存在时可点 */
export function useDesktopActionGate(apiReady: boolean): {
  phase: DesktopGatePhase;
  desktopReady: boolean;
  hasDesktop: boolean;
  canAct: boolean;
  blockHint: string;
} {
  const gate = useDesktopGate();
  const canAct = gate.phase === "ready" && apiReady;
  let blockHint = "";
  if (!canAct) {
    if (gate.phase === "hydrating") blockHint = DESKTOP_HYDRATING;
    else if (gate.phase === "offline") blockHint = LOCAL_ONLY_HINT;
    else if (!apiReady) blockHint = MSG_API_NOT_READY;
  }
  return { ...gate, canAct, blockHint };
}
