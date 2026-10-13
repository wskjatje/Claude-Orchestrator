import {
  EditorSelection,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  EditorView,
  hoverTooltip,
  keymap,
} from "@codemirror/view";
import {
  analyzeSymbolAt,
  findDeclarationInText,
  findDefinitionInDocument,
  findDefinitionLocation,
  findReferencesInText,
  kindLabel,
  type SourceLocation,
} from "@/lib/codemirror-symbol-nav";
import { wordAtPos } from "@/lib/codemirror-word";
import {
  clearPendingGotoRetry,
  clearPendingLineGoto,
  clearPendingSymbolGoto,
  consumePendingLineGoto,
  consumePendingSymbolGoto,
  pathsMatchAnyPending,
  pathsMatchPending,
  pathsMatchPendingLine,
  peekPendingLineGoto,
  peekPendingSymbolGoto,
  registerPendingGotoRetry,
  setPendingLineGoto,
  setPendingSymbolGoto,
} from "@/lib/codemirror-pending-goto";
import { getEditorIdeHandlers, type EditorIdeHandlers } from "@/lib/codemirror-ide-handlers";
import {
  fetchTsDefinition,
  fetchTsHover,
  fetchTsImplementation,
  fetchTsReferences,
  fetchTsRename,
  fetchTsSignatureHelp,
  fetchTsTypeDefinition,
  offsetToLineCol,
} from "@/lib/workspace-tsservice-client";

export type { EditorIdeHandlers };

const setReferenceHighlight = StateEffect.define<DecorationSet>();

const referenceHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setReferenceHighlight)) return e.value;
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

let gotoSeq = 0;

function referenceDecorations(view: EditorView, word: string): DecorationSet {
  const text = view.state.doc.toString();
  const refs = findReferencesInText(text, word);
  const marks = refs.map((r) =>
    Decoration.mark({ class: "cm-ide-reference" }).range(r.from, r.to),
  );
  return Decoration.set(marks, true);
}

export function scrollToLocation(view: EditorView, loc: Pick<SourceLocation, "from" | "to">) {
  if (loc.from < 0 || loc.to > view.state.doc.length) return;
  view.dispatch({
    selection: EditorSelection.create([EditorSelection.range(loc.from, loc.to)]),
    effects: EditorView.scrollIntoView(loc.from, { y: "center" }),
  });
  view.focus();
}

export async function goToDefinition(view: EditorView, pos: number, handlers?: EditorIdeHandlers) {
  const h = handlers ?? getEditorIdeHandlers();
  const seq = ++gotoSeq;

  // 真 LSP（TS Language Service）优先
  try {
    const { line, column } = offsetToLineCol(view.state.doc, pos);
    const hit = await fetchTsDefinition({
      relPath: h.relPath,
      line,
      column,
      content: view.state.doc.toString(),
    });
    if (seq !== gotoSeq) return;
    if (hit) {
      const same =
        hit.relPath.replace(/\\/g, "/") === h.relPath.replace(/\\/g, "/") ||
        h.relPath.replace(/\\/g, "/").endsWith("/" + hit.relPath.replace(/\\/g, "/"));
      if (same) {
        const from = lineColumnToPos(view.state.doc, hit.line, hit.column);
        const to = lineColumnToPos(
          view.state.doc,
          hit.endLine ?? hit.line,
          hit.endColumn ?? hit.column + 1,
        );
        scrollToLocation(view, { from, to: Math.max(to, from + 1) });
        return;
      }
      if (h.onOpenFile) {
        setPendingLineGoto(hit.relPath, hit.line, hit.column);
        h.onOpenFile(hit.relPath);
        return;
      }
    }
  } catch {
    /* 回落启发式 */
  }

  const local = findDefinitionInDocument(view.state.doc, pos);
  if (local) {
    scrollToLocation(view, local);
    return;
  }

  try {
    const { cross } = await findDefinitionLocation(view.state.doc, pos, h.relPath, h.readFile);
    if (seq !== gotoSeq) return;
    if (cross && h.onOpenFile) {
      setPendingSymbolGoto(cross.relPath, cross.word, cross.from);
      h.onOpenFile(cross.relPath);
    }
  } catch {
    /* 忽略跳转失败，避免未捕获 Promise 拖死页面 */
  }
}

export async function findAllReferences(view: EditorView, pos: number, handlers?: EditorIdeHandlers) {
  const h = handlers ?? getEditorIdeHandlers();
  const { line, column } = offsetToLineCol(view.state.doc, pos);
  const lspRefs = await fetchTsReferences({
    relPath: h.relPath,
    line,
    column,
    content: view.state.doc.toString(),
  });

  if (lspRefs.length) {
    const sameFile = lspRefs.filter(
      (r) =>
        r.relPath.replace(/\\/g, "/") === h.relPath.replace(/\\/g, "/") ||
        h.relPath.replace(/\\/g, "/").endsWith("/" + r.relPath.replace(/\\/g, "/")),
    );
    const marks = sameFile.map((r) => {
      const from = lineColumnToPos(view.state.doc, r.line, r.column);
      const to = lineColumnToPos(view.state.doc, r.endLine ?? r.line, r.endColumn ?? r.column + 1);
      return Decoration.mark({ class: "cm-ide-reference" }).range(from, Math.max(to, from + 1));
    });
    view.dispatch({ effects: setReferenceHighlight.of(Decoration.set(marks, true)) });
    const first = sameFile[0] || lspRefs[0]!;
    if (
      first.relPath.replace(/\\/g, "/") === h.relPath.replace(/\\/g, "/") ||
      h.relPath.replace(/\\/g, "/").endsWith("/" + first.relPath.replace(/\\/g, "/"))
    ) {
      const from = lineColumnToPos(view.state.doc, first.line, first.column);
      scrollToLocation(view, { from, to: from + 1 });
    } else if (h.onOpenFile) {
      setPendingLineGoto(first.relPath, first.line, first.column);
      h.onOpenFile(first.relPath);
    }
    // 暴露给 Peek 面板
    setLastReferencesPeek(lspRefs.map((r) => ({ ...r, word: wordAtPos(view.state.doc, pos)?.word || "" })));
    return lspRefs.length;
  }

  const hit = wordAtPos(view.state.doc, pos);
  if (!hit) return 0;
  const refs = findReferencesInText(view.state.doc.toString(), hit.word);
  const deco = referenceDecorations(view, hit.word);
  view.dispatch({ effects: setReferenceHighlight.of(deco) });
  if (refs[0]) scrollToLocation(view, refs[0]);
  setLastReferencesPeek(
    refs.map((r) => ({
      relPath: h.relPath,
      line: view.state.doc.lineAt(r.from).number,
      column: r.from - view.state.doc.lineAt(r.from).from + 1,
      word: hit.word,
    })),
  );
  return refs.length;
}

export async function renameSymbolAt(view: EditorView, pos: number, readOnly?: boolean) {
  if (readOnly) return false;
  const h = getEditorIdeHandlers();
  const { line, column } = offsetToLineCol(view.state.doc, pos);
  const rename = await fetchTsRename({
    relPath: h.relPath,
    line,
    column,
    content: view.state.doc.toString(),
  });

  const hit = wordAtPos(view.state.doc, pos);
  const oldName = rename?.displayName || hit?.word;
  if (!oldName) return false;
  const next = window.prompt(`重命名「${oldName}」`, oldName);
  if (!next || next === oldName) return false;
  if (!/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(next)) return false;

  if (rename?.canRename && rename.locations.length) {
    const norm = (p: string) => p.replace(/\\/g, "/");
    const cur = norm(h.relPath);
    const isSame = (r: { relPath: string }) => {
      const p = norm(r.relPath);
      return p === cur || cur.endsWith("/" + p) || p.endsWith("/" + cur);
    };
    const sameFile = rename.locations.filter(isSame);
    if (sameFile.length) {
      const changes = sameFile
        .map((r) => {
          const from = lineColumnToPos(view.state.doc, r.line, r.column);
          const to = lineColumnToPos(
            view.state.doc,
            r.endLine ?? r.line,
            r.endColumn ?? r.column + oldName.length,
          );
          return { from, to, insert: next };
        })
        .sort((a, b) => b.from - a.from);
      view.dispatch({ changes });
      view.focus();
    }
    const crossLocs = rename.locations
      .filter((r) => !isSame(r))
      .map((r) => ({ ...r, oldName, newName: next }));
    if (crossLocs.length) {
      setLastRenameCrossFiles(crossLocs);
      const first = crossLocs[0]!;
      setPendingLineGoto(first.relPath, first.line, first.column);
      h.onOpenFile?.(first.relPath);
    }
    if (sameFile.length || crossLocs.length) return true;
  }

  // 回落：同文件启发式
  if (!hit) return false;
  const text = view.state.doc.toString();
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}_$])${hit.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_$])`,
    "gu",
  );
  const newText = text.replace(re, next);
  if (newText === text) return false;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newText },
    selection: EditorSelection.cursor(hit.from),
  });
  view.focus();
  return true;
}

/** Peek：最近一次引用列表 */
export type PeekRef = {
  relPath: string;
  line: number;
  column: number;
  endLine?: number;
  endColumn?: number;
  word?: string;
};

let lastPeek: PeekRef[] = [];
let peekListeners = new Set<() => void>();

export function setLastReferencesPeek(refs: PeekRef[]) {
  lastPeek = refs;
  peekListeners.forEach((l) => l());
}

export function getLastReferencesPeek() {
  return lastPeek;
}

export function subscribeReferencesPeek(fn: () => void) {
  peekListeners.add(fn);
  return () => peekListeners.delete(fn);
}

let lastRenameCross: (PeekRef & { oldName: string; newName: string })[] = [];
let renameListeners = new Set<() => void>();

export function setLastRenameCrossFiles(items: (PeekRef & { oldName: string; newName: string })[]) {
  lastRenameCross = items;
  renameListeners.forEach((l) => l());
}

export function getLastRenameCrossFiles() {
  return lastRenameCross;
}

export function subscribeRenameCross(fn: () => void) {
  renameListeners.add(fn);
  return () => renameListeners.delete(fn);
}

/** Peek Definition：定义位置 + 上下文片段（不离开当前文件） */
export type PeekDefinition = PeekRef & {
  snippet: string;
  startLine: number;
};

let lastPeekDef: PeekDefinition | null = null;
let peekDefListeners = new Set<() => void>();

export function setLastPeekDefinition(def: PeekDefinition | null) {
  lastPeekDef = def;
  peekDefListeners.forEach((l) => l());
}

export function getLastPeekDefinition() {
  return lastPeekDef;
}

export function subscribePeekDefinition(fn: () => void) {
  peekDefListeners.add(fn);
  return () => peekDefListeners.delete(fn);
}

function snippetAround(
  text: string,
  line: number,
  pad = 4,
): { snippet: string; startLine: number } {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const idx = Math.max(0, Math.min(lines.length - 1, line - 1));
  const from = Math.max(0, idx - pad);
  const to = Math.min(lines.length, idx + pad + 1);
  return {
    snippet: lines.slice(from, to).join("\n"),
    startLine: from + 1,
  };
}

/** Alt+F12：Peek Definition（浮层，不强制跳转） */
export async function peekDefinition(
  view: EditorView,
  pos: number,
  handlers?: EditorIdeHandlers,
) {
  const h = handlers ?? getEditorIdeHandlers();
  const word = wordAtPos(view.state.doc, pos)?.word || "";
  const { line, column } = offsetToLineCol(view.state.doc, pos);

  let hit: {
    relPath: string;
    line: number;
    column: number;
    endLine?: number;
    endColumn?: number;
  } | null = null;

  try {
    hit = await fetchTsDefinition({
      relPath: h.relPath,
      line,
      column,
      content: view.state.doc.toString(),
    });
  } catch {
    hit = null;
  }

  if (!hit) {
    const local = findDefinitionInDocument(view.state.doc, pos);
    if (local) {
      const loc = offsetToLineCol(view.state.doc, local.from);
      const { snippet, startLine } = snippetAround(view.state.doc.toString(), loc.line);
      setLastPeekDefinition({
        relPath: h.relPath,
        line: loc.line,
        column: loc.column,
        word,
        snippet,
        startLine,
      });
      return;
    }
    try {
      const { cross } = await findDefinitionLocation(view.state.doc, pos, h.relPath, h.readFile);
      if (cross) {
        const text = (await h.readFile?.(cross.relPath)) || "";
        // 启发式：用符号名在目标文件中找首行
        const lines = text.replace(/\r\n/g, "\n").split("\n");
        let foundLine = 1;
        const re = new RegExp(
          `(function|class|const|let|var|type|interface|enum)\\s+${cross.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        );
        for (let i = 0; i < lines.length; i++) {
          if (re.test(lines[i]!)) {
            foundLine = i + 1;
            break;
          }
        }
        const { snippet, startLine } = snippetAround(text, foundLine);
        setLastPeekDefinition({
          relPath: cross.relPath,
          line: foundLine,
          column: 1,
          word: cross.word || word,
          snippet,
          startLine,
        });
        return;
      }
    } catch {
      /* ignore */
    }
    setLastPeekDefinition(null);
    return;
  }

  const same =
    hit.relPath.replace(/\\/g, "/") === h.relPath.replace(/\\/g, "/") ||
    h.relPath.replace(/\\/g, "/").endsWith("/" + hit.relPath.replace(/\\/g, "/"));
  let text = "";
  if (same) {
    text = view.state.doc.toString();
  } else {
    text = (await h.readFile?.(hit.relPath)) || "";
  }
  const { snippet, startLine } = snippetAround(text, hit.line);
  setLastPeekDefinition({
    relPath: hit.relPath,
    line: hit.line,
    column: hit.column,
    endLine: hit.endLine,
    endColumn: hit.endColumn,
    word,
    snippet,
    startLine,
  });
}

export function changeAllOccurrences(view: EditorView, pos: number, readOnly?: boolean) {
  if (readOnly) return false;
  const hit = wordAtPos(view.state.doc, pos);
  if (!hit) return false;
  const next = window.prompt(`将所有「${hit.word}」替换为`, hit.word);
  if (!next || next === hit.word) return false;

  const text = view.state.doc.toString();
  const re = new RegExp(
    `(?<![\\p{L}\\p{N}_$])${hit.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}_$])`,
    "gu",
  );
  const newText = text.replace(re, next);
  if (newText === text) return false;
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: newText },
  });
  view.focus();
  return true;
}

export async function execClipboard(
  action: "cut" | "copy" | "paste",
  view: EditorView,
  readOnly?: boolean,
) {
  view.focus();
  if (action === "paste" && readOnly) return;
  try {
    if (action === "copy" || action === "cut") {
      const text = view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to);
      if (!text && action === "cut") return;
      await navigator.clipboard.writeText(text);
      if (action === "cut" && !readOnly) {
        view.dispatch(view.state.replaceSelection(""));
      }
      return;
    }
    const clip = await navigator.clipboard.readText();
    if (!readOnly) view.dispatch(view.state.replaceSelection(clip));
  } catch {
    document.execCommand(action);
  }
}

function lineColumnToPos(doc: EditorView["state"]["doc"], line: number, column: number): number {
  const ln = Math.max(1, Math.min(line, doc.lines));
  const lineObj = doc.line(ln);
  const col = Math.max(0, column - 1);
  return Math.min(lineObj.from + col, lineObj.to);
}

export function applyPendingLineGoto(view: EditorView, relPath: string): boolean {
  if (!pathsMatchPendingLine(relPath)) return false;
  const pending = peekPendingLineGoto();
  if (!pending) return false;
  if (!view.state.doc.length && pending.line > 1) return false;

  const from = lineColumnToPos(view.state.doc, pending.line, pending.column);
  const to = Math.min(from + 1, view.state.doc.length);
  consumePendingLineGoto();
  clearPendingGotoRetry();
  scrollToLocation(view, { from, to });
  return true;
}

export function applyPendingGoto(view: EditorView, relPath: string): boolean {
  if (applyPendingLineGoto(view, relPath)) return true;
  if (!pathsMatchPending(relPath)) return false;
  const pending = peekPendingSymbolGoto();
  if (!pending) return false;

  const text = view.state.doc.toString();
  if (!text.trim()) return false;

  let target: Pick<SourceLocation, "from" | "to"> | null = null;
  if (pending.from != null && pending.from >= 0 && pending.from < text.length) {
    const len = pending.word ? pending.word.length : 1;
    target = { from: pending.from, to: Math.min(pending.from + len, text.length) };
  } else if (pending.word) {
    target =
      findDeclarationInText(text, pending.word) ?? findReferencesInText(text, pending.word)[0] ?? null;
  } else {
    target = { from: 0, to: 1 };
  }

  if (!target) return false;
  consumePendingSymbolGoto();
  clearPendingGotoRetry();
  scrollToLocation(view, target);
  return true;
}

export function runPendingGotoWithRetry(view: EditorView, relPath: string): () => void {
  let tries = 0;
  let cancelled = false;
  const maxTries = 12;

  const cancel = () => {
    cancelled = true;
  };

  registerPendingGotoRetry(cancel);

  const tick = () => {
    if (cancelled) return;
    if (!pathsMatchAnyPending(relPath)) {
      clearPendingGotoRetry();
      return;
    }
    if (applyPendingGoto(view, relPath)) return;
    if (++tries >= maxTries) {
      clearPendingSymbolGoto();
      clearPendingLineGoto();
      clearPendingGotoRetry();
      return;
    }
    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
  return cancel;
}

async function goToKind(
  view: EditorView,
  pos: number,
  kind: "type" | "impl",
) {
  const h = getEditorIdeHandlers();
  const { line, column } = offsetToLineCol(view.state.doc, pos);
  const hit =
    kind === "type"
      ? await fetchTsTypeDefinition({
          relPath: h.relPath,
          line,
          column,
          content: view.state.doc.toString(),
        })
      : await fetchTsImplementation({
          relPath: h.relPath,
          line,
          column,
          content: view.state.doc.toString(),
        });
  if (!hit) return;
  const same =
    hit.relPath.replace(/\\/g, "/") === h.relPath.replace(/\\/g, "/") ||
    h.relPath.replace(/\\/g, "/").endsWith("/" + hit.relPath.replace(/\\/g, "/"));
  if (same) {
    const from = lineColumnToPos(view.state.doc, hit.line, hit.column);
    scrollToLocation(view, { from, to: from + 1 });
    return;
  }
  if (h.onOpenFile) {
    setPendingLineGoto(hit.relPath, hit.line, hit.column);
    h.onOpenFile(hit.relPath);
  }
}

const ideKeymap = keymap.of([
  {
    key: "F12",
    run: (view) => {
      void goToDefinition(view, view.state.selection.main.head);
      return true;
    },
  },
  {
    key: "Shift-F12",
    run: (view) => {
      void findAllReferences(view, view.state.selection.main.head);
      return true;
    },
  },
  {
    key: "F2",
    run: (view) => {
      void renameSymbolAt(view, view.state.selection.main.head, getEditorIdeHandlers().readOnly);
      return true;
    },
  },
  {
    key: "Mod-F2",
    run: (view) =>
      changeAllOccurrences(view, view.state.selection.main.head, getEditorIdeHandlers().readOnly),
  },
  {
    key: "Alt-F12",
    run: (view) => {
      void peekDefinition(view, view.state.selection.main.head);
      return true;
    },
  },
  {
    key: "Shift-Alt-F12",
    run: (view) => {
      void goToKind(view, view.state.selection.main.head, "type");
      return true;
    },
  },
  {
    key: "Mod-F12",
    run: (view) => {
      void goToKind(view, view.state.selection.main.head, "impl");
      return true;
    },
  },
  {
    key: "Shift-Alt-o",
    run: (view) => {
      void organizeImportsAt(view, getEditorIdeHandlers().readOnly);
      return true;
    },
  },
  {
    key: "Alt-.",
    run: (view) => {
      void quickFixAt(view, getEditorIdeHandlers().readOnly);
      return true;
    },
  },
  {
    key: "Mod-.",
    run: (view) => {
      void quickFixAt(view, getEditorIdeHandlers().readOnly);
      return true;
    },
  },
]);

async function quickFixAt(view: EditorView, readOnly?: boolean) {
  if (readOnly) return false;
  const h = getEditorIdeHandlers();
  if (!/\.(tsx?|jsx?|mjs|cjs)$/i.test(h.relPath)) return false;
  const api = (await import("@/lib/desktop-api")).getDesktop();
  if (!api?.workspaceTsCodeFixes || !api.workspaceTsApplyCodeFix) return false;
  const pos = view.state.selection.main.head;
  const { line, column } = offsetToLineCol(view.state.doc, pos);
  const content = view.state.doc.toString();
  try {
    const listed = await api.workspaceTsCodeFixes({
      relPath: h.relPath,
      line,
      column,
      content,
    });
    const fixes = listed?.fixes || [];
    if (!fixes.length) return false;
    const labels = fixes.map((f, i) => `${i + 1}. ${f.description}`).join("\n");
    const pickRaw = window.prompt(`Quick Fix（输入序号）\n${labels}`, "1");
    if (!pickRaw) return false;
    const idx = Math.max(0, Math.min(fixes.length - 1, (Number(pickRaw) || 1) - 1));
    const fix = fixes[idx]!;
    const applied = await api.workspaceTsApplyCodeFix({
      relPath: h.relPath,
      content,
      fix,
    });
    if (!applied?.ok || typeof applied.content !== "string") return false;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: applied.content },
    });
    const others = (applied.files || []).filter(
      (f) => f.path.replace(/\\/g, "/") !== h.relPath.replace(/\\/g, "/"),
    );
    if (others.length && api.workspaceApplyWriteFence) {
      await api.workspaceApplyWriteFence(others);
    }
    return true;
  } catch {
    return false;
  }
}

async function organizeImportsAt(view: EditorView, readOnly?: boolean) {
  if (readOnly) return false;
  const h = getEditorIdeHandlers();
  if (!/\.(tsx?|jsx?|mjs|cjs)$/i.test(h.relPath)) return false;
  const api = (await import("@/lib/desktop-api")).getDesktop();
  if (!api?.workspaceTsOrganizeImports) return false;
  try {
    const r = await api.workspaceTsOrganizeImports({
      relPath: h.relPath,
      content: view.state.doc.toString(),
    });
    if (!r?.ok || !r.changed || typeof r.content !== "string") return false;
    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: r.content },
    });
    return true;
  } catch {
    return false;
  }
}

const ideHover = hoverTooltip(
  async (view, pos) => {
    const h = getEditorIdeHandlers();
    const { line, column } = offsetToLineCol(view.state.doc, pos);
    const content = view.state.doc.toString();
    const [lsp, sig] = await Promise.all([
      fetchTsHover({ relPath: h.relPath, line, column, content }),
      fetchTsSignatureHelp({ relPath: h.relPath, line, column, content }),
    ]);
    if (lsp?.display || sig?.items?.length) {
      const from = lsp
        ? lineColumnToPos(view.state.doc, lsp.fromLine, lsp.fromCol)
        : pos;
      const to = lsp
        ? lineColumnToPos(view.state.doc, lsp.toLine, lsp.toCol)
        : pos + 1;
      return {
        pos: from,
        end: Math.max(to, from + 1),
        above: true,
        create() {
          const dom = document.createElement("div");
          dom.className = "cm-ide-hover";
          if (lsp?.display) {
            const title = document.createElement("div");
            title.className = "cm-ide-hover-title";
            title.textContent = lsp.display;
            dom.appendChild(title);
            if (lsp.kind) {
              const meta = document.createElement("div");
              meta.className = "cm-ide-hover-meta";
              meta.textContent = lsp.kind;
              dom.appendChild(meta);
            }
            if (lsp.documentation) {
              const def = document.createElement("div");
              def.className = "cm-ide-hover-def";
              def.textContent = lsp.documentation;
              dom.appendChild(def);
            }
          }
          if (sig?.items?.length) {
            const active = sig.items[sig.activeSignature] || sig.items[0]!;
            const sigEl = document.createElement("div");
            sigEl.className = "cm-ide-hover-def";
            sigEl.textContent = active.label;
            dom.appendChild(sigEl);
          }
          return { dom };
        },
      };
    }

    const info = analyzeSymbolAt(view.state.doc, pos);
    if (!info) return null;
    return {
      pos: info.from,
      end: info.to,
      above: true,
      create() {
        const dom = document.createElement("div");
        dom.className = "cm-ide-hover";
        const title = document.createElement("div");
        title.className = "cm-ide-hover-title";
        title.textContent = info.word;
        const meta = document.createElement("div");
        meta.className = "cm-ide-hover-meta";
        meta.textContent = kindLabel(info.kind);
        dom.append(title, meta);
        if (info.definition?.preview) {
          const def = document.createElement("div");
          def.className = "cm-ide-hover-def";
          def.textContent = info.definition.preview;
          dom.appendChild(def);
        }
        return { dom };
      },
    };
  },
  { hoverTime: 400 },
);

const ideDomHandlers = EditorView.domEventHandlers({
  click(event, view) {
    if (!(event.metaKey || event.ctrlKey) || event.button !== 0) return false;
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos == null || !wordAtPos(view.state.doc, pos)) return false;
    void goToDefinition(view, pos);
    return true;
  },
  contextmenu(event, view) {
    if (getEditorIdeHandlers().isMenuOpen?.()) return true;
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos == null) return false;
    event.preventDefault();
    event.stopPropagation();
    getEditorIdeHandlers().onContextMenu?.({ x: event.clientX, y: event.clientY, pos, view });
    return true;
  },
});

export const editorIdeExtensions: Extension[] = [
  referenceHighlightField,
  ideHover,
  ideDomHandlers,
  ideKeymap,
];
