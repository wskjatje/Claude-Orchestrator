import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { ChatFileEditCard, ChatFileEditList } from "@/components/chat-file-edit-card";
import { ChatCursorCollapsible } from "@/components/chat-cursor-collapsible";
import { ChatMarkdown } from "@/components/chat-markdown";
import { ChatThoughtBlock } from "@/components/chat-thought-block";
import {
  ChatToolActivityGroup,
  ChatToolActivityRow,
  isFileEditTool,
  type ToolActivityItem,
} from "@/components/chat-tool-activity";
import { ToolCallBubble } from "@/components/tool-call-bubble";
import { useTheme } from "@/hooks/use-theme";
import { parseAssistantContent, type AssistantBlock } from "@/lib/chat-assistant-parse";
import {
  buildEditPool,
  languageFromPath,
  parseChatFileEdits,
  summaryEditForPath,
  takeEditForPath,
  type ChatFileEdit,
} from "@/lib/parse-chat-file-edits";
import { cn } from "@/lib/utils";

function ClassicThoughtBlock({ title, body }: { title: string; body: string }) {
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
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", open && "rotate-90")} />
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

function ClassicTerminalOutputBlock({ title, body }: { title: string; body: string }) {
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

function CursorTerminalOutputBlock({ title, body }: { title: string; body: string }) {
  const lineCount = body ? body.replace(/\r\n/g, "\n").split("\n").length : 0;
  return (
    <div className="chat-terminal-output">
      <div className="chat-terminal-output-head">{title}</div>
      <ChatCursorCollapsible
        lineCount={lineCount}
        bodyClassName="chat-terminal-output-body"
      >
        <pre className="workbench-code m-0 whitespace-pre-wrap break-words">{body}</pre>
      </ChatCursorCollapsible>
    </div>
  );
}

type RenderUnit =
  | { kind: "thought"; title: string; body: string }
  | { kind: "tools"; items: ToolActivityItem[] }
  | { kind: "terminal"; title: string; body: string }
  | { kind: "markdown"; body: string }
  | { kind: "file-edit"; edit: ChatFileEdit };

function groupCursorUnits(
  blocks: AssistantBlock[],
  edits: ChatFileEdit[],
  pool: Map<string, ChatFileEdit[]>,
  used: Set<string>,
  seq: { n: number },
): RenderUnit[] {
  const out: RenderUnit[] = [];
  let toolBuf: ToolActivityItem[] = [];

  const flushTools = () => {
    if (!toolBuf.length) return;
    out.push({ kind: "tools", items: [...toolBuf] });
    toolBuf = [];
  };

  const pushFileEdit = (path: string) => {
    const edit = takeEditForPath(path, pool, used) ?? summaryEditForPath(path, seq);
    out.push({ kind: "file-edit", edit });
  };

  for (const b of blocks) {
    if (b.kind === "tool") {
      if (isFileEditTool(b.name, b.arg)) {
        flushTools();
        const pathArg = b.arg?.trim().replace(/^[`'"]|[`'"]$/g, "") ?? "";
        if (pathArg) pushFileEdit(pathArg);
        continue;
      }
      toolBuf.push({ name: b.name, arg: b.arg, status: b.status });
      continue;
    }
    flushTools();
    if (b.kind === "thought") out.push({ kind: "thought", title: b.title, body: b.body });
    else if (b.kind === "terminal") out.push({ kind: "terminal", title: b.title, body: b.body });
    else if (b.kind === "markdown") out.push({ kind: "markdown", body: b.body });
  }
  flushTools();

  for (const edit of edits) {
    if (!used.has(edit.id)) {
      used.add(edit.id);
      out.push({ kind: "file-edit", edit });
    }
  }

  return out;
}

function ClassicAssistantContent({
  content,
  blocks,
  edits,
}: {
  content: string;
  blocks: AssistantBlock[];
  edits: ChatFileEdit[];
}) {
  if (blocks.length === 1 && blocks[0]?.kind === "markdown") {
    return (
      <div className="chat-assistant-blocks">
        <ChatMarkdown content={content} />
        <ChatFileEditList edits={edits} usePanel={false} />
      </div>
    );
  }

  return (
    <div className="chat-assistant-blocks space-y-1">
      {blocks.map((b, i) => {
        if (b.kind === "thought") {
          return <ClassicThoughtBlock key={i} title={b.title} body={b.body} />;
        }
        if (b.kind === "tool") {
          const pathArg = b.arg?.trim().replace(/^[`'"]|[`'"]$/g, "");
          if (pathArg && isFileEditTool(b.name, pathArg)) {
            return (
              <div key={i} className="mb-1">
                <ChatFileEditCard
                  edit={{
                    id: `${pathArg}::inline-${i}`,
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
          return <ClassicTerminalOutputBlock key={i} title={b.title} body={b.body} />;
        }
        return <ChatMarkdown key={i} content={b.body} />;
      })}
      <ChatFileEditList edits={edits} usePanel={false} />
    </div>
  );
}

function CursorAssistantContent({ units }: { units: RenderUnit[] }) {
  return (
    <div className="chat-assistant-blocks chat-assistant-blocks--cursor">
      {units.map((u, i) => {
        if (u.kind === "thought") {
          return <ChatThoughtBlock key={`thought:${i}`} title={u.title} body={u.body} />;
        }
        if (u.kind === "tools") {
          return u.items.length === 1 ? (
            <ChatToolActivityRow key={`tool:${i}`} {...u.items[0]!} />
          ) : (
            <ChatToolActivityGroup key={`tools:${i}`} items={u.items} />
          );
        }
        if (u.kind === "terminal") {
          return <CursorTerminalOutputBlock key={`term:${i}`} title={u.title} body={u.body} />;
        }
        if (u.kind === "markdown") {
          return <ChatMarkdown key={`md:${i}`} content={u.body} />;
        }
        if (u.kind === "file-edit") {
          return <ChatFileEditCard key={u.edit.id} edit={u.edit} variant="cursor" />;
        }
        return null;
      })}
    </div>
  );
}

export function ChatAssistantContent({ content }: { content: string }) {
  const { resolved } = useTheme();
  const { edits, stripped } = useMemo(() => parseChatFileEdits(content), [content]);
  const blocks = useMemo(() => parseAssistantContent(stripped), [stripped]);

  const cursorUnits = useMemo(() => {
    const used = new Set<string>();
    const pool = buildEditPool(edits);
    const seq = { n: 10_000 };
    return groupCursorUnits(blocks, edits, pool, used, seq);
  }, [blocks, edits]);

  if (resolved === "dark") {
    return <CursorAssistantContent units={cursorUnits} />;
  }

  return <ClassicAssistantContent content={stripped} blocks={blocks} edits={edits} />;
}
