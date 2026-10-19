import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";
import type { DomElementPayload } from "@/lib/dom-element-meta";

type ComposerHandlers = {
  insertTerminalSelection: (payload: TerminalSelectionPayload) => void;
  insertDomElement?: (payload: DomElementPayload) => void;
  openChatPanel?: () => void;
  /** 预填 Composer 正文并聚焦（用选区提问 / 用 Agent 修） */
  prefillComposer?: (text: string) => void;
};

type WorkbenchComposerBridgeValue = {
  registerComposerHandlers: (handlers: ComposerHandlers) => () => void;
  addTerminalSelectionToChat: (payload: TerminalSelectionPayload) => void;
  addDomElementToChat: (payload: DomElementPayload) => void;
  prefillComposer: (text: string) => void;
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

  const addDomElementToChat = useCallback((payload: DomElementPayload) => {
    if (!payload.selector) return;
    handlersRef.current?.openChatPanel?.();
    handlersRef.current?.insertDomElement?.(payload);
  }, []);

  const prefillComposer = useCallback((text: string) => {
    const t = String(text || "").trim();
    if (!t) return;
    handlersRef.current?.openChatPanel?.();
    handlersRef.current?.prefillComposer?.(t);
  }, []);

  const value = useMemo(
    () => ({
      registerComposerHandlers,
      addTerminalSelectionToChat,
      addDomElementToChat,
      prefillComposer,
    }),
    [
      registerComposerHandlers,
      addTerminalSelectionToChat,
      addDomElementToChat,
      prefillComposer,
    ],
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
