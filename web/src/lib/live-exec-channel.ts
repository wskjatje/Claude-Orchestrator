/** 本轮执行通道（流式可见）：CLI / Host / 本地 / 直聊（无静默回落态） */

export type LiveExecChannel =
  | "idle"
  | "cli"
  | "host"
  | "local"
  | "direct";

type State = {
  channel: LiveExecChannel;
  label: string;
  /** 本回合回显应优先写入的终端会话（有则绑定，避免进错 pane） */
  terminalSessionId: string | null;
};

let state: State = { channel: "idle", label: "", terminalSessionId: null };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((fn) => {
    try {
      fn();
    } catch {
      /* */
    }
  });
}

export function setLiveExecChannel(channel: LiveExecChannel, label?: string) {
  const labels: Record<LiveExecChannel, string> = {
    idle: "",
    cli: "Agent",
    host: "Host",
    local: "本地",
    direct: "直聊",
  };
  state = {
    channel,
    label: label ?? labels[channel],
    // 切换通道时清掉旧绑定；回显前由终端面板认领
    terminalSessionId: null,
  };
  emit();
}

/** 终端面板在 echo/ensure 时认领当前回合会话 */
export function bindLiveExecTerminalSession(sessionId: string) {
  const id = String(sessionId || "").trim();
  if (!id) return;
  if (state.channel === "idle") return;
  if (state.terminalSessionId === id) return;
  state = { ...state, terminalSessionId: id };
  emit();
}

export function getLiveExecTerminalSessionId(): string | null {
  return state.terminalSessionId;
}

export function clearLiveExecChannel() {
  state = { channel: "idle", label: "", terminalSessionId: null };
  emit();
}

export function getLiveExecChannelState(): State {
  return state;
}

export function subscribeLiveExecChannel(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
