/**
 * CodeMirror SCM gutter：按 git diff 在行号旁标绿（增）/蓝（改）。
 */
import {
  type Extension,
  RangeSetBuilder,
  StateEffect,
  StateField,
} from "@codemirror/state";
import { EditorView, GutterMarker, gutter } from "@codemirror/view";
import { getDesktop } from "@/lib/desktop-api";

export type ScmLineKind = "add" | "mod";

const setScmLines = StateEffect.define<Map<number, ScmLineKind>>();

class ScmMarker extends GutterMarker {
  constructor(readonly kind: ScmLineKind) {
    super();
  }
  eq(other: ScmMarker) {
    return other.kind === this.kind;
  }
  toDOM() {
    const el = document.createElement("div");
    el.className =
      this.kind === "add" ? "cm-scm-gutter-add" : "cm-scm-gutter-mod";
    el.title = this.kind === "add" ? "新增行" : "修改行";
    return el;
  }
}

const addMarker = new ScmMarker("add");
const modMarker = new ScmMarker("mod");

const scmLinesField = StateField.define<Map<number, ScmLineKind>>({
  create: () => new Map(),
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(setScmLines)) return e.value;
    }
    return value;
  },
});

/** 从 unified diff 解析「新文件侧」变更行号 */
export function parseScmChangedLines(
  diffText: string,
  relPath: string,
): Map<number, ScmLineKind> {
  const out = new Map<number, ScmLineKind>();
  const norm = relPath.replace(/\\/g, "/").replace(/^\.\//, "");
  const base = norm.split("/").pop() || norm;
  const chunks = String(diffText || "").split(/(?=^diff --git )/m);
  for (const body of chunks) {
    const m =
      body.match(/^diff --git a\/(.+?) b\/(.+)$/m) ||
      body.match(/^\+\+\+ b\/(.+)$/m);
    const path = String(m?.[2] || m?.[1] || "")
      .replace(/\\/g, "/")
      .trim();
    if (!path || (path !== norm && path !== base && !path.endsWith("/" + base))) {
      continue;
    }
    let newLine = 0;
    let inHunk = false;
    let hunkHasDel = false;
    let pendingAdds: number[] = [];
    const flushAdds = () => {
      for (const ln of pendingAdds) {
        out.set(ln, hunkHasDel ? "mod" : "add");
      }
      pendingAdds = [];
      hunkHasDel = false;
    };
    for (const raw of body.replace(/\r\n/g, "\n").split("\n")) {
      const hunk = raw.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s@@/);
      if (hunk) {
        flushAdds();
        newLine = Number(hunk[1]) || 0;
        inHunk = true;
        continue;
      }
      if (!inHunk) continue;
      if (raw.startsWith("+") && !raw.startsWith("+++")) {
        pendingAdds.push(newLine);
        newLine++;
      } else if (raw.startsWith("-") && !raw.startsWith("---")) {
        hunkHasDel = true;
      } else if (raw.startsWith(" ") || raw === "") {
        flushAdds();
        if (newLine) newLine++;
      }
    }
    flushAdds();
  }
  return out;
}

function scmGutterExt(): Extension {
  return [
    scmLinesField,
    gutter({
      class: "cm-scm-gutter",
      markers(view) {
        const map = view.state.field(scmLinesField);
        const builder = new RangeSetBuilder<GutterMarker>();
        const sorted = [...map.keys()].sort((a, b) => a - b);
        for (const ln of sorted) {
          if (ln < 1 || ln > view.state.doc.lines) continue;
          const line = view.state.doc.line(ln);
          const kind = map.get(ln)!;
          builder.add(line.from, line.from, kind === "add" ? addMarker : modMarker);
        }
        return builder.finish();
      },
      initialSpacer: () => addMarker,
    }),
    EditorView.baseTheme({
      ".cm-scm-gutter": {
        width: "3px",
        minWidth: "3px",
      },
      ".cm-scm-gutter-add": {
        width: "3px",
        height: "100%",
        minHeight: "1.2em",
        backgroundColor: "var(--diff-add-fg, #3fb950)",
        opacity: "0.85",
      },
      ".cm-scm-gutter-mod": {
        width: "3px",
        height: "100%",
        minHeight: "1.2em",
        backgroundColor: "var(--info, #58a6ff)",
        opacity: "0.9",
      },
    }),
  ];
}

/** 拉取路径 diff 并写入 SCM gutter；返回 dispose */
export function createScmGutterController(relPath: string): {
  extension: Extension[];
  attach: (view: EditorView) => void;
  dispose: () => void;
} {
  let cancelled = false;
  let viewRef: EditorView | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const load = async () => {
    const api = getDesktop();
    if (!api?.workspaceGetGitDiffPaths || !viewRef || cancelled) return;
    try {
      const r = await api.workspaceGetGitDiffPaths({ paths: [relPath] });
      if (cancelled || !viewRef) return;
      const map =
        r?.ok && r.diff
          ? parseScmChangedLines(String(r.diff), relPath)
          : new Map<number, ScmLineKind>();
      viewRef.dispatch({ effects: setScmLines.of(map) });
    } catch {
      /* ignore */
    }
  };

  return {
    extension: [
      scmGutterExt(),
      EditorView.updateListener.of((update) => {
        if (!update.docChanged || !viewRef) return;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => void load(), 400);
      }),
    ],
    attach(view: EditorView) {
      viewRef = view;
      void load();
    },
    dispose() {
      cancelled = true;
      viewRef = null;
      if (timer) clearTimeout(timer);
    },
  };
}
