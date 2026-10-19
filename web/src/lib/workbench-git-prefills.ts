/** 聊天 / toast → Git 面板：预填提交说明 */

type Prefill = { message: string; ts: number };

let pending: Prefill | null = null;
const listeners = new Set<(p: Prefill) => void>();

export function preferGitCommitMessage(message: string) {
  const msg = String(message || "").trim();
  if (!msg) return;
  const next = { message: msg.slice(0, 500), ts: Date.now() };
  pending = next;
  listeners.forEach((fn) => {
    try {
      fn(next);
    } catch {
      /* */
    }
  });
}

export function consumePreferredGitCommitMessage(): string | null {
  const m = pending?.message ?? null;
  pending = null;
  return m;
}

export function subscribePreferredGitCommitMessage(fn: (p: Prefill) => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
