import { isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { CopyTextButton } from "@/components/copy-text-button";

type ChatMarkdownProps = {
  content: string;
  className?: string;
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
  ...props
}: {
  codeClass?: string;
  children?: ReactNode;
}) {
  const text = extractPlainText(children).replace(/\n$/, "");
  const isBlock = Boolean(codeClass?.includes("language-"));
  const isDiff = Boolean(codeClass?.includes("language-diff"));

  if (!isBlock) {
    return (
      <code
        className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[12px] text-foreground"
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
    <div className="group/code relative my-2.5">
      <div className="absolute right-2 top-2 z-10 opacity-0 transition group-hover/code:opacity-100">
        <CopyTextButton text={text} size="xs" className="bg-background/95" />
      </div>
      <pre
        className={cn(
          "overflow-x-auto rounded-lg border border-border/60 bg-code-bg px-3 py-2.5 pr-16 font-mono text-[12px] leading-relaxed text-foreground",
          isDiff && "chat-diff-block",
        )}
      >
        <code className={cn("block whitespace-pre", codeClass && !isDiff && codeClass)} {...props}>
          {isDiff ? diffBody : children}
        </code>
      </pre>
    </div>
  );
}

/** Cursor 式 Markdown：标题、列表、带复制按钮的代码块。 */
export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div className={cn("chat-md min-w-0 text-[13px] leading-relaxed text-foreground", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2 mt-4 text-[1.05rem] font-semibold tracking-tight first:mt-0">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-4 text-[1rem] font-semibold tracking-tight first:mt-0">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-3 text-[0.95rem] font-semibold first:mt-0">{children}</h3>
          ),
          h4: ({ children }) => (
            <h4 className="mb-1 mt-2.5 text-[0.9rem] font-semibold first:mt-0">{children}</h4>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
          em: ({ children }) => <em className="text-muted-foreground">{children}</em>,
          hr: () => <hr className="my-4 border-border/70" />,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">
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
            <MarkdownCodeBlock codeClass={codeClass} {...props}>
              {children}
            </MarkdownCodeBlock>
          ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-border/60">
              <table className="w-full border-collapse text-[12.5px]">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border-b border-border bg-muted/40 px-3 py-1.5 text-left font-semibold">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border-b border-border/60 px-3 py-1.5">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
