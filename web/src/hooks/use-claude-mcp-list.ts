import { useCallback, useEffect, useState } from "react";
import { getDesktop } from "@/lib/desktop-api";

export type ClaudeMcpRow = {
  name: string;
  enabled: boolean;
  label: string;
};

const MCP_LABELS: Record<string, string> = {
  filesystem: "文件系统",
  fetch: "网页抓取",
  memory: "记忆",
  sanshengliubu: "三省六部",
  "ollama-local": "Ollama 本地",
};

export function mcpDisplayLabel(name: string): string {
  const key = name.trim();
  return MCP_LABELS[key] ?? key;
}

export function useClaudeMcpList() {
  const [mcps, setMcps] = useState<ClaudeMcpRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const api = getDesktop();
    if (!api?.readClaudeConfigJson) {
      setMcps([]);
      return;
    }
    setLoading(true);
    const r = await api.readClaudeConfigJson("mcp.json");
    setLoading(false);
    if (!r.ok || r.missing || !r.data) {
      setMcps([]);
      return;
    }
    const ms = (r.data as { mcpServers?: Record<string, unknown> }).mcpServers;
    if (!ms || typeof ms !== "object") {
      setMcps([]);
      return;
    }
    setMcps(
      Object.entries(ms).map(([name, cfg]) => {
        const c = cfg && typeof cfg === "object" ? (cfg as Record<string, unknown>) : {};
        return {
          name,
          enabled: c.disabled !== true,
          label: mcpDisplayLabel(name),
        };
      }),
    );
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { mcps, loading, reload };
}

export function filterMcpsByQuery(items: ClaudeMcpRow[], query: string): ClaudeMcpRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((m) => m.name.toLowerCase().includes(q) || m.label.toLowerCase().includes(q));
}
