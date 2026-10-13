import { useMemo, useState } from "react";
import { ChatMarkdown } from "@/components/chat-markdown";
import {
  stripDsmlToolMarkup,
  stripForceContinueMarkers,
} from "@/lib/compress-agent-display";

function normalizeThoughtTitle(title: string): { head: string; hint: string } {
  const t = title.trim();
  if (/^thought\b/i.test(t) || /^思考/.test(t) || !t) {
    return { head: "Thought", hint: "briefly" };
  }
  return { head: t, hint: "" };
}

function sanitizeThoughtBody(body: string): string {
  let t = stripForceContinueMarkers(stripDsmlToolMarkup(body).text);
  t = t.replace(/^要不要我[^\n]*\??\s*$/gm, "");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

/** 思考块（Thought briefly；默认折叠，避免百科式占屏） */
export function ChatThoughtBlock({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  const { head, hint } = useMemo(() => normalizeThoughtTitle(title), [title]);
  const cleanBody = useMemo(() => sanitizeThoughtBody(body), [body]);
  const hasBody = Boolean(cleanBody);

  return (
    <div className="chat-thought-block">
      <button
        type="button"
        className="chat-thought-toggle"
        onClick={() => hasBody && setOpen((v) => !v)}
        aria-expanded={hasBody ? open : undefined}
        disabled={!hasBody}
      >
        <span className="chat-thought-label">{head}</span>
        {hint ? <span className="chat-thought-hint">{hint}</span> : null}
      </button>
      {open && hasBody ? (
        <div className="chat-thought-body">
          <ChatMarkdown content={cleanBody} className="chat-thought-md" />
        </div>
      ) : null}
    </div>
  );
}
