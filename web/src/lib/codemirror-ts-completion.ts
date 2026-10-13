import { type Completion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { fetchTsCompletions } from "@/lib/workspace-tsservice-client";
import { offsetToLineCol } from "@/lib/workspace-tsservice-client";

function mapKind(kind: string | undefined): string {
  const k = String(kind || "").toLowerCase();
  if (k.includes("method") || k.includes("function")) return "function";
  if (k.includes("class") || k.includes("interface") || k.includes("type")) return "class";
  if (k.includes("enum")) return "enum";
  if (k.includes("keyword")) return "keyword";
  if (k.includes("module") || k.includes("script")) return "namespace";
  if (k.includes("property") || k.includes("var") || k.includes("let") || k.includes("const"))
    return "variable";
  return "text";
}

/**
 * TS Language Service 补全源（主源，boost 高于 AI）。
 */
export function tsCompletionSource(relPath: string) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    if (!/\.(tsx?|jsx?|mjs|cjs|py|go|rs)$/i.test(relPath)) return null;
    const match = context.matchBefore(/[\w$]+/);
    if (!context.explicit && !match) return null;

    const pos = context.pos;
    const { line, column } = offsetToLineCol(context.state.doc, pos);
    const r = await fetchTsCompletions({
      relPath,
      line,
      column,
      content: context.state.doc.toString(),
    });
    if (context.aborted || !r?.completions?.length) return null;

    const from =
      match?.from ??
      (() => {
        // LS 返回的 fromLine/fromCol
        try {
          const ln = context.state.doc.line(r.fromLine);
          return Math.min(ln.from + Math.max(0, r.fromCol - 1), ln.to);
        } catch {
          return pos;
        }
      })();

    const options: Completion[] = r.completions.map((c) => ({
      label: c.label,
      type: mapKind(c.kind),
      detail: c.detail || undefined,
      apply: c.insertText || c.label,
      boost: 80,
      sortText: c.sortText,
    }));

    return { from, options, filter: true };
  };
}
