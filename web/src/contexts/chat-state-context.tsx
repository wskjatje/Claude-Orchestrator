import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode, type MutableRefObject } from "react";

// ---- Types (shared between ChatPage and GlobalChatPanel) ----

export type DiskMsg = {
  role: "user" | "assistant";
  content: string;
  ts?: number;
  name?: string;
  attachments?: unknown[];
  terminalSnippets?: unknown[];
  agentStem?: string;
  agentLabel?: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number; costUsd?: number };
  latencyMs?: number;
  requestError?: boolean;
  billingSource?: "cloud" | "local";
  modelId?: string;
};

export type ChatSession = {
  id: string;
  title: string;
  modelId: string;
  history: DiskMsg[];
  workspacePath?: string | null;
  claudeSessionId?: string | null;
};

export type Msg = {
  role: "user" | "assistant";
  content: string;
  ts?: number;
  name?: string;
};

// ---- Context ----

export type ChatStateValue = {
  sessions: ChatSession[];
  activeId: string;
  messages: Msg[];
  sendingSessions: Record<string, boolean>;
  globalModel: string;
  activeStreamRequestId: string | null;
  sending: boolean;
  chainRunning: boolean;
  /** true 时 ChatPage 正在挂载中，由其自己处理流 */
  isChatPageMounted: boolean;
  /** 显式创建的空会话 ID，跨路由切换保留，防止被 prune / resume 误移除 */
  explicitEmptySessionId: string | null;
  /** 已打开的聊天标签页 ID 列表，跨路由切换保留 */
  openTabIds: string[];

  // Refs for async callbacks (shared across components)
  sessionsRef: MutableRefObject<ChatSession[]>;
  activeIdRef: MutableRefObject<string>;
  messagesRef: MutableRefObject<Msg[]>;
  sendingSessionsRef: MutableRefObject<Record<string, boolean>>;
  activeRequestIdsRef: MutableRefObject<Map<string, string>>;
  streamContextRef: MutableRefObject<{ sessionId: string; requestId: string } | null>;
  /** 按会话累积的消息池，GlobalChatPanel 将流式 delta 按真实 sessionId 写入此池，
   *  切换对话时不会被清空，确保返回正在流的会话时仍能看到累积内容。 */
  perSessionMessages: Record<string, Msg[]>;
  perSessionMessagesRef: MutableRefObject<Record<string, Msg[]>>;

  // Sync setters — called by ChatPage to push state into context
  syncSessions: (s: ChatSession[]) => void;
  syncActiveId: (id: string) => void;
  syncMessages: (m: Msg[]) => void;
  syncSessionMessages: (sessionId: string, msgs: Msg[]) => void;
  syncSendingSessions: (s: Record<string, boolean>) => void;
  syncGlobalModel: (m: string) => void;
  syncActiveStreamRequestId: (id: string | null) => void;
  syncSending: (v: boolean) => void;
  syncChainRunning: (v: boolean) => void;
  /** ChatPage 组件是否挂载中；GlobalChatPanel 借此判断是否自己接管流 */
  syncChatPageMounted: (v: boolean) => void;
  /** 显式创建的空会话 ID，跨路由切换保留 */
  syncExplicitEmptySessionId: (id: string | null) => void;
  /** 已打开的聊天标签页 ID 列表，跨路由切换保留 */
  syncOpenTabIds: (ids: string[]) => void;
};

const ChatStateContext = createContext<ChatStateValue | null>(null);

export function useChatState(): ChatStateValue {
  const ctx = useContext(ChatStateContext);
  if (!ctx) throw new Error("useChatState must be used within ChatStateProvider");
  return ctx;
}

export function ChatStateProvider({ children }: { children: ReactNode }) {
  // ---- State that persists across route changes ----
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeId, setActiveId] = useState("s0");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [sendingSessions, setSendingSessions] = useState<Record<string, boolean>>({});
  const [globalModel, setGlobalModel] = useState("");
  const [activeStreamRequestId, setActiveStreamRequestId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [chainRunning, setChainRunning] = useState(false);
  const [isChatPageMounted, setIsChatPageMounted] = useState(false);
  const [explicitEmptySessionId, setExplicitEmptySessionId] = useState<string | null>(null);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);

  // Refs used by async callbacks (maps, refs)
  const activeIdRef = useRef(activeId);
  const sessionsRef = useRef<ChatSession[]>([]);
  const messagesRef = useRef<Msg[]>([]);
  const sendingSessionsRef = useRef<Record<string, boolean>>({});
  const activeRequestIdsRef = useRef<Map<string, string>>(new Map());
  const streamContextRef = useRef<{ sessionId: string; requestId: string } | null>(null);
  const [perSessionMessages, setPerSessionMessages] = useState<Record<string, Msg[]>>({});
  const perSessionMessagesRef = useRef<Record<string, Msg[]>>({});
  // Keep ref in sync with state
  useEffect(() => { perSessionMessagesRef.current = perSessionMessages; }, [perSessionMessages]);

  // Keep refs in sync with state
  useEffect(() => { activeIdRef.current = activeId; }, [activeId]);
  useEffect(() => { sessionsRef.current = sessions; }, [sessions]);
  useEffect(() => { messagesRef.current = messages; }, [messages]);
  useEffect(() => { sendingSessionsRef.current = sendingSessions; }, [sendingSessions]);

  const syncSessionMessages = useCallback((sessionId: string, msgs: Msg[]) => {
    setPerSessionMessages((prev) => {
      const next = { ...prev, [sessionId]: msgs };
      perSessionMessagesRef.current = next;
      return next;
    });
  }, []);

  const value: ChatStateValue = {
    sessions, activeId, messages, sendingSessions,
    globalModel, activeStreamRequestId, sending, chainRunning,
    isChatPageMounted,
    explicitEmptySessionId,
    openTabIds,
    sessionsRef, activeIdRef, messagesRef, sendingSessionsRef,
    activeRequestIdsRef, streamContextRef,
    perSessionMessages, perSessionMessagesRef,
    syncSessions: setSessions,
    syncActiveId: setActiveId,
    syncMessages: setMessages,
    syncSessionMessages,
    syncSendingSessions: setSendingSessions,
    syncGlobalModel: setGlobalModel,
    syncActiveStreamRequestId: setActiveStreamRequestId,
    syncSending: setSending,
    syncChainRunning: setChainRunning,
    syncChatPageMounted: setIsChatPageMounted,
    syncExplicitEmptySessionId: setExplicitEmptySessionId,
    syncOpenTabIds: setOpenTabIds,
  };

  return (
    <ChatStateContext.Provider value={value}>
      {children}
    </ChatStateContext.Provider>
  );
}
