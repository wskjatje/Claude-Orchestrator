import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ChatMarkdown } from "@/components/chat-markdown";
import { cn } from "@/lib/utils";

function normalizeThoughtTitle(title: string): string {
  const t = title.trim();
  if (/^thought\b/i.test(t)) return t.replace(/^thought\b/i, "Thought");
  if (/^思考/.test(t)) return t;
  return t || "Thought";
}

/** Cursor 式可折叠思考块（默认收起） */
export function ChatThoughtBlock({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  const label = useMemo(() => normalizeThoughtTitle(title), [title]);
  const hasBody = Boolean(body.trim());

  return (
    <div className="chat-thought-block">
      <button
        type="button"
        className="chat-thought-toggle"
        onClick={() => hasBody && setOpen((v) => !v)}
        aria-expanded={hasBody ? open : undefined}
        disabled={!hasBody}
      >
        <ChevronRight className={cn("chat-thought-chevron", open && "chat-thought-chevron--open")} />
        <span>{label}</span>
      </button>
      {open && hasBody ? (
        <div className="chat-thought-body">
          <ChatMarkdown content={body} className="chat-thought-md" />
        </div>
      ) : null}
    </div>
  );
}
