import { splitUserDisplayText } from "@/lib/restore-user-composer";

export function formatChatResendPreview(content: string): {
  text: string;
  isAttachmentOnly: boolean;
} {
  const raw = content.trim();
  if (!raw) {
    return { text: "（含图片或附件的提问）", isAttachmentOnly: true };
  }
  const { lead } = splitUserDisplayText(raw);
  const base = (lead || raw).replace(/\s+/g, " ").trim();
  const clipped = base.slice(0, 160);
  return {
    text: clipped + (base.length > 160 ? "…" : ""),
    isAttachmentOnly: false,
  };
}
