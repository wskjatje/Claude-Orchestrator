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

type Listener = () => void;
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* */
    }
  });
}

export function subscribeSessionHistoryCheckpoint(fn: Listener) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** @returns 是否写入成功；失败时调用方必须硬报错，禁止继续截断 */
export function saveSessionHistoryCheckpoint(cp: SessionHistoryCheckpoint): boolean {
  if (!cp?.sessionId || !Array.isArray(cp.discarded) || cp.discarded.length === 0) {
    return false;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(cp));
    emit();
    return true;
  } catch {
    return false;
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
    if (cp.discarded.length === 0) return null;
    if (typeof cp.keepUntil !== "number" || cp.keepUntil < 0) return null;
    if (sessionId && cp.sessionId !== sessionId) return null;
    return cp;
  } catch {
    return null;
  }
}

export function hasSessionHistoryCheckpoint(sessionId?: string): boolean {
  return loadSessionHistoryCheckpoint(sessionId) != null;
}

export function clearSessionHistoryCheckpoint(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
  emit();
}

/** 命令面板 → ChatPage 执行恢复（需会话 patch 能力） */
type RestoreListener = () => void;
const restoreListeners = new Set<RestoreListener>();

export function requestRestoreSessionCheckpoint() {
  restoreListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* */
    }
  });
}

export function subscribeRestoreSessionCheckpoint(fn: RestoreListener) {
  restoreListeners.add(fn);
  return () => {
    restoreListeners.delete(fn);
  };
}
