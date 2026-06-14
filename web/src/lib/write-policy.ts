import { normalizeAgentStem } from "@/lib/agent-artifact-paths";

/**
 * 须用户手动「确认写入」的 Agent（仅产品经理、项目经理）。
 * 其余 Agent（含 product-sprint-prioritizer、frontend-engineer 等）自动落盘，行为对齐 Cursor。
 */
const MANUAL_CONFIRM_WRITE_STEMS = new Set([
  "product-manager",
  "project-manager",
  "project-manager-senior",
]);

export function agentRequiresManualConfirmWrite(agentName: string): boolean {
  const stem = normalizeAgentStem(agentName);
  if (!stem) return false;
  return MANUAL_CONFIRM_WRITE_STEMS.has(stem);
}

export function agentAutoWritesToProject(agentName: string): boolean {
  return !agentRequiresManualConfirmWrite(agentName);
}
