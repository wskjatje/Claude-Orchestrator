/** Agent 写盘后的聚合 Diff Review 状态（中栏只读审查） */

import { isPlanDocumentPath } from "@/lib/plan-build-request";
import { trackComposerCanvasPlan } from "@/lib/workbench-composer-turn-footer";

export type AgentWrittenReviewState = {
  paths: string[];
  open: boolean;
};

let state: AgentWrittenReviewState = { paths: [], open: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribeAgentWrittenReview(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getAgentWrittenReviewState(): AgentWrittenReviewState {
  return state;
}

function normalizePaths(paths: string[]): string[] {
  return [...new Set(
    (paths || [])
      .map((p) => String(p || "").replace(/\\/g, "/").replace(/^\.\//, "").trim())
      .filter(Boolean),
  )].slice(0, 40);
}

/**
 * 记录 Agent 已写路径供 Composer `> N Files` 条，不自动打开 Review（对齐 Cursor）。
 */
export function trackAgentWrittenPaths(paths: string[]) {
  const next = normalizePaths(paths);
  if (!next.length) return;
  const merged = normalizePaths([...state.paths, ...next]);
  state = { paths: merged, open: state.open };
  emit();
  const planPath = next.find((p) => isPlanDocumentPath(p));
  if (planPath) trackComposerCanvasPlan(planPath);
}

/** 打开写盘后聚合审查（最多 40 路径） */
export function openAgentWrittenReview(paths: string[]) {
  const next = normalizePaths(paths);
  state = { paths: next, open: next.length > 0 };
  emit();
}

export function closeAgentWrittenReview() {
  state = { ...state, open: false };
  emit();
}

export function clearAgentWrittenReview() {
  state = { paths: [], open: false };
  emit();
}
