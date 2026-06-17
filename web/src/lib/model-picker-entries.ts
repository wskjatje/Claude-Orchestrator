export type OrchMode = "claude-code" | "local-mcp";

export type ModelPickerEntry = {
  mode: OrchMode;
  model: string;
  tier: string;
};

export function tierLabel(tier: string): string {
  if (tier === "Fast") return "快速";
  if (tier === "High") return "高质";
  if (tier === "Local") return "本地";
  if (tier === "Cloud") return "云端";
  if (tier === "Custom") return "当前文件";
  return tier;
}

function tierForCloud(model: string): string {
  const id = model.trim().toLowerCase();
  if (id === "sonnet" || id === "haiku") return "Fast";
  if (id === "opus") return "High";
  if (id.includes("opus")) return "High";
  if (id.includes("haiku")) return "Fast";
  if (id.includes("sonnet")) return "Fast";
  if (id.includes("flash")) return "Fast";
  if (id.includes("pro")) return "High";
  return "Cloud";
}

export function buildChatEnabledModelEntries(
  cloudModels: string[],
  localModels: string[],
  extraModels: string[] = [],
): ModelPickerEntry[] {
  const cloud = cloudModels.filter(Boolean).map((model) => ({
    mode: "claude-code" as const,
    model,
    tier: tierForCloud(model),
  }));
  const local = localModels.filter(Boolean).map((model) => ({
    mode: "local-mcp" as const,
    model,
    tier: "Local",
  }));
  const known = new Set([...cloudModels, ...localModels]);
  const extra = extraModels
    .filter(Boolean)
    .filter((m) => !known.has(m))
    .map((model) => ({
      mode: "claude-code" as const,
      model,
      tier: "Custom",
    }));
  return [...cloud, ...local, ...extra];
}

export function filterModelPickerEntries(entries: ModelPickerEntry[], query: string): ModelPickerEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;
  return entries.filter(
    (e) =>
      e.model.toLowerCase().includes(q) ||
      tierLabel(e.tier).toLowerCase().includes(q) ||
      e.tier.toLowerCase().includes(q) ||
      (e.mode === "claude-code" && ("cloud".includes(q) || "云端".includes(q))) ||
      (e.mode === "local-mcp" && ("local".includes(q) || "本地".includes(q))) ||
      (e.tier === "Custom" && "当前".includes(q)),
  );
}

export function displayModelName(model: string): string {
  const m = model.trim();
  if (/^(sonnet|opus|haiku)$/i.test(m)) return m.charAt(0).toUpperCase() + m.slice(1);
  return m;
}

export function shortModelPickerLabel(model: string): string {
  const m = model.trim();
  const tail = m.includes("/") ? m.split("/").pop()! : m;
  if (tail.length <= 28) return tail;
  return `${tail.slice(0, 26)}…`;
}

export function chatEnabledPoolHint(cloudModels: string[], localModels: string[]): string {
  const hasCloud = cloudModels.length > 0;
  const hasLocal = localModels.length > 0;
  if (hasCloud && hasLocal) return "云+本地";
  if (hasLocal) return "本地";
  if (hasCloud) return "云端";
  return "";
}
