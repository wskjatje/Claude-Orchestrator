import type { PendingTerminalSnippet } from "@/components/composer-terminal-attachments";
import { looksLikeTerminalPaste } from "@/lib/chat-terminal-paste";
import type { UserImageAttachment } from "@/lib/ollama-messages";
import {
  inferTerminalSourceLabel,
  type TerminalSelectionPayload,
} from "@/lib/terminal-selection-meta";

export function splitUserDisplayText(content: string): { lead: string; terminal?: string } {
  const trimmed = content.trim();
  if (!trimmed) return { lead: "" };

  const blocks = trimmed.split(/\n\n+/);
  if (blocks.length >= 2) {
    const last = blocks[blocks.length - 1] ?? "";
    if (looksLikeTerminalPaste(last)) {
      return {
        lead: blocks.slice(0, -1).join("\n\n").trim(),
        terminal: last,
      };
    }
  }

  if (looksLikeTerminalPaste(trimmed)) {
    return { lead: "", terminal: trimmed };
  }

  return { lead: trimmed };
}

function newLocalId(): string {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export type RestoredUserComposer = {
  input: string;
  terminalSnippets: PendingTerminalSnippet[];
  attachments: (UserImageAttachment & { id: string })[];
};

/** 将磁盘中的用户消息还原为 Composer 可编辑状态。 */
export function restoreUserMsgToComposer(msg: {
  content: string;
  attachments?: UserImageAttachment[];
  terminalSnippets?: TerminalSelectionPayload[];
}): RestoredUserComposer {
  const { lead, terminal } = splitUserDisplayText(msg.content);

  let terminalSnippets: PendingTerminalSnippet[] = [];
  if (msg.terminalSnippets?.length) {
    terminalSnippets = msg.terminalSnippets.map((s) => ({
      ...s,
      id: newLocalId(),
    }));
  } else if (terminal) {
    terminalSnippets = [
      {
        id: newLocalId(),
        text: terminal,
        sourceLabel: inferTerminalSourceLabel("zsh", terminal),
      },
    ];
  }

  const attachments =
    msg.attachments?.map((a) => ({
      ...a,
      id: newLocalId(),
    })) ?? [];

  return {
    input: lead,
    terminalSnippets,
    attachments,
  };
}
