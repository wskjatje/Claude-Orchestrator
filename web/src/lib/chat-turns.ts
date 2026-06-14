import type { ChatBubbleMessage } from "@/components/chat-message-bubble";

export type ChatTurn = {
  userIndex: number;
  user: ChatBubbleMessage;
  replyIndices: number[];
};

export function isDisplayUserMessage(m: ChatBubbleMessage): boolean {
  return m.role === "user" && Boolean(m.content.trim()) && m.content !== "__WAITING__";
}

/** 按 user → 后续 assistant 分组，便于顶部悬停栏随滚动切换对应提问 */
export function groupChatTurns(messages: ChatBubbleMessage[]): {
  leadingOrphans: number[];
  turns: ChatTurn[];
} {
  const leadingOrphans: number[] = [];
  const turns: ChatTurn[] = [];
  let current: ChatTurn | null = null;

  for (let i = 0; i < messages.length; i++) {
    const m = messages[i];
    if (isDisplayUserMessage(m)) {
      if (current) turns.push(current);
      current = { userIndex: i, user: m, replyIndices: [] };
      continue;
    }
    if (m.role === "assistant") {
      if (current) current.replyIndices.push(i);
      else leadingOrphans.push(i);
    }
  }
  if (current) turns.push(current);
  return { leadingOrphans, turns };
}
