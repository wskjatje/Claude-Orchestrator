import { linter, type Diagnostic } from "@codemirror/lint";
import type { EditorView } from "@codemirror/view";
import type { WorkbenchProblem } from "@/types/workbench-problems";

function lineColToPos(doc: EditorView["state"]["doc"], line: number, col: number): number {
  const ln = Math.max(1, Math.min(line, doc.lines));
  const lineObj = doc.line(ln);
  return Math.min(lineObj.from + Math.max(0, col - 1), lineObj.to);
}

export function workspaceLinterExtension(
  relPath: string,
  getProblems: () => WorkbenchProblem[],
) {
  return linter((view) => {
    const fileProblems = getProblems().filter((p) => p.relPath === relPath);
    const diags: Diagnostic[] = [];
    for (const p of fileProblems) {
      const from = lineColToPos(view.state.doc, p.line, p.column);
      const to = lineColToPos(
        view.state.doc,
        p.endLine ?? p.line,
        p.endColumn ?? p.column + 1,
      );
      diags.push({
        from: Math.min(from, to),
        to: Math.max(from, to, from + 1),
        severity: p.severity,
        message: p.rule ? `${p.message} (${p.rule})` : p.message,
      });
    }
    return diags;
  });
}
