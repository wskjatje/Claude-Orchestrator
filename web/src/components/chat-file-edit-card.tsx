import { useEffect, useState } from "react";
import { Check, ChevronRight, FolderOpen, RotateCcw, X } from "lucide-react";
import {
  ChatDockCollapsible,
  useDockCollapsibleState,
} from "@/components/chat-dock-collapsible";
import { CursorDiffLines } from "@/components/cursor-diff-lines";
import { SetiFileIcon } from "@/lib/seti/seti-file-icon";
import { cn } from "@/lib/utils";
import {
  dedupeEditsByPath,
  type ChatFileEdit,
  type ChatFileEditStatus,
} from "@/lib/parse-chat-file-edits";
import { isPlanDocumentPath } from "@/lib/plan-build-request";
import { PLAN_BUILD_BUTTON } from "@/lib/ui-copy";

/** 返回 `false` 表示操作未成功，不更新本地 status（如写入失败仍保持「待应用」） */
export type ChatFileEditActionResult = boolean | void;

export type ChatFileEditActions = {
  onApply?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
  onReject?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
  /** 拒绝后反悔，恢复为待应用 */
  onUndoReject?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
  onOpen?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
  onRevert?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
  /** Plan→Build：按方案文档执行（复用 write 意图） */
  onBuildFromPlan?: (edit: ChatFileEdit) => ChatFileEditActionResult | Promise<ChatFileEditActionResult>;
};

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
    <span
      className="chat-file-edit-stats inline-flex items-center gap-2 font-mono tabular-nums shrink-0"
      aria-label={[
        edit.added > 0 ? `增加 ${edit.added} 行` : "",
        edit.removed > 0 ? `删除 ${edit.removed} 行` : "",
        label || "",
      ]
        .filter(Boolean)
        .join("，")}
    >
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
          {edit.added > 0 ? (
            <span className="chat-file-edit-stat-add">+{edit.added}</span>
          ) : null}
          {edit.removed > 0 ? (
            <span className="chat-file-edit-stat-del">−{edit.removed}</span>
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
      <div className="chat-file-edit-actions flex flex-wrap items-center gap-1 border-t border-border/40 px-2 py-1">
        <button
          type="button"
          disabled={busy || !actions.onApply}
          className="btn-row text-[11px] font-medium"
          onClick={(e) => {
            e.stopPropagation();
            void run(() => actions.onApply?.(edit), "applied");
          }}
        >
          <Check className="h-3 w-3" /> Keep
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
          <X className="h-3 w-3" /> Undo
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

  const showBuild =
    Boolean(actions.onBuildFromPlan) &&
    isPlanDocumentPath(edit.path) &&
    status === "applied";

  if (status === "applied" && (actions.onOpen || actions.onRevert || showBuild)) {
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
            <FolderOpen className="h-3 w-3" /> Open
          </button>
        ) : null}
        {showBuild ? (
          <button
            type="button"
            disabled={busy}
            className="btn-row text-[11px] font-medium"
            onClick={(e) => {
              e.stopPropagation();
              void run(() => actions.onBuildFromPlan?.(edit));
            }}
          >
            <ChevronRight className="h-3 w-3" /> {PLAN_BUILD_BUTTON}
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
            <RotateCcw className="h-3 w-3" /> Undo
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
      onBuildFromPlan: actions.onBuildFromPlan ? wrap(actions.onBuildFromPlan) : undefined,
    };
  };
  return { status, setStatus, busy, wrapActions };
}

/** 长 Diff 默认收起约 8 行，点头部或底部 chevron 展开/收起（对齐 Cursor） */
const DOCK_DIFF_COLLAPSE_AFTER = 8;

function DockFileEditCard({
  edit,
  actions,
}: {
  edit: ChatFileEdit;
  actions?: ChatFileEditActions;
}) {
  const fileName = edit.path.split("/").pop() ?? edit.path;
  const hasPreview = edit.previewLines.length > 0;
  const appliedSummary =
    (edit.status === "applied" || edit.summaryOnly) && hasPreview;
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
        <SetiFileIcon fileName={fileName} className="chat-file-edit-card-icon" />
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
          <CursorDiffLines lines={edit.previewLines} language={edit.language} />
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

export function ChatFileEditCard({
  edit,
  actions,
}: {
  edit: ChatFileEdit;
  /** @deprecated 仅 dock；保留参数以免旧调用崩 */
  variant?: "classic" | "dock";
  actions?: ChatFileEditActions;
}) {
  return <DockFileEditCard edit={edit} actions={actions} />;
}

export function ChatFileEditList({
  edits,
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

  return (
    <div className="chat-file-edit-stack">
      {showBulk ? (
        <div className="chat-file-edit-bulk flex flex-wrap items-center gap-1.5 px-1 py-1">
          <span className="text-[length:var(--font-size-xs)] text-muted-foreground">
            {pendingCount} 个待应用
          </span>
          {onApplyAll ? (
            <button
              type="button"
              className="btn-row text-[length:var(--font-size-xs)]"
              disabled={bulkBusy}
              onClick={() => void onApplyAll()}
            >
              <Check className="h-3 w-3" /> 全部保留
            </button>
          ) : null}
          {onRejectAll ? (
            <button
              type="button"
              className="btn-row text-[length:var(--font-size-xs)]"
              disabled={bulkBusy}
              onClick={() => void onRejectAll()}
            >
              <X className="h-3 w-3" /> 全部撤销
            </button>
          ) : null}
        </div>
      ) : null}
      {uniqueEdits.map((edit) => (
        <ChatFileEditCard key={edit.id} edit={edit} actions={actions} />
      ))}
    </div>
  );
}
