import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";

type ComposerHandlers = {
  insertTerminalSelection: (payload: TerminalSelectionPayload) => void;
  openChatPanel?: () => void;
};

type WorkbenchComposerBridgeValue = {
  registerComposerHandlers: (handlers: ComposerHandlers) => () => void;
  addTerminalSelectionToChat: (payload: TerminalSelectionPayload) => void;
};

const WorkbenchComposerBridgeContext = createContext<WorkbenchComposerBridgeValue | null>(null);

export function WorkbenchComposerBridgeProvider({ children }: { children: ReactNode }) {
  const handlersRef = useRef<ComposerHandlers | null>(null);

  const registerComposerHandlers = useCallback((handlers: ComposerHandlers) => {
    handlersRef.current = handlers;
    return () => {
      if (handlersRef.current === handlers) handlersRef.current = null;
    };
  }, []);

  const addTerminalSelectionToChat = useCallback((payload: TerminalSelectionPayload) => {
    const trimmed = payload.text.trim();
    if (!trimmed) return;
    handlersRef.current?.openChatPanel?.();
    handlersRef.current?.insertTerminalSelection({ ...payload, text: trimmed });
  }, []);

  const value = useMemo(
    () => ({ registerComposerHandlers, addTerminalSelectionToChat }),
    [registerComposerHandlers, addTerminalSelectionToChat],
  );

  return (
    <WorkbenchComposerBridgeContext.Provider value={value}>
      {children}
    </WorkbenchComposerBridgeContext.Provider>
  );
}

export function useWorkbenchComposerBridge() {
  const ctx = useContext(WorkbenchComposerBridgeContext);
  if (!ctx) {
    throw new Error(
      "useWorkbenchComposerBridge must be used within WorkbenchComposerBridgeProvider",
    );
  }
  return ctx;
}

export function useWorkbenchComposerBridgeOptional() {
  return useContext(WorkbenchComposerBridgeContext);
}
