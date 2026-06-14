import { applyChainTemplate, CHAIN_TEMPLATES } from "@/lib/chain-templates";
import { getDesktop } from "@/lib/desktop-api";

/** 将内置通用官方模板同步到注册表（official-{templateId}），供对话与任务链页调用 */
export async function syncOfficialGenericChains(): Promise<{ ok: boolean; synced?: number }> {
  const api = getDesktop();
  if (!api?.orchestrationEnsureOfficialChains) return { ok: false };

  const items = CHAIN_TEMPLATES.map((t) => ({
    templateId: t.id,
    name: t.name,
    description: t.description,
    category: t.category,
    steps: applyChainTemplate(t, {}),
  }));

  const r = await api.orchestrationEnsureOfficialChains({ items });
  return { ok: Boolean(r.ok), synced: r.synced };
}
