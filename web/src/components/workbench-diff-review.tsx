import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Check, ChevronLeft, ChevronRight, FileCode2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPendingWritesState,
  subscribePendingWrites,
  type PendingWriteItem,
} from "@/lib/workbench-pending-writes";
import { useWorkbenchWorkspaceOptional } from "@/contexts/workbench-workspace-context";
import { getDesktop } from "@/lib/desktop-api";
import {
  applyUnifiedDiff,
  applyUnifiedDiffHunks,
  splitUnifiedDiffHunks,
  type DiffHunk,
} from "@/lib/apply-unified-diff";
import {
  buildLineDiffPreview,
  languageFromPath,
  type ChatFileEditLine,
} from "@/lib/parse-chat-file-edits";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";
import { highlightDiffLine } from "@/components/chat-diff-highlight";

type PreviewState = {
  before: string;
  after: string;
  lines: ChatFileEditLine[];
  added: number;
  removed: number;
  error?: string;
  hunks?: DiffHunk[];
};

async function buildPreview(item: PendingWriteItem): Promise<PreviewState> {
  const api = getDesktop();
  let before = "";
  try {
    if (api?.readWorkspaceTextFile) {
      const r = await api.readWorkspaceTextFile(item.path);
      if (r?.ok && typeof r.text === "string") before = r.text;
    }
  } catch {
    before = "";
  }
  let after = item.content;
  if (item.source === "diff" || item.diffBody) {
    const body = item.diffBody || item.content;
    const applied = applyUnifiedDiff(before, body);
    if (applied == null) {
      return {
        before,
        after: "",
        lines: [],
        added: 0,
        removed: 0,
        error: "diff 与磁盘基线不匹配，无法预览",
      };
    }
    after = applied;
  }
  const { previewLines, added, removed } = buildLineDiffPreview(before, after, 80);
  const hunks =
    item.source === "diff" || item.diffBody
      ? splitUnifiedDiffHunks(item.diffBody || item.content).hunks
      : [];
  return { before, after, lines: previewLines, added, removed, hunks };
}

/** 中栏多文件 Diff Review：与侧栏待审同源，Accept/Reject 真实写盘 */
export function WorkbenchDiffReview({
  onClose,
}: {
  onClose?: () => void;
}) {
  const pending = useSyncExternalStore(
    subscribePendingWrites,
    getPendingWritesState,
    getPendingWritesState,
  );
  const ws = useWorkbenchWorkspaceOptional();
  const items = pending.items;
  const [idx, setIdx] = useState(0);
  const [preview, setPreview] = useState<PreviewState | null>(null);
  const [busy, setBusy] = useState(false);
  const [selectedHunks, setSelectedHunks] = useState<Set<number>>(new Set());

  const safeIdx = items.length ? Math.min(idx, items.length - 1) : 0;
  const current = items[safeIdx] ?? null;

  useEffect(() => {
    if (!current) {
      setPreview(null);
      return;
    }
    let cancelled = false;
    void buildPreview(current).then((p) => {
      if (cancelled) return;
      setPreview(p);
      if (p.hunks?.length) {
        setSelectedHunks(new Set(p.hunks.map((h) => h.index)));
      } else {
        setSelectedHunks(new Set());
      }
    });
    return () => {
      cancelled = true;
    };
  }, [current?.path, current?.content, current?.diffBody, current?.source, current?.historyIndex]);

  useEffect(() => {
    if (idx >= items.length) setIdx(Math.max(0, items.length - 1));
  }, [items.length, idx]);

  const lang = useMemo(
    () => (current ? languageFromPath(current.path) : "text"),
    [current?.path],
  );

  if (!items.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 bg-code-bg/20 p-6 text-center">
        <FileCode2 className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-[13px] text-muted-foreground">暂无待确认写入</p>
        {onClose ? (
          <button type="button" className="btn-row text-[12px]" onClick={onClose}>
            关闭
          </button>
        ) : null}
      </div>
    );
  }

  const gotoLine = (lineText: string, kind: string) => {
    if (!current || !preview) return;
    const hay = kind === "add" ? preview.after : preview.before;
    const lines = hay.split("\n");
    const line = lines.findIndex((l) => l === lineText) + 1;
    if (line > 0) {
      setPendingLineGoto(current.path, line, 1);
      void ws?.openFile?.(current.path);
    }
  };

  const accept = async () => {
    if (!current || !pending.applyOne) return;
    setBusy(true);
    try {
      let item = current;
      if (
        preview?.hunks?.length &&
        (current.source === "diff" || current.diffBody) &&
        selectedHunks.size < preview.hunks.length
      ) {
        const body = current.diffBody || current.content;
        const after = applyUnifiedDiffHunks(preview.before, body, [...selectedHunks]);
        if (after == null) {
          setBusy(false);
          return;
        }
        item = { ...current, content: after, source: "fence", diffBody: undefined };
      }
      await pending.applyOne(item);
    } finally {
      setBusy(false);
    }
  };

  const toggleHunk = (index: number) => {
    setSelectedHunks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const reject = () => {
    if (!current || !pending.rejectOne) return;
    pending.rejectOne(current);
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-code-bg/30">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <span className="text-[12px] font-medium">Diff Review</span>
        <span className="text-[11px] text-muted-foreground">
          {safeIdx + 1}/{items.length}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="workbench-icon-btn workbench-icon-btn--sm"
            disabled={safeIdx <= 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
            aria-label="上一个"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="workbench-icon-btn workbench-icon-btn--sm"
            disabled={safeIdx >= items.length - 1}
            onClick={() => setIdx((i) => Math.min(items.length - 1, i + 1))}
            aria-label="下一个"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          {onClose ? (
            <button type="button" className="workbench-icon-btn workbench-icon-btn--sm" onClick={onClose} aria-label="关闭">
              <X className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-border/70 px-3 py-1.5">
        <code className="truncate font-mono text-[11.5px]">{current.path}</code>
        {preview ? (
          <span className="font-mono text-[10.5px] text-muted-foreground">
            +{preview.added} −{preview.removed}
          </span>
        ) : null}
        <div className="ml-auto flex gap-1">
          <button
            type="button"
            className="btn-row text-[11px]"
            disabled={busy || !pending.applyOne}
            onClick={() => void accept()}
          >
            <Check className="h-3 w-3" /> 接受
          </button>
          <button
            type="button"
            className="btn-row text-[11px]"
            disabled={busy || !pending.rejectOne}
            onClick={reject}
          >
            <X className="h-3 w-3" /> 拒绝
          </button>
          {pending.applyAll && items.length > 1 ? (
            <button
              type="button"
              className="btn-row text-[11px]"
              disabled={busy}
              onClick={() => void pending.applyAll?.()}
            >
              全部接受
            </button>
          ) : null}
        </div>
      </div>

      {preview?.hunks && preview.hunks.length > 1 ? (
        <div className="flex shrink-0 flex-wrap gap-1 border-b border-border/60 px-3 py-1.5">
          {preview.hunks.map((h) => (
            <button
              key={h.index}
              type="button"
              className={cn(
                "rounded border px-1.5 py-0.5 font-mono text-[10px]",
                selectedHunks.has(h.index)
                  ? "border-primary/40 bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground line-through opacity-60",
              )}
              onClick={() => toggleHunk(h.index)}
              title={h.header}
            >
              hunk {h.index + 1}
            </button>
          ))}
        </div>
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto font-mono text-[11.5px] leading-[1.45]">
        {preview?.error ? (
          <p className="p-3 text-[12px] text-destructive">{preview.error}</p>
        ) : null}
        {preview?.lines.map((line, i) => (
          <button
            key={`${i}-${line.kind}-${line.text.slice(0, 24)}`}
            type="button"
            className={cn(
              "chat-file-edit-line flex w-full border-0 px-3 py-0 text-left hover:bg-secondary/40",
              line.kind === "add" && "chat-file-edit-line--add",
              line.kind === "del" && "chat-file-edit-line--del",
              line.kind === "ctx" && "chat-file-edit-line--ctx text-muted-foreground",
              line.kind === "fold" && "text-muted-foreground",
            )}
            onClick={() => {
              if (line.kind === "fold") return;
              gotoLine(line.text, line.kind);
            }}
            title="跳转到编辑器"
          >
            {line.kind === "fold"
              ? line.text
              : highlightDiffLine(line.text || " ", lang)}
          </button>
        ))}
        {!preview ? (
          <p className="p-3 text-[12px] text-muted-foreground">加载预览…</p>
        ) : null}
      </div>

      <ul className="flex shrink-0 gap-1 overflow-x-auto border-t border-border px-2 py-1.5">
        {items.map((it, i) => (
          <li key={`${it.path}-${it.historyIndex}-${i}`}>
            <button
              type="button"
              className={cn(
                "rounded px-2 py-0.5 font-mono text-[10.5px]",
                i === safeIdx ? "bg-primary/15 text-foreground" : "text-muted-foreground hover:bg-secondary",
              )}
              onClick={() => setIdx(i)}
            >
              {it.path.split("/").pop()}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
