import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getDefaultTerminalShell,
  resolveShellPath,
  shellDisplayLabel,
} from "@/lib/terminal-shell-profiles";
import { registerWorkbenchTerminalRunHandlers } from "@/lib/workbench-terminal-run-bridge";
import { TerminalSessionRail } from "@/components/terminal-session-rail";
import {
  WorkspaceTerminal,
  type WorkspaceTerminalHandle,
  type WorkspaceTerminalMeta,
} from "@/components/workspace-terminal";

export type TerminalSession = {
  id: string;
  label: string;
  shell: string;
};

export type TerminalSessionsHeaderState = {
  sessions: TerminalSession[];
  activeId: string;
  selectSession: (id: string) => void;
  closeSession: (id: string) => void;
  addSession: (shell?: string) => void;
  splitActive: () => void;
  killActive: () => void;
  restartActive: () => void;
  closeActive: () => void;
};

function newSessionId() {
  return `term-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createSession(shell = resolveShellPath(getDefaultTerminalShell()) ?? "/bin/zsh"): TerminalSession {
  return {
    id: newSessionId(),
    label: shellDisplayLabel(shell),
    shell,
  };
}

export function TerminalSessionsView({
  panelActive,
  onActiveMetaChange,
  onRegisterActions,
  onRegisterHeader,
}: {
  panelActive: boolean;
  onActiveMetaChange: (meta: WorkspaceTerminalMeta) => void;
  onRegisterActions: (actions: {
    addSession: (shell?: string) => void;
    restartActive: () => void;
    killActive: () => void;
    closeActive: () => void;
    splitActive: () => void;
    refitActive: () => void;
  }) => void;
  onRegisterHeader: (state: TerminalSessionsHeaderState | null) => void;
}) {
  const initial = useRef(createSession()).current;
  const [sessions, setSessions] = useState<TerminalSession[]>([initial]);
  const [activeId, setActiveId] = useState<string>(initial.id);
  const [splitPeerId, setSplitPeerId] = useState<string | null>(null);
  const [focusedPaneId, setFocusedPaneId] = useState<string>(initial.id);
  const refs = useRef(new Map<string, WorkspaceTerminalHandle | null>());

  const setRef = useCallback(
    (id: string) => (handle: WorkspaceTerminalHandle | null) => {
      if (handle) refs.current.set(id, handle);
      else refs.current.delete(id);
    },
    [],
  );

  const handleFor = (id: string) => refs.current.get(id) ?? null;
  const focusedHandle = () => handleFor(focusedPaneId) ?? handleFor(activeId);

  const addSession = useCallback((shell?: string) => {
    const path =
      resolveShellPath(shell) ??
      resolveShellPath(getDefaultTerminalShell()) ??
      "/bin/zsh";
    const session = createSession(path);
    setSessions((prev) => [...prev, session]);
    setActiveId(session.id);
    setFocusedPaneId(session.id);
    setSplitPeerId(null);
  }, []);

  const splitActive = useCallback(() => {
    const current = sessions.find((s) => s.id === activeId);
    if (!current) return;
    if (splitPeerId) {
      addSession(current.shell);
      return;
    }
    const peer = createSession(current.shell);
    setSessions((prev) => [...prev, peer]);
    setSplitPeerId(peer.id);
    setFocusedPaneId(peer.id);
  }, [activeId, addSession, sessions, splitPeerId]);

  const splitSession = useCallback(
    (id: string) => {
      const current = sessions.find((s) => s.id === id);
      if (!current) return;
      setActiveId(id);
      setFocusedPaneId(id);
      if (splitPeerId) {
        addSession(current.shell);
        return;
      }
      const peer = createSession(current.shell);
      setSessions((prev) => [...prev, peer]);
      setSplitPeerId(peer.id);
      setFocusedPaneId(peer.id);
    },
    [addSession, sessions, splitPeerId],
  );

  const restartActive = useCallback(() => {
    focusedHandle()?.restart();
  }, [focusedPaneId, activeId]);

  const killActive = useCallback(() => {
    focusedHandle()?.kill();
  }, [focusedPaneId, activeId]);

  const closeSession = useCallback(
    (id: string) => {
      handleFor(id)?.dispose();

      if (splitPeerId === id) setSplitPeerId(null);
      else if (splitPeerId === activeId && id === activeId) setSplitPeerId(null);

      setSessions((prev) => {
        const next = prev.filter((s) => s.id !== id);
        if (!next.length) {
          const fresh = createSession();
          setActiveId(fresh.id);
          setFocusedPaneId(fresh.id);
          setSplitPeerId(null);
          return [fresh];
        }
        if (id === activeId) {
          const idx = prev.findIndex((s) => s.id === id);
          const fallback = next[Math.max(0, idx - 1)] ?? next[0];
          setActiveId(fallback.id);
          setFocusedPaneId(fallback.id);
        } else if (id === focusedPaneId) {
          setFocusedPaneId(activeId);
        }
        return next;
      });
      refs.current.delete(id);
    },
    [activeId, focusedPaneId, splitPeerId],
  );

  const closeActive = useCallback(() => {
    closeSession(focusedPaneId);
  }, [closeSession, focusedPaneId]);

  const refitVisible = useCallback(() => {
    const ids = splitPeerId ? [activeId, splitPeerId] : [activeId];
    for (const id of ids) {
      refs.current.get(id)?.focus();
    }
  }, [activeId, splitPeerId]);

  const selectSession = useCallback((id: string) => {
    setActiveId(id);
    setFocusedPaneId(id);
    setSplitPeerId(null);
  }, []);

  useEffect(() => {
    onRegisterActions({
      addSession,
      restartActive,
      killActive,
      closeActive,
      splitActive,
      refitActive: refitVisible,
    });
  }, [addSession, restartActive, killActive, closeActive, splitActive, refitVisible, onRegisterActions]);

  useEffect(() => {
    onRegisterHeader({
      sessions,
      activeId,
      selectSession,
      closeSession,
      addSession,
      splitActive,
      killActive,
      restartActive,
      closeActive,
    });
    return () => onRegisterHeader(null);
  }, [
    sessions,
    activeId,
    selectSession,
    closeSession,
    addSession,
    splitActive,
    killActive,
    restartActive,
    closeActive,
    onRegisterHeader,
  ]);

  useEffect(() => {
    registerWorkbenchTerminalRunHandlers({
      runInActive: (command) => focusedHandle()?.runCommand(command) ?? false,
      ensureSession: () => {
        if (!sessions.length) addSession();
      },
      isActiveReady: () => focusedHandle()?.isReady() ?? false,
    });
    return () => registerWorkbenchTerminalRunHandlers(null);
  }, [addSession, sessions.length, activeId, focusedPaneId]);

  useEffect(() => {
    if (!panelActive || !focusedPaneId) return;
    const t = window.setTimeout(() => handleFor(focusedPaneId)?.focus(), 60);
    return () => window.clearTimeout(t);
  }, [panelActive, focusedPaneId, sessions.length, splitPeerId]);

  const onSessionMeta = useCallback(
    (sessionId: string, meta: WorkspaceTerminalMeta) => {
      setSessions((prev) => {
        const target = prev.find((s) => s.id === sessionId);
        const nextLabel = meta.shellLabel || target?.label || "";
        if (!target || target.label === nextLabel) return prev;
        return prev.map((s) => (s.id === sessionId ? { ...s, label: nextLabel } : s));
      });
      if (sessionId === activeId || sessionId === focusedPaneId) {
        onActiveMetaChange(meta);
      }
    },
    [activeId, focusedPaneId, onActiveMetaChange],
  );

  const paneIds = splitPeerId ? [activeId, splitPeerId] : [activeId];
  const hiddenIds = sessions.map((s) => s.id).filter((id) => !paneIds.includes(id));
  const showRail = sessions.length > 1 && !splitPeerId;

  const renderTerminal = (sessionId: string, visible: boolean, focused: boolean) => {
    const session = sessions.find((s) => s.id === sessionId);
    if (!session) return null;
    return (
      <WorkspaceTerminal
        key={session.id}
        ref={setRef(session.id)}
        active={panelActive}
        keepAlive
        visible={visible}
        focused={focused}
        shell={session.shell}
        variant="panel"
        hideChrome
        onMetaChange={(meta) => onSessionMeta(session.id, meta)}
      />
    );
  };

  const terminalBody = (
    <>
      {splitPeerId ? (
        <div className="flex h-full min-h-0 w-full">
          {paneIds.map((id, index) => (
            <Fragment key={id}>
              {index > 0 ? <div className="terminal-split-divider" aria-hidden /> : null}
              <div
                className={cn(
                  "terminal-pane relative min-h-0 min-w-0 flex-1 overflow-hidden",
                  focusedPaneId === id && "terminal-pane--focused",
                )}
                onMouseDown={() => setFocusedPaneId(id)}
              >
                {renderTerminal(id, true, focusedPaneId === id)}
              </div>
            </Fragment>
          ))}
        </div>
      ) : (
        <div className="absolute inset-0">{renderTerminal(activeId, true, true)}</div>
      )}

      {hiddenIds.map((id) => (
        <div key={id} className="hidden" aria-hidden>
          {renderTerminal(id, false, false)}
        </div>
      ))}
    </>
  );

  return (
    <div className="flex h-full min-h-0 w-full overflow-hidden bg-[var(--terminal-bg)]">
      <div className="relative min-h-0 min-w-0 flex-1 overflow-hidden">{terminalBody}</div>
      {showRail ? (
        <TerminalSessionRail
          sessions={sessions}
          activeId={activeId}
          onSelect={selectSession}
          onClose={closeSession}
          onSplit={splitSession}
        />
      ) : null}
    </div>
  );
}

export {
  getDefaultTerminalShell,
  setDefaultTerminalShell,
  TERMINAL_SHELL_PROFILES,
  type TerminalShellId,
} from "@/lib/terminal-shell-profiles";
