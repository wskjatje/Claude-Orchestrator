import type { OrchestrationState } from "@/types/desktop";
import type { ChainStatusBadge } from "@/hooks/use-orchestration-execution";
import { buildChainBoardRows } from "@/lib/parse-active-chain";

export type ChainExecutionPhase =
  | "empty"
  | "draft"
  | "idle"
  | "running"
  | "paused"
  | "completed";

export type ChainStepRow = {
  index: number;
  taskId: string;
  agentName: string;
  done: boolean;
  current: boolean;
  pending: boolean;
};

export type ChainExecutionView = {
  phase: ChainExecutionPhase;
  phaseLabel: string;
  tone: ChainStatusBadge["tone"];
  total: number;
  currentIndex: number;
  completedCount: number;
  progressPct: number;
  statusText: string;
  fileLabel: string;
  stepRows: ChainStepRow[];
};

const FILE_LABEL = ".claudecode/orchestration/active-chain.json";

export function deriveChainExecutionView(opts: {
  orch: OrchestrationState | null;
  steps: { agentName: string; taskId?: string; instruction?: string }[];
  dirty: boolean;
  chainRunning: boolean;
  chainStatusBadge: ChainStatusBadge;
  hasFile: boolean;
}): ChainExecutionView {
  const { orch, steps, dirty, chainRunning, chainStatusBadge, hasFile } = opts;
  const total = steps.length;
  const idx = orch?.currentIndex ?? 0;
  const diskStatus = orch?.status?.trim() || "idle";

  let phase: ChainExecutionPhase = "empty";
  if (total === 0 && !hasFile) {
    phase = "empty";
  } else if (dirty) {
    phase = "draft";
  } else if (idx >= total && total > 0) {
    phase = "completed";
  } else if (chainRunning) {
    phase = "running";
  } else if (idx > 0) {
    phase = "paused";
  } else {
    phase = "idle";
  }

  const phaseLabels: Record<ChainExecutionPhase, string> = {
    empty: "无任务链",
    draft: "未保存草稿",
    idle: "待执行",
    running: "执行中",
    paused: "已暂停",
    completed: "已完成",
  };

  const completedCount = total ? Math.min(idx, total) : 0;
  const progressPct = total ? Math.round((completedCount / total) * 100) : 0;

  const board = buildChainBoardRows(steps, dirty ? 0 : idx);
  const stepRows: ChainStepRow[] = board.map((r, i) => ({
    index: i,
    taskId: r.taskId,
    agentName: r.agentName,
    done: r.done,
    current: r.current,
    pending: !r.done && !r.current,
  }));

  let statusText = chainStatusBadge.label.replace(/^链：/, "");
  if (phase === "draft") statusText = "编辑中，保存后才会写入磁盘并允许执行";
  else if (phase === "empty") statusText = "可从下方模板套用，或手动添加步骤";
  else if (phase === "completed") statusText = `全部 ${total} 步已完成 · 磁盘 status=${diskStatus}`;
  else if (phase === "running") statusText = `正在执行第 ${idx + 1}/${total} 步`;
  else if (phase === "paused") statusText = `已完成 ${completedCount}/${total} 步，可继续执行`;
  else statusText = `共 ${total} 步，尚未开始`;

  return {
    phase,
    phaseLabel: phaseLabels[phase],
    tone: chainStatusBadge.tone,
    total,
    currentIndex: idx,
    completedCount,
    progressPct,
    statusText,
    fileLabel: FILE_LABEL,
    stepRows,
  };
}
