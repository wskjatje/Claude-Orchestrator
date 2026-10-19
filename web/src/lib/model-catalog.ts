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
  /** 本轮是否用户显式指定（非 Auto） */
  userPinned?: boolean;
  /** Auto 时实际采用的路由偏好 */
  routeHint?: ModelRouteHint;
};

/** Auto 时的双轨偏好：改码偏云、问答偏本地；手选模型时忽略 */
export type ModelRouteHint = "prefer-cloud" | "prefer-local" | "prefer-mode";

type ProviderCatalogEntry = {
  id: string;
  isCurrent?: boolean;
  notes?: string;
};

/** 项目内已添加的云供应商；catalog 为空时不展示任何云供应商（须通过 UI 显式添加） */
export function resolveCloudProviderCatalog(
  catalog: string[] | undefined,
  providers: ProviderCatalogEntry[],
): string[] {
  const ids = [...new Set((catalog ?? []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (!ids.length) return [];
  return ids.filter((id) => providers.some((p) => p.id === id));
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
 * 根据回合策略推断 Auto 路由：
 * - 允许写盘 / 工具环 → 偏云
 * - 只读 / 直聊问答 → 偏本地（无本地则回落云）
 */
export function inferModelRouteHint(input: {
  allowWrites?: boolean;
  forceDirectChat?: boolean;
  allowTools?: boolean;
  intent?: "readonly" | "write" | "chat";
}): ModelRouteHint {
  if (input.allowWrites || input.intent === "write") return "prefer-cloud";
  if (input.forceDirectChat || input.intent === "readonly" || input.allowTools === false) {
    return "prefer-local";
  }
  if (input.intent === "chat") return "prefer-local";
  return "prefer-cloud";
}

/**
 * 解析本轮实际执行的模型（优先级从高到低）：
 * 1. 聊天区用户显式指定的模型（非 Auto）→ 原样使用
 * 2. Agent frontmatter 显式 model（若调用方传入）
 * 3. Auto → 按 routeHint（改码偏云 / 问答偏本地），再回落 preferredMode
 */
export function resolveModelForExecution(input: {
  selectedModel: string | undefined;
  cloudModels: string[];
  localModels: string[];
  agentModel?: string;
  /** 聊天 Auto 时的编排偏好（与底部模型选择器的 mode 一致） */
  preferredMode?: OrchMode;
  /** Auto 任务偏好；手选模型时忽略 */
  routeHint?: ModelRouteHint;
  /** Agent 专用：未启用到聊天的模型仍可解析 */
  allCloudModels?: string[];
  allLocalModels?: string[];
  /** Auto 时优先（须在对应池内） */
  preferredCloudModel?: string;
  preferredLocalModel?: string;
}): ResolvedExecutionModel | null {
  const cloud = input.cloudModels.map((m) => m.trim()).filter(Boolean);
  const local = input.localModels.map((m) => m.trim()).filter(Boolean);
  const cloudAll = (input.allCloudModels ?? cloud).map((m) => m.trim()).filter(Boolean);
  const localAll = (input.allLocalModels ?? local).map((m) => m.trim()).filter(Boolean);

  const selected = normalizeChatModelSelection(input.selectedModel);
  // 1) 用户手选：最高优先级，绝不被 Auto 策略覆盖；池外硬失败
  if (selected && !isAutoModelSelection(selected)) {
    if (local.includes(selected) || localAll.includes(selected)) {
      return { mode: "local-mcp", modelId: selected, userPinned: true };
    }
    if (cloud.includes(selected) || cloudAll.includes(selected)) {
      return { mode: "claude-code", modelId: selected, userPinned: true };
    }
    return null;
  }

  // 2) Agent frontmatter（仅 Auto / 未选手选时）；池外硬失败
  const agentRaw = input.agentModel?.trim();
  const agent = agentRaw && !isInheritedAgentModel(agentRaw) ? agentRaw : undefined;
  if (agent) {
    if (cloudAll.includes(agent)) {
      return { mode: "claude-code", modelId: agent, userPinned: false };
    }
    if (localAll.includes(agent)) {
      return { mode: "local-mcp", modelId: agent, userPinned: false };
    }
    return null;
  }

  // 3) Auto
  const hint = input.routeHint || "prefer-mode";
  const auto = resolveAutoModelFromPools(cloud, local, input.preferredMode, hint, {
    preferredCloudModel: input.preferredCloudModel,
    preferredLocalModel: input.preferredLocalModel,
  });
  return auto ? { ...auto, userPinned: false, routeHint: hint } : null;
}

function resolveAutoModelFromPools(
  cloud: string[],
  local: string[],
  preferredMode?: OrchMode,
  routeHint: ModelRouteHint = "prefer-mode",
  prefs?: { preferredCloudModel?: string; preferredLocalModel?: string },
): ResolvedExecutionModel | null {
  const preferCloud = String(prefs?.preferredCloudModel || "").trim();
  const preferLocal = String(prefs?.preferredLocalModel || "").trim();
  const pickFrom = (list: string[], preferred: string) => {
    if (preferred && list.includes(preferred)) return preferred;
    return list[0] || null;
  };
  const pickCloud = (): ResolvedExecutionModel | null => {
    const id = pickFrom(cloud, preferCloud);
    return id ? { mode: "claude-code", modelId: id } : null;
  };
  const pickLocal = (): ResolvedExecutionModel | null => {
    const id = pickFrom(local, preferLocal);
    return id ? { mode: "local-mcp", modelId: id } : null;
  };
  const pickByMode = (): ResolvedExecutionModel | null => {
    if (preferredMode === "local-mcp") return pickLocal() || pickCloud();
    return pickCloud() || pickLocal();
  };

  // prefer-cloud / prefer-local：对侧池空禁止静默换通道
  if (routeHint === "prefer-cloud") return pickCloud();
  if (routeHint === "prefer-local") return pickLocal();
  return pickByMode();
}

/** 与 server/resolve-execution-model.mjs 同源 */
export const CLOUD_PROVIDER_REQUIRED_ERROR =
  "未启用云供应商：请在「设置 → 模型与连接」添加并启用云模型；不会自动改用本地模型。";

export const LOCAL_PROVIDER_REQUIRED_ERROR =
  "未启用本地模型：请在「设置 → 模型与连接」配置 Ollama/本地池；不会自动改用云模型。";

export const MODEL_NOT_IN_POOL_ERROR =
  "所选模型不在已启用池内：请在「设置 → 模型与连接」启用该模型后再选；不会按名称启发式推断通道。";

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

/**
 * Cursor：选中的模型就是本轮调用的模型。
 * 只有 Claude 系进入 Claude CLI 工具环；其余云供应商模型走该供应商 API。
 */
export function isClaudeCliModel(modelId: string | undefined): boolean {
  const id = String(modelId || "").trim();
  if (!id || isAutoModelSelection(id)) return false;
  return /^(sonnet|opus|haiku|claude)(-|$)/i.test(id);
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
    if (hint === "云+本地") {
      return { value: "Auto", caption: "Auto · 改码偏云 / 问答偏本地" };
    }
    if (hint === "本地") return { value: "Auto", caption: "本地 · Host 编排" };
    if (hint === "云端") return { value: "Auto", caption: "云端 · CLI/Host" };
    const orch = input.orchMode === "local-mcp" ? "local-mcp" : "claude-code";
    return {
      value: "Auto",
      caption: orch === "local-mcp" ? "本地 · Host 编排" : "云端 · CLI/Host",
    };
  }

  const mode = inferOrchModeForChatModel(raw, pools);
  return {
    value: shortModelPickerLabel(raw),
    caption: mode === "local-mcp" ? "手选 · 本地" : "手选 · 云端",
  };
}

/** 已配置的全部模型（Agent frontmatter 解析用，不受聊天启用限制） */
export async function loadConfiguredModelPools(
  api: NonNullable<ReturnType<typeof getDesktop>>,
): Promise<ModelCatalogPools> {
  if (typeof api.cloudProvidersGetModelPools === "function") {
    try {
      const r = await api.cloudProvidersGetModelPools();
      if (r.ok && r.configured) {
        return {
          cloudModels: r.configured.cloudModels ?? [],
          localModels: r.configured.localModels ?? [],
        };
      }
    } catch {
      /* 回退到本地拼装 */
    }
  }

  const settings = await api.getChatSettings();
  const cloudSet = new Set<string>();
  let providerIds = new Set(settings.cloudProviderCatalog ?? []);

  if (typeof api.cloudProvidersListProviders === "function") {
    try {
      const r = await api.cloudProvidersListProviders();
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

  const vendorModelSet = new Set(cloudSet);
  for (const m of settings.cloudModelCatalog ?? []) {
    const id = String(m || "").trim();
    if (id && vendorModelSet.has(id)) cloudSet.add(id);
  }

  const localModels = [
    ...new Set((settings.localModelCatalog ?? []).map((m) => String(m || "").trim()).filter(Boolean)),
  ];

  return { cloudModels: [...cloudSet], localModels };
}

async function refreshCapabilitySnapshot(
  api: NonNullable<ReturnType<typeof getDesktop>>,
): Promise<void> {
  if (typeof api.modelsCapabilities !== "function") return;
  try {
    const { rememberModelCapabilities } = await import("@/lib/model-capability-cache");
    const r = await api.modelsCapabilities({ action: "snapshot" });
    if (r.ok && Array.isArray(r.models)) {
      rememberModelCapabilities(r.models);
    }
  } catch {
    /* 能力缓存刷新失败不阻断模型池 */
  }
}

/** 聊天区可选模型：仅 chatEnabled* ∩ catalog */
export async function loadChatModelPools(
  api: NonNullable<ReturnType<typeof getDesktop>>,
): Promise<ModelCatalogPools> {
  if (typeof api.cloudProvidersGetModelPools === "function") {
    try {
      const r = await api.cloudProvidersGetModelPools();
      if (r.ok && r.chat) {
        void refreshCapabilitySnapshot(api);
        return {
          cloudModels: r.chat.cloudModels ?? [],
          localModels: r.chat.localModels ?? [],
        };
      }
    } catch {
      /* 回退 */
    }
  }

  const settings = await api.getChatSettings();
  const enabledCloudProviders = new Set(settings.chatEnabledCloudProviders ?? []);
  const providerCatalog = new Set(settings.cloudProviderCatalog ?? []);
  const enabledLocal = normalizeStringList(settings.chatEnabledLocalModels);
  const cloudSet = new Set<string>();

  if (typeof api.cloudProvidersListProviders === "function") {
    try {
      const r = await api.cloudProvidersListProviders();
      if (r.ok) {
        for (const p of r.providers ?? []) {
          if (!enabledCloudProviders.has(p.id) || !providerCatalog.has(p.id)) continue;
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

  void refreshCapabilitySnapshot(api);
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
    agentBasenameByWorkspace: s.agentBasenameByWorkspace ?? {},
    defaultConfirmWritePath: s.defaultConfirmWritePath ?? "",
    mcpConfigAbsolutePath: s.mcpConfigAbsolutePath ?? "",
    devMcpOrchDebug: s.devMcpOrchDebug === true,
    cloudModelCatalog: s.cloudModelCatalog ?? [],
    localModelCatalog: s.localModelCatalog ?? [],
    cloudProviderCatalog: s.cloudProviderCatalog ?? [],
    chatEnabledCloudProviders: s.chatEnabledCloudProviders ?? [],
    chatEnabledLocalModels: s.chatEnabledLocalModels ?? [],
    preferredCloudModel: s.preferredCloudModel ?? "",
    preferredLocalModel: s.preferredLocalModel ?? "",
    modelCapabilityOverrides: s.modelCapabilityOverrides ?? {},
    personalGithubRepo: s.personalGithubRepo ?? "",
    gitUserName: s.gitUserName ?? "",
    gitUserEmail: s.gitUserEmail ?? "",
    upstreamGithubRepo: s.upstreamGithubRepo ?? "https://github.com/anthropics/claude-code.git",
  };
}
