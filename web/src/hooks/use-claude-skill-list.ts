import { useCallback, useEffect, useState } from "react";
import { getDesktop } from "@/lib/desktop-api";
import { agentMatchesDisplayQuery, resolveAgentDisplayName } from "@/lib/agent-display-name";

export type ClaudeSkillRow = {
  basename: string;
  stem: string;
  description: string;
  displayName: string;
  name?: string;
  nameZh?: string;
  heading?: string;
  source: "user" | "project";
  category?: "项目" | "通用" | "实验";
};

export function useClaudeSkillList() {
  const [skills, setSkills] = useState<ClaudeSkillRow[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
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
          source: row.source ?? "user",
          category: row.category,
        };
      }),
    );
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { skills, loading, reload };
}

export function filterSkillsByQuery(items: ClaudeSkillRow[], query: string): ClaudeSkillRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((s) =>
    agentMatchesDisplayQuery(
      {
        stem: s.stem,
        basename: s.basename,
        name: s.name,
        nameZh: s.nameZh,
        heading: s.heading,
        description: s.description,
        displayName: s.displayName,
      },
      q,
    ),
  );
}

export function resolveSkillStemFromInput(text: string, skills: ClaudeSkillRow[]): string {
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

export function skillDisplayNameForStem(stem: string, skills: ClaudeSkillRow[]): string {
  const t = stem.trim();
  if (!t) return "";
  return skills.find((s) => s.stem === t)?.displayName ?? t;
}
