/** 编辑/重发截断历史前的会话检查点，供撤销恢复 */

const KEY = "claude-orchestrator:session-history-checkpoint:v1";

export type SessionHistoryCheckpoint = {
  sessionId: string;
  savedAt: number;
  /** 将被丢弃的尾部消息（含检查点之后） */
  discarded: unknown[];
  /** 截断点：保留 history[0..keepUntil) */
  keepUntil: number;
};

export function saveSessionHistoryCheckpoint(cp: SessionHistoryCheckpoint): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(cp));
  } catch {
    /* quota */
  }
}

export function loadSessionHistoryCheckpoint(
  sessionId?: string,
): SessionHistoryCheckpoint | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const cp = JSON.parse(raw) as SessionHistoryCheckpoint;
    if (!cp || typeof cp.sessionId !== "string" || !Array.isArray(cp.discarded)) return null;
    if (sessionId && cp.sessionId !== sessionId) return null;
    return cp;
  } catch {
    return null;
  }
}

export function clearSessionHistoryCheckpoint(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
}
