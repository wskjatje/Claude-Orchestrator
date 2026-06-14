import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ChatFileEditCard, ChatFileEditList } from "@/components/chat-file-edit-card";
import { ChatMarkdown } from "@/components/chat-markdown";
import { ToolCallBubble } from "@/components/tool-call-bubble";
import { cn } from "@/lib/utils";
import { parseAssistantContent } from "@/lib/chat-assistant-parse";
import { languageFromPath, parseChatFileEdits } from "@/lib/parse-chat-file-edits";

function ThoughtBlock({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  if (!body.trim()) {
    return (
      <div className="chat-thought-block mb-2 text-[12px] text-muted-foreground">
        {title}
      </div>
    );
  }
  return (
    <div className="chat-thought-block mb-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
      >
        <ChevronRight
          className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")}
        />
        {title}
      </button>
      {open ? (
        <div className="mt-1.5 border-l-2 border-border/80 pl-3 text-[12px] leading-relaxed text-muted-foreground">
          <ChatMarkdown content={body} className="text-[12px]" />
        </div>
      ) : null}
    </div>
  );
}

function TerminalOutputBlock({ title, body }: { title: string; body: string }) {
  return (
    <div className="chat-terminal-output mb-3 overflow-hidden rounded-lg border border-border/70 bg-code-bg">
      <div className="border-b border-border/50 bg-muted/20 px-2.5 py-1.5 text-[10.5px] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <pre className="workbench-code max-h-[min(360px,45vh)] overflow-auto p-3 whitespace-pre-wrap break-words text-[12px] text-foreground">
        {body}
      </pre>
    </div>
  );
}

/** Cursor 式助手正文：Markdown 优先，文件改动紧凑行在底部。 */
export function ChatAssistantContent({ content }: { content: string }) {
  const { edits, stripped } = useMemo(() => parseChatFileEdits(content), [content]);
  const blocks = parseAssistantContent(stripped);

  if (blocks.length === 1 && blocks[0]?.kind === "markdown") {
    return (
      <div className="chat-assistant-blocks">
        <ChatMarkdown content={stripped} />
        <ChatFileEditList edits={edits} />
      </div>
    );
  }

  return (
    <div className="chat-assistant-blocks space-y-1">
      {blocks.map((b, i) => {
        if (b.kind === "thought") {
          return <ThoughtBlock key={i} title={b.title} body={b.body} />;
        }
        if (b.kind === "tool") {
          const pathArg = b.arg?.trim().replace(/^[`'"]|[`'"]$/g, "");
          if (pathArg && /^(Edit|Write|MultiEdit)$/i.test(b.name) && /\.\w+$/.test(pathArg)) {
            return (
              <div key={i} className="mb-1">
                <ChatFileEditCard
                  edit={{
                    path: pathArg,
                    language: languageFromPath(pathArg),
                    added: 0,
                    removed: 0,
                    previewLines: [],
                    summaryOnly: true,
                  }}
                />
              </div>
            );
          }
          return (
            <div key={i} className="mb-2">
              <ToolCallBubble name={b.name} arg={b.arg} status={b.status} />
            </div>
          );
        }
        if (b.kind === "terminal") {
          return <TerminalOutputBlock key={i} title={b.title} body={b.body} />;
        }
        return <ChatMarkdown key={i} content={b.body} />;
      })}
      <ChatFileEditList edits={edits} />
    </div>
  );
}
