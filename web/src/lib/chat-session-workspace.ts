import { sortSessionsByLatest } from "@/lib/chat-session-activity";

export type WorkspaceScopedSession = {
  id: string;
  workspacePath?: string | null;
};

/** Stable key for grouping chat sessions by opened folder. */
export function workspaceSessionKey(path: string | null | undefined): string {
  const p = typeof path === "string" ? path.trim().replace(/\/+$/, "") : "";
  return p || "";
}

/** sessionStorage 缓存是否可用于当前工作区（路径一致，或缓存内已有本会话） */
export function chatSessionsCacheMatchesWorkspace(
  cachedWorkspacePath: string | null | undefined,
  workspacePath: string | null | undefined,
  cachedSessions: WorkspaceScopedSession[] = [],
): boolean {
  if (workspaceSessionKey(cachedWorkspacePath) === workspaceSessionKey(workspacePath)) {
    return true;
  }
  const key = workspaceSessionKey(workspacePath);
  if (!key || !cachedSessions.length) return false;
  return cachedSessions.some((s) => sessionMatchesWorkspaceTab(s, workspacePath));
}

export function sessionBelongsToWorkspace(
  session: WorkspaceScopedSession,
  workspacePath: string | null | undefined,
): boolean {
  const key = workspaceSessionKey(workspacePath);
  const sessionKey = workspaceSessionKey(session.workspacePath);
  return sessionKey === key;
}

/** 顶栏 tab：仅展示已绑定且与当前工作区一致的会话（未绑定 legacy 会话不出现在项目 tab 中） */
export function sessionMatchesWorkspaceTab(
  session: WorkspaceScopedSession,
  workspacePath: string | null | undefined,
): boolean {
  const key = workspaceSessionKey(workspacePath);
  const sessionKey = workspaceSessionKey(session.workspacePath);
  if (!sessionKey) return false;
  return sessionKey === key;
}

/** 用 activeByWorkspace 反查 legacy 会话所属工作区（加载磁盘数据时一次性回填） */
export function backfillSessionWorkspaceFromActiveMap<T extends WorkspaceScopedSession>(
  sessions: T[],
  activeByWorkspace: Record<string, string> | undefined,
): T[] {
  if (!activeByWorkspace) return sessions;
  const sessionToWorkspace = new Map<string, string>();
  for (const [wsKey, sessionId] of Object.entries(activeByWorkspace)) {
    if (!wsKey || !sessionId) continue;
    if (!sessionToWorkspace.has(sessionId)) sessionToWorkspace.set(sessionId, wsKey);
  }
  let changed = false;
  const next = sessions.map((s) => {
    if (workspaceSessionKey(s.workspacePath)) return s;
    const ws = sessionToWorkspace.get(s.id);
    if (!ws) return s;
    changed = true;
    return { ...s, workspacePath: ws };
  });
  return changed ? next : sessions;
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
  const keepIsEmpty = sessions.some(
    (s) =>
      s.id === keepId &&
      sessionMatchesWorkspaceTab(s, workspacePath) &&
      s.history.length === 0,
  );
  return sessions.filter((s) => {
    if (!sessionMatchesWorkspaceTab(s, workspacePath)) return true;
    if (s.history.length > 0) return true;
    /** 活动 tab 已有对话 → 移除工作区内全部空 tab */
    if (!keepIsEmpty) return false;
    /** 仅保留 keepId 对应的空 tab */
    return s.id === keepId;
  });
}

/**
 * 回到聊天页时恢复活动会话：优先 activeByWorkspace；
 * 若当前指向空会话且存在有历史的会话，则恢复最近一条（除非用户刚主动点了「新对话」）。
 */
export function pickActiveSessionIdOnResume(
  sessions: SessionWithHistory[],
  activeByWorkspace: Record<string, string> | undefined,
  workspacePath: string | null | undefined,
  fallbackActiveId?: string,
  explicitEmptySessionId?: string | null,
  cachedActiveId?: string | null,
): string {
  const scoped = filterSessionsForWorkspaceTabs(sessions, workspacePath);

  /** 跨路由返回：优先恢复离开聊天页时的活动 tab（含未发送的新空会话） */
  if (cachedActiveId && scoped.some((s) => s.id === cachedActiveId)) {
    return cachedActiveId;
  }

  const preferred = pickActiveSessionId(sessions, activeByWorkspace, workspacePath, fallbackActiveId);
  const prefSess = scoped.find((s) => s.id === preferred);
  if (prefSess && prefSess.history.length > 0) return preferred;
  if (prefSess && prefSess.history.length === 0 && prefSess.id === explicitEmptySessionId) {
    return preferred;
  }
  /** activeByWorkspace 指向空 tab，但存在有历史的会话 → 回到最近工作会话（避免发送后/remount 落到「新对话」） */
  const withHistory = sortSessionsByLatest(scoped.filter((s) => s.history.length > 0));
  if (withHistory.length > 0) return withHistory[0]!.id;
  return preferred || scoped[0]?.id || "";
}

export type ResolveWorkspaceChatSessionsOptions = {
  /** 恢复聊天页时为 true（含 HMR 后从 sessionStorage 恢复） */
  resume?: boolean;
  explicitEmptySessionId?: string | null;
  cachedActiveId?: string | null;
};

export function resolveWorkspaceChatSessions<T extends SessionWithHistory>(
  sessions: T[],
  workspacePath: string | null | undefined,
  activeByWorkspace: Record<string, string>,
  createSession: () => T,
  options?: ResolveWorkspaceChatSessionsOptions | null,
): { sessions: T[]; activeId: string; activeByWorkspace: Record<string, string> } {
  const wsKey = workspaceSessionKey(workspacePath);
  const resume = Boolean(options?.resume);
  const explicitEmptySessionId = options?.explicitEmptySessionId ?? null;
  const cachedActiveId = options?.cachedActiveId ?? null;
  const pickActive = (fallback?: string) =>
    resume
      ? pickActiveSessionIdOnResume(
          list,
          activeByWorkspace,
          workspacePath,
          fallback ?? activeByWorkspace[wsKey],
          explicitEmptySessionId,
          cachedActiveId,
        )
      : pickActiveSessionId(list, activeByWorkspace, workspacePath, fallback ?? activeByWorkspace[wsKey]);

  let list = sessions;
  let scoped = filterSessionsForWorkspaceTabs(list, workspacePath);
  let activeId = pickActive();

  if (!scoped.length) {
    const ns = createSession();
    list = [...list, ns];
    activeId = ns.id;
    scoped = [ns];
  } else if (!scoped.some((s) => s.id === activeId)) {
    activeId = pickActive();
  }

  if (resume) {
    const withHistory = sortSessionsByLatest(scoped.filter((s) => s.history.length > 0));
    const activeSess = scoped.find((s) => s.id === activeId);
    if (
      withHistory.length > 0 &&
      activeSess &&
      activeSess.history.length === 0 &&
      activeId !== explicitEmptySessionId &&
      !(cachedActiveId && cachedActiveId === activeId)
    ) {
      activeId = withHistory[0]!.id;
    }
  }

  list = pruneDuplicateEmptySessions(list, workspacePath, activeId);
  const nextActiveByWorkspace = { ...activeByWorkspace, [wsKey]: activeId };
  return { sessions: list, activeId, activeByWorkspace: nextActiveByWorkspace };
}
