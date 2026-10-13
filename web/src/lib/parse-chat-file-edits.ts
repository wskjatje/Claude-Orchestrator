import {
  parseWorkspaceWriteItemsFromBubble,
  stripWorkspaceWriteFencesForHistory,
} from "@/lib/assistant-reply";
import { isWorkspaceWriteRejected } from "@/lib/rejected-workspace-writes";

export type ChatFileEditLine = {
  kind: "add" | "del" | "ctx" | "fold";
  text: string;
  /** 旧文件行号（del/ctx）；fold 时为折叠起点 */
  oldLine?: number;
  /** 新文件行号（add/ctx）；fold 时为折叠终点侧 */
  newLine?: number;
  /** 行首前缀；fold 无前缀 */
  prefix?: "+" | "-" | " ";
  /** kind=fold：被折叠的上下文行（可展开） */
  hiddenLines?: ChatFileEditLine[];
};

export type ChatFileEditStatus = "pending" | "applied" | "rejected";

export type ChatFileEdit = {
  id: string;
  path: string;
  language: string;
  added: number;
  removed: number;
  previewLines: ChatFileEditLine[];
  /** 仅路径摘要（如折叠后的「已写入」列表） */
  summaryOnly?: boolean;
  /** pending=待 Apply；applied=已写入（CLI/已接受）；rejected=已拒绝 */
  status?: ChatFileEditStatus;
  /** fence / 已解析的待写入正文；diff 可在 Accept 时由 diffBody + 磁盘合成 */
  writeContent?: string;
  /** 原始 unified diff 正文（source=diff） */
  diffBody?: string;
  /** fence=需确认；cli=工具已提议；summary=历史已写入；diff=unified 可应用 */
  source?: "fence" | "cli" | "summary" | "diff";
  /** 确认为新建文件（允许全绿 add 预览） */
  isNewFile?: boolean;
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
  const ext = base.includes(".") ? (base.split(".").pop()?.toLowerCase() ?? "") : "";
  return EXT_LANG[ext] ?? (ext || "text");
}

export function fileBadgeFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const ext = base.includes(".") ? (base.split(".").pop()?.toUpperCase() ?? "") : "";
  if (ext.length <= 4) return ext || "FILE";
  return ext.slice(0, 4);
}

function linesToAddPreview(content: string, maxLines = 48): ChatFileEditLine[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  return lines.slice(0, maxLines).map((text, i) => ({
    kind: "add" as const,
    text,
    newLine: i + 1,
    prefix: "+" as const,
  }));
}

function countLineStats(lines: ChatFileEditLine[]): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const l of lines) {
    if (l.kind === "add") added++;
    else if (l.kind === "del") removed++;
    else if (l.kind === "fold" && l.hiddenLines?.length) {
      const nested = countLineStats(l.hiddenLines);
      added += nested.added;
      removed += nested.removed;
    }
  }
  return { added, removed };
}

function makeLine(
  kind: "add" | "del" | "ctx",
  text: string,
  oldLine?: number,
  newLine?: number,
): ChatFileEditLine {
  const prefix = kind === "add" ? "+" : kind === "del" ? "-" : " ";
  return { kind, text, oldLine, newLine, prefix };
}

type LineOp = { kind: "eq" | "del" | "add"; text: string };

/** 行级 LCS（DP）；过大时回退前后缀，避免 O(n·m) 卡顿 */
function lineOpsLcs(oldL: string[], newL: string[]): LineOp[] {
  const n = oldL.length;
  const m = newL.length;
  const MAX_CELLS = 48_000;
  if (n * m > MAX_CELLS) return lineOpsPrefixSuffix(oldL, newL);

  const dp: Uint16Array[] = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = 1; i <= n; i++) {
    const row = dp[i]!;
    const prev = dp[i - 1]!;
    const a = oldL[i - 1]!;
    for (let j = 1; j <= m; j++) {
      row[j] = a === newL[j - 1] ? prev[j - 1]! + 1 : Math.max(prev[j]!, row[j - 1]!);
    }
  }
  const ops: LineOp[] = [];
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldL[i - 1] === newL[j - 1]) {
      ops.push({ kind: "eq", text: oldL[i - 1]! });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i]![j - 1]! >= dp[i - 1]![j]!)) {
      ops.push({ kind: "add", text: newL[j - 1]! });
      j--;
    } else {
      ops.push({ kind: "del", text: oldL[i - 1]! });
      i--;
    }
  }
  ops.reverse();
  return ops;
}

/** 前后缀对齐回退（大文件） */
function lineOpsPrefixSuffix(oldL: string[], newL: string[]): LineOp[] {
  let i = 0;
  let j = 0;
  while (i < oldL.length && j < newL.length && oldL[i] === newL[j]) {
    i++;
    j++;
  }
  let oi = oldL.length - 1;
  let nj = newL.length - 1;
  while (oi >= i && nj >= j && oldL[oi] === newL[nj]) {
    oi--;
    nj--;
  }
  const ops: LineOp[] = [];
  for (let k = 0; k < i; k++) ops.push({ kind: "eq", text: oldL[k]! });
  for (let k = i; k <= oi; k++) ops.push({ kind: "del", text: oldL[k]! });
  for (let k = j; k <= nj; k++) ops.push({ kind: "add", text: newL[k]! });
  for (let k = oi + 1; k < oldL.length; k++) ops.push({ kind: "eq", text: oldL[k]! });
  return ops;
}

/** 为 ops 标注旧/新行号后按 hunk 折叠未展示的 eq */
function opsToPreviewLines(
  ops: LineOp[],
  maxLines: number,
  ctxPad = 2,
): { previewLines: ChatFileEditLine[]; added: number; removed: number } {
  let added = 0;
  let removed = 0;
  const changeIdx: number[] = [];
  // 预先计算每步的行号
  const meta: { oldLine?: number; newLine?: number }[] = [];
  let oi = 1;
  let nj = 1;
  for (let i = 0; i < ops.length; i++) {
    const k = ops[i]!.kind;
    if (k === "eq") {
      meta.push({ oldLine: oi, newLine: nj });
      oi++;
      nj++;
    } else if (k === "del") {
      removed++;
      changeIdx.push(i);
      meta.push({ oldLine: oi });
      oi++;
    } else {
      added++;
      changeIdx.push(i);
      meta.push({ newLine: nj });
      nj++;
    }
  }
  if (!changeIdx.length) {
    return { previewLines: [], added: 0, removed: 0 };
  }
  const keep = new Set<number>();
  for (const idx of changeIdx) {
    for (let k = Math.max(0, idx - ctxPad); k <= Math.min(ops.length - 1, idx + ctxPad); k++) {
      keep.add(k);
    }
  }
  const previewLines: ChatFileEditLine[] = [];
  let lastKept = -2;
  for (let i = 0; i < ops.length; i++) {
    if (!keep.has(i)) continue;
    if (lastKept >= 0 && i - lastKept > 1) {
      const hidden: ChatFileEditLine[] = [];
      for (let h = lastKept + 1; h < i; h++) {
        const op = ops[h]!;
        const m = meta[h]!;
        if (op.kind === "eq") {
          hidden.push(makeLine("ctx", op.text, m.oldLine, m.newLine));
        } else if (op.kind === "del") {
          hidden.push(makeLine("del", op.text, m.oldLine, undefined));
        } else {
          hidden.push(makeLine("add", op.text, undefined, m.newLine));
        }
      }
      const first = meta[lastKept + 1];
      const last = meta[i - 1];
      previewLines.push({
        kind: "fold",
        text: `⋯ ${hidden.length} 行`,
        oldLine: first?.oldLine,
        newLine: last?.newLine,
        hiddenLines: hidden,
      });
    }
    const op = ops[i]!;
    const m = meta[i]!;
    if (op.kind === "eq") previewLines.push(makeLine("ctx", op.text, m.oldLine, m.newLine));
    else if (op.kind === "del") previewLines.push(makeLine("del", op.text, m.oldLine, undefined));
    else previewLines.push(makeLine("add", op.text, undefined, m.newLine));
    lastKept = i;
    if (previewLines.length >= maxLines) break;
  }
  return { previewLines, added, removed };
}

/** 相对磁盘基线的行级 diff 预览（LCS；过大回退前后缀） */
export function buildLineDiffPreview(
  before: string,
  after: string,
  maxLines = 64,
  opts?: { allowFullAdd?: boolean },
): { previewLines: ChatFileEditLine[]; added: number; removed: number; isNewFile?: boolean } {
  const oldL = String(before ?? "").replace(/\r\n/g, "\n").split("\n");
  const newL = String(after ?? "").replace(/\r\n/g, "\n").split("\n");
  const beforeEmpty = !String(before ?? "").length;
  if (beforeEmpty) {
    if (opts?.allowFullAdd === false) {
      return { previewLines: [], added: 0, removed: 0 };
    }
    return {
      previewLines: linesToAddPreview(after, maxLines),
      added: newL.length === 1 && newL[0] === "" ? 0 : newL.length,
      removed: 0,
      isNewFile: true,
    };
  }
  if (String(before) === String(after)) {
    return { previewLines: [], added: 0, removed: 0 };
  }
  return opsToPreviewLines(lineOpsLcs(oldL, newL), maxLines);
}

function makeEdit(seq: { n: number }, partial: Omit<ChatFileEdit, "id">): ChatFileEdit {
  seq.n += 1;
  return { id: `${partial.path}::${seq.n}`, ...partial };
}

/** 解析 unified diff 正文为带行号的 preview（保留 @@ hunk，hunk 间插 fold） */
export function previewLinesFromUnifiedBody(
  body: string,
  maxLines = 80,
): { previewLines: ChatFileEditLine[]; path: string; isNewFile: boolean } {
  const lines = body.replace(/\r\n/g, "\n").split("\n");
  let path = "";
  let isNewFile = false;
  const previewLines: ChatFileEditLine[] = [];
  let oldLine = 0;
  let newLine = 0;
  let sawHunk = false;
  let pendingGap = false;

  for (const raw of lines) {
    const line = raw.replace(/\r$/, "");
    if (!path) {
      const plus = line.match(/^\+\+\+\s+(?:b\/)?(.+?)\s*$/);
      if (plus?.[1] && !/^\/dev\/null/i.test(plus[1])) path = plus[1].trim().replace(/^b\//, "");
      const minus = line.match(/^---\s+(?:a\/)?(.+?)\s*$/);
      if (minus?.[1] && /^\/?dev\/null/i.test(minus[1])) isNewFile = true;
      if (!path && minus?.[1] && !/^\/?dev\/null/i.test(minus[1])) {
        path = minus[1].trim().replace(/^a\//, "");
      }
    }
    if (line.startsWith("new file")) isNewFile = true;
    if (
      line.startsWith("diff ") ||
      line.startsWith("index ") ||
      line.startsWith("new file") ||
      line.startsWith("deleted file") ||
      line.startsWith("---") ||
      line.startsWith("+++")
    ) {
      continue;
    }
    const hunk = line.match(/^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s@@/);
    if (hunk) {
      if (sawHunk && previewLines.length) pendingGap = true;
      oldLine = Number(hunk[1]) || 0;
      newLine = Number(hunk[2]) || 0;
      sawHunk = true;
      continue;
    }
    if (line.startsWith("+")) {
      if (pendingGap) {
        previewLines.push({
          kind: "fold",
          text: "⋯",
          oldLine,
          newLine,
          hiddenLines: [],
        });
        pendingGap = false;
      }
      previewLines.push(makeLine("add", line.slice(1), undefined, newLine || undefined));
      if (newLine) newLine++;
    } else if (line.startsWith("-")) {
      if (pendingGap) {
        previewLines.push({
          kind: "fold",
          text: "⋯",
          oldLine,
          newLine,
          hiddenLines: [],
        });
        pendingGap = false;
      }
      previewLines.push(makeLine("del", line.slice(1), oldLine || undefined, undefined));
      if (oldLine) oldLine++;
    } else if (line.startsWith(" ") || line.startsWith("\t") || (sawHunk && line === "")) {
      if (pendingGap) {
        previewLines.push({
          kind: "fold",
          text: "⋯",
          oldLine,
          newLine,
          hiddenLines: [],
        });
        pendingGap = false;
      }
      const text = line.startsWith(" ") || line.startsWith("\t") ? line.slice(1) : line;
      previewLines.push(makeLine("ctx", text, oldLine || undefined, newLine || undefined));
      if (oldLine) oldLine++;
      if (newLine) newLine++;
    }
    if (previewLines.length >= maxLines) break;
  }
  return { previewLines, path, isNewFile };
}

function parseDiffBody(
  body: string,
  fallbackPath: string | undefined,
  seq: { n: number },
): ChatFileEdit | null {
  const diffBody = body;
  const { previewLines, path: parsedPath, isNewFile } = previewLinesFromUnifiedBody(body, 64);
  const path = parsedPath || fallbackPath || "";

  if (!path && previewLines.length === 0) return null;
  const stats = countLineStats(previewLines);
  const rejected = path ? isWorkspaceWriteRejected(path, diffBody) : false;
  return makeEdit(seq, {
    path: path || "file",
    language: languageFromPath(path || ""),
    added: stats.added,
    removed: stats.removed,
    previewLines,
    source: "diff",
    diffBody,
    writeContent: diffBody,
    status: rejected ? "rejected" : "pending",
    isNewFile: isNewFile || undefined,
  });
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
          source: "summary",
          status: "applied",
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
          source: "summary",
          status: "applied",
        }),
      );
    }
  }
  return edits;
}

/** 流式未闭合的 workspace-write：提示「生成中」卡片 */
function parseOpenWorkspaceWriteHint(text: string, seq: { n: number }): ChatFileEdit | null {
  const openRe = /(?:```|''')\s*`?\s*workspace-write\s*`?\s*\n?/gi;
  let lastOpen = -1;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(text)) !== null) lastOpen = m.index;
  if (lastOpen < 0) return null;
  const tail = text.slice(lastOpen);
  const ticks = tail.match(/```|'''/g) || [];
  if (ticks.length >= 2) return null;
  const pathM = tail.match(/"path"\s*:\s*"([^"]+)"/);
  const path = pathM?.[1]?.replace(/\\/g, "/") || "…";
  return makeEdit(seq, {
    path,
    language: languageFromPath(path),
    added: 0,
    removed: 0,
    previewLines: [{ kind: "ctx", text: "正在生成改动…" }],
    summaryOnly: true,
    source: "fence",
    status: "pending",
  });
}

/** 流式未闭合的 ```diff：提示「生成中」卡片（无 Accept） */
function parseOpenDiffHint(text: string, seq: { n: number }): ChatFileEdit | null {
  const openRe = /```diff\s*\n?/gi;
  let lastOpen = -1;
  let m: RegExpExecArray | null;
  while ((m = openRe.exec(text)) !== null) lastOpen = m.index;
  if (lastOpen < 0) return null;
  const tail = text.slice(lastOpen);
  const ticks = tail.match(/```/g) || [];
  if (ticks.length >= 2) return null;
  let path = "";
  const plus = tail.match(/^\+\+\+\s+(?:b\/)?(.+?)\s*$/m);
  if (plus?.[1]) path = plus[1].trim().replace(/^b\//, "");
  if (!path) {
    const minus = tail.match(/^---\s+(?:a\/)?(.+?)\s*$/m);
    if (minus?.[1] && !/^dev\/null/i.test(minus[1])) {
      path = minus[1].trim().replace(/^a\//, "");
    }
  }
  path = path.replace(/\\/g, "/") || "…";
  return makeEdit(seq, {
    path,
    language: languageFromPath(path),
    added: 0,
    removed: 0,
    previewLines: [{ kind: "ctx", text: "正在生成改动…" }],
    summaryOnly: true,
    source: "diff",
    status: "pending",
  });
}

/** 从助手正文提取文件改动卡片，并返回去掉围栏后的 Markdown。 */
export function parseChatFileEdits(text: string): { edits: ChatFileEdit[]; stripped: string } {
  if (!text?.trim()) return { edits: [], stripped: text };

  const seq = { n: 0 };
  const edits: ChatFileEdit[] = [];
  let stripped = text;

  for (const item of parseWorkspaceWriteItemsFromBubble(text)) {
    const previewLines = linesToAddPreview(item.content);
    const lineCount = item.content.replace(/\r\n/g, "\n").split("\n").length;
    const rejected = isWorkspaceWriteRejected(item.path, item.content);
    edits.push(
      makeEdit(seq, {
        path: item.path,
        language: languageFromPath(item.path),
        added: lineCount,
        removed: 0,
        previewLines,
        status: rejected ? "rejected" : "pending",
        writeContent: item.content,
        source: "fence",
      }),
    );
  }
  if (edits.length > 0) {
    stripped = stripWorkspaceWriteFencesForHistory(stripped);
  } else {
    const hint = parseOpenWorkspaceWriteHint(text, seq);
    if (hint) edits.push(hint);
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

  const openDiff = parseOpenDiffHint(text, seq);
  if (openDiff) edits.push(openDiff);

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

/** 按路径取下一个未使用的改动（用于 inline 穿插） */
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

/**
 * Agent acceptEdits 下视为已写入（轻量 Edit 行）
 */
export function summaryEditForPath(
  path: string,
  seq: { n: number },
  opts?: { applied?: boolean },
): ChatFileEdit {
  return makeEdit(seq, {
    path,
    language: languageFromPath(path),
    added: 0,
    removed: 0,
    previewLines: [],
    summaryOnly: true,
    source: opts?.applied ? "summary" : "cli",
    status: opts?.applied ? "applied" : "pending",
  });
}

/** 拆开「a.py, b.py」式多路径 Edit 参数 */
export function splitWorkspaceEditPaths(raw: string): string[] {
  const s = String(raw || "")
    .trim()
    .replace(/^[`'"]|[`'"]$/g, "");
  if (!s) return [];
  if (!/[,，]/.test(s)) {
    const one = s.replace(/\\/g, "/").replace(/^\.\//, "");
    return one ? [one] : [];
  }
  return [
    ...new Set(
      s
        .split(/[,，]/)
        .map((p) =>
          p
            .trim()
            .replace(/^[`'"]|[`'"]$/g, "")
            .replace(/\s*[（(]新增[）)]\s*$/u, "")
            .replace(/\\/g, "/")
            .replace(/^\.\//, ""),
        )
        .filter((p) => p && (/\.\w+$/.test(p) || p.includes("/"))),
    ),
  ];
}

/** 从 unified diff 按文件切开，生成 previewLines / +/-（含行号与 hunk fold） */
export function editsPreviewFromUnifiedDiff(
  diffText: string,
  seq: { n: number },
): ChatFileEdit[] {
  const raw = String(diffText || "");
  if (!raw.trim() || raw.includes("无差异")) return [];
  const chunks = raw.split(/(?=^diff --git )/m).filter((c) => c.trim());
  const out: ChatFileEdit[] = [];
  for (const body of chunks) {
    const m =
      body.match(/^diff --git a\/(.+?) b\/(.+)$/m) || body.match(/^\+\+\+ b\/(.+)$/m);
    const pathFromHeader = String(m?.[2] || m?.[1] || "")
      .replace(/\\/g, "/")
      .trim();
    const { previewLines, path: pathFromBody, isNewFile } = previewLinesFromUnifiedBody(body, 80);
    const path = (pathFromHeader || pathFromBody).replace(/\\/g, "/").trim();
    if (!path || path === "/dev/null") continue;
    const stats = countLineStats(previewLines);
    if (!previewLines.length && !stats.added && !stats.removed) continue;
    out.push(
      makeEdit(seq, {
        path,
        language: languageFromPath(path),
        added: stats.added,
        removed: stats.removed,
        previewLines,
        summaryOnly: true,
        status: "applied",
        source: "summary",
        diffBody: body,
        isNewFile: isNewFile || undefined,
      }),
    );
  }
  return out;
}

function normalizeEditPath(p: string): string {
  return String(p || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

function dedupePreviewLines(lines: ChatFileEditLine[]): ChatFileEditLine[] {
  const out: ChatFileEditLine[] = [];
  for (const line of lines) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.kind === line.kind &&
      prev.text === line.text &&
      prev.oldLine === line.oldLine &&
      prev.newLine === line.newLine &&
      line.kind !== "fold"
    ) {
      continue;
    }
    out.push(line);
  }
  return out;
}

/** 展开 fold 行（供 UI 点击）；无 hiddenLines 时仅移除折叠标记 */
export function expandFoldLine(
  lines: ChatFileEditLine[],
  foldIndex: number,
): ChatFileEditLine[] {
  const fold = lines[foldIndex];
  if (!fold || fold.kind !== "fold") return lines;
  const hidden = fold.hiddenLines?.length ? fold.hiddenLines : [];
  return [...lines.slice(0, foldIndex), ...hidden, ...lines.slice(foldIndex + 1)];
}

function editRank(e: ChatFileEdit): number {
  let s = 0;
  if (e.status === "applied") s += 100;
  if (e.status === "rejected") s -= 40;
  if (e.source === "fence" && e.writeContent) s += 50;
  if (e.source === "diff" && (e.diffBody || e.writeContent)) s += 35;
  if (!e.summaryOnly) s += 25;
  s += Math.min(40, e.previewLines?.length || 0);
  s += Math.min(30, Math.floor((e.writeContent?.length || e.diffBody?.length || 0) / 800));
  return s;
}

/** 同一 path 只保留一张卡片，避免「2 个待应用」重复块 */
export function dedupeEditsByPath(edits: ChatFileEdit[]): ChatFileEdit[] {
  const map = new Map<string, ChatFileEdit>();
  for (const raw of edits) {
    const key = normalizeEditPath(raw.path);
    if (!key) continue;
    const e = {
      ...raw,
      path: key,
      previewLines: dedupePreviewLines(raw.previewLines || []),
    };
    const prev = map.get(key);
    if (!prev || editRank(e) > editRank(prev)) {
      map.set(key, e);
    } else if (prev.status !== "applied" && e.status === "applied") {
      map.set(key, e);
    }
  }
  return [...map.values()];
}
