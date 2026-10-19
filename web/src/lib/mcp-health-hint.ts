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

export const MCP_HEALTH_HARD_FAIL_MESSAGE =
  "MCP 全部不可用，本轮需要 MCP 工具，已中止（不会静默改用 Host）。请到「通讯」页修复后重试。";

export const MCP_HEALTH_SNAPSHOT_UNAVAILABLE_MESSAGE =
  "无法读取 MCP 健康快照，本轮需要 MCP 工具，已中止（不会假定可用）。请到「通讯」页修复后重试。";

/**
 * 本轮需要 MCP 且快照显示已配置但 0 可用 → 硬失败。
 * 快照接口缺失/异常/非 ok → 同样硬失败（禁止 catch→ok）。
 * 不触发全量探活；只读已有快照。
 */
export async function assertMcpHealthForTurn(
  api: DesktopApi | null | undefined,
  opts: { needsMcp: boolean },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!opts.needsMcp) return { ok: true };
  // 无 MCP 快照能力（非桌面桥）→ 放行；有能力则禁止异常/非 ok 静默放行
  if (!api?.mcpGetHealthSnapshot) return { ok: true };
  try {
    const r = await api.mcpGetHealthSnapshot();
    if (!r?.ok) {
      return { ok: false, error: MCP_HEALTH_SNAPSHOT_UNAVAILABLE_MESSAGE };
    }
    const { okCount, total } = summarizeMcpHealthSnapshot(r.snapshot);
    // missing / 未配置服务器：无已配 MCP，放行
    if (r.missing || total === 0) return { ok: true };
    if (okCount === 0) {
      return { ok: false, error: MCP_HEALTH_HARD_FAIL_MESSAGE };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: MCP_HEALTH_SNAPSHOT_UNAVAILABLE_MESSAGE };
  }
}

/**
 * 发送前只读提示：不阻断（硬闸见 assertMcpHealthForTurn）。
 * 仅在「有配置但部分降级」时 toast。
 */
export async function toastMcpHealthIfDegraded(api: DesktopApi | null | undefined): Promise<void> {
  if (!api?.mcpGetHealthSnapshot) return;
  try {
    const r = await api.mcpGetHealthSnapshot();
    if (!r?.ok) return;
    const { okCount, total } = summarizeMcpHealthSnapshot(r.snapshot);
    if (r.missing || total === 0) return;
    if (okCount === 0) {
      // 硬闸会阻断；此处仅弱提示部分降级
      return;
    }
    if (okCount < total) {
      toast.message(`MCP 快照 ${okCount}/${total} 部分不可用（详见通讯页）。`);
    }
  } catch {
    /* ignore */
  }
}
