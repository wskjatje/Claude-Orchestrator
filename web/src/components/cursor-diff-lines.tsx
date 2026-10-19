import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { highlightDiffLine } from "@/components/chat-diff-highlight";
import { expandFoldLine, type ChatFileEditLine } from "@/lib/parse-chat-file-edits";

/**
 * 对齐 Cursor 对话 diff：
 * 单栏行号 | ± | 代码；行级淡色底（非整块染色）。
 */
export function CursorDiffLines({
  lines,
  language,
  onLineClick,
  className,
}: {
  lines: ChatFileEditLine[];
  language?: string;
  onLineClick?: (line: ChatFileEditLine) => void;
  className?: string;
}) {
  const [localLines, setLocalLines] = useState(lines);
  useEffect(() => {
    setLocalLines(lines);
  }, [lines]);

  const lang = language || "text";

  return (
    <div className={cn("cursor-diff-lines", className)} role="table" aria-label="diff">
      {localLines.map((line, i) => {
        if (line.kind === "fold") {
          return (
            <button
              key={`fold:${i}:${line.text}`}
              type="button"
              className="cursor-diff-line cursor-diff-line--fold"
              onClick={() =>
                setLocalLines((prev) => {
                  const idx =
                    prev[i]?.kind === "fold"
                      ? i
                      : prev.findIndex(
                          (l) =>
                            l.kind === "fold" &&
                            l.text === line.text &&
                            l.oldLine === line.oldLine &&
                            l.newLine === line.newLine,
                        );
                  return idx >= 0 ? expandFoldLine(prev, idx) : prev;
                })
              }
            >
              <span className="cursor-diff-gutter" aria-hidden />
              <span className="cursor-diff-prefix" aria-hidden />
              <span className="cursor-diff-fold-label">{line.text || "⋯"}</span>
            </button>
          );
        }

        const prefix = line.prefix ?? (line.kind === "add" ? "+" : line.kind === "del" ? "-" : " ");
        const lineNo =
          line.kind === "del"
            ? line.oldLine
            : line.kind === "add"
              ? line.newLine
              : (line.newLine ?? line.oldLine);
        const clickable = Boolean(onLineClick);
        const Tag = clickable ? "button" : "div";

        return (
          <Tag
            key={`${i}:${line.kind}:${line.oldLine ?? ""}:${line.newLine ?? ""}:${line.text.slice(0, 32)}`}
            type={clickable ? "button" : undefined}
            className={cn(
              "cursor-diff-line",
              line.kind === "add" && "cursor-diff-line--add",
              line.kind === "del" && "cursor-diff-line--del",
              line.kind === "ctx" && "cursor-diff-line--ctx",
              clickable && "cursor-diff-line--clickable",
            )}
            onClick={
              clickable
                ? () => {
                    onLineClick?.(line);
                  }
                : undefined
            }
            title={clickable ? "跳转到编辑器" : undefined}
          >
            <span className="cursor-diff-gutter" aria-hidden>
              {lineNo != null ? String(lineNo) : ""}
            </span>
            <span
              className={cn(
                "cursor-diff-prefix",
                line.kind === "add" && "cursor-diff-prefix--add",
                line.kind === "del" && "cursor-diff-prefix--del",
              )}
              aria-hidden
            >
              {prefix}
            </span>
            <span className="cursor-diff-code">{highlightDiffLine(line.text || " ", lang)}</span>
          </Tag>
        );
      })}
    </div>
  );
}
