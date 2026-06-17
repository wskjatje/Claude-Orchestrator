import type { DesktopApi } from "@/types/desktop";
import { getDesktop } from "@/lib/desktop-api";
import { chatEnabledPoolHint, shortModelPickerLabel } from "@/lib/model-picker-entries";

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

/** 项目内已添加的云供应商；catalog 为空时展示全部 */
export function resolveCloudProviderCatalog(
  catalog: string[] | undefined,
  providers: ProviderCatalogEntry[],
): string[] {
  const ids = [...new Set((catalog ?? []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (ids.length) return ids.filter((id) => providers.some((p) => p.id === id));
  return providers.map((p) => p.id);
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
  if (!model || isInheritedAgentModel(model)) return undefined;
  return model;
}

export function isAutoModelSelection(model: string | undefined): boolean {
  const id = String(model || "").trim().toLowerCase();
  return !id || id === AUTO_MODEL_ID;
}

/** Claude Code Agent frontmatter：未设置 / `inherit` / `auto` 表示跟随聊天所选模型 */
export function isInheritedAgentModel(model: string | undefined): boolean {
  const id = String(model || "").trim().toLowerCase();
  return !id || id === "inherit" || id === AUTO_MODEL_ID;
}

/** 聊天区 modelId / settings.model：inherit / auto / 空 → 跟随 Auto 解析 */
export function normalizeChatModelSelection(model: string | undefined): string {
  const id = String(model || "").trim();
  if (isAutoModelSelection(id) || isInheritedAgentModel(id)) return AUTO_MODEL_ID;
  return id;
}

/**
 * 解析本轮实际执行的模型：
 * 1. Agent frontmatter 显式 model → 使用该模型
 * 2. 否则 → 聊天区所选模型（含 Auto：按 preferredMode 从云/本地池取首项）
 */
export function resolveModelForExecution(input: {
  selectedModel: string | undefined;
  cloudModels: string[];
  localModels: string[];
  agentModel?: string;
  /** 聊天 Auto 时的编排偏好（与底部模型选择器的 mode 一致） */
  preferredMode?: OrchMode;
  /** Agent 专用：未启用到聊天的模型仍可解析 */
  allCloudModels?: string[];
  allLocalModels?: string[];
}): ResolvedExecutionModel | null {
  const cloud = input.cloudModels.map((m) => m.trim()).filter(Boolean);
  const local = input.localModels.map((m) => m.trim()).filter(Boolean);
  const cloudAll = (input.allCloudModels ?? cloud).map((m) => m.trim()).filter(Boolean);
  const localAll = (input.allLocalModels ?? local).map((m) => m.trim()).filter(Boolean);
  const agentRaw = input.agentModel?.trim();
  const agent = agentRaw && !isInheritedAgentModel(agentRaw) ? agentRaw : undefined;

  if (agent) {
    if (cloudAll.includes(agent)) return { mode: "claude-code", modelId: agent };
    if (localAll.includes(agent)) return { mode: "local-mcp", modelId: agent };
    return { mode: "claude-code", modelId: agent };
  }

  const selected = normalizeChatModelSelection(input.selectedModel);
  if (selected && !isAutoModelSelection(selected)) {
    if (local.includes(selected)) return { mode: "local-mcp", modelId: selected };
    if (cloud.includes(selected)) return { mode: "claude-code", modelId: selected };
    if (/^(sonnet|opus|haiku|claude-)/i.test(selected)) {
      return { mode: "claude-code", modelId: selected };
    }
    return resolveAutoModelFromPools(cloud, local, input.preferredMode);
  }

  return resolveAutoModelFromPools(cloud, local, input.preferredMode);
}

function resolveAutoModelFromPools(
  cloud: string[],
  local: string[],
  preferredMode?: OrchMode,
): ResolvedExecutionModel | null {
  if (preferredMode === "local-mcp") {
    return local.length ? { mode: "local-mcp", modelId: local[0]! } : null;
  }
  return cloud.length ? { mode: "claude-code", modelId: cloud[0]! } : null;
}

/** 聊天区已启用模型的合并列表（云 + 本地） */
export function chatModelPoolCombined(pools: ModelCatalogPools): string[] {
  return [...pools.cloudModels, ...pools.localModels];
}

/** @deprecated 会话 modelId 校验请用 chatModelPoolCombined */
export function chatModelPoolForMode(
  pools: ModelCatalogPools,
  mode: OrchMode,
): string[] {
  return mode === "local-mcp" ? pools.localModels : pools.cloudModels;
}

export function inferOrchModeForChatModel(
  model: string | undefined,
  pools: ModelCatalogPools,
): OrchMode {
  const id = String(model || "").trim();
  if (pools.localModels.includes(id)) return "local-mcp";
  if (pools.cloudModels.includes(id)) return "claude-code";
  if (/^(sonnet|opus|haiku|claude-)/i.test(id)) return "claude-code";
  return "claude-code";
}

/** 概览 / 仪表盘：与聊天模型选择器一致的展示文案 */
export function formatChatModelOverviewDisplay(input: {
  modelId: string | undefined;
  cloudModels: string[];
  localModels: string[];
  orchMode?: OrchMode;
}): { value: string; caption: string } {
  const raw = String(input.modelId || "").trim();
  const pools: ModelCatalogPools = {
    cloudModels: input.cloudModels,
    localModels: input.localModels,
  };

  if (isAutoModelSelection(raw)) {
    const hint = chatEnabledPoolHint(input.cloudModels, input.localModels);
    if (hint === "云+本地") return { value: "Auto", caption: `Auto · ${hint}` };
    if (hint === "本地") return { value: "Auto", caption: "本地 MCP 编排" };
    if (hint === "云端") return { value: "Auto", caption: "Claude Code CLI" };
    const orch = input.orchMode === "local-mcp" ? "local-mcp" : "claude-code";
    return {
      value: "Auto",
      caption: orch === "local-mcp" ? "本地 MCP 编排" : "Claude Code CLI",
    };
  }

  const mode = inferOrchModeForChatModel(raw, pools);
  return {
    value: shortModelPickerLabel(raw),
    caption: mode === "local-mcp" ? "本地 MCP 编排" : "Claude Code CLI",
  };
}

/** 已配置的全部模型（Agent frontmatter 解析用，不受聊天启用限制） */
export async function loadConfiguredModelPools(
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

  for (const m of settings.cloudModelCatalog ?? []) {
    const id = String(m || "").trim();
    if (id) cloudSet.add(id);
  }

  const localModels = [
    ...new Set((settings.localModelCatalog ?? []).map((m) => String(m || "").trim()).filter(Boolean)),
  ];

  return { cloudModels: [...cloudSet], localModels };
}

/** 聊天区可选模型：仅 chatEnabled* */
export async function loadChatModelPools(
  api: NonNullable<ReturnType<typeof getDesktop>>,
): Promise<ModelCatalogPools> {
  const settings = await api.getChatSettings();
  const enabledCloudProviders = new Set(settings.chatEnabledCloudProviders ?? []);
  const enabledLocal = normalizeStringList(settings.chatEnabledLocalModels);
  const cloudSet = new Set<string>();

  if (typeof api.ccSwitchListProviders === "function") {
    try {
      const r = await api.ccSwitchListProviders();
      if (r.ok) {
        for (const p of r.providers ?? []) {
          if (!enabledCloudProviders.has(p.id)) continue;
          for (const m of p.models ?? []) {
            const id = String(m || "").trim();
            if (id) cloudSet.add(id);
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  const configuredLocal = new Set(
    (settings.localModelCatalog ?? []).map((m) => String(m || "").trim()).filter(Boolean),
  );
  const localModels = enabledLocal.filter((m) => configuredLocal.has(m));

  return { cloudModels: [...cloudSet], localModels };
}

function normalizeStringList(raw: string[] | undefined): string[] {
  return [...new Set((raw ?? []).map((v) => String(v || "").trim()).filter(Boolean))];
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
    chatEnabledCloudProviders: s.chatEnabledCloudProviders ?? [],
    chatEnabledLocalModels: s.chatEnabledLocalModels ?? [],
    personalGithubRepo: s.personalGithubRepo ?? "",
    gitUserName: s.gitUserName ?? "",
    gitUserEmail: s.gitUserEmail ?? "",
    upstreamGithubRepo: s.upstreamGithubRepo ?? "https://github.com/anthropics/claude-code.git",
  };
}
