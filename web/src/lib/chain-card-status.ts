import type { SavedChainSummary } from "@/types/desktop";

export type ChainCardStatusTone = "success" | "primary" | "warning" | "muted";

export function chainCategoryLabel(category: SavedChainSummary["category"]): string {
  if (category === "single") return "单 Agent";
  if (category === "pipeline") return "流水线";
  return "自定义";
}

export function chainCardStatus(
  chain: SavedChainSummary,
  opts: { running: boolean; activeChainId: string | null },
): { label: string; tone: ChainCardStatusTone; progress: string } {
  const total = chain.stepCount;
  const idx = chain.currentIndex ?? 0;
  const progress = total ? `${Math.min(idx, total)}/${total} 步` : "0 步";

  if (opts.running && opts.activeChainId === chain.id) {
    return { label: `● 执行中（${idx + 1}/${total || "?"})`, tone: "success", progress };
  }
  if (!chain.enabled) {
    return { label: "○ 已停用", tone: "muted", progress };
  }
  if (total > 0 && (chain.status === "completed" || idx >= total)) {
    return { label: "● 已完成", tone: "primary", progress };
  }
  if (idx > 0) {
    return { label: `● 已暂停（${idx}/${total}）`, tone: "warning", progress };
  }
  return { label: "● 待执行", tone: "success", progress };
}
