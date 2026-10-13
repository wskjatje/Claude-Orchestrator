import { useCallback, useEffect, useState } from "react";
import { getDesktop } from "@/lib/desktop-api";
import { summarizeMcpHealthSnapshot } from "@/lib/mcp-health-hint";

export type McpHealthSummary = {
  okCount: number;
  total: number;
  missing: boolean;
  ready: boolean;
};

const EMPTY: McpHealthSummary = { okCount: 0, total: 0, missing: false, ready: false };

/** 只读：拉取 mcpGetHealthSnapshot（不触发全量探活） */
export function useMcpHealthSummary(enabled = true) {
  const [summary, setSummary] = useState<McpHealthSummary>(EMPTY);

  const reload = useCallback(async () => {
    const api = getDesktop();
    if (!api?.mcpGetHealthSnapshot) {
      setSummary(EMPTY);
      return;
    }
    try {
      const r = await api.mcpGetHealthSnapshot();
      if (!r?.ok) {
        setSummary({ ...EMPTY, missing: Boolean(r?.missing) });
        return;
      }
      const { okCount, total } = summarizeMcpHealthSnapshot(r.snapshot);
      setSummary({
        okCount,
        total,
        missing: Boolean(r.missing),
        ready: true,
      });
    } catch {
      setSummary(EMPTY);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void reload();
    const api = getDesktop();
    const unsub = api?.onMcpHealthChanged?.(() => {
      void reload();
    });
    return () => {
      unsub?.();
    };
  }, [enabled, reload]);

  return { summary, reload };
}
