import { hasDesktop, isWebBridge } from "@/lib/desktop-api";
import { DESKTOP_HYDRATING } from "@/lib/ui-copy";

/** 侧栏底部单行连接状态（与 useDesktopGate 对齐；Web Bridge 勿标成「桌面版」） */
export function sidebarConnectionLabel(opts: { mounted: boolean; online: boolean }): string {
  if (!opts.mounted) return DESKTOP_HYDRATING;
  const desktop = hasDesktop();
  if (!opts.online) {
    return desktop ? "桌面服务未就绪" : "本机服务未连接";
  }
  // Web Bridge 也有 window.desktop，须先于「桌面版」判断
  if (isWebBridge()) return "本机服务已连接";
  if (desktop) return "桌面版 · 已连接";
  return "CLI 桥接 · 已连接";
}
