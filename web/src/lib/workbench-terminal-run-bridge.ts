/** 聊天 → 集成终端：与 React 树位置无关（ChatPage 在 Provider 外也能调用） */

type TerminalRunHandlers = {
  runInActive: (command: string) => boolean;
  /** 回显 Agent 已跑命令（不重执行） */
  echoAgentRun: (command: string, output: string, ok: boolean) => boolean;
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

export function workbenchTerminalEchoAgentRun(
  command: string,
  output: string,
  ok: boolean,
): boolean {
  const cmd = command.trim();
  if (!cmd) return false;
  return handlers?.echoAgentRun(cmd, output, ok) ?? false;
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

/** Agent 工具环结束后把 Bash/run_command 轨迹回显到底栏（不重跑） */
export async function echoAgentRunsInWorkbenchTerminal(
  runs: Array<{ command: string; output?: string; ok?: boolean }>,
  opts?: { maxWaitMs?: number; pollMs?: number },
): Promise<number> {
  const list = (runs || []).filter((r) => String(r?.command || "").trim());
  if (!list.length) return 0;
  workbenchTerminalEnsureSession();
  workbenchTerminalFocusTab();
  const maxWait = opts?.maxWaitMs ?? 12_000;
  const poll = opts?.pollMs ?? 200;
  const deadline = Date.now() + maxWait;
  let n = 0;
  while (Date.now() < deadline) {
    if (workbenchTerminalIsReady()) break;
    await new Promise((r) => window.setTimeout(r, poll));
  }
  for (const r of list) {
    const ok = workbenchTerminalEchoAgentRun(
      String(r.command),
      String(r.output || ""),
      r.ok !== false,
    );
    if (ok) n++;
  }
  return n;
}
