import { sessionActivityMs } from "@/lib/chat-session-activity";
import { workspaceSessionKey } from "@/lib/chat-session-workspace";

export type ChatHistoryListItem = {
  id: string;
  title: string;
  workspacePath?: string | null;
  activityMs: number;
  preview: string;
};

export type ChatHistoryDateGroup = {
  label: string;
  items: ChatHistoryListItem[];
};

export type ChatHistoryWorkspaceGroup = {
  workspaceKey: string;
  workspaceLabel: string;
  items: ChatHistoryListItem[];
};

type SessionSource = {
  id: string;
  title: string;
  workspacePath?: string | null;
  history: { role: string; content?: string; ts?: number }[];
};

function firstUserPreview(history: SessionSource["history"]): string {
  const user = history.find((m) => m.role === "user" && m.content && m.content !== "__WAITING__");
  if (!user?.content) return "";
  const line = user.content.split("\n")[0]?.trim() ?? "";
  return line.length > 120 ? `${line.slice(0, 120)}…` : line;
}

const GENERIC_SESSION_TITLES = new Set(["新对话", "Claude 会话", ""]);

/**
 * 页签 / 历史主标题：优先首条用户提问（与内容对齐）。
 * AI 改写标题不抢主位置，见 resolveSessionAiTitle。
 */
export function resolveSessionDisplayTitle(
  title: string | null | undefined,
  history: SessionSource["history"] | null | undefined,
): string {
  const preview = firstUserPreview(history || []);
  if (preview) {
    return preview.length > 28 ? `${preview.slice(0, 28)}…` : preview;
  }
  const stored = String(title ?? "").trim();
  if (stored && !GENERIC_SESSION_TITLES.has(stored)) return stored;
  return stored || "新对话";
}

/** AI / 存储标题（非占位且与主标题不同时，作 tooltip / 副行） */
export function resolveSessionAiTitle(
  title: string | null | undefined,
  history: SessionSource["history"] | null | undefined,
): string | null {
  const stored = String(title ?? "").trim();
  if (!stored || GENERIC_SESSION_TITLES.has(stored)) return null;
  const display = resolveSessionDisplayTitle(title, history);
  if (stored === display) return null;
  // 主标题是截断的首条时，完整 AI 标题仍可展示
  if (display.endsWith("…") && stored.startsWith(display.slice(0, -1))) return null;
  return stored;
}

export function resolveSessionTitleTooltip(
  title: string | null | undefined,
  history: SessionSource["history"] | null | undefined,
): string {
  const display = resolveSessionDisplayTitle(title, history);
  const ai = resolveSessionAiTitle(title, history);
  return ai ? `${display}\nAI 标题：${ai}` : display;
}

export function toChatHistoryListItem(sess: SessionSource): ChatHistoryListItem {
  const display = resolveSessionDisplayTitle(sess.title, sess.history);
  const ai = resolveSessionAiTitle(sess.title, sess.history);
  return {
    id: sess.id,
    title: display,
    workspacePath: sess.workspacePath ?? null,
    activityMs: sessionActivityMs(sess),
    /** 副行：AI 标题（与主标题不同时） */
    preview: ai || "",
  };
}

export function shortenWorkspaceLabel(abs: string): string {
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

function dateGroupLabel(ms: number, now = Date.now()): string {
  const dayMs = 86_400_000;
  const startOfDay = (t: number) => {
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

export function groupHistoryByDate(items: ChatHistoryListItem[]): ChatHistoryDateGroup[] {
  const sorted = [...items].sort((a, b) => b.activityMs - a.activityMs);
  const map = new Map<string, ChatHistoryListItem[]>();
  const order = ["今天", "昨天", "过去 7 天", "过去 30 天", "更早"];
  for (const item of sorted) {
    const label = dateGroupLabel(item.activityMs);
    const bucket = map.get(label) ?? [];
    bucket.push(item);
    map.set(label, bucket);
  }
  return order
    .filter((label) => map.has(label))
    .map((label) => ({ label, items: map.get(label)! }));
}

export function groupHistoryByWorkspace(items: ChatHistoryListItem[]): ChatHistoryWorkspaceGroup[] {
  const sorted = [...items].sort((a, b) => b.activityMs - a.activityMs);
  const map = new Map<string, ChatHistoryListItem[]>();
  for (const item of sorted) {
    const key = workspaceSessionKey(item.workspacePath);
    const bucket = map.get(key) ?? [];
    bucket.push(item);
    map.set(key, bucket);
  }
  return [...map.entries()]
    .sort((a, b) => {
      const aMax = a[1][0]?.activityMs ?? 0;
      const bMax = b[1][0]?.activityMs ?? 0;
      return bMax - aMax;
    })
    .map(([workspaceKey, groupItems]) => ({
      workspaceKey,
      workspaceLabel: shortenWorkspaceLabel(workspaceKey),
      items: groupItems,
    }));
}

export function formatHistoryTime(ms: number): string {
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
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function filterHistoryItems(items: ChatHistoryListItem[], query: string): ChatHistoryListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) return items;
  return items.filter((item) => {
    const ws = shortenWorkspaceLabel(workspaceSessionKey(item.workspacePath)).toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.preview.toLowerCase().includes(q) ||
      ws.includes(q)
    );
  });
}
