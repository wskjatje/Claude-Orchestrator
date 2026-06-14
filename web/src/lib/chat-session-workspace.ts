export type WorkspaceScopedSession = {
  id: string;
  workspacePath?: string | null;
};

/** Stable key for grouping chat sessions by opened folder. */
export function workspaceSessionKey(path: string | null | undefined): string {
  const p = typeof path === "string" ? path.trim() : "";
  return p || "";
}

export function sessionBelongsToWorkspace(
  session: WorkspaceScopedSession,
  workspacePath: string | null | undefined,
): boolean {
  const key = workspaceSessionKey(workspacePath);
  const sessionKey = workspaceSessionKey(session.workspacePath);
  return sessionKey === key;
}

/** 顶栏 tab：已绑定工作区的会话严格匹配；未绑定的 legacy 会话仅出现在当前打开的项目下 */
export function sessionMatchesWorkspaceTab(
  session: WorkspaceScopedSession,
  workspacePath: string | null | undefined,
): boolean {
  const key = workspaceSessionKey(workspacePath);
  const sessionKey = workspaceSessionKey(session.workspacePath);
  if (sessionKey) return sessionKey === key;
  return Boolean(key);
}

export function filterSessionsForWorkspace<T extends WorkspaceScopedSession>(
  sessions: T[],
  workspacePath: string | null | undefined,
): T[] {
  return sessions.filter((s) => sessionBelongsToWorkspace(s, workspacePath));
}

export function filterSessionsForWorkspaceTabs<T extends WorkspaceScopedSession>(
  sessions: T[],
  workspacePath: string | null | undefined,
): T[] {
  return sessions.filter((s) => sessionMatchesWorkspaceTab(s, workspacePath));
}

export function stampSessionWorkspaceIfMissing<T extends WorkspaceScopedSession>(
  session: T,
  workspacePath: string | null | undefined,
): T {
  if (workspaceSessionKey(session.workspacePath)) return session;
  const key = workspaceSessionKey(workspacePath);
  if (!key) return session;
  return { ...session, workspacePath: key };
}

export function pickActiveSessionId(
  sessions: WorkspaceScopedSession[],
  activeByWorkspace: Record<string, string> | undefined,
  workspacePath: string | null | undefined,
  fallbackActiveId?: string,
): string {
  const key = workspaceSessionKey(workspacePath);
  const scoped = filterSessionsForWorkspaceTabs(sessions, workspacePath);
  const preferred = activeByWorkspace?.[key] ?? fallbackActiveId;
  if (preferred && scoped.some((s) => s.id === preferred)) return preferred;
  return scoped[0]?.id ?? "";
}

/** @deprecated 仅在内存中改写 legacy 会话归属，会污染跨项目历史；请改用 stampSessionWorkspaceIfMissing */
export function assignLegacySessionsToWorkspace<T extends WorkspaceScopedSession>(
  sessions: T[],
  workspacePath: string | null | undefined,
): T[] {
  const key = workspaceSessionKey(workspacePath);
  if (!key) return sessions;
  return sessions.map((s) =>
    s.workspacePath == null || s.workspacePath === "" ? { ...s, workspacePath: key } : s,
  );
}

type SessionWithHistory = WorkspaceScopedSession & {
  history: unknown[];
  title?: string;
  modelId?: string;
};

/** 当前工作区内可复用的空会话（无历史、未在发送中） */
export function findReusableEmptySession<T extends SessionWithHistory>(
  sessions: T[],
  workspacePath: string | null | undefined,
  sendingById: Record<string, boolean> = {},
): T | undefined {
  return filterSessionsForWorkspaceTabs(sessions, workspacePath).find(
    (s) => s.history.length === 0 && !sendingById[s.id],
  );
}

/** 同一工作区只保留一个空会话（保留 keepId；有历史的会话全部保留） */
export function pruneDuplicateEmptySessions<T extends SessionWithHistory>(
  sessions: T[],
  workspacePath: string | null | undefined,
  keepId: string,
): T[] {
  let keptEmpty = false;
  return sessions.filter((s) => {
    if (!sessionMatchesWorkspaceTab(s, workspacePath)) return true;
    if (s.history.length > 0) return true;
    if (s.id === keepId) {
      keptEmpty = true;
      return true;
    }
    if (!keptEmpty) {
      keptEmpty = true;
      return true;
    }
    return false;
  });
}

export function resolveWorkspaceChatSessions<T extends SessionWithHistory>(
  sessions: T[],
  workspacePath: string | null | undefined,
  activeByWorkspace: Record<string, string>,
  createSession: () => T,
): { sessions: T[]; activeId: string; activeByWorkspace: Record<string, string> } {
  const wsKey = workspaceSessionKey(workspacePath);
  let list = sessions;
  let scoped = filterSessionsForWorkspaceTabs(list, workspacePath);
  let activeId = pickActiveSessionId(list, activeByWorkspace, workspacePath);

  if (!scoped.length) {
    const ns = createSession();
    list = [...list, ns];
    activeId = ns.id;
    scoped = [ns];
  } else if (!scoped.some((s) => s.id === activeId)) {
    activeId = pickActiveSessionId(list, activeByWorkspace, workspacePath);
  }

  list = pruneDuplicateEmptySessions(list, workspacePath, activeId);
  const nextActiveByWorkspace = { ...activeByWorkspace, [wsKey]: activeId };
  return { sessions: list, activeId, activeByWorkspace: nextActiveByWorkspace };
}
