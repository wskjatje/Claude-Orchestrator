import { useCallback, useEffect, useMemo, useState, useSyncExternalStore, type ReactNode } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { CodemirrorWorkbench } from "@/components/codemirror-workbench";
import { highlightDiffLine } from "@/components/chat-diff-highlight";
import { WorkbenchEditorToolbar, type EditorViewMode } from "@/components/workbench-editor-toolbar";
import { WorkbenchMarkdownPreview } from "@/components/workbench-markdown-preview";
import { WorkbenchSvgPreview } from "@/components/workbench-svg-preview";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { getDesktop } from "@/lib/desktop-api";
import { inlinePreviewKind } from "@/lib/editor-file-kind";
import { buildLineDiffPreview } from "@/lib/parse-chat-file-edits";
import {
  getPendingWritesState,
  subscribePendingWrites,
} from "@/lib/workbench-pending-writes";
import { cn } from "@/lib/utils";

type Props = {
  content: string;
  relPath: string;
  readOnly?: boolean;
  dirty?: boolean;
  onChange?: (content: string) => void;
  onSave?: () => void;
  saving?: boolean;
  toolbarExtras?: ReactNode;
};

export function WorkbenchCodeEditor({
  content,
  relPath,
  readOnly,
  dirty,
  onChange,
  onSave,
  saving,
  toolbarExtras,
}: Props) {
  const ws = useWorkbenchWorkspace();
  const previewKind = inlinePreviewKind(relPath);
  const [viewMode, setViewMode] = useState<EditorViewMode>("source");
  const pending = useSyncExternalStore(
    subscribePendingWrites,
    getPendingWritesState,
    getPendingWritesState,
  );
  const pendingForFile = pending.items.find(
    (it) => it.path.replace(/\\/g, "/") === relPath.replace(/\\/g, "/"),
  );

  const pendingHunkLines = useMemo(() => {
    if (!pendingForFile) return [];
    const proposed =
      pendingForFile.source === "diff" && pendingForFile.diffBody
        ? pendingForFile.diffBody
        : pendingForFile.content;
    if (pendingForFile.source === "diff" && pendingForFile.diffBody) {
      return pendingForFile.diffBody.split("\n").slice(0, 120).map((text) => {
        const prefix = text[0] === "+" || text[0] === "-" || text[0] === " " ? text[0] : " ";
        const kind =
          prefix === "+" ? ("add" as const) : prefix === "-" ? ("del" as const) : ("ctx" as const);
        return { kind, text: text.slice(prefix === " " || prefix === "+" || prefix === "-" ? 1 : 0), prefix: prefix as "+" | "-" | " " };
      });
    }
    const { previewLines } = buildLineDiffPreview(content, proposed, 80, { allowFullAdd: true });
    return previewLines.filter((l) => l.kind !== "fold").slice(0, 80);
  }, [pendingForFile, content]);

  const readWorkspaceFile = useCallback(async (path: string) => {
    const readFn = getDesktop()?.readWorkspaceTextFile;
    if (!readFn) return null;
    const tryRead = async (p: string) => {
      try {
        const r = await readFn(p);
        if (!r.ok || r.binary) return null;
        return r.text ?? null;
      } catch {
        return null;
      }
    };
    return tryRead(path);
  }, []);

  useEffect(() => {
    setViewMode("source");
  }, [relPath]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (readOnly || !onSave || viewMode !== "source") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, onSave, viewMode]);

  const showPreview = Boolean(previewKind) && viewMode === "preview";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--code-bg)]">
      <WorkbenchEditorToolbar
        relPath={relPath}
        dirty={dirty}
        saving={saving}
        readOnly={readOnly}
        onSave={onSave}
        viewMode={previewKind ? viewMode : undefined}
        onViewModeChange={previewKind ? setViewMode : undefined}
        extraActions={toolbarExtras}
      />
      {pendingForFile && (pending.applyOne || pending.rejectOne) ? (
        <div className="flex shrink-0 flex-col border-b border-border/60 bg-amber-500/8">
          <div className="flex items-center gap-2 px-3 py-1.5">
            <span className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
              待确认写入 · {pendingForFile.path}
              {pendingHunkLines.length ? ` · ${pendingHunkLines.length} 行预览` : ""}
            </span>
            {pending.applyOne ? (
              <button
                type="button"
                className="btn-row text-[11px]"
                onClick={() => {
                  void (async () => {
                    try {
                      await pending.applyOne?.(pendingForFile);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "接受失败");
                    }
                  })();
                }}
              >
                <Check className="h-3 w-3" /> 接受
              </button>
            ) : null}
            {pending.rejectOne ? (
              <button
                type="button"
                className="btn-row text-[11px]"
                onClick={() => {
                  void (async () => {
                    try {
                      await pending.rejectOne?.(pendingForFile);
                    } catch (e) {
                      toast.error(e instanceof Error ? e.message : "拒绝失败");
                    }
                  })();
                }}
              >
                <X className="h-3 w-3" /> 拒绝
              </button>
            ) : null}
          </div>
          {pendingHunkLines.length ? (
            <div
              className="max-h-40 overflow-auto border-t border-border/40 bg-[var(--code-bg)] px-2 py-1 font-mono text-[11px] leading-[1.45]"
              role="region"
              aria-label="待确认行内 diff"
            >
              {pendingHunkLines.map((line, i) => (
                <div
                  key={i}
                  className={cn(
                    "whitespace-pre-wrap break-all",
                    line.kind === "add" && "bg-emerald-500/12 text-emerald-800 dark:text-emerald-200",
                    line.kind === "del" && "bg-rose-500/12 text-rose-800 dark:text-rose-200",
                    line.kind === "ctx" && "text-muted-foreground",
                  )}
                >
                  <span className="inline-block w-3 select-none opacity-60">
                    {line.prefix || (line.kind === "add" ? "+" : line.kind === "del" ? "-" : " ")}
                  </span>
                  {highlightDiffLine(line.text || " ", "")}
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {showPreview && previewKind === "markdown" ? (
        <WorkbenchMarkdownPreview content={content} />
      ) : showPreview && previewKind === "svg" ? (
        <WorkbenchSvgPreview content={content} />
      ) : (
        <CodemirrorWorkbench
          value={content}
          relPath={relPath}
          readOnly={readOnly}
          onChange={onChange}
          onOpenFile={ws.openFile}
          readWorkspaceFile={readWorkspaceFile}
        />
      )}
    </div>
  );
}
