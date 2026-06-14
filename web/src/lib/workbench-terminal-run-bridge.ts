/** 聊天 → 集成终端：与 React 树位置无关（ChatPage 在 Provider 外也能调用） */

type TerminalRunHandlers = {
  runInActive: (command: string) => boolean;
  ensureSession: () => void;
  isActiveReady: () => boolean;
};

let handlers: TerminalRunHandlers | null = null;
let focusTabHandler: (() => void) | null = null;

export function registerWorkbenchTerminalRunHandlers(next: TerminalRunHandlers | null) {
  handlers = next;
}

export function registerWorkbenchTerminalFocusTab(fn: (() => void) | null) {
  focusTabHandler = fn;
}

export function workbenchTerminalFocusTab() {
  focusTabHandler?.();
}

export function workbenchTerminalRunInActive(command: string): boolean {
  const cmd = command.trim();
  if (!cmd) return false;
  return handlers?.runInActive(cmd) ?? false;
}

export function workbenchTerminalEnsureSession() {
  handlers?.ensureSession();
}

export function workbenchTerminalIsReady(): boolean {
  return handlers?.isActiveReady() ?? false;
}

export async function runCommandInWorkbenchTerminalBridge(
  command: string,
  opts?: { maxWaitMs?: number; pollMs?: number },
): Promise<boolean> {
  const cmd = command.trim();
  if (!cmd) return false;
  workbenchTerminalEnsureSession();
  const maxWait = opts?.maxWaitMs ?? 15_000;
  const poll = opts?.pollMs ?? 200;
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    if (workbenchTerminalRunInActive(cmd)) return true;
    await new Promise((r) => window.setTimeout(r, poll));
  }
  return false;
}
