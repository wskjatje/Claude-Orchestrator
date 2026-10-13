/** Agent 写盘后的聚合 Diff Review 状态（中栏只读审查） */

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

/** 打开写盘后聚合审查（最多 40 路径） */
export function openAgentWrittenReview(paths: string[]) {
  const next = [...new Set(
    (paths || [])
      .map((p) => String(p || "").replace(/\\/g, "/").replace(/^\.\//, "").trim())
      .filter(Boolean),
  )].slice(0, 40);
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
