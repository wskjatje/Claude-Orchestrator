import {
  EditorSelection,
  StateEffect,
  StateField,
  type Extension,
} from "@codemirror/state";
import { completionStatus } from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";
import {
  Decoration,
  EditorView,
  WidgetType,
  keymap,
} from "@codemirror/view";
import { fetchAiCompletionText, slicePrefixSuffix } from "@/lib/ai-completion-fetch";
import { getUiPrefsCache } from "@/lib/ui-prefs";

function isInCommentOrString(view: EditorView, pos: number): boolean {
  try {
    const node = syntaxTree(view.state).resolveInner(pos, -1);
    let cur: typeof node | null = node;
    while (cur) {
      const name = cur.name.toLowerCase();
      if (
        name.includes("comment") ||
        name.includes("string") ||
        name.includes("template") ||
        (name === "literal" && /['"`]/.test(view.state.doc.sliceString(cur.from, cur.from + 1)))
      ) {
        return true;
      }
      cur = cur.parent;
    }
  } catch {
    /* 无语法树时不抑制 */
  }
  return false;
}

type GhostState = { pos: number; text: string } | null;

const setGhostEffect = StateEffect.define<GhostState>();

class GhostWidget extends WidgetType {
  constructor(readonly text: string) {
    super();
  }
  eq(other: GhostWidget) {
    return other.text === this.text;
  }
  toDOM() {
    const span = document.createElement("span");
    span.className = "cm-ghost-text";
    span.textContent = this.text;
    span.setAttribute("aria-hidden", "true");
    return span;
  }
  ignoreEvent() {
    return true;
  }
}

const ghostField = StateField.define<GhostState>({
  create() {
    return null;
  },
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setGhostEffect)) return e.value;
    }
    if (tr.docChanged || tr.selection) return null;
    return value;
  },
  provide: (f) =>
    EditorView.decorations.from(f, (ghost) => {
      if (!ghost?.text) return Decoration.none;
      const widget = Decoration.widget({
        widget: new GhostWidget(ghost.text),
        side: 1,
      });
      return Decoration.set([widget.range(ghost.pos)]);
    }),
});

function acceptGhost(view: EditorView): boolean {
  const ghost = view.state.field(ghostField, false);
  if (!ghost?.text) return false;
  view.dispatch({
    changes: { from: ghost.pos, insert: ghost.text },
    selection: EditorSelection.cursor(ghost.pos + ghost.text.length),
    effects: setGhostEffect.of(null),
  });
  return true;
}

function clearGhost(view: EditorView): boolean {
  const ghost = view.state.field(ghostField, false);
  if (!ghost) return false;
  view.dispatch({ effects: setGhostEffect.of(null) });
  return true;
}

const DEBOUNCE_MS = 700;
const MIN_PREFIX_CHARS = 8;
const FAIL_BACKOFF_MS = 4000;

/**
 * 幽灵文本补全：停顿后请求模型，灰色内联预览；Tab 接受，Esc 取消。
 */
export function ghostTextExtension(relPath: string): Extension {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let seq = 0;
  let abort: AbortController | null = null;
  let failUntil = 0;

  const schedule = EditorView.updateListener.of((update) => {
    if (!update.docChanged && !update.selectionSet) return;
    if (timer) clearTimeout(timer);
    abort?.abort();
    const view = update.view;
    if (getUiPrefsCache().ghostTextEnabled === false) {
      view.dispatch({ effects: setGhostEffect.of(null) });
      return;
    }
    // LSP 下拉激活时不抢幽灵
    if (completionStatus(view.state) === "active") {
      view.dispatch({ effects: setGhostEffect.of(null) });
      return;
    }
    const sel = view.state.selection.main;
    if (!sel.empty) {
      view.dispatch({ effects: setGhostEffect.of(null) });
      return;
    }
    const pos = sel.head;
    if (isInCommentOrString(view, pos)) {
      view.dispatch({ effects: setGhostEffect.of(null) });
      return;
    }
    // 标识符中间优先留给 LSP 补全
    const chAfter = view.state.doc.sliceString(pos, pos + 1);
    if (/[\w$]/.test(chAfter)) {
      view.dispatch({ effects: setGhostEffect.of(null) });
      return;
    }
    const before = view.state.doc.sliceString(Math.max(0, pos - 1), pos);
    if (!/\S/.test(before) && !update.docChanged) {
      view.dispatch({ effects: setGhostEffect.of(null) });
      return;
    }
    if (Date.now() < failUntil) return;

    const mySeq = ++seq;
    timer = setTimeout(async () => {
      if (getUiPrefsCache().ghostTextEnabled === false) return;
      if (completionStatus(view.state) === "active") return;
      const cur = view.state.selection.main;
      if (!cur.empty || cur.head !== pos) return;
      if (isInCommentOrString(view, pos)) return;
      const doc = view.state.doc.toString();
      const { prefix, suffix } = slicePrefixSuffix(doc, pos);
      if (prefix.trim().length < MIN_PREFIX_CHARS) return;

      abort?.abort();
      const ac = new AbortController();
      abort = ac;
      const text = await fetchAiCompletionText({
        relPath,
        prefix,
        suffix,
        requestId: `ghost-${mySeq}`,
        signal: ac.signal,
      });
      if (ac.signal.aborted || mySeq !== seq) return;
      if (!text) {
        failUntil = Date.now() + FAIL_BACKOFF_MS;
        view.dispatch({ effects: setGhostEffect.of(null) });
        return;
      }
      const now = view.state.selection.main;
      if (!now.empty) return;
      if (completionStatus(view.state) === "active") return;
      view.dispatch({
        effects: setGhostEffect.of({ pos: now.head, text }),
      });
    }, DEBOUNCE_MS);
  });

  const keys = keymap.of([
    {
      key: "Tab",
      run: (view) => {
        // 下拉补全激活时让权，避免抢走 acceptCompletion
        if (completionStatus(view.state) === "active") return false;
        return acceptGhost(view);
      },
    },
    {
      key: "Escape",
      run: (view) => clearGhost(view),
    },
  ]);

  const theme = EditorView.theme({
    ".cm-ghost-text": {
      opacity: "0.42",
      pointerEvents: "none",
      whiteSpace: "pre",
      fontStyle: "italic",
    },
  });

  return [ghostField, schedule, keys, theme];
}
