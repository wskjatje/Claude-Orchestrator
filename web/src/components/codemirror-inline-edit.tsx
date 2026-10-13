import { useCallback, useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { toast } from "sonner";
import { runInlineEdit } from "@/lib/inline-edit-request";
import { applyPendingWorkspaceWrite } from "@/lib/assistant-reply";
import { stashWorkspaceWriteCheckpoint } from "@/lib/workspace-write-checkpoint";
import { getDesktop } from "@/lib/desktop-api";
import { getWorkbenchInteractionMode } from "@/lib/workbench-interaction-mode";
import { toastWorkspaceWriteSuccess } from "@/lib/toast-workspace-write";

type Props = {
  open: boolean;
  view: EditorView | null;
  relPath: string;
  onClose: () => void;
  onApplied: (nextText: string) => void;
};

/** Cmd/Ctrl+K 选区 Inline Edit（真实调用 claudeCodePrompt） */
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

  useEffect(() => {
    if (open) {
      setInstruction("");
      setStreamPreview("");
    }
  }, [open]);

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
      const mode = getWorkbenchInteractionMode();
      if (mode === "ask") {
        toast.message("Ask 模式只读：未改动编辑器", {
          description: "切换 Propose/Agent 后可再次 Inline Edit 并应用",
        });
        onClose();
        return;
      }
      if (mode === "agent") {
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
        toastWorkspaceWriteSuccess("已写入磁盘（Agent）", {
          writtenPaths: [relPath],
          autoOpenScm: true,
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

  if (!open) return null;

  return (
    <div className="absolute inset-x-3 top-3 z-40 mx-auto max-w-lg rounded-lg border border-border bg-surface-elevated p-3 shadow-lg">
      <p className="mb-1.5 text-[12px] font-medium">Inline Edit · {relPath}</p>
      <textarea
        className="mb-2 h-20 w-full resize-y rounded-md border border-border bg-background px-2 py-1.5 text-[12.5px] outline-none focus:ring-1 focus:ring-primary/40"
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
        <pre className="mb-2 max-h-28 overflow-auto rounded border border-border/60 bg-code-bg/40 p-2 font-mono text-[10.5px] leading-snug text-muted-foreground whitespace-pre-wrap">
          {streamPreview}
        </pre>
      ) : null}
      <div className="flex justify-end gap-1.5">
        <button type="button" className="btn-row text-[11px]" disabled={busy} onClick={onClose}>
          取消
        </button>
        <button
          type="button"
          className="btn-row text-[11px]"
          disabled={busy || !instruction.trim()}
          onClick={() => void run()}
        >
          {busy ? "生成中…" : "应用"}
        </button>
      </div>
    </div>
  );
}
