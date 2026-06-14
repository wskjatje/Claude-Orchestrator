const WS_URL =
  (import.meta.env.VITE_BRIDGE_WS_URL as string | undefined) || "ws://127.0.0.1:18789";

export function isOpenTerminalMessage(text: string): boolean {
  const t = text.trim();
  if (!t || t.length > 80) return false;
  if (/^(?:\/terminal|\/term)\b/i.test(t)) return true;
  return (
    /^(?:打开|开启|显示|切换)\s*(?:集成)?终端$/i.test(t) ||
    /(?:打开|开启|显示|切换).*(?:终端|terminal|命令行)/i.test(t)
  );
}

export type TerminalServerMessage =
  | { type: "terminal:started"; cwd?: string; shell?: string; mode?: string; warning?: string }
  | { type: "terminal:output"; data: string }
  | { type: "terminal:exit"; exitCode?: number }
  | { type: "terminal:error"; error?: string };

export type WorkspaceTerminalSession = {
  sendInput: (data: string) => void;
  resize: (cols: number, rows: number) => void;
  restart: () => void;
  kill: () => void;
  close: () => void;
};

export function connectWorkspaceTerminal(handlers: {
  onMessage: (msg: TerminalServerMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
  onError?: (err: string) => void;
  cwd?: string;
  shell?: string;
  cols?: number;
  rows?: number;
}): WorkspaceTerminalSession {
  let ws: WebSocket | null = null;
  let open = false;
  const shell = handlers.shell;

  const send = (payload: Record<string, unknown>) => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(payload));
  };

  const start = () => {
    send({
      type: "terminal:start",
      cwd: handlers.cwd,
      shell,
      cols: handlers.cols ?? 80,
      rows: handlers.rows ?? 24,
    });
  };

  try {
    ws = new WebSocket(WS_URL);
  } catch (e) {
    handlers.onError?.(e instanceof Error ? e.message : String(e));
    return {
      sendInput: () => {},
      resize: () => {},
      restart: () => {},
      kill: () => {},
      close: () => {},
    };
  }

  ws.onopen = () => {
    open = true;
    handlers.onOpen?.();
    start();
  };

  ws.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as TerminalServerMessage;
      if (msg.type?.startsWith("terminal:")) handlers.onMessage(msg);
    } catch {
      /* ignore */
    }
  };

  ws.onerror = () => {
    handlers.onError?.("WebSocket 连接失败，请确认 Bridge 已启动（npm run web:dev:full）");
  };

  ws.onclose = () => {
    open = false;
    handlers.onClose?.();
  };

  return {
    sendInput: (data) => send({ type: "terminal:input", data }),
    resize: (cols, rows) => send({ type: "terminal:resize", cols, rows }),
    restart: () => {
      if (open) start();
    },
    kill: () => send({ type: "terminal:kill" }),
    close: () => {
      try {
        send({ type: "terminal:kill" });
        ws?.close();
      } catch {
        /* ignore */
      }
      ws = null;
    },
  };
}
