import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import type { EditorView } from "@codemirror/view";
import { toast } from "sonner";
import { runInlineEdit } from "@/lib/inline-edit-request";
import { applyPendingWorkspaceWrite } from "@/lib/assistant-reply";
import { stashWorkspaceWriteCheckpoint } from "@/lib/workspace-write-checkpoint";
import { getDesktop } from "@/lib/desktop-api";
import {
  getWorkbenchInteractionMode,
  type WorkbenchInteractionMode,
} from "@/lib/workbench-interaction-mode";
import { toastWorkspaceWriteSuccess } from "@/lib/toast-workspace-write";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  view: EditorView | null;
  relPath: string;
  onClose: () => void;
  onApplied: (nextText: string) => void;
};

type AskPreview = {
  before: string;
  after: string;
};

/** 若前缀/后缀未变，抽出替换段；否则退回新全文前部供预览 */
function extractReplacementSegment(
  full: string,
  next: string,
  from: number,
  to: number,
): string {
  const prefix = full.slice(0, from);
  const suffix = full.slice(to);
  if (next.startsWith(prefix) && next.endsWith(suffix) && next.length >= prefix.length + suffix.length) {
    return next.slice(prefix.length, next.length - suffix.length);
  }
  return next.slice(0, Math.min(next.length, 6000));
}

function selectionAnchorStyle(view: EditorView | null): CSSProperties {
  if (!view) return { top: 12, left: 12, right: 12, maxWidth: 420 };
  try {
    const sel = view.state.selection.main;
    const coords = view.coordsAtPos(sel.from);
    const host = view.dom.getBoundingClientRect();
    if (!coords) return { top: 12, left: 12, right: 12, maxWidth: 420 };
    const top = Math.max(8, coords.bottom - host.top + 6);
    const left = Math.max(8, Math.min(coords.left - host.left, host.width - 360));
    return {
      top,
      left,
      width: Math.min(420, Math.max(280, host.width - left - 16)),
    };
  } catch {
    return { top: 12, left: 12, right: 12, maxWidth: 420 };
  }
}

function previewLines(before: string, after: string, max = 24): { kind: "del" | "add" | "ctx"; text: string }[] {
  const a = before.replace(/\r\n/g, "\n").split("\n");
  const b = after.replace(/\r\n/g, "\n").split("\n");
  if (a.join("\n") === b.join("\n")) return [];
  // 简化：整段 del + add（选区级），避免引入完整 LCS 依赖
  const out: { kind: "del" | "add" | "ctx"; text: string }[] = [];
  for (const line of a.slice(0, max)) out.push({ kind: "del", text: line });
  for (const line of b.slice(0, max)) out.push({ kind: "add", text: line });
  if (a.length > max || b.length > max) {
    out.push({ kind: "ctx", text: `… 共 ${a.length}→${b.length} 行` });
  }
  return out;
}

/** Cmd/Ctrl+K 选区 Inline Edit（真实调用 claudeCodePrompt；贴选区浮层） */
export function CodemirrorInlineEditDialog({
  open,
  view,
  relPath,
  onClose,
  onApplied,
}: Props) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [streamPreview, setStreamPreview] = useState("");
  const [askPreview, setAskPreview] = useState<AskPreview | null>(null);
  const [mode, setMode] = useState<WorkbenchInteractionMode>(() => getWorkbenchInteractionMode());
  const [anchor, setAnchor] = useState<CSSProperties>({ top: 12, left: 12 });

  useEffect(() => {
    if (!open) return;
    setInstruction("");
    setStreamPreview("");
    setAskPreview(null);
    setMode(getWorkbenchInteractionMode());
    setAnchor(selectionAnchorStyle(view));
  }, [open, view]);

  const run = useCallback(async () => {
    if (!view) return;
    const sel = view.state.selection.main;
    if (sel.empty) {
      toast.error("请先选中要修改的代码");
      return;
    }
    const fullText = view.state.doc.toString();
    const selection = fullText.slice(sel.from, sel.to);
    setBusy(true);
    setStreamPreview("");
    setAskPreview(null);
    try {
      const result = await runInlineEdit({
        relPath,
        fullText,
        selection,
        selectionFrom: sel.from,
        selectionTo: sel.to,
        instruction,
        onDelta: (_chunk, acc) => setStreamPreview(acc.slice(-1200)),
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const ix = getWorkbenchInteractionMode();
      setMode(ix);
      if (ix === "ask") {
        // Ask：展示真实 diff 预览，不写盘、不改缓冲
        const afterSel = extractReplacementSegment(
          fullText,
          result.nextFullText,
          sel.from,
          sel.to,
        );
        setAskPreview({ before: selection, after: afterSel });
        toast.message("Ask · 仅预览，未改动编辑器");
        return;
      }
      if (ix === "agent") {
        const api = getDesktop();
        if (!api) {
          toast.error("无法写入");
          return;
        }
        stashWorkspaceWriteCheckpoint(relPath, fullText);
        const r = await applyPendingWorkspaceWrite(api, {
          path: relPath,
          content: result.nextFullText,
        });
        if (!r.ok) {
          toast.error(r.error || "写入失败");
          return;
        }
        onApplied(result.nextFullText);
        toastWorkspaceWriteSuccess("", {
          writtenPaths: [relPath],
        });
        onClose();
        return;
      }
      // Plan：写入编辑器缓冲区，须用户保存才落盘
      onApplied(result.nextFullText);
      toast.message("已应用到编辑器（Plan·未保存）", {
        description: "保存文件后才会写入磁盘；或改用 Agent 模式直接写盘",
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }, [view, relPath, instruction, onApplied, onClose]);

  const diffRows = useMemo(() => {
    if (!askPreview) return [];
    return previewLines(askPreview.before, askPreview.after);
  }, [askPreview]);

  if (!open) return null;

  const applyLabel =
    mode === "ask" ? "生成预览" : mode === "agent" ? "生成并写入" : "生成并应用";

  return (
    <div
      className="cm-inline-edit-popover absolute z-40 rounded-lg border border-border/80 bg-popover p-2.5 shadow-lg"
      style={anchor}
      role="dialog"
      aria-label="Inline Edit"
    >
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <p className="truncate text-[11.5px] font-medium text-foreground/90">
          Edit · <span className="font-mono text-muted-foreground">{relPath.split("/").pop()}</span>
        </p>
        <span className="shrink-0 rounded px-1 py-px text-[10px] text-muted-foreground">
          {mode === "ask" ? "Ask" : mode === "agent" ? "Agent" : "Plan"}
        </span>
      </div>
      <textarea
        className="mb-1.5 h-16 w-full resize-y rounded-md border border-border/70 bg-background px-2 py-1.5 text-[12.5px] outline-none focus:ring-1 focus:ring-primary/35"
        placeholder="说明要如何修改选区…"
        value={instruction}
        disabled={busy}
        autoFocus
        onChange={(e) => setInstruction(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            onClose();
          }
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            void run();
          }
        }}
      />
      {busy && streamPreview ? (
        <pre className="mb-1.5 max-h-24 overflow-auto rounded border border-border/50 bg-code-bg/50 p-1.5 font-mono text-[10.5px] leading-snug text-muted-foreground whitespace-pre-wrap">
          {streamPreview}
        </pre>
      ) : null}
      {askPreview && diffRows.length ? (
        <div className="mb-1.5 max-h-40 overflow-auto rounded border border-border/50 bg-code-bg/40 font-mono text-[11px] leading-[1.4]">
          {diffRows.map((row, i) => (
            <div
              key={i}
              className={cn(
                "whitespace-pre-wrap break-all px-1.5",
                row.kind === "add" && "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200",
                row.kind === "del" && "bg-rose-500/12 text-rose-800 dark:text-rose-200",
                row.kind === "ctx" && "text-muted-foreground",
              )}
            >
              <span className="inline-block w-3 opacity-60">
                {row.kind === "add" ? "+" : row.kind === "del" ? "-" : " "}
              </span>
              {row.text || " "}
            </div>
          ))}
        </div>
      ) : null}
      <div className="flex justify-end gap-1">
        <button type="button" className="btn-row text-[11px]" disabled={busy} onClick={onClose}>
          {askPreview ? "关闭" : "取消"}
        </button>
        {!askPreview ? (
          <button
            type="button"
            className="btn-row text-[11px] font-medium"
            disabled={busy || !instruction.trim()}
            onClick={() => void run()}
          >
            {busy ? "生成中…" : applyLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
