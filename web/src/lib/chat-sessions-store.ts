/** 跨路由缓存聊天会话，避免切换侧栏菜单后回到聊天页时丢失内存态 */

export type CachedChatSession = {
  id: string;
  title: string;
  modelId: string;
  history: unknown[];
  workspacePath?: string | null;
  claudeSessionId?: string | null;
};

export type ChatSessionsCache = {
  sessions: CachedChatSession[];
  activeId: string;
  activeByWorkspace: Record<string, string>;
  workspacePath: string | null;
  composerDrafts: Record<
    string,
    {
      input: string;
      pendingImages: unknown[];
      pendingTerminalSnippets: unknown[];
    }
  >;
  /** 用户主动「新对话」创建的空会话 id，恢复时不自动跳回旧历史 */
  explicitEmptySessionId: string | null;
};

const STORAGE_KEY = "claudecode.chatSessionsCache.v1";

let cache: ChatSessionsCache | null = null;

function readStorageCache(): ChatSessionsCache | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ChatSessionsCache;
  } catch {
    return null;
  }
}

function writeStorageCache(next: ChatSessionsCache | null): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    if (!next) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
}

export function getChatSessionsCache(): ChatSessionsCache | null {
  if (cache) return cache;
  const stored = readStorageCache();
  if (stored) cache = stored;
  return cache;
}

export function setChatSessionsCache(next: ChatSessionsCache): void {
  cache = next;
  writeStorageCache(next);
}

export function markExplicitEmptyChatSession(sessionId: string): void {
  const base = cache ?? readStorageCache();
  if (!base) {
    cache = {
      sessions: [],
      activeId: sessionId,
      activeByWorkspace: {},
      workspacePath: null,
      composerDrafts: {},
      explicitEmptySessionId: sessionId,
    };
    writeStorageCache(cache);
    return;
  }
  setChatSessionsCache({ ...base, explicitEmptySessionId: sessionId });
}

export function clearExplicitEmptyChatSessionIf(sessionId: string): void {
  if (cache?.explicitEmptySessionId === sessionId) {
    setChatSessionsCache({ ...cache, explicitEmptySessionId: null });
  }
}

export function clearExplicitEmptyChatSession(): void {
  if (cache?.explicitEmptySessionId) {
    setChatSessionsCache({ ...cache, explicitEmptySessionId: null });
  }
}

/** 更新缓存中的活动空会话标记（resolve / 新对话选中空 tab 时） */
export function syncExplicitEmptyInCache(sessionId: string | null): void {
  if (!cache) return;
  setChatSessionsCache({ ...cache, explicitEmptySessionId: sessionId });
}
