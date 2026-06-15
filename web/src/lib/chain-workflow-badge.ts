export type ChainWorkflowBadgeTone = "neutral" | "active" | "paused" | "done" | "idle";

export type ChainWorkflowBadge = {
  label: string;
  tone: ChainWorkflowBadgeTone;
};

/** 聊天/workflow 底栏：区分「从未开跑」与「中途暂停」 */
export function buildChainWorkflowBadge(opts: {
  total: number;
  currentIndex: number;
  running: boolean;
  lastError?: string | null;
  loaded?: boolean;
}): ChainWorkflowBadge {
  const { total, currentIndex: idx, running, lastError, loaded = true } = opts;

  if (!loaded || total === 0) {
    return { label: "工作流：无任务链", tone: "neutral" };
  }
  if (idx >= total) {
    return { label: `工作流：已完成（${total}/${total}）`, tone: "done" };
  }
  if (running) {
    return { label: `工作流：执行中（${idx + 1}/${total}）`, tone: "active" };
  }
  if (idx === 0 && !lastError?.trim()) {
    return { label: "工作流：待执行", tone: "idle" };
  }
  return { label: `工作流：已暂停（${idx + 1}/${total}）`, tone: "paused" };
}
