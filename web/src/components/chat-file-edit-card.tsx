import { useEffect, useState } from "react";
import { Check, ChevronRight, FileCode2, FolderOpen, RotateCcw, X } from "lucide-react";
import {
  ChatDockCollapsible,
  ChatDockCollapsibleChevron,
  useDockCollapsibleState,
} from "@/components/chat-dock-collapsible";
import { highlightDiffLine } from "@/components/chat-diff-highlight";
import { cn } from "@/lib/utils";
import {
  dedupeEditsByPath,
  expandFoldLine,
  fileBadgeFromPath,
  type ChatFileEdit,
  type ChatFileEditLine,
  type ChatFileEditStatus,
} from "@/lib/parse-chat-file-edits";

/** 返回 `false` 表示操作未成功，不更新本地 status（如写入失败仍保持「待应用」） */
export type ChatFileEditActionResult = boolean | void;

export type ChatFileEditActions = {
  onApply?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
  onReject?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
  /** 拒绝后反悔，恢复为待应用 */
  onUndoReject?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
  onOpen?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
  onRevert?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
};

function gutterLineNo(line: ChatFileEditLine): string {
  if (line.kind === "fold") return "";
  if (line.kind === "del") return line.oldLine != null ? String(line.oldLine) : "";
  if (line.kind === "add") return line.newLine != null ? String(line.newLine) : "";
  return line.newLine != null
    ? String(line.newLine)
    : line.oldLine != null
      ? String(line.oldLine)
      : "";
}

function EditLine({
  line,
  language,
  compactStyle,
  onExpandFold,
}: {
  line: ChatFileEditLine;
  language: string;
  compactStyle?: boolean;
  onExpandFold?: () => void;
}) {
  if (line.kind === "fold") {
    const Tag = onExpandFold ? "button" : "div";
    return (
      <Tag
        type={onExpandFold ? "button" : undefined}
        className={cn(
          "chat-file-edit-line chat-file-edit-line--fold font-mono",
          compactStyle && "chat-file-edit-line--compact",
          onExpandFold && "chat-file-edit-line--fold-clickable",
        )}
        onClick={
          onExpandFold
            ? (e) => {
                e.stopPropagation();
                onExpandFold();
              }
            : undefined
        }
      >
        <span className="chat-file-edit-gutter" aria-hidden />
        <span className="chat-file-edit-prefix" aria-hidden />
        <span className="chat-file-edit-fold-label">{line.text || "⋯"}</span>
      </Tag>
    );
  }
  const prefix = line.prefix ?? (line.kind === "add" ? "+" : line.kind === "del" ? "-" : " ");
  return (
    <div
      className={cn(
        "chat-file-edit-line font-mono whitespace-pre-wrap break-all",
        compactStyle ? "chat-file-edit-line--compact" : "text-[11.5px] leading-[1.45]",
        line.kind === "add" && "chat-file-edit-line--add",
        line.kind === "del" && "chat-file-edit-line--del",
        line.kind === "ctx" && (compactStyle ? "chat-file-edit-line--ctx" : "text-muted-foreground"),
      )}
    >
      {compactStyle ? (
        <>
          <span className="chat-file-edit-gutter" aria-hidden>
            {gutterLineNo(line)}
          </span>
          <span
            className={cn(
              "chat-file-edit-prefix",
              line.kind === "add" && "chat-file-edit-prefix--add",
              line.kind === "del" && "chat-file-edit-prefix--del",
            )}
            aria-hidden
          >
            {prefix}
          </span>
        </>
      ) : null}
      <span className="chat-file-edit-code">
        {highlightDiffLine(line.text || " ", language)}
      </span>
    </div>
  );
}

function DiffPreviewBody({
  lines,
  language,
  compactStyle,
}: {
  lines: ChatFileEditLine[];
  language: string;
  compactStyle?: boolean;
}) {
  const [localLines, setLocalLines] = useState(lines);
  useEffect(() => {
    setLocalLines(lines);
  }, [lines]);
  return (
    <>
      {localLines.map((line, i) => (
        <EditLine
          key={`${i}:${line.kind}:${line.oldLine ?? ""}:${line.newLine ?? ""}:${line.text.slice(0, 24)}`}
          line={line}
          language={language}
          compactStyle={compactStyle}
          onExpandFold={
            line.kind === "fold"
              ? () =>
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
              : undefined
          }
        />
      ))}
    </>
  );
}

function statusLabel(
  status: ChatFileEditStatus | undefined,
  source?: ChatFileEdit["source"],
  summaryOnly?: boolean,
): string {
  if (summaryOnly && status === "pending") return "生成中";
  if (status === "pending") return "待应用";
  if (status === "rejected") return "已拒绝";
  if (status === "applied") return "已写入";
  // CLI/工具行在 plan 下未必真写盘，勿标「已写入」
  if (source === "cli") return "已提议";
  return "";
}

function EditStats({
  edit,
  status,
}: {
  edit: ChatFileEdit;
  status: ChatFileEditStatus | undefined;
}) {
  const showStats = edit.added > 0 || edit.removed > 0;
  // Diff 卡：有 +/- 时不挂「已写入」标签，只留统计
  const label =
    status === "applied" && showStats
      ? ""
      : statusLabel(status, edit.source, edit.summaryOnly);
  return (
    <span className="chat-file-edit-stats inline-flex items-center gap-1.5 font-mono tabular-nums">
      {label ? (
        <span
          className={cn(
            "chat-file-edit-stat-muted text-[11px]",
            status === "pending" && "text-amber-600 dark:text-amber-400",
            status === "rejected" && "text-muted-foreground",
            status === "applied" && "text-emerald-600 dark:text-emerald-400",
          )}
        >
          {label}
        </span>
      ) : null}
      {showStats ? (
        <>
          {edit.added > 0 ? <span className="chat-file-edit-stat-add">+{edit.added}</span> : null}
          {edit.removed > 0 ? (
            <span className="chat-file-edit-stat-del">-{edit.removed}</span>
          ) : null}
        </>
      ) : null}
    </span>
  );
}

function EditActionBar({
  edit,
  status,
  busy,
  actions,
  onLocalStatus,
}: {
  edit: ChatFileEdit;
  status: ChatFileEditStatus | undefined;
  busy: boolean;
  actions?: ChatFileEditActions;
  onLocalStatus: (s: ChatFileEditStatus) => void;
}) {
  if (!actions) return null;
  const run = async (
    fn: (() => ChatFileEditActionResult | Promise<ChatFileEditActionResult>) | undefined,
    next?: ChatFileEditStatus,
  ) => {
    if (!fn || busy) return;
    const result = await fn();
    if (result === false) return;
    if (next) onLocalStatus(next);
  };

  if (
    status === "pending" &&
    !edit.summaryOnly &&
    edit.writeContent != null &&
    (actions.onApply || actions.onReject)
  ) {
    return (
      <div className="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 py-1.5">
        <button
          type="button"
          disabled={busy || !actions.onApply}
          className="btn-row text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            void run(() => actions.onApply?.(edit), "applied");
          }}
        >
          <Check className="h-3 w-3" /> 接受
        </button>
        <button
          type="button"
          disabled={busy || !actions.onReject}
          className="btn-row text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            void run(() => actions.onReject?.(edit), "rejected");
          }}
        >
          <X className="h-3 w-3" /> 拒绝
        </button>
      </div>
    );
  }

  if (status === "rejected" && edit.writeContent != null && actions.onUndoReject) {
    return (
      <div className="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 py-1.5">
        <button
          type="button"
          disabled={busy}
          className="btn-row text-[11px]"
          onClick={(e) => {
            e.stopPropagation();
            void run(() => actions.onUndoReject?.(edit), "pending");
          }}
        >
          <RotateCcw className="h-3 w-3" /> 恢复
        </button>
      </div>
    );
  }

  // 已落盘卡：不挂「打开/撤销」条，点文件名进 Review
  if (status === "applied" && edit.summaryOnly) return null;

  if (status === "applied" && (actions.onOpen || actions.onRevert)) {
    return (
      <div className="flex flex-wrap items-center gap-1 border-t border-border/50 px-2 py-1.5">
        {actions.onOpen ? (
          <button
            type="button"
            disabled={busy}
            className="btn-row text-[11px]"
            onClick={(e) => {
              e.stopPropagation();
              void run(() => actions.onOpen?.(edit));
            }}
          >
            <FolderOpen className="h-3 w-3" /> 打开
          </button>
        ) : null}
        {actions.onRevert ? (
          <button
            type="button"
            disabled={busy}
            className="btn-row text-[11px]"
            onClick={(e) => {
              e.stopPropagation();
              void run(() => actions.onRevert?.(edit));
            }}
          >
            <RotateCcw className="h-3 w-3" /> 撤销
          </button>
        ) : null}
      </div>
    );
  }

  return null;
}

function useEditCardState(edit: ChatFileEdit) {
  const [status, setStatus] = useState<ChatFileEditStatus | undefined>(edit.status);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setStatus(edit.status);
  }, [edit.id, edit.status]);
  const wrapActions = (actions?: ChatFileEditActions): ChatFileEditActions | undefined => {
    if (!actions) return undefined;
    const wrap =
      (fn?: (e: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>) =>
      async (e: ChatFileEdit) => {
        if (!fn) return;
        setBusy(true);
        try {
          return await fn(e);
        } finally {
          setBusy(false);
        }
      };
    return {
      onApply: actions.onApply ? wrap(actions.onApply) : undefined,
      onReject: actions.onReject ? wrap(actions.onReject) : undefined,
      onUndoReject: actions.onUndoReject ? wrap(actions.onUndoReject) : undefined,
      onOpen: actions.onOpen ? wrap(actions.onOpen) : undefined,
      onRevert: actions.onRevert ? wrap(actions.onRevert) : undefined,
    };
  };
  return { status, setStatus, busy, wrapActions };
}

/** 长 Diff 默认收起约 8 行，点头部或底部 chevron 展开/收起 */
const DOCK_DIFF_COLLAPSE_AFTER = 8;

function DockFileEditCard({
  edit,
  actions,
}: {
  edit: ChatFileEdit;
  actions?: ChatFileEditActions;
}) {
  const badge = fileBadgeFromPath(edit.path);
  const fileName = edit.path.split("/").pop() ?? edit.path;
  const hasPreview = edit.previewLines.length > 0;
  const appliedSummary =
    (edit.status === "applied" || edit.summaryOnly) && hasPreview;
  // 与底部折叠共用阈值；默认收起（紧凑卡，避免一直通栏展开）
  const { expanded, setExpanded, collapsible, toggle } = useDockCollapsibleState(
    edit.previewLines.length,
    DOCK_DIFF_COLLAPSE_AFTER,
    false,
    edit.id,
  );
  const { status, setStatus, busy, wrapActions } = useEditCardState(edit);
  const wired = wrapActions(actions);
  const openFile = () => {
    void wired?.onOpen?.(edit);
  };
  // 可折叠：点头部切换展开；不可折叠：点头部打开文件
  const onHeadClick = () => {
    if (collapsible) {
      toggle();
      return;
    }
    if (wired?.onOpen) openFile();
  };
  const HeadTag = collapsible || appliedSummary || wired?.onOpen ? "button" : "div";

  return (
    <div
      className={cn(
        "chat-file-edit-card chat-file-edit-card--compact",
        collapsible && !expanded && "chat-file-edit-card--collapsed",
        collapsible && expanded && "chat-file-edit-card--expanded",
      )}
    >
      <HeadTag
        type={HeadTag === "button" ? "button" : undefined}
        className={cn(
          "chat-file-edit-card-head",
          (collapsible || appliedSummary || wired?.onOpen) &&
            "chat-file-edit-card-head--clickable",
        )}
        onClick={HeadTag === "button" ? onHeadClick : undefined}
        aria-expanded={collapsible ? expanded : undefined}
      >
        <ChatDockCollapsibleChevron expanded={expanded} collapsible={collapsible} />
        <span className="chat-file-edit-badge">{badge}</span>
        <FileCode2 className="chat-file-edit-card-icon" aria-hidden />
        <span
          className="chat-file-edit-card-name"
          title={edit.path}
          onClick={(e) => {
            if (!wired?.onOpen) return;
            e.stopPropagation();
            openFile();
          }}
        >
          {fileName}
        </span>
        <EditStats edit={edit} status={status} />
      </HeadTag>
      {hasPreview ? (
        <ChatDockCollapsible
          lineCount={edit.previewLines.length}
          collapseAfterLines={DOCK_DIFF_COLLAPSE_AFTER}
          collapsedVisibleLines={DOCK_DIFF_COLLAPSE_AFTER}
          bodyClassName="chat-file-edit-card-body"
          expanded={expanded}
          onExpandedChange={setExpanded}
        >
          <DiffPreviewBody
            lines={edit.previewLines}
            language={edit.language}
            compactStyle
          />
        </ChatDockCollapsible>
      ) : null}
      <EditActionBar
        edit={edit}
        status={status}
        busy={busy}
        actions={wired}
        onLocalStatus={setStatus}
      />
    </div>
  );
}

/** 经典：紧凑行，点击展开 */
function ClassicFileEditCard({
  edit,
  actions,
}: {
  edit: ChatFileEdit;
  actions?: ChatFileEditActions;
}) {
  const [open, setOpen] = useState(false);
  const badge = fileBadgeFromPath(edit.path);
  const fileName = edit.path.split("/").pop() ?? edit.path;
  const hasPreview = edit.previewLines.length > 0;
  const expandable = hasPreview;
  const { status, setStatus, busy, wrapActions } = useEditCardState(edit);
  const wired = wrapActions(actions);

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
        <FileCode2
          className="h-3.5 w-3.5 shrink-0 text-sky-500/85 dark:text-sky-400/90"
          aria-hidden
        />
        <span
          className="min-w-0 truncate font-mono text-[12px] text-foreground/90"
          title={edit.path}
        >
          {fileName}
        </span>
        <span className="ml-auto shrink-0">
          <EditStats edit={edit} status={status} />
        </span>
      </button>
      {open && hasPreview ? (
        <div className="chat-file-edit-preview mt-0.5 overflow-hidden rounded-md border border-border/50 bg-code-bg/70">
          <div className="max-h-[min(220px,32vh)] overflow-auto px-2.5 py-2">
            <DiffPreviewBody lines={edit.previewLines} language={edit.language} />
          </div>
        </div>
      ) : null}
      <EditActionBar
        edit={edit}
        status={status}
        busy={busy}
        actions={wired}
        onLocalStatus={setStatus}
      />
    </div>
  );
}

export function ChatFileEditCard({
  edit,
  variant = "classic",
  actions,
}: {
  edit: ChatFileEdit;
  variant?: "classic" | "dock";
  actions?: ChatFileEditActions;
}) {
  if (variant === "dock") return <DockFileEditCard edit={edit} actions={actions} />;
  return <ClassicFileEditCard edit={edit} actions={actions} />;
}

export function ChatFileEditList({
  edits,
  usePanel = false,
  variant = "classic",
  actions,
  onApplyAll,
  onRejectAll,
  bulkBusy,
}: {
  edits: ChatFileEdit[];
  usePanel?: boolean;
  variant?: "classic" | "dock";
  actions?: ChatFileEditActions;
  onApplyAll?: () => void | Promise<void>;
  onRejectAll?: () => void | Promise<void>;
  bulkBusy?: boolean;
}) {
  const uniqueEdits = dedupeEditsByPath(edits);
  if (!uniqueEdits.length) return null;

  const pendingCount = uniqueEdits.filter(
    (e) =>
      !e.summaryOnly &&
      (e.status === "pending" || e.status == null) &&
      e.writeContent != null,
  ).length;
  const showBulk = pendingCount > 1 && (onApplyAll || onRejectAll);

  const bulkBar = showBulk ? (
    <div className="chat-file-edit-bulk flex flex-wrap items-center gap-1.5 px-1 py-1">
      <span className="text-[11px] text-muted-foreground">{pendingCount} 个待应用</span>
      {onApplyAll ? (
        <button
          type="button"
          className="btn-row text-[11px]"
          disabled={bulkBusy}
          onClick={() => void onApplyAll()}
        >
          <Check className="h-3 w-3" /> 全部接受
        </button>
      ) : null}
      {onRejectAll ? (
        <button
          type="button"
          className="btn-row text-[11px]"
          disabled={bulkBusy}
          onClick={() => void onRejectAll()}
        >
          <X className="h-3 w-3" /> 全部拒绝
        </button>
      ) : null}
    </div>
  ) : null;

  if (variant === "dock") {
    return (
      <div className="chat-file-edit-stack">
        {bulkBar}
        {uniqueEdits.map((edit) => (
          <ChatFileEditCard key={edit.id} edit={edit} variant="dock" actions={actions} />
        ))}
      </div>
    );
  }

  const list = (
    <div className={cn("chat-file-edit-list", !usePanel && "mt-2 space-y-0.5")}>
      {bulkBar}
      {uniqueEdits.map((edit) => (
        <ChatFileEditCard key={edit.id} edit={edit} variant="classic" actions={actions} />
      ))}
    </div>
  );
  if (usePanel) {
    return <div className="chat-file-edit-panel">{list}</div>;
  }
  return list;
}
