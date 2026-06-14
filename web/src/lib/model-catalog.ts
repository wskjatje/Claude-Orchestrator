import type { DesktopApi } from "@/types/desktop";
import { getDesktop } from "@/lib/desktop-api";

export type ModelCatalogPools = {
  cloudModels: string[];
  localModels: string[];
};

export const AUTO_MODEL_ID = "auto";

type OrchMode = "claude-code" | "local-mcp";

export type ResolvedExecutionModel = {
  mode: OrchMode;
  modelId: string;
};

type ProviderCatalogEntry = {
  id: string;
  isCurrent?: boolean;
  notes?: string;
};

/** 仅展示 Workbench 自主添加的云供应商；空 catalog 时一次性迁移 Workbench 备注或当前供应商 */
export function resolveCloudProviderCatalog(
  catalog: string[] | undefined,
  providers: ProviderCatalogEntry[],
): string[] {
  const ids = [...new Set((catalog ?? []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (ids.length) return ids;

  const workbench = providers
    .filter((p) => /Workbench/i.test(p.notes ?? ""))
    .map((p) => p.id);
  if (workbench.length) return workbench;

  const current = providers.find((p) => p.isCurrent);
  return current ? [current.id] : [];
}

/** Agent frontmatter `model:`（Claude Code 子 Agent 约定） */
export function parseAgentModelFromFrontmatter(content: string): string | undefined {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return undefined;
  const closeIdx = trimmed.indexOf("\n---", 3);
  if (closeIdx === -1) return undefined;
  const fm = trimmed.slice(3, closeIdx);
  const match = fm.match(/^model:\s*['"]?([^'"\n#]+)['"]?\s*(?:#.*)?$/im);
  const model = match?.[1]?.trim();
  return model || undefined;
}

export function isAutoModelSelection(model: string | undefined): boolean {
  const id = String(model || "").trim().toLowerCase();
  return !id || id === AUTO_MODEL_ID;
}

/**
 * 解析本轮实际执行的模型：Agent 指定 > 用户显式选择 > Auto（云模型优先，无云则用本地）
 */
export function resolveModelForExecution(input: {
  selectedModel: string | undefined;
  cloudModels: string[];
  localModels: string[];
  agentModel?: string;
}): ResolvedExecutionModel | null {
  const cloud = input.cloudModels.map((m) => m.trim()).filter(Boolean);
  const local = input.localModels.map((m) => m.trim()).filter(Boolean);
  const agent = input.agentModel?.trim();

  if (agent) {
    if (cloud.includes(agent)) return { mode: "claude-code", modelId: agent };
    if (local.includes(agent)) return { mode: "local-mcp", modelId: agent };
    return { mode: "claude-code", modelId: agent };
  }

  const selected = String(input.selectedModel || "").trim();
  if (selected && !isAutoModelSelection(selected)) {
    if (local.includes(selected)) return { mode: "local-mcp", modelId: selected };
    if (cloud.includes(selected)) return { mode: "claude-code", modelId: selected };
    if (/^(sonnet|opus|haiku|claude-)/i.test(selected)) {
      return { mode: "claude-code", modelId: selected };
    }
    return cloud.length
      ? { mode: "claude-code", modelId: selected }
      : local.length
        ? { mode: "local-mcp", modelId: selected }
        : null;
  }

  if (cloud.length) return { mode: "claude-code", modelId: cloud[0]! };
  if (local.length) return { mode: "local-mcp", modelId: local[0]! };
  return null;
}

/** 与「模型与连接」页表格一致：云 = 已添加供应商；本地 = 已添加的 localModelCatalog */
export async function loadChatModelPools(
  api: NonNullable<ReturnType<typeof getDesktop>>,
): Promise<ModelCatalogPools> {
  const settings = await api.getChatSettings();
  const cloudSet = new Set<string>();
  let providerIds = new Set(settings.cloudProviderCatalog ?? []);

  if (typeof api.ccSwitchListProviders === "function") {
    try {
      const r = await api.ccSwitchListProviders();
      if (r.ok) {
        const allProviders = r.providers ?? [];
        const resolved = resolveCloudProviderCatalog(settings.cloudProviderCatalog, allProviders);
        providerIds = new Set(resolved);
        for (const p of allProviders) {
          if (!providerIds.has(p.id)) continue;
          for (const m of p.models ?? []) {
            const id = String(m || "").trim();
            if (id) cloudSet.add(id);
          }
        }
      }
    } catch {
      /* Bridge 离线时仅用 catalog */
    }
  }

  const localModels = [...new Set((settings.localModelCatalog ?? []).map((m) => String(m || "").trim()).filter(Boolean))];

  return {
    cloudModels: [...cloudSet],
    localModels,
  };
}

export function chatSettingsPreservePayload(
  s: Awaited<ReturnType<DesktopApi["getChatSettings"]>>,
): Parameters<DesktopApi["saveChatSettings"]>[0] {
  return {
    ollamaBase: s.ollamaBase ?? "",
    model: s.model ?? "",
    localOllamaModel: s.localOllamaModel ?? "",
    claudeCliPath: s.claudeCliPath ?? "",
    orchestrationMode: s.orchestrationMode === "local-mcp" ? "local-mcp" : "claude-code",
    localAgentBasename: s.localAgentBasename ?? "",
    defaultConfirmWritePath: s.defaultConfirmWritePath ?? "docs/prd.md",
    mcpConfigAbsolutePath: s.mcpConfigAbsolutePath ?? "",
    devMcpOrchDebug: s.devMcpOrchDebug === true,
    cloudModelCatalog: s.cloudModelCatalog ?? [],
    localModelCatalog: s.localModelCatalog ?? [],
    cloudProviderCatalog: s.cloudProviderCatalog ?? [],
    personalGithubRepo: s.personalGithubRepo ?? "",
    gitUserName: s.gitUserName ?? "",
    gitUserEmail: s.gitUserEmail ?? "",
    upstreamGithubRepo: s.upstreamGithubRepo ?? "https://github.com/anthropics/claude-code.git",
  };
}
