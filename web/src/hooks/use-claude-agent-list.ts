import { useCallback, useEffect, useState } from "react";
import { getDesktop } from "@/lib/desktop-api";
import { agentMatchesDisplayQuery, resolveAgentDisplayName } from "@/lib/agent-display-name";

export type ClaudeAgentRow = {
  basename: string;
  stem: string;
  description: string;
  displayName: string;
  name?: string;
  nameZh?: string;
  heading?: string;
  source: "root" | "sanshengliubu";
};

export function useClaudeAgentList() {
  const [agents, setAgents] = useState<ClaudeAgentRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    const api = getDesktop();
    if (!api?.listClaudeAgentMarkdown) {
      setAgents([]);
      return;
    }
    setLoading(true);
    const r = await api.listClaudeAgentMarkdown();
    setLoading(false);
    if (!r.ok || !r.items?.length) {
      setAgents([]);
      return;
    }
    setAgents(
      r.items.map((row) => {
        const displayName =
          row.displayName?.trim() ||
          resolveAgentDisplayName({
            stem: row.stem,
            basename: row.basename,
            name: row.name,
            nameZh: row.nameZh,
            heading: row.heading,
            description: row.description,
          });
        return {
          basename: row.basename,
          stem: row.stem,
          description: row.description ?? "",
          displayName,
          name: row.name,
          nameZh: row.nameZh,
          heading: row.heading,
          source: row.source,
        };
      }),
    );
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { agents, loading, reload };
}

export function filterAgentsByQuery(agents: ClaudeAgentRow[], query: string): ClaudeAgentRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return agents;
  return agents.filter((a) =>
    agentMatchesDisplayQuery(
      {
        stem: a.stem,
        basename: a.basename,
        name: a.name,
        nameZh: a.nameZh,
        heading: a.heading,
        description: a.description,
        displayName: a.displayName,
      },
      q,
    ),
  );
}

export function resolveAgentStemFromInput(text: string, agents: ClaudeAgentRow[]): string {
  const t = text.trim();
  if (!t) return "";
  const exactStem = agents.find((a) => a.stem === t);
  if (exactStem) return exactStem.stem;
  const exactDisplay = agents.find((a) => a.displayName === t);
  if (exactDisplay) return exactDisplay.stem;
  const ciStem = agents.find((a) => a.stem.toLowerCase() === t.toLowerCase());
  if (ciStem) return ciStem.stem;
  return t;
}

export function agentDisplayNameForStem(stem: string, agents: ClaudeAgentRow[]): string {
  const t = stem.trim();
  if (!t) return "";
  return agents.find((a) => a.stem === t)?.displayName ?? t;
}
