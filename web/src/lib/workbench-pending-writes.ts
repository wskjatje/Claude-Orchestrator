/** 聊天待审 workspace-write 队列（侧栏订阅） */

export type PendingWriteItem = {
  path: string;
  /** fence 正文；diff 时为 diffBody（勿直接落盘） */
  content: string;
  historyIndex: number;
  source?: "fence" | "cli" | "summary" | "diff";
  diffBody?: string;
};

export type PendingWritesState = {
  items: PendingWriteItem[];
  applyOne: ((item: PendingWriteItem) => void | Promise<void>) | null;
  rejectOne: ((item: PendingWriteItem) => void | Promise<void>) | null;
  applyAll: (() => void | Promise<void>) | null;
  rejectAll: (() => void | Promise<void>) | null;
  /** 侧栏点击路径时滚到对应助手气泡 */
  focusHistoryIndex: ((historyIndex: number) => void) | null;
};

let state: PendingWritesState = {
  items: [],
  applyOne: null,
  rejectOne: null,
  applyAll: null,
  rejectAll: null,
  focusHistoryIndex: null,
};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => fn());
}

export function subscribePendingWrites(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function getPendingWritesState(): PendingWritesState {
  return state;
}

export function setPendingWritesState(next: PendingWritesState) {
  state = next;
  emit();
}

export function clearPendingWritesState() {
  state = {
    items: [],
    applyOne: null,
    rejectOne: null,
    applyAll: null,
    rejectAll: null,
    focusHistoryIndex: null,
  };
  emit();
}
