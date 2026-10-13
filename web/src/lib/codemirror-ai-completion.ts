import { type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { getDesktop } from "@/lib/desktop-api";
import { fetchAiCompletionText, slicePrefixSuffix } from "@/lib/ai-completion-fetch";

/**
 * AI 下拉补全：仅显式触发（Ctrl-Space 等），避免与幽灵文本双打模型。
 * 日常停顿续写由 ghostTextExtension 负责。
 */
export function aiCompletionSource(relPath: string) {
  return async (context: CompletionContext): Promise<CompletionResult | null> => {
    if (!context.explicit) return null;
    if (!getDesktop()?.claudeCodePrompt) return null;

    const pos = context.pos;
    const doc = context.state.doc.toString();
    const { prefix, suffix } = slicePrefixSuffix(doc, pos);
    if (!prefix.trim()) return null;

    const ac = new AbortController();
    const onAbort = () => ac.abort();
    context.addEventListener?.("abort", onAbort);
    // CompletionContext 用 aborted 标志；部分版本无 addEventListener
    const poll = setInterval(() => {
      if (context.aborted) ac.abort();
    }, 80);

    try {
      const text = await fetchAiCompletionText({
        relPath,
        prefix,
        suffix,
        requestId: `tab-complete-${Date.now()}`,
        signal: ac.signal,
      });
      if (ac.signal.aborted || context.aborted || !text) return null;
      const word = context.matchBefore(/\w+$/);
      const from = word ? word.from : pos;
      return {
        from,
        options: [
          {
            label: text.split("\n")[0]!.slice(0, 48) + (text.includes("\n") ? "…" : ""),
            apply: text,
            type: "text",
            boost: 40,
            detail: "AI",
          },
        ],
        filter: false,
      };
    } catch {
      return null;
    } finally {
      clearInterval(poll);
    }
  };
}
