import { cn } from "@/lib/utils";

/** Renders a unified diff (lines starting with +, -, @@) with semantic colors. */
export function DiffBlock({ diff }: { diff: string }) {
  const lines = diff.split("\n");
  return (
    <pre className="overflow-x-auto rounded-lg border border-border bg-code-bg font-mono text-[12px] leading-relaxed">
      {lines.map((line, i) => {
        let cls = "px-3 text-foreground/70";
        if (line.startsWith("+++") || line.startsWith("---")) cls = "px-3 bg-diff-hunk/40 text-diff-hunk-fg font-semibold";
        else if (line.startsWith("@@")) cls = "px-3 bg-diff-hunk/30 text-diff-hunk-fg";
        else if (line.startsWith("+")) cls = "px-3 bg-diff-add/40 text-diff-add-fg";
        else if (line.startsWith("-")) cls = "px-3 bg-diff-del/40 text-diff-del-fg";
        return (
          <div key={i} className={cls}>
            {line || " "}
          </div>
        );
      })}
    </pre>
  );
}
