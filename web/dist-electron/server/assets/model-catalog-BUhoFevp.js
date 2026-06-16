const AUTO_MODEL_ID = "auto";
function resolveCloudProviderCatalog(catalog, providers) {
  const ids = [...new Set((catalog ?? []).map((id) => String(id || "").trim()).filter(Boolean))];
  if (ids.length) return ids.filter((id) => providers.some((p) => p.id === id));
  return providers.map((p) => p.id);
}
function parseAgentModelFromFrontmatter(content) {
  const trimmed = content.trimStart();
  if (!trimmed.startsWith("---")) return void 0;
  const closeIdx = trimmed.indexOf("\n---", 3);
  if (closeIdx === -1) return void 0;
  const fm = trimmed.slice(3, closeIdx);
  const match = fm.match(/^model:\s*['"]?([^'"\n#]+)['"]?\s*(?:#.*)?$/im);
  const model = match?.[1]?.trim();
  if (!model || isInheritedAgentModel(model)) return void 0;
  return model;
}
function isAutoModelSelection(model) {
  const id = String(model || "").trim().toLowerCase();
  return !id || id === AUTO_MODEL_ID;
}
function isInheritedAgentModel(model) {
  const id = String(model || "").trim().toLowerCase();
  return !id || id === "inherit" || id === AUTO_MODEL_ID;
}
function normalizeChatModelSelection(model) {
  const id = String(model || "").trim();
  if (isAutoModelSelection(id) || isInheritedAgentModel(id)) return AUTO_MODEL_ID;
  return id;
}
function resolveModelForExecution(input) {
  const cloud = input.cloudModels.map((m) => m.trim()).filter(Boolean);
  const local = input.localModels.map((m) => m.trim()).filter(Boolean);
  const agentRaw = input.agentModel?.trim();
  const agent = agentRaw && !isInheritedAgentModel(agentRaw) ? agentRaw : void 0;
  if (agent) {
    if (cloud.includes(agent)) return { mode: "claude-code", modelId: agent };
    if (local.includes(agent)) return { mode: "local-mcp", modelId: agent };
    return { mode: "claude-code", modelId: agent };
  }
  const selected = normalizeChatModelSelection(input.selectedModel);
  if (selected && !isAutoModelSelection(selected)) {
    if (local.includes(selected)) return { mode: "local-mcp", modelId: selected };
    if (cloud.includes(selected)) return { mode: "claude-code", modelId: selected };
    if (/^(sonnet|opus|haiku|claude-)/i.test(selected)) {
      return { mode: "claude-code", modelId: selected };
    }
    return cloud.length ? { mode: "claude-code", modelId: selected } : local.length ? { mode: "local-mcp", modelId: selected } : null;
  }
  return resolveAutoModelFromPools(cloud, local, input.preferredMode);
}
function resolveAutoModelFromPools(cloud, local, preferredMode) {
  if (preferredMode === "local-mcp" && local.length) {
    return { mode: "local-mcp", modelId: local[0] };
  }
  if (cloud.length) return { mode: "claude-code", modelId: cloud[0] };
  if (local.length) return { mode: "local-mcp", modelId: local[0] };
  return null;
}
async function loadChatModelPools(api) {
  const settings = await api.getChatSettings();
  const cloudSet = /* @__PURE__ */ new Set();
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
    }
  }
  const localModels = [...new Set((settings.localModelCatalog ?? []).map((m) => String(m || "").trim()).filter(Boolean))];
  return {
    cloudModels: [...cloudSet],
    localModels
  };
}
function chatSettingsPreservePayload(s) {
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
    upstreamGithubRepo: s.upstreamGithubRepo ?? "https://github.com/anthropics/claude-code.git"
  };
}
export {
  AUTO_MODEL_ID as A,
  resolveModelForExecution as a,
  chatSettingsPreservePayload as c,
  isAutoModelSelection as i,
  loadChatModelPools as l,
  normalizeChatModelSelection as n,
  parseAgentModelFromFrontmatter as p,
  resolveCloudProviderCatalog as r
};
