import type { Terminal } from "@xterm/xterm";

export type TerminalSelectionPayload = {
  text: string;
  sourceLabel: string;
  startLine?: number;
  endLine?: number;
};

/** xterm 选区在缓冲区中的行号（1-based，贴近 Cursor 展示） */
export function getTerminalSelectionLineRange(
  term: Terminal,
): { startLine: number; endLine: number } | undefined {
  try {
    const pos = term.getSelectionPosition?.();
    if (!pos) return undefined;
    const buf = term.buffer.active;
    const startRow = buf.baseY + Math.min(pos.start.y, pos.end.y) + 1;
    const endRow = buf.baseY + Math.max(pos.start.y, pos.end.y) + 1;
    return { startLine: startRow, endLine: endRow };
  } catch {
    return undefined;
  }
}

/** 根据选区内容推断 Cursor 式来源标签（node / python / zsh …） */
export function inferTerminalSourceLabel(shellLabel: string, selectionText: string): string {
  const t = selectionText.toLowerCase();
  if (/\[vite\]|npm run|node:|node\.js|\bnode\b/.test(t)) return "node";
  if (/\bpython\b|flask|django|uvicorn/.test(t)) return "python";
  if (/\bbash\b/.test(t)) return "bash";
  const base = shellLabel.trim().toLowerCase();
  if (base) return base.split("/").pop() || base;
  return "terminal";
}

export function formatTerminalChipLabel(
  payload: Pick<TerminalSelectionPayload, "sourceLabel" | "startLine" | "endLine">,
): string {
  const name = payload.sourceLabel || "terminal";
  if (payload.startLine != null && payload.endLine != null) {
    return `${name} (${payload.startLine}-${payload.endLine})`;
  }
  return name;
}
