import { isValidElement, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CopyTextButton } from "@/components/copy-text-button";

export type ChatMarkdownVariant = "chat" | "workbench";

type ChatMarkdownProps = {
  content: string;
  className?: string;
  /** chat：紧凑气泡；workbench：编辑器 Markdown Preview（正文字色） */
  variant?: ChatMarkdownVariant;
};

function extractPlainText(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(extractPlainText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) {
    return extractPlainText(node.props.children);
  }
  return "";
}

function MarkdownCodeBlock({
  codeClass,
  children,
  variant,
  ...props
}: {
  codeClass?: string;
  children?: ReactNode;
  variant: ChatMarkdownVariant;
}) {
  const text = extractPlainText(children).replace(/\n$/, "");
  const isBlock = Boolean(codeClass?.includes("language-"));
  const isDiff = Boolean(codeClass?.includes("language-diff"));
  const lineCount = text.split("\n").length;
  const collapsible = isBlock && lineCount > 4;
  const [expanded, setExpanded] = useState(false);
  const workbench = variant === "workbench";

  if (!isBlock) {
    return (
      <code
        className={cn(
          "rounded-md font-mono text-foreground",
          workbench
            ? "bg-muted/55 px-1.5 py-0.5 text-[0.9em]"
            : "bg-muted/60 px-1.5 py-0.5 text-[length:var(--font-size-sm)]",
        )}
        {...props}
      >
        {children}
      </code>
    );
  }

  const diffBody =
    isDiff && text
      ? text.split("\n").map((line, i) => {
          if (line.startsWith("+")) {
            return (
              <span key={i} className="diff-add block">
                {line}
              </span>
            );
          }
          if (line.startsWith("-")) {
            return (
              <span key={i} className="diff-del block">
                {line}
              </span>
            );
          }
          return (
            <span key={i} className="block">
              {line}
            </span>
          );
        })
      : null;

  return (
    <div className={cn("group/code relative", workbench ? "my-3" : "my-2.5")}>
      <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover/code:opacity-100">
        <CopyTextButton text={text} size="xs" className="bg-background/95" />
      </div>
      <div
        className={cn(
          "overflow-hidden rounded-lg border border-border/60 bg-code-bg",
          collapsible && !expanded && "max-h-[calc(4*1.45em+20px)]",
        )}
      >
        <pre
          className={cn(
            "overflow-x-auto px-3 py-2.5 pr-16 font-mono leading-relaxed text-foreground",
            workbench ? "text-[13px]" : "text-[length:var(--font-size-sm)]",
            isDiff && "chat-diff-block",
            collapsible && !expanded && "overflow-hidden",
          )}
        >
          <code className={cn("block whitespace-pre", codeClass && !isDiff && codeClass)} {...props}>
            {isDiff ? diffBody : children}
          </code>
        </pre>
        {collapsible && !expanded ? (
          <div className="relative">
            <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background to-transparent" />
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1 border-0 px-0 pb-1 pt-4 text-[12px] text-muted-foreground hover:text-foreground"
              onClick={() => setExpanded(true)}
            >
              <ChevronDown className="h-3 w-3" />
              展开全部
            </button>
          </div>
        ) : collapsible && expanded ? (
          <button
            type="button"
            className="flex w-full items-center justify-center gap-1 border-0 px-0 py-1 text-[12px] text-muted-foreground hover:text-foreground"
            onClick={() => setExpanded(false)}
          >
            <ChevronDown className="h-3 w-3 rotate-180" />
            收起
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Markdown：标题、列表、带复制按钮的代码块。 */
export function ChatMarkdown({ content, className, variant = "chat" }: ChatMarkdownProps) {
  const workbench = variant === "workbench";

  return (
    <div
      className={cn(
        "min-w-0 leading-relaxed text-foreground",
        workbench ? "workbench-md-body" : "chat-md",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1
              className={cn(
                "font-semibold tracking-tight text-foreground first:mt-0",
                workbench
                  ? "mb-4 mt-0 border-b border-border/70 pb-2 text-[1.625rem] leading-snug"
                  : "mb-2 mt-4 text-[1.05rem]",
              )}
            >
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2
              className={cn(
                "font-semibold tracking-tight text-foreground first:mt-0",
                workbench ? "mb-3 mt-7 text-[1.35rem] leading-snug" : "mb-2 mt-4 text-[1rem]",
              )}
            >
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3
              className={cn(
                "font-semibold text-foreground first:mt-0",
                workbench ? "mb-2 mt-5 text-[1.15rem]" : "mb-1.5 mt-3 text-[0.95rem]",
              )}
            >
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4
              className={cn(
                "font-semibold text-foreground first:mt-0",
                workbench ? "mb-1.5 mt-4 text-[1.05rem]" : "mb-1 mt-2.5 text-[0.9rem]",
              )}
            >
              {children}
            </h4>
          ),
          p: ({ children }) => (
            <p className={cn("last:mb-0 text-foreground", workbench ? "mb-3.5" : "mb-2")}>
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul
              className={cn(
                "list-disc space-y-1 pl-5 last:mb-0 text-foreground",
                workbench ? "mb-3.5" : "mb-2",
              )}
            >
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol
              className={cn(
                "list-decimal space-y-1 pl-5 last:mb-0 text-foreground",
                workbench ? "mb-3.5" : "mb-2",
              )}
            >
              {children}
            </ol>
          ),
          li: ({ children }) => <li className="leading-relaxed text-foreground">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => (
            <em className={workbench ? "italic text-foreground" : "text-muted-foreground"}>
              {children}
            </em>
          ),
          hr: () => <hr className={cn("border-border/70", workbench ? "my-6" : "my-4")} />,
          blockquote: ({ children }) => (
            <blockquote
              className={cn(
                "border-l-[3px] border-border pl-3 text-muted-foreground",
                workbench ? "my-3.5 py-0.5" : "my-2 border-l-2",
              )}
            >
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              className="text-primary underline underline-offset-2 hover:text-primary/80"
              target="_blank"
              rel="noreferrer"
            >
              {children}
            </a>
          ),
          pre: ({ children }) => <>{children}</>,
          code: ({ className: codeClass, children, ...props }) => (
            <MarkdownCodeBlock codeClass={codeClass} variant={variant} {...props}>
              {children}
            </MarkdownCodeBlock>
          ),
          table: ({ children }) => (
            <div className={cn("overflow-x-auto rounded-lg border border-border/60", workbench ? "my-3.5" : "my-2")}>
              <table
                className={cn(
                  "w-full border-collapse",
                  workbench ? "text-[13px]" : "text-[length:var(--font-size-sm)]",
                )}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-muted/40 px-3 py-1.5 text-left font-semibold text-foreground">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/60 px-3 py-1.5 text-foreground">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
