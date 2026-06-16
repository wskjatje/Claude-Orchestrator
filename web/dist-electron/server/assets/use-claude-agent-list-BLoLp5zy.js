import { r as reactExports } from "./worker-entry-Co3Cn06u.js";
import { g as getDesktop } from "./router-CCRumuR1.js";
import { r as resolveAgentDisplayName, a as agentMatchesDisplayQuery } from "./agent-display-name-DbLOtgcU.js";
function useClaudeAgentList() {
  const [agents, setAgents] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const reload = reactExports.useCallback(async () => {
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
        const displayName = row.displayName?.trim() || resolveAgentDisplayName({
          stem: row.stem,
          basename: row.basename,
          name: row.name,
          nameZh: row.nameZh,
          heading: row.heading,
          description: row.description
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
          skills: row.skills?.length ? [...row.skills] : void 0
        };
      })
    );
  }, []);
  reactExports.useEffect(() => {
    void reload();
  }, [reload]);
  return { agents, loading, reload };
}
function filterAgentsByQuery(agents, query) {
  const q = query.trim().toLowerCase();
  if (!q) return agents;
  return agents.filter(
    (a) => agentMatchesDisplayQuery(
      {
        stem: a.stem,
        basename: a.basename,
        name: a.name,
        nameZh: a.nameZh,
        heading: a.heading,
        description: a.description,
        displayName: a.displayName
      },
      q
    )
  );
}
function resolveAgentStemFromInput(text, agents) {
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
function agentDisplayNameForStem(stem, agents) {
  const t = stem.trim();
  if (!t) return "";
  return agents.find((a) => a.stem === t)?.displayName ?? t;
}
export {
  agentDisplayNameForStem as a,
  filterAgentsByQuery as f,
  resolveAgentStemFromInput as r,
  useClaudeAgentList as u
};
