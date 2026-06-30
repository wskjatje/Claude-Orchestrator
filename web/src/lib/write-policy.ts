import { normalizeAgentStem } from "@/lib/agent-artifact-paths";

/**
 * 所有 Agent 均自动落盘。
 */
export function agentAutoWritesToProject(agentName: string): boolean {
  return true;
}
