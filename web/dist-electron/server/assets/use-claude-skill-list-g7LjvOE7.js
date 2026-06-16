import { r as reactExports } from "./worker-entry-Co3Cn06u.js";
import { g as getDesktop } from "./router-CCRumuR1.js";
import { r as resolveAgentDisplayName, a as agentMatchesDisplayQuery } from "./agent-display-name-DbLOtgcU.js";
function useClaudeSkillList() {
  const [skills, setSkills] = reactExports.useState([]);
  const [loading, setLoading] = reactExports.useState(false);
  const reload = reactExports.useCallback(async () => {
    const api = getDesktop();
    if (!api?.listClaudeSkillMarkdown) {
      setSkills([]);
      return;
    }
    setLoading(true);
    const r = await api.listClaudeSkillMarkdown();
    setLoading(false);
    if (!r.ok || !r.items?.length) {
      setSkills([]);
      return;
    }
    setSkills(
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
          source: row.source ?? "user",
          category: row.category
        };
      })
    );
  }, []);
  reactExports.useEffect(() => {
    void reload();
  }, [reload]);
  return { skills, loading, reload };
}
function filterSkillsByQuery(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter(
    (s) => agentMatchesDisplayQuery(
      {
        stem: s.stem,
        basename: s.basename,
        name: s.name,
        nameZh: s.nameZh,
        heading: s.heading,
        description: s.description,
        displayName: s.displayName
      },
      q
    )
  );
}
function resolveSkillStemFromInput(text, skills) {
  const t = text.trim();
  if (!t) return "";
  const exactStem = skills.find((s) => s.stem === t);
  if (exactStem) return exactStem.stem;
  const exactDisplay = skills.find((s) => s.displayName === t);
  if (exactDisplay) return exactDisplay.stem;
  const ciStem = skills.find((s) => s.stem.toLowerCase() === t.toLowerCase());
  if (ciStem) return ciStem.stem;
  return t.replace(/\.md$/i, "");
}
function skillDisplayNameForStem(stem, skills) {
  const t = stem.trim();
  if (!t) return "";
  return skills.find((s) => s.stem === t)?.displayName ?? t;
}
export {
  filterSkillsByQuery as f,
  resolveSkillStemFromInput as r,
  skillDisplayNameForStem as s,
  useClaudeSkillList as u
};
