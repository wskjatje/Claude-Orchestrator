import { useEffect, useState } from "react";
import { getBridge, type BridgeStatus } from "@/lib/bridge-client";
import { hasDesktop, isWebBridge } from "@/lib/desktop-api";
import { useDesktopReady } from "@/hooks/use-desktop-ready";
import { pingWebBridgeHealth } from "@/lib/install-desktop-bridge";
import { loadUiPrefsFromProjectDb, saveUiPrefsToProjectDb } from "@/lib/ui-prefs";
import {
  BRIDGE_CONNECTED_VERSION,
  BRIDGE_ELECTRON_VERSION,
  BRIDGE_OFFLINE_VERSION,
} from "@/lib/ui-copy";

/**
 * Returns reactive Bridge connection state.
 * Bridge URL 持久化在项目 SQLite（ui_prefs），不再使用 localStorage。
 */
export function useBridge() {
  const desktopReady = useDesktopReady();
  const [status, setStatus] = useState<BridgeStatus>("offline");
  const [version, setVersion] = useState<string | undefined>();

  useEffect(() => {
    if (typeof window === "undefined" || !desktopReady) return;

    // web:dev 与打包 Electron 均探测同源 /api/health（不再把 Electron 恒标 online）
    if (isWebBridge() || hasDesktop()) {
      let cancelled = false;
      /** 连续失败次数；短暂抖动不立刻刷「无法连接」横幅 */
      let failStreak = 0;
      const OFFLINE_GRACE_POLLS = 2;
      const poll = async () => {
        const ok = await pingWebBridgeHealth();
        if (cancelled) return;
        if (ok) {
          failStreak = 0;
          setStatus("online");
          setVersion(
            hasDesktop() && !isWebBridge()
              ? BRIDGE_ELECTRON_VERSION
              : BRIDGE_CONNECTED_VERSION,
          );
          return;
        }
        failStreak += 1;
        if (failStreak >= OFFLINE_GRACE_POLLS) {
          setStatus("offline");
          setVersion(BRIDGE_OFFLINE_VERSION);
        }
      };
      void poll();
      const id = window.setInterval(poll, 4000);
      return () => {
        cancelled = true;
        window.clearInterval(id);
      };
    }

    const b = getBridge();
    void (async () => {
      const prefs = await loadUiPrefsFromProjectDb();
      if (prefs.bridgeUrl) b.setUrl(prefs.bridgeUrl);
      else b.connect();
    })();
    const off = b.onStatus((s, v) => {
      setStatus(s);
      setVersion(v);
    });
    return () => {
      off();
    };
  }, [desktopReady]);

  return {
    status,
    online: status === "online",
    connecting: status === "connecting",
    version,
    setUrl(url: string) {
      void saveUiPrefsToProjectDb({ bridgeUrl: url });
      getBridge().setUrl(url);
    },
    send(payload: unknown) {
      return getBridge().send(payload);
    },
  };
}
