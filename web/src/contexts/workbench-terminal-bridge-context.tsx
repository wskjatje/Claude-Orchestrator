import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

type TerminalHandlers = {
  /** 向当前活动终端发送一行命令（需 Shell 已 ready） */
  runInActive: (command: string) => boolean;
  /** 确保至少有一个终端会话 */
  ensureSession: () => void;
  /** 当前活动终端是否可接收命令 */
  isActiveReady: () => boolean;
  /** 切换到底部面板的终端 Tab */
  focusTerminalTab?: () => void;
};

type WorkbenchTerminalBridgeValue = {
  registerTerminalHandlers: (handlers: TerminalHandlers) => () => void;
  runInActiveTerminal: (command: string) => boolean;
  ensureTerminalSession: () => void;
  isTerminalReady: () => boolean;
  focusTerminalTab: () => void;
};

const WorkbenchTerminalBridgeContext = createContext<WorkbenchTerminalBridgeValue | null>(null);

export function WorkbenchTerminalBridgeProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<TerminalHandlers | null>(null);

  const registerTerminalHandlers = useCallback((handlers: TerminalHandlers) => {
    handlersRef.current = handlers;
    return () => {
      if (handlersRef.current === handlers) handlersRef.current = null;
    };
  }, []);

  const runInActiveTerminal = useCallback((command: string) => {
    const cmd = command.trim();
    if (!cmd) return false;
    return handlersRef.current?.runInActive(cmd) ?? false;
  }, []);

  const ensureTerminalSession = useCallback(() => {
    handlersRef.current?.ensureSession();
  }, []);

  const isTerminalReady = useCallback(() => handlersRef.current?.isActiveReady() ?? false, []);

  const focusTerminalTab = useCallback(() => {
    handlersRef.current?.focusTerminalTab?.();
  }, []);

  const value = useMemo(
    () => ({
      registerTerminalHandlers,
      runInActiveTerminal,
      ensureTerminalSession,
      isTerminalReady,
      focusTerminalTab,
    }),
    [registerTerminalHandlers, runInActiveTerminal, ensureTerminalSession, isTerminalReady, focusTerminalTab],
  );

  return (
    <WorkbenchTerminalBridgeContext.Provider value={value}>
      {children}
    </WorkbenchTerminalBridgeContext.Provider>
  );
}

export function useWorkbenchTerminalBridge() {
  const ctx = useContext(WorkbenchTerminalBridgeContext);
  if (!ctx) {
    throw new Error("useWorkbenchTerminalBridge must be used within WorkbenchTerminalBridgeProvider");
  }
  return ctx;
}

export function useWorkbenchTerminalBridgeOptional() {
  return useContext(WorkbenchTerminalBridgeContext);
}

/** 等待终端就绪后发送命令（类 Cursor：聊天触发 → 底部终端执行） */
export async function runCommandInWorkbenchTerminal(
  bridge: Pick<
    WorkbenchTerminalBridgeValue,
    "runInActiveTerminal" | "ensureTerminalSession" | "isTerminalReady"
  >,
  command: string,
  opts?: { maxWaitMs?: number; pollMs?: number },
): Promise<boolean> {
  const cmd = command.trim();
  if (!cmd) return false;
  bridge.ensureTerminalSession();
  const maxWait = opts?.maxWaitMs ?? 10_000;
  const poll = opts?.pollMs ?? 180;
  const deadline = Date.now() + maxWait;
  while (Date.now() < deadline) {
    if (bridge.runInActiveTerminal(cmd)) return true;
    await new Promise((r) => window.setTimeout(r, poll));
  }
  return false;
}
