import { shortenWorkspaceLabel } from "@/lib/chat-history-groups";

export type WorkspaceHistoryEntry = {
  path: string;
  openedAt: number;
};

export type WorkspaceHistoryPayload = {
  version: number;
  entries: WorkspaceHistoryEntry[];
};

export function formatWorkspaceHistoryLabel(absPath: string): string {
  return shortenWorkspaceLabel(absPath);
}

export function formatWorkspaceHistoryTime(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  const now = new Date();
  const sameDay =
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
  if (sameDay) {
    return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
