import type { DesktopApi } from "@/lib/desktop-api";
import {
  getSkillDefinition,
  resolveAgentSkillBundleFromMeta,
} from "@/lib/agent-skill-catalog";
import { parseAgentMarkdown, serializeAgentMarkdown } from "@/lib/agent-markdown";
import { serializeSkillMarkdown } from "@/lib/skill-markdown";
import { MSG_API_NOT_READY } from "@/lib/ui-copy";

export type SyncAgentSkillsResult = {
  ok: boolean;
  agentStem: string;
  createdSkills: string[];
  skippedSkills: string[];
  downloadedSkills?: string[];
  templatedSkills?: string[];
  skillStems: string[];
  tools: string[];
  agentUpdated: boolean;
  error?: string;
  summary?: string;
};

type GithubSyncResponse = {
  ok: boolean;
  summary?: string;
  downloaded?: { stem: string; source?: string }[];
  templated?: { stem: string; error?: string }[];
  skipped?: { stem: string }[];
  failed?: { stem: string; error?: string }[];
  agentResults?: {
    agentStem: string;
    ok: boolean;
    error?: string;
    skillStems?: string[];
    tools?: string[];
  }[];
  error?: string;
};

function mapGithubSyncToResult(
  stem: string,
  r: GithubSyncResponse,
): SyncAgentSkillsResult {
  const agentRow = r.agentResults?.find((x) => x.agentStem === stem);
  const needed = new Set(agentRow?.skillStems ?? []);
  const downloaded = (r.downloaded ?? []).filter((x) => needed.has(x.stem)).map((x) => x.stem);
  const templated = (r.templated ?? []).filter((x) => needed.has(x.stem)).map((x) => x.stem);
  const skipped = (r.skipped ?? []).filter((x) => needed.has(x.stem)).map((x) => x.stem);
  return {
    ok: r.ok && (agentRow?.ok !== false),
    agentStem: stem,
    createdSkills: [...downloaded, ...templated],
    downloadedSkills: downloaded,
    templatedSkills: templated,
    skippedSkills: skipped,
    skillStems: agentRow?.skillStems ?? [],
    tools: agentRow?.tools ?? [],
    agentUpdated: agentRow?.ok !== false,
    error: r.error || agentRow?.error,
    summary: r.summary,
  };
}

async function syncAgentSkillsLocalFallback(
  api: DesktopApi,
  agentStem: string,
  agentBasename: string,
): Promise<SyncAgentSkillsResult> {
  const stem = agentStem.trim();
  const basename = agentBasename.trim();

  if (!api.saveClaudeSkillMarkdown || !api.saveClaudeAgentMarkdown) {
    return {
      ok: false,
      agentStem: stem,
      createdSkills: [],
      skippedSkills: [],
      skillStems: [],
      tools: [],
      agentUpdated: false,
      error: MSG_API_NOT_READY,
    };
  }

  const read = await api.readClaudeAgentMarkdown(basename);
  const parsed = parseAgentMarkdown(
    read.ok && read.content?.trim()
      ? read.content
      : serializeAgentMarkdown({
          description: "",
          category: "通用",
          model: "inherit",
          tools: ["read", "edit"],
          skills: [],
          body: "",
        }),
  );
  const bundle = resolveAgentSkillBundleFromMeta(stem, parsed);

  const listed = await api.listClaudeSkillMarkdown();
  const existing = new Set((listed.items ?? []).map((i) => i.stem));
  const createdSkills: string[] = [];
  const skippedSkills: string[] = [];

  for (const skillStem of bundle.skillStems) {
    if (existing.has(skillStem)) {
      skippedSkills.push(skillStem);
      continue;
    }
    const def = getSkillDefinition(skillStem, stem);
    const content = serializeSkillMarkdown(def);
    const r = await api.saveClaudeSkillMarkdown({
      basename: `${skillStem}.md`,
      content,
      createOnly: true,
    });
    if (r.ok) {
      createdSkills.push(skillStem);
      existing.add(skillStem);
    }
  }

  const nextMeta = {
    ...parsed,
    skills: bundle.skillStems,
    tools: bundle.tools,
  };
  const markdown = serializeAgentMarkdown(nextMeta, { heading: stem });
  const save = await api.saveClaudeAgentMarkdown({
    basename,
    content: markdown,
    createOnly: false,
  });
  if (!save.ok) {
    return {
      ok: false,
      agentStem: stem,
      createdSkills,
      skippedSkills,
      skillStems: bundle.skillStems,
      tools: bundle.tools,
      agentUpdated: false,
      error: save.error || "更新 Agent 失败",
    };
  }

  return {
    ok: true,
    agentStem: stem,
    createdSkills,
    skippedSkills,
    skillStems: bundle.skillStems,
    tools: bundle.tools,
    agentUpdated: true,
  };
}

export async function syncAgentSkillsAndTools(
  api: DesktopApi,
  agentStem: string,
  agentBasename: string,
  opts?: { overwrite?: boolean },
): Promise<SyncAgentSkillsResult> {
  const stem = agentStem.trim();
  const basename = agentBasename.trim();
  if (!stem || !basename) {
    return {
      ok: false,
      agentStem: stem,
      createdSkills: [],
      skippedSkills: [],
      skillStems: [],
      tools: [],
      agentUpdated: false,
      error: "缺少 Agent stem 或文件名",
    };
  }

  if (api.syncAgentSkillsFromGithub) {
    const r = await api.syncAgentSkillsFromGithub({
      agentStem: stem,
      agentBasename: basename,
      overwrite: opts?.overwrite ?? true,
    });
    return mapGithubSyncToResult(stem, r);
  }

  return syncAgentSkillsLocalFallback(api, stem, basename);
}

export async function syncAllKnownAgentSkillsAndTools(
  api: DesktopApi,
  agents: { stem: string; basename: string }[],
  opts?: { onlyMissing?: boolean; overwrite?: boolean },
): Promise<SyncAgentSkillsResult[]> {
  if (api.syncAgentSkillsFromGithub) {
    const r = await api.syncAgentSkillsFromGithub({
      allAgents: true,
      onlyMissing: opts?.onlyMissing === true,
      overwrite: opts?.overwrite ?? true,
    });
    return agents.map((a) => mapGithubSyncToResult(a.stem, r));
  }

  const results: SyncAgentSkillsResult[] = [];
  for (const a of agents) {
    results.push(await syncAgentSkillsAndTools(api, a.stem, a.basename, opts));
  }
  return results;
}
