import { useState } from "react";
import { ChevronRight, FileCode2 } from "lucide-react";
import {
  ChatCursorCollapsible,
  ChatCursorCollapsibleChevron,
  useCursorCollapsibleState,
} from "@/components/chat-cursor-collapsible";
import { highlightDiffLine } from "@/components/chat-diff-highlight";
import { cn } from "@/lib/utils";
import {
  fileBadgeFromPath,
  type ChatFileEdit,
  type ChatFileEditLine,
} from "@/lib/parse-chat-file-edits";

function EditLine({
  line,
  language,
  cursorStyle,
}: {
  line: ChatFileEditLine;
  language: string;
  cursorStyle?: boolean;
}) {
  return (
    <div
      className={cn(
        "chat-file-edit-line font-mono whitespace-pre-wrap break-all",
        cursorStyle ? "chat-file-edit-line--cursor" : "text-[11.5px] leading-[1.45]",
        line.kind === "add" && "chat-file-edit-line--add",
        line.kind === "del" && "chat-file-edit-line--del",
        line.kind === "ctx" && (cursorStyle ? "chat-file-edit-line--ctx" : "text-muted-foreground"),
      )}
    >
      {highlightDiffLine(line.text || " ", language)}
    </div>
  );
}

function EditStats({ edit }: { edit: ChatFileEdit }) {
  const showStats = edit.added > 0 || edit.removed > 0;
  if (showStats) {
    return (
      <span className="chat-file-edit-stats font-mono tabular-nums">
        {edit.added > 0 ? <span className="chat-file-edit-stat-add">+{edit.added}</span> : null}
        {edit.removed > 0 ? (
          <span className="chat-file-edit-stat-del">-{edit.removed}</span>
        ) : null}
      </span>
    );
  }
  if (edit.summaryOnly) {
    return <span className="chat-file-edit-stat-muted">已写入</span>;
  }
  return null;
}

/** Cursor 式：默认收起 diff，头部/底部 chevron 展开 */
function CursorFileEditCard({ edit }: { edit: ChatFileEdit }) {
  const badge = fileBadgeFromPath(edit.path);
  const fileName = edit.path.split("/").pop() ?? edit.path;
  const hasPreview = edit.previewLines.length > 0;
  const { expanded, setExpanded, collapsible, toggle } = useCursorCollapsibleState(
    edit.previewLines.length,
  );
  const HeadTag = collapsible ? "button" : "div";

  return (
    <div
      className={cn(
        "chat-file-edit-card chat-file-edit-card--cursor",
        collapsible && !expanded && "chat-file-edit-card--collapsed",
        collapsible && expanded && "chat-file-edit-card--expanded",
      )}
    >
      <HeadTag
        type={collapsible ? "button" : undefined}
        className={cn(
          "chat-file-edit-card-head",
          collapsible && "chat-file-edit-card-head--clickable",
        )}
        onClick={collapsible ? toggle : undefined}
        aria-expanded={collapsible ? expanded : undefined}
      >
        <ChatCursorCollapsibleChevron expanded={expanded} collapsible={collapsible} />
        <span className="chat-file-edit-badge">{badge}</span>
        <FileCode2 className="chat-file-edit-card-icon" aria-hidden />
        <span className="chat-file-edit-card-name" title={edit.path}>
          {fileName}
        </span>
        <EditStats edit={edit} />
      </HeadTag>
      {hasPreview ? (
        <ChatCursorCollapsible
          lineCount={edit.previewLines.length}
          bodyClassName="chat-file-edit-card-body"
          expanded={expanded}
          onExpandedChange={setExpanded}
        >
          {edit.previewLines.map((line, i) => (
            <EditLine key={i} line={line} language={edit.language} cursorStyle />
          ))}
        </ChatCursorCollapsible>
      ) : null}
    </div>
  );
}

/** 经典：紧凑行，点击展开 */
function ClassicFileEditCard({ edit }: { edit: ChatFileEdit }) {
  const [open, setOpen] = useState(false);
  const badge = fileBadgeFromPath(edit.path);
  const fileName = edit.path.split("/").pop() ?? edit.path;
  const hasPreview = edit.previewLines.length > 0;
  const expandable = hasPreview;

  return (
    <div className="chat-file-edit-row">
      <button
        type="button"
        className={cn(
          "chat-file-edit-row-btn flex w-full min-w-0 items-center gap-2 rounded-md px-1 py-1 text-left transition",
          expandable && "hover:bg-muted/40",
          !expandable && "cursor-default",
        )}
        onClick={() => expandable && setOpen((v) => !v)}
        aria-expanded={expandable ? open : undefined}
      >
        {expandable ? (
          <ChevronRight
            className={cn(
              "h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform",
              open && "rotate-90",
            )}
          />
        ) : (
          <span className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center">
            <span className="chat-file-edit-badge">{badge}</span>
          </span>
        )}
        <FileCode2 className="h-3.5 w-3.5 shrink-0 text-sky-500/85 dark:text-sky-400/90" aria-hidden />
        <span className="min-w-0 truncate font-mono text-[12px] text-foreground/90" title={edit.path}>
          {fileName}
        </span>
        <span className="ml-auto shrink-0">
          <EditStats edit={edit} />
        </span>
      </button>
      {open && hasPreview ? (
        <div className="chat-file-edit-preview mt-0.5 overflow-hidden rounded-md border border-border/50 bg-code-bg/70">
          <div className="max-h-[min(220px,32vh)] overflow-auto px-2.5 py-2">
            {edit.previewLines.map((line, i) => (
              <EditLine key={i} line={line} language={edit.language} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ChatFileEditCard({
  edit,
  variant = "classic",
}: {
  edit: ChatFileEdit;
  variant?: "classic" | "cursor";
}) {
  if (variant === "cursor") return <CursorFileEditCard edit={edit} />;
  return <ClassicFileEditCard edit={edit} />;
}

export function ChatFileEditList({
  edits,
  usePanel = false,
  variant = "classic",
}: {
  edits: ChatFileEdit[];
  usePanel?: boolean;
  variant?: "classic" | "cursor";
}) {
  if (!edits.length) return null;

  if (variant === "cursor") {
    return (
      <div className="chat-file-edit-stack">
        {edits.map((edit) => (
          <ChatFileEditCard key={edit.id} edit={edit} variant="cursor" />
        ))}
      </div>
    );
  }

  const list = (
    <div className={cn("chat-file-edit-list", !usePanel && "mt-2 space-y-0.5")}>
      {edits.map((edit) => (
        <ChatFileEditCard key={edit.id} edit={edit} variant="classic" />
      ))}
    </div>
  );
  if (usePanel) {
    return <div className="chat-file-edit-panel">{list}</div>;
  }
  return list;
}
