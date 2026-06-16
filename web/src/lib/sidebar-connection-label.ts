import { hasDesktop, isWebBridge } from "@/lib/desktop-api";

/** 侧栏底部单行连接状态（避免「Claude Code · 已连接 · Claude Code」类重复） */
export function sidebarConnectionLabel(opts: {
  mounted: boolean;
  online: boolean;
}): string {
  if (!opts.mounted) return "正在连接…";
  if (!opts.online) {
    return hasDesktop() ? "桌面服务未就绪" : "本机服务未连接";
  }
  if (hasDesktop()) return "桌面版 · 已连接";
  if (isWebBridge()) return "本机服务已连接";
  return "CLI 桥接 · 已连接";
}
