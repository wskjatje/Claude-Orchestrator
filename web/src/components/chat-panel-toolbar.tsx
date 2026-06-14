import { ChatSessionTabs } from "@/components/chat-session-tabs";
import type { ChatHistoryListItem } from "@/lib/chat-history-groups";

type Session = { id: string; title: string; modelId?: string | null };

type Props = {
  sessions: Session[];
  activeId: string;
  sendingSessions: Record<string, boolean>;
  onSessionChange: (id: string) => void;
  onNewSession: () => void;
  onCloseSession: (id: string) => void;
  hasDesktopApi: boolean;
  onClosePanel: () => void;
  terminalOpen?: boolean;
  onToggleTerminal?: () => void;
  projectHistoryItems: ChatHistoryListItem[];
  allHistoryItems: ChatHistoryListItem[];
  onSelectHistorySession: (sessionId: string) => void;
  onHistoryOpen?: () => void;
};

/** 会话标签顶栏（类 Cursor：终端开关在顶栏右侧，模型 / Agent 在输入框底部） */
export function ChatPanelToolbar(props: Props) {
  return <ChatSessionTabs {...props} />;
}
