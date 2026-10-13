import { ChatSessionTabs } from "@/components/chat-session-tabs";
import type { ChatHistoryListItem } from "@/lib/chat-history-groups";

type Session = { id: string; title: string; modelId?: string | null };

type Props = {
  sessions: Session[];
  activeId: string;
  sendingSessions: Record<string, boolean>;
  activeStreamRequestId: string | null;
  onSessionChange: (id: string) => void;
  onNewSession: () => void;
  onCloseSession: (id: string) => void;
  hasDesktopApi: boolean;
  projectHistoryItems: ChatHistoryListItem[];
  allHistoryItems: ChatHistoryListItem[];
  onSelectHistorySession: (sessionId: string) => void;
  onDeleteHistorySession: (sessionId: string) => void;
  onHistoryOpen?: () => void;
  onCollapsePanel?: () => void;
};

/** 会话标签顶栏（+ / 历史 / 更多 / 折叠；全局布局开关仍在 WorkbenchPanelToolbar） */
export function ChatPanelToolbar(props: Props) {
  return <ChatSessionTabs {...props} />;
}
