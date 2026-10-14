/**
 * 展示层硬闸：只读问答即使历史缺 suppressFileEdits / 旧前端漏写，也不渲染 Edit 卡与「本地MCP」。
 */
import { isReadOnlyUserIntent } from "@/lib/turn-policy";
import { stripAllWorkspaceWritePayloads } from "@/lib/assistant-reply";
import { parseChatFileEdits } from "@/lib/parse-chat-file-edits";
import { getWorkbenchInteractionMode } from "@/lib/workbench-interaction-mode";
import type { AgentTurnMeta } from "@/lib/agent-turn-meta";

export function previousUserLineForAssistant(
  history: { role: string; content: string }[],
  assistantIndex: number,
): string {
  for (let i = assistantIndex - 1; i >= 0; i--) {
    const m = history[i];
    if (m?.role === "user") return String(m.content || "");
  }
  return "";
}

/** 本条助手回复是否应按只读问答展示（不问改就不写、不刷文件卡） */
export function shouldForceReadonlyAssistantDisplay(opts: {
  userLine: string;
  suppressFileEdits?: boolean;
  requestError?: boolean;
}): boolean {
  if (opts.requestError) return true;
  if (opts.suppressFileEdits) return true;
  if (getWorkbenchInteractionMode() === "ask") return true;
  return isReadOnlyUserIntent(opts.userLine);
}

/** 剥写盘载荷 + 文件卡可解析块；去掉「已完成 N 处改动」类 Agent 收尾 */
export function sanitizeReadonlyAssistantContent(text: string): string {
  let out = stripAllWorkspaceWritePayloads(String(text || ""));
  const { edits, stripped } = parseChatFileEdits(out);
  if (edits.length) out = stripped.trim() || out;
  out = out
    .replace(/^已完成\s*\d+\s*处改动。?\s*/gm, "")
    .replace(/\n已完成\s*\d+\s*处改动。?/g, "")
    .replace(/\n*【工作区已写入】[\s\S]*$/u, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return out;
}

export function stripAgentTurnForReadonlyDisplay(
  agentTurn: AgentTurnMeta | undefined,
): AgentTurnMeta | undefined {
  if (!agentTurn) return undefined;
  // 只读：保留摘要以外的痕迹一律丢掉，避免 Edit/本地MCP
  return undefined;
}
