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
  setPendingSymbolGoto,
} from "@/lib/codemirror-pending-goto";
import { getEditorIdeHandlers, type EditorIdeHandlers } from "@/lib/codemirror-ide-handlers";

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

export function findAllReferences(view: EditorView, pos: number) {
  const hit = wordAtPos(view.state.doc, pos);
  if (!hit) return 0;
  const refs = findReferencesInText(view.state.doc.toString(), hit.word);
  const deco = referenceDecorations(view, hit.word);
  view.dispatch({ effects: setReferenceHighlight.of(deco) });
  if (refs[0]) scrollToLocation(view, refs[0]);
  return refs.length;
}

export function renameSymbolAt(view: EditorView, pos: number, readOnly?: boolean) {
  if (readOnly) return false;
  const hit = wordAtPos(view.state.doc, pos);
  if (!hit) return false;
  const next = window.prompt(`重命名「${hit.word}」`, hit.word);
  if (!next || next === hit.word) return false;
  if (!/^[\p{L}_$][\p{L}\p{N}_$]*$/u.test(next)) return false;

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
      findAllReferences(view, view.state.selection.main.head);
      return true;
    },
  },
  {
    key: "F2",
    run: (view) => renameSymbolAt(view, view.state.selection.main.head, getEditorIdeHandlers().readOnly),
  },
  {
    key: "Mod-F2",
    run: (view) =>
      changeAllOccurrences(view, view.state.selection.main.head, getEditorIdeHandlers().readOnly),
  },
]);

const ideHover = hoverTooltip(
  (view, pos) => {
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
  { hoverTime: 500 },
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
