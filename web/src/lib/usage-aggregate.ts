import type { ChatHistoryMsg, UsageStatsSummary } from "@/types/desktop";

function inTimeRange(ts: number | undefined, start: number, end: number): boolean {
  if (typeof ts !== "number" || !Number.isFinite(ts)) return false;
  return ts >= start && ts <= end;
}

/** 客户端回退：无落库统计时从会话 history 现场聚合 */
export function aggregateSessions(
  sessions: { id: string; title: string; modelId: string; history: ChatHistoryMsg[] }[],
  start: number,
  end: number,
): UsageStatsSummary {
  let msgUser = 0;
  let msgAssistant = 0;
  let promptTok = 0;
  let completionTok = 0;
  let totalTok = 0;
  let apiTurns = 0;
  let errors = 0;
  let latencySumMs = 0;
  let latencySamples = 0;
  let workspaceWriteHints = 0;
  const sessionsTouched = new Set<string>();
  const modelCounts: Record<string, number> = {};

  for (const s of sessions) {
    let touched = false;
    const mid = (s.modelId || "").trim() || "（未标注模型）";
    for (const m of s.history ?? []) {
      if (!inTimeRange(m.ts, start, end)) continue;
      touched = true;
      if (m.role === "user") msgUser++;
      else if (m.role === "assistant") {
        msgAssistant++;
        if (m.requestError) errors++;
        const u = m.usage;
        if (u && typeof u === "object") {
          apiTurns++;
          promptTok += u.prompt_tokens ?? 0;
          completionTok += u.completion_tokens ?? 0;
          totalTok += u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0);
          if (typeof m.latencyMs === "number" && m.latencyMs > 0) {
            latencySumMs += m.latencyMs;
            latencySamples++;
          }
        } else if (m.requestError) {
          apiTurns++;
        }
        if (typeof m.content === "string" && /```(?:workspace-write)\b/i.test(m.content)) {
          workspaceWriteHints++;
        }
      }
    }
    if (touched) {
      sessionsTouched.add(s.id);
      modelCounts[mid] = (modelCounts[mid] ?? 0) + 1;
    }
  }

  const throughputTokPerSec =
    latencySamples > 0 && completionTok > 0 ? completionTok / (latencySumMs / 1000) : null;
  const avgTokPerMsg = apiTurns > 0 && totalTok > 0 ? totalTok / apiTurns : null;
  const errRate = apiTurns > 0 ? errors / apiTurns : 0;
  const topModel = Object.entries(modelCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";

  return {
    msgUser,
    msgAssistant,
    sessionsInRange: sessionsTouched.size,
    promptTok,
    completionTok,
    totalTok,
    apiTurns,
    errors,
    latencySumMs,
    latencySamples,
    workspaceWriteHints,
    throughputTokPerSec,
    avgTokPerMsg,
    errRate,
    topModel,
    modelCounts,
  };
}
