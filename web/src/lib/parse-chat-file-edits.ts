import {
  parseWorkspaceWriteItemsFromBubble,
  stripWorkspaceWriteFencesForHistory,
} from "@/lib/assistant-reply";

export type ChatFileEditLine = { kind: "add" | "del" | "ctx"; text: string };

export type ChatFileEdit = {
  id: string;
  path: string;
  language: string;
  added: number;
  removed: number;
  previewLines: ChatFileEditLine[];
  /** 仅路径摘要（如折叠后的「已写入」列表） */
  summaryOnly?: boolean;
};

const EXT_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "tsx",
  js: "javascript",
  jsx: "jsx",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  md: "markdown",
  css: "css",
  scss: "scss",
  html: "html",
  py: "python",
  rs: "rust",
  go: "go",
  sh: "shell",
};

export function languageFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const ext = base.includes(".") ? base.split(".").pop()?.toLowerCase() ?? "" : "";
  return EXT_LANG[ext] ?? (ext || "text");
}

export function fileBadgeFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const ext = base.includes(".") ? base.split(".").pop()?.toUpperCase() ?? "" : "";
  if (ext.length <= 4) return ext || "FILE";
  return ext.slice(0, 4);
}

function linesToAddPreview(content: string, maxLines = 28): ChatFileEditLine[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  return lines.slice(0, maxLines).map((text) => ({ kind: "add", text }));
}

function countLineStats(lines: ChatFileEditLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.kind === "add") added++;
    else if (l.kind === "del") removed++;
  }
  return { added, removed };
}

function makeEdit(
  seq: { n: number },
  partial: Omit<ChatFileEdit, "id">,
): ChatFileEdit {
  seq.n += 1;
  return { id: `${partial.path}::${seq.n}`, ...partial };
}

function parseDiffBody(body: string, fallbackPath: string | undefined, seq: { n: number }): ChatFileEdit | null {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let path = fallbackPath ?? "";
  const previewLines: ChatFileEditLine[] = [];

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (!path) {
      const plus = line.match(/^\+\+\+\s+(?:b\/)?(.+?)\s*$/);
      if (plus?.[1]) path = plus[1].trim();
      const minus = line.match(/^---\s+(?:a\/)?(.+?)\s*$/);
      if (!path && minus?.[1] && !/^dev\/null/i.test(minus[1])) path = minus[1].trim();
    }
    if (line.startsWith("+++") || line.startsWith("---") || line.startsWith("@@")) continue;
    if (line.startsWith("+")) previewLines.push({ kind: "add", text: line.slice(1) });
    else if (line.startsWith("-")) previewLines.push({ kind: "del", text: line.slice(1) });
    else if (line.trim()) previewLines.push({ kind: "ctx", text: line });
  }

  if (!path && previewLines.length === 0) return null;
  const stats = countLineStats(previewLines);
  return makeEdit(seq, {
    path: path || "file",
    language: languageFromPath(path || ""),
    added: stats.added,
    removed: stats.removed,
    previewLines: previewLines.slice(0, 32),
  });
}

function parsePathFromCodeInfo(info: string): string | null {
  const t = info.trim();
  if (!t) return null;
  const colon = t.match(/^(?:[\w.-]+:)?(.+\.[a-z0-9]{1,8})$/i);
  if (colon?.[1] && /\//.test(colon[1])) return colon[1].replace(/\\/g, "/");
  const pathish = t.match(
    /((?:docs|src|app|web|server|lib|components|routes)\/[a-zA-Z0-9_./-]+\.[a-z0-9]{1,8})/i,
  );
  return pathish?.[1]?.replace(/\\/g, "/") ?? null;
}

function parseInlineWrittenPaths(text: string, seq: { n: number }): ChatFileEdit[] {
  const edits: ChatFileEdit[] = [];
  const seen = new Set<string>();
  const patterns = [
    /已写入(?:[^`\n]*?)`([^`]+\.\w{1,8})`/gi,
    /已写入\s+[`'"]?((?:docs|[\w.-]+)\/[\w./-]+\.\w{1,8})/gi,
    /已写入\s+[`'"]?([\w./-]+\.(?:md|tsx?|jsx?|json|css|py|cjs|mjs))/gi,
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const p = m[1]?.replace(/\\/g, "/").trim();
      if (!p || seen.has(p)) continue;
      seen.add(p);
      edits.push(
        makeEdit(seq, {
          path: p,
          language: languageFromPath(p),
          added: 0,
          removed: 0,
          previewLines: [],
          summaryOnly: true,
        }),
      );
    }
  }
  return edits;
}

function stripInlineWrittenClaims(text: string): string {
  return text
    .replace(/^[^\n]*已写入\s+[`'"]?[\w./-]+\.\w+[`'"]?[^\n]*\n?/gim, "")
    .replace(/^[^\n]*分析完成[^\n]*已写入[^\n]*\n?/gim, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function parseWrittenPathSummary(text: string, seq: { n: number }): ChatFileEdit[] {
  const edits: ChatFileEdit[] = [];
  const blockRe = /【工作区已写入】[^\n]*\n((?:- `[^`\n]+`\n?)+)/g;
  let m: RegExpExecArray | null;
  while ((m = blockRe.exec(text)) !== null) {
    const lines = m[1].match(/- `([^`\n]+)`/g) ?? [];
    for (const raw of lines) {
      const p = raw.replace(/^- `|`$/g, "").trim();
      if (!p) continue;
      edits.push(
        makeEdit(seq, {
          path: p,
          language: languageFromPath(p),
          added: 0,
          removed: 0,
          previewLines: [],
          summaryOnly: true,
        }),
      );
    }
  }
  return edits;
}

/** 从助手正文提取 Cursor 式文件改动卡片，并返回去掉围栏后的 Markdown。 */
export function parseChatFileEdits(text: string): { edits: ChatFileEdit[]; stripped: string } {
  if (!text?.trim()) return { edits: [], stripped: text };

  const seq = { n: 0 };
  const edits: ChatFileEdit[] = [];
  let stripped = text;

  for (const item of parseWorkspaceWriteItemsFromBubble(text)) {
    const previewLines = linesToAddPreview(item.content);
    const lineCount = item.content.replace(/\r\n/g, "\n").split("\n").length;
    edits.push(
      makeEdit(seq, {
        path: item.path,
        language: languageFromPath(item.path),
        added: lineCount,
        removed: 0,
        previewLines,
      }),
    );
  }
  if (edits.length > 0) {
    stripped = stripWorkspaceWriteFencesForHistory(stripped);
  }

  const diffRe = /```diff\s*\n([\s\S]*?)```/gi;
  let dm: RegExpExecArray | null;
  const diffRemovals: { start: number; end: number }[] = [];
  while ((dm = diffRe.exec(text)) !== null) {
    const edit = parseDiffBody(dm[1] ?? "", undefined, seq);
    if (edit) edits.push(edit);
    diffRemovals.push({ start: dm.index, end: dm.index + dm[0].length });
  }
  for (let i = diffRemovals.length - 1; i >= 0; i--) {
    const { start, end } = diffRemovals[i]!;
    stripped = stripped.slice(0, start) + stripped.slice(end);
  }

  const codeRe = /```([\w.:/\\-]+)\s*\n([\s\S]*?)```/g;
  let cm: RegExpExecArray | null;
  const codeRemovals: { start: number; end: number }[] = [];
  while ((cm = codeRe.exec(text)) !== null) {
    const info = cm[1] ?? "";
    if (/^diff$/i.test(info)) continue;
    const path = parsePathFromCodeInfo(info);
    if (!path) continue;
    const body = (cm[2] ?? "").replace(/\n$/, "");
    if (!body.trim()) continue;
    const previewLines = linesToAddPreview(body);
    edits.push(
      makeEdit(seq, {
        path,
        language: languageFromPath(path),
        added: body.split("\n").length,
        removed: 0,
        previewLines,
      }),
    );
    codeRemovals.push({ start: cm.index, end: cm.index + cm[0].length });
  }
  for (let i = codeRemovals.length - 1; i >= 0; i--) {
    const { start, end } = codeRemovals[i]!;
    stripped = stripped.slice(0, start) + stripped.slice(end);
  }

  for (const edit of parseWrittenPathSummary(text, seq)) {
    if (!edits.some((e) => e.path === edit.path)) edits.push(edit);
  }
  for (const edit of parseInlineWrittenPaths(text, seq)) {
    if (!edits.some((e) => e.path === edit.path)) edits.push(edit);
  }

  stripped = stripInlineWrittenClaims(stripped);
  stripped = stripped
    .replace(/\n*【工作区已写入】[^\n]*\n(?:- `[^`\n]+`\n?)+/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { edits, stripped };
}

/** 按路径取下一个未使用的改动（用于 Cursor 式 inline 穿插） */
export function takeEditForPath(
  path: string,
  pool: Map<string, ChatFileEdit[]>,
  used: Set<string>,
): ChatFileEdit | null {
  const queue = pool.get(path);
  if (!queue?.length) return null;
  while (queue.length) {
    const edit = queue.shift()!;
    if (used.has(edit.id)) continue;
    used.add(edit.id);
    return edit;
  }
  return null;
}

export function buildEditPool(edits: ChatFileEdit[]): Map<string, ChatFileEdit[]> {
  const pool = new Map<string, ChatFileEdit[]>();
  for (const edit of edits) {
    const list = pool.get(edit.path) ?? [];
    list.push(edit);
    pool.set(edit.path, list);
  }
  return pool;
}

export function summaryEditForPath(path: string, seq: { n: number }): ChatFileEdit {
  return makeEdit(seq, {
    path,
    language: languageFromPath(path),
    added: 0,
    removed: 0,
    previewLines: [],
    summaryOnly: true,
  });
}
