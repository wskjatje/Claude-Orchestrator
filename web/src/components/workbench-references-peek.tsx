import { useEffect, useState, useSyncExternalStore } from "react";
import { X } from "lucide-react";
import {
  getLastPeekDefinition,
  getLastReferencesPeek,
  getLastRenameCrossFiles,
  setLastPeekDefinition,
  setLastRenameCrossFiles,
  subscribePeekDefinition,
  subscribeReferencesPeek,
  subscribeRenameCross,
} from "@/lib/codemirror-ide-extensions";
import { applyCrossFileRename } from "@/lib/apply-cross-file-rename";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";
import { useWorkbenchWorkspaceOptional } from "@/contexts/workbench-workspace-context";
import { toastWorkspaceWriteSuccess } from "@/lib/toast-workspace-write";
import { toast } from "sonner";

/** Peek Definition / 引用 / 跨文件重命名确认 */
export function WorkbenchReferencesPeek() {
  const refs = useSyncExternalStore(
    subscribeReferencesPeek,
    getLastReferencesPeek,
    getLastReferencesPeek,
  );
  const peekDef = useSyncExternalStore(
    subscribePeekDefinition,
    getLastPeekDefinition,
    getLastPeekDefinition,
  );
  const renameCross = useSyncExternalStore(
    subscribeRenameCross,
    getLastRenameCrossFiles,
    getLastRenameCrossFiles,
  );
  const ws = useWorkbenchWorkspaceOptional();
  const [busy, setBusy] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const renameKey = renameCross.map((r) => `${r.relPath}:${r.line}:${r.column}`).join("|");
  useEffect(() => {
    setSelected(new Set(renameCross.map((r) => `${r.relPath}:${r.line}:${r.column}`)));
  }, [renameKey]); // eslint-disable-line react-hooks/exhaustive-deps -- renameKey 概括列表

  if (!refs.length && !renameCross.length && !peekDef) return null;

  const toggle = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const openAt = (relPath: string, line: number, column = 1) => {
    setPendingLineGoto(relPath, line, column);
    void ws?.openFile?.(relPath, { line, column, pin: true });
  };

  const applySelected = async () => {
    const locs = renameCross.filter((r) =>
      selected.has(`${r.relPath}:${r.line}:${r.column}`),
    );
    if (!locs.length) {
      toast.message("请先勾选要应用的位置");
      return;
    }
    setBusy(true);
    try {
      const r = await applyCrossFileRename(locs);
      if (!r.ok) {
        toast.error(r.error || "重命名失败");
        return;
      }
      toastWorkspaceWriteSuccess("", {
        refreshDiff: () => ws?.refreshDiff?.(),
        refreshFiles: () => ws?.refreshFiles?.(),
        writtenPaths: r.written,
      });
      setLastRenameCrossFiles([]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="shrink-0 border-t border-border bg-surface/80 px-3 py-1.5 text-[11.5px]">
      {peekDef ? (
        <div className="mb-1.5">
          <div className="mb-1 flex items-center gap-2">
            <span className="font-medium text-muted-foreground">Peek Definition</span>
            <button
              type="button"
              className="font-mono text-[11px] text-foreground/90 hover:underline"
              onClick={() => openAt(peekDef.relPath, peekDef.line, peekDef.column)}
              title="转到定义"
            >
              {peekDef.relPath}:{peekDef.line}
              {peekDef.word ? ` · ${peekDef.word}` : ""}
            </button>
            <button
              type="button"
              className="ml-auto rounded p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="关闭 Peek Definition"
              onClick={() => setLastPeekDefinition(null)}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
          <pre className="max-h-36 overflow-auto rounded border border-border/60 bg-code-bg/50 px-2 py-1.5 font-mono text-[11px] leading-relaxed text-foreground/90">
            {peekDef.snippet.split("\n").map((ln, i) => {
              const lineNo = peekDef.startLine + i;
              const isHit = lineNo === peekDef.line;
              return (
                <div
                  key={`${lineNo}:${i}`}
                  className={
                    isHit
                      ? "bg-primary/15 text-foreground"
                      : "text-muted-foreground"
                  }
                >
                  <span className="mr-2 inline-block w-8 select-none text-right opacity-60">
                    {lineNo}
                  </span>
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => openAt(peekDef.relPath, lineNo, 1)}
                  >
                    {ln || " "}
                  </button>
                </div>
              );
            })}
          </pre>
        </div>
      ) : null}
      {refs.length ? (
        <div className="mb-1">
          <span className="mr-2 font-medium text-muted-foreground">引用 {refs.length}</span>
          <ul className="mt-0.5 flex max-h-24 flex-col gap-0.5 overflow-auto font-mono text-[11px]">
            {refs.slice(0, 24).map((r, i) => (
              <li key={`${r.relPath}:${r.line}:${i}`}>
                <button
                  type="button"
                  className="text-left text-foreground/90 hover:underline"
                  onClick={() => openAt(r.relPath, r.line, r.column)}
                >
                  {r.relPath}:{r.line}
                  {r.word ? ` · ${r.word}` : ""}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {renameCross.length ? (
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="font-medium text-muted-foreground">
              跨文件重命名 {renameCross.length}
            </span>
            <button
              type="button"
              className="btn-row text-[11px]"
              disabled={busy || !selected.size}
              onClick={() => void applySelected()}
            >
              {busy ? "写入中…" : `应用所选 (${selected.size})`}
            </button>
            <button
              type="button"
              className="btn-row text-[11px]"
              disabled={busy}
              onClick={() => setLastRenameCrossFiles([])}
            >
              取消
            </button>
          </div>
          <ul className="mt-0.5 flex max-h-28 flex-col gap-0.5 overflow-auto font-mono text-[11px]">
            {renameCross.slice(0, 40).map((r, i) => {
              const key = `${r.relPath}:${r.line}:${r.column}`;
              return (
                <li key={`rn-${key}:${i}`} className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={selected.has(key)}
                    onChange={() => toggle(key)}
                    aria-label={`选择 ${key}`}
                  />
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => openAt(r.relPath, r.line, r.column)}
                  >
                    {r.relPath}:{r.line} · {r.oldName}→{r.newName}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
