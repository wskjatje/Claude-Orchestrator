function sessionActivityMs(sess) {
  for (let i = sess.history.length - 1; i >= 0; i--) {
    const ts = sess.history[i]?.ts;
    if (typeof ts === "number") return ts;
  }
  const idMatch = /^s(\d{10,})$/.exec(sess.id);
  if (idMatch) return Number(idMatch[1]);
  return 0;
}
function sortSessionsByLatest(sessions) {
  return [...sessions].sort((a, b) => sessionActivityMs(b) - sessionActivityMs(a));
}
function workspaceSessionKey(path) {
  const p = typeof path === "string" ? path.trim().replace(/\/+$/, "") : "";
  return p || "";
}
function chatSessionsCacheMatchesWorkspace(cachedWorkspacePath, workspacePath, cachedSessions = []) {
  if (workspaceSessionKey(cachedWorkspacePath) === workspaceSessionKey(workspacePath)) {
    return true;
  }
  const key = workspaceSessionKey(workspacePath);
  if (!key || !cachedSessions.length) return false;
  return cachedSessions.some((s) => sessionMatchesWorkspaceTab(s, workspacePath));
}
function sessionMatchesWorkspaceTab(session, workspacePath) {
  const key = workspaceSessionKey(workspacePath);
  const sessionKey = workspaceSessionKey(session.workspacePath);
  if (!sessionKey) return false;
  return sessionKey === key;
}
function backfillSessionWorkspaceFromActiveMap(sessions, activeByWorkspace) {
  if (!activeByWorkspace) return sessions;
  const sessionToWorkspace = /* @__PURE__ */ new Map();
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
function filterSessionsForWorkspaceTabs(sessions, workspacePath) {
  return sessions.filter((s) => sessionMatchesWorkspaceTab(s, workspacePath));
}
function stampSessionWorkspaceIfMissing(session, workspacePath) {
  if (workspaceSessionKey(session.workspacePath)) return session;
  const key = workspaceSessionKey(workspacePath);
  if (!key) return session;
  return { ...session, workspacePath: key };
}
function pickActiveSessionId(sessions, activeByWorkspace, workspacePath, fallbackActiveId) {
  const key = workspaceSessionKey(workspacePath);
  const scoped = filterSessionsForWorkspaceTabs(sessions, workspacePath);
  const preferred = activeByWorkspace?.[key] ?? fallbackActiveId;
  if (preferred && scoped.some((s) => s.id === preferred)) return preferred;
  return scoped[0]?.id ?? "";
}
function pruneDuplicateEmptySessions(sessions, workspacePath, keepId) {
  const keepIsEmpty = sessions.some(
    (s) => s.id === keepId && sessionMatchesWorkspaceTab(s, workspacePath) && s.history.length === 0
  );
  return sessions.filter((s) => {
    if (!sessionMatchesWorkspaceTab(s, workspacePath)) return true;
    if (s.history.length > 0) return true;
    if (!keepIsEmpty) return false;
    return s.id === keepId;
  });
}
function pickActiveSessionIdOnResume(sessions, activeByWorkspace, workspacePath, fallbackActiveId, explicitEmptySessionId, cachedActiveId) {
  const scoped = filterSessionsForWorkspaceTabs(sessions, workspacePath);
  if (cachedActiveId && scoped.some((s) => s.id === cachedActiveId)) {
    return cachedActiveId;
  }
  const preferred = pickActiveSessionId(sessions, activeByWorkspace, workspacePath, fallbackActiveId);
  const prefSess = scoped.find((s) => s.id === preferred);
  if (prefSess && prefSess.history.length > 0) return preferred;
  if (prefSess && prefSess.history.length === 0 && prefSess.id === explicitEmptySessionId) {
    return preferred;
  }
  const withHistory = sortSessionsByLatest(scoped.filter((s) => s.history.length > 0));
  if (withHistory.length > 0) return withHistory[0].id;
  return preferred || scoped[0]?.id || "";
}
function resolveWorkspaceChatSessions(sessions, workspacePath, activeByWorkspace, createSession, options) {
  const wsKey = workspaceSessionKey(workspacePath);
  const resume = Boolean(options?.resume);
  const explicitEmptySessionId = options?.explicitEmptySessionId ?? null;
  const cachedActiveId = options?.cachedActiveId ?? null;
  const pickActive = (fallback) => resume ? pickActiveSessionIdOnResume(
    list,
    activeByWorkspace,
    workspacePath,
    activeByWorkspace[wsKey],
    explicitEmptySessionId,
    cachedActiveId
  ) : pickActiveSessionId(list, activeByWorkspace, workspacePath, activeByWorkspace[wsKey]);
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
    if (withHistory.length > 0 && activeSess && activeSess.history.length === 0 && activeId !== explicitEmptySessionId && !(cachedActiveId && cachedActiveId === activeId)) {
      activeId = withHistory[0].id;
    }
  }
  list = pruneDuplicateEmptySessions(list, workspacePath, activeId);
  const nextActiveByWorkspace = { ...activeByWorkspace, [wsKey]: activeId };
  return { sessions: list, activeId, activeByWorkspace: nextActiveByWorkspace };
}
function firstUserPreview(history) {
  const user = history.find((m) => m.role === "user" && m.content && m.content !== "__WAITING__");
  if (!user?.content) return "";
  const line = user.content.split("\n")[0]?.trim() ?? "";
  return line.length > 120 ? `${line.slice(0, 120)}…` : line;
}
function toChatHistoryListItem(sess) {
  return {
    id: sess.id,
    title: sess.title?.trim() || "新对话",
    workspacePath: sess.workspacePath ?? null,
    activityMs: sessionActivityMs(sess),
    preview: firstUserPreview(sess.history)
  };
}
function shortenWorkspaceLabel(abs) {
  const p = abs.trim();
  if (!p) return "（未关联项目）";
  const m = p.match(/^(\/Users\/[^/]+)(\/.*)?$/);
  if (m) return `~${m[2] ?? ""}` || "~";
  const w = p.match(/^(\/home\/[^/]+)(\/.*)?$/);
  if (w) return `~${w[2] ?? ""}` || "~";
  const parts = p.split(/[/\\]/).filter(Boolean);
  if (parts.length >= 2) return parts.slice(-2).join("/");
  return parts[parts.length - 1] || p;
}
function dateGroupLabel(ms, now = Date.now()) {
  const dayMs = 864e5;
  const startOfDay = (t) => {
    const d = new Date(t);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  };
  const todayStart = startOfDay(now);
  const dayStart = startOfDay(ms);
  const diffDays = Math.floor((todayStart - dayStart) / dayMs);
  if (diffDays <= 0) return "今天";
  if (diffDays === 1) return "昨天";
  if (diffDays <= 7) return "过去 7 天";
  if (diffDays <= 30) return "过去 30 天";
  return "更早";
}
function groupHistoryByDate(items) {
  const sorted = [...items].sort((a, b) => b.activityMs - a.activityMs);
  const map = /* @__PURE__ */ new Map();
  const order = ["今天", "昨天", "过去 7 天", "过去 30 天", "更早"];
  for (const item of sorted) {
    const label = dateGroupLabel(item.activityMs);
    const bucket = map.get(label) ?? [];
    bucket.push(item);
    map.set(label, bucket);
  }
  return order.filter((label) => map.has(label)).map((label) => ({ label, items: map.get(label) }));
}
function groupHistoryByWorkspace(items) {
  const sorted = [...items].sort((a, b) => b.activityMs - a.activityMs);
  const map = /* @__PURE__ */ new Map();
  for (const item of sorted) {
    const key = workspaceSessionKey(item.workspacePath);
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }
  return [...map.entries()].sort((a, b) => {
    const aMax = a[1][0]?.activityMs ?? 0;
    const bMax = b[1][0]?.activityMs ?? 0;
    return bMax - aMax;
  }).map(([workspaceKey, groupItems]) => ({
    workspaceKey,
    workspaceLabel: shortenWorkspaceLabel(workspaceKey),
    items: groupItems
  }));
}
function filterHistoryItems(items, query) {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const ws = shortenWorkspaceLabel(workspaceSessionKey(item.workspacePath)).toLowerCase();
    return item.title.toLowerCase().includes(q) || item.preview.toLowerCase().includes(q) || ws.includes(q);
  });
}
export {
  groupHistoryByWorkspace as a,
  backfillSessionWorkspaceFromActiveMap as b,
  pickActiveSessionId as c,
  chatSessionsCacheMatchesWorkspace as d,
  sortSessionsByLatest as e,
  filterHistoryItems as f,
  groupHistoryByDate as g,
  filterSessionsForWorkspaceTabs as h,
  sessionMatchesWorkspaceTab as i,
  stampSessionWorkspaceIfMissing as j,
  pruneDuplicateEmptySessions as p,
  resolveWorkspaceChatSessions as r,
  shortenWorkspaceLabel as s,
  toChatHistoryListItem as t,
  workspaceSessionKey as w
};
