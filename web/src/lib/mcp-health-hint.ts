import { toast } from "sonner";
import type { DesktopApi } from "@/types/desktop";

/** 从快照统计 ok/total（与 use-mcp-health-summary 一致） */
export function summarizeMcpHealthSnapshot(snapshot: {
  servers?: Record<string, { status?: string }>;
} | null | undefined): { okCount: number; total: number } {
  const servers = snapshot?.servers;
  if (!servers || typeof servers !== "object") return { okCount: 0, total: 0 };
  const entries = Object.values(servers);
  const total = entries.length;
  const okCount = entries.filter((s) => String(s?.status || "").toLowerCase() === "ok").length;
  return { okCount, total };
}

/**
 * 发送前只读提示：不阻断发送、不触发全量探活。
 * 仅在「有配置但 0 可用」或「配置缺失且曾期望有 MCP」时提示。
 */
export async function toastMcpHealthIfDegraded(api: DesktopApi | null | undefined): Promise<void> {
  if (!api?.mcpGetHealthSnapshot) return;
  try {
    const r = await api.mcpGetHealthSnapshot();
    if (!r?.ok) return;
    const { okCount, total } = summarizeMcpHealthSnapshot(r.snapshot);
    // 仅「已配置但全部不可用」；无配置/空快照不打扰
    if (r.missing || total === 0) return;
    if (okCount === 0) {
      toast.message(`MCP 快照 ${okCount}/${total} 均不可用；本轮 CLI/编排可能无 MCP（详见通讯页）。`);
    }
  } catch {
    /* ignore */
  }
}
