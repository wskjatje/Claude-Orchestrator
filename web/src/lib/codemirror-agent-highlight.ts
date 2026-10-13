/**
 * Agent 本回合写入：对照 checkpoint 高亮新增行（浅绿背景）。
 */
import { type Extension, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state";
import { Decoration, type DecorationSet, EditorView } from "@codemirror/view";
import { peekWorkspaceWriteCheckpoint } from "@/lib/workspace-write-checkpoint";
import { buildLineDiffPreview } from "@/lib/parse-chat-file-edits";

const setAgentLines = StateEffect.define<Set<number>>();

const agentLineDeco = Decoration.line({ class: "cm-agent-changed-line" });

const agentLinesField = StateField.define<Set<number>>({
  create: () => new Set(),
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setAgentLines)) return e.value;
    }
    return value;
  },
});

function buildAgentDeco(
  doc: { lines: number; line: (n: number) => { from: number } },
  lines: Set<number>,
): DecorationSet {
  const builder = new RangeSetBuilder<typeof agentLineDeco>();
  const sorted = [...lines].sort((a, b) => a - b);
  for (const ln of sorted) {
    if (ln < 1 || ln > doc.lines) continue;
    const line = doc.line(ln);
    builder.add(line.from, line.from, agentLineDeco);
  }
  return builder.finish();
}

const agentDecoField = StateField.define<DecorationSet>({
  create: () => Decoration.none,
  update(value, tr) {
    let lines: Set<number> | null = null;
    for (const e of tr.effects) {
      if (e.is(setAgentLines)) lines = e.value;
    }
    if (!lines) {
      if (tr.docChanged) return value.map(tr.changes);
      return value;
    }
    return buildAgentDeco(tr.state.doc, lines);
  },
  provide: (f) => EditorView.decorations.from(f),
});

function computeAgentChangedLines(relPath: string, after: string): Set<number> {
  const before = peekWorkspaceWriteCheckpoint(relPath);
  if (before === undefined) return new Set();
  const { previewLines } = buildLineDiffPreview(before, after, 500, {
    allowFullAdd: before === "",
  });
  const set = new Set<number>();
  for (const l of previewLines) {
    if (l.kind === "add" && l.newLine != null) set.add(l.newLine);
  }
  return set;
}

export function createAgentHighlightController(relPath: string): {
  extension: Extension[];
  attach: (view: EditorView) => void;
  dispose: () => void;
} {
  let cancelled = false;
  let viewRef: EditorView | null = null;

  const refresh = () => {
    if (!viewRef || cancelled) return;
    const after = viewRef.state.doc.toString();
    const lines = computeAgentChangedLines(relPath, after);
    viewRef.dispatch({ effects: setAgentLines.of(lines) });
  };

  return {
    extension: [
      agentLinesField,
      agentDecoField,
      EditorView.baseTheme({
        ".cm-agent-changed-line": {
          backgroundColor: "color-mix(in oklab, var(--diff-add) 28%, transparent)",
        },
      }),
    ],
    attach(view: EditorView) {
      viewRef = view;
      refresh();
    },
    dispose() {
      cancelled = true;
      viewRef = null;
    },
  };
}
