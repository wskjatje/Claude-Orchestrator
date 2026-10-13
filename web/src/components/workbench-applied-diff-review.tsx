import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { FileCode2, X } from "lucide-react";
import { getDesktop } from "@/lib/desktop-api";
import {
  closeAgentWrittenReview,
  getAgentWrittenReviewState,
  subscribeAgentWrittenReview,
} from "@/lib/agent-written-review";
import { highlightDiffLine } from "@/components/chat-diff-highlight";
import { requestOpenWorkbenchFile } from "@/lib/workbench-open-file";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";
import { peekWorkspaceWriteCheckpoint } from "@/lib/workspace-write-checkpoint";
import { buildLineDiffPreview, type ChatFileEditLine } from "@/lib/parse-chat-file-edits";
import { cn } from "@/lib/utils";

/** 按文件切开 unified diff（粗分） */
function splitDiffByFile(diff: string): { path: string; body: string }[] {
  const chunks = String(diff || "").split(/(?=^diff --git )/m).filter((c) => c.trim());
  const out: { path: string; body: string }[] = [];
  for (const body of chunks) {
    const m =
      body.match(/^diff --git a\/(.+?) b\/(.+)$/m) ||
      body.match(/^\+\+\+ b\/(.+)$/m);
    const path = (m?.[2] || m?.[1] || "（未知）").replace(/\\/g, "/");
    out.push({ path, body });
  }
  return out;
}

function linesFromUnifiedOrPreview(
  body: string,
  preview?: ChatFileEditLine[],
): { kind: "raw" | "preview"; raw?: string[]; preview?: ChatFileEditLine[] } {
  if (preview?.length) return { kind: "preview", preview };
  return { kind: "raw", raw: (body || "").split("\n").slice(0, 400) };
}

/** Agent 已写盘路径的只读聚合 Diff（相对 HEAD；失败时用 checkpoint） */
export function WorkbenchAppliedDiffReview({ onClose }: { onClose?: () => void }) {
  const review = useSyncExternalStore(
    subscribeAgentWrittenReview,
    getAgentWrittenReviewState,
    getAgentWrittenReviewState,
  );
  const [diff, setDiff] = useState("");
  const [checkpointPreviews, setCheckpointPreviews] = useState<
    Map<string, ChatFileEditLine[]>
  >(() => new Map());
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (!review.open || !review.paths.length) {
      setDiff("");
      setErr(null);
      setCheckpointPreviews(new Map());
      return;
    }
    let cancelled = false;
    setLoading(true);
    setErr(null);
    void (async () => {
      const api = getDesktop();
      if (!api?.workspaceGetGitDiffPaths) {
        if (!cancelled) {
          setErr("当前环境不支持路径 Diff");
          setLoading(false);
        }
        return;
      }
      try {
        const r = await api.workspaceGetGitDiffPaths({ paths: review.paths });
        if (cancelled) return;
        const gitDiff = r?.ok ? String(r.diff || "") : "";
        const gitUsable =
          r?.ok &&
          gitDiff &&
          !gitDiff.includes("无差异") &&
          !gitDiff.includes("无文件内容") &&
          /^(diff --git|\+|-)|\n@@/m.test(gitDiff);

        if (gitUsable) {
          setDiff(gitDiff);
          setErr(null);
          setCheckpointPreviews(new Map());
        } else {
          // git 失败或假全绿：用 checkpoint vs 磁盘合成真 Diff
          const map = new Map<string, ChatFileEditLine[]>();
          const readFile = api.readWorkspaceTextFile;
          if (readFile) {
            for (const p of review.paths) {
              const before = peekWorkspaceWriteCheckpoint(p);
              if (before === undefined) continue;
              try {
                const fr = await readFile(p);
                const after = fr?.ok && typeof fr.text === "string" ? fr.text : "";
                const { previewLines } = buildLineDiffPreview(before, after, 120, {
                  allowFullAdd: before === "",
                });
                if (previewLines.length) map.set(p.replace(/\\/g, "/"), previewLines);
              } catch {
                /* ignore */
              }
            }
          }
          setCheckpointPreviews(map);
          setDiff(gitUsable ? gitDiff : "");
          if (!map.size && !gitUsable) {
            setErr(r?.error || "无法合成 Diff（无 git 基线且无写入快照）");
          } else {
            setErr(null);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setErr(e instanceof Error ? e.message : String(e));
          setDiff("");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [review.open, review.paths.join("\0")]);

  const files = useMemo(() => {
    const split = splitDiffByFile(diff);
    if (split.length) return split;
    if (checkpointPreviews.size) {
      return review.paths
        .filter((p) => checkpointPreviews.has(p.replace(/\\/g, "/")))
        .map((path) => ({ path, body: "" }));
    }
    if (review.paths.length) {
      return review.paths.map((path) => ({
        path,
        body: diff || "（无差异）",
      }));
    }
    return [];
  }, [diff, review.paths, checkpointPreviews]);

  useEffect(() => {
    if (idx >= files.length) setIdx(Math.max(0, files.length - 1));
  }, [files.length, idx]);

  const current = files[idx] ?? null;
  const display = useMemo(() => {
    const path = current?.path?.replace(/\\/g, "/") || "";
    const preview = checkpointPreviews.get(path);
    return linesFromUnifiedOrPreview(current?.body || "", preview);
  }, [current?.body, current?.path, checkpointPreviews]);

  const handleClose = () => {
    closeAgentWrittenReview();
    onClose?.();
  };

  if (!review.open) return null;

  return (
    <div className="flex h-full min-h-0 flex-col bg-code-bg/20">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2">
        <FileCode2 className="h-3.5 w-3.5 text-primary" />
        <span className="text-[12px] font-medium">已写入 · Diff Review</span>
        <span className="font-mono text-[10px] text-muted-foreground">
          {review.paths.length} 文件
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-40"
            disabled={idx <= 0}
            onClick={() => setIdx((i) => Math.max(0, i - 1))}
          >
            上一个
          </button>
          <button
            type="button"
            className="rounded px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-secondary disabled:opacity-40"
            disabled={idx >= files.length - 1}
            onClick={() => setIdx((i) => Math.min(files.length - 1, i + 1))}
          >
            下一个
          </button>
          <button
            type="button"
            className="rounded p-1 text-muted-foreground hover:bg-secondary"
            aria-label="关闭 Diff Review"
            onClick={handleClose}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <aside className="w-44 shrink-0 overflow-y-auto border-r border-border/60 p-1">
          {review.paths.map((p, i) => {
            const active = files[idx]?.path === p || (files[idx] == null && i === idx);
            return (
              <button
                key={p}
                type="button"
                className={cn(
                  "mb-0.5 w-full truncate rounded px-2 py-1 text-left font-mono text-[11px]",
                  active ? "bg-primary/10 text-foreground" : "text-muted-foreground hover:bg-secondary/60",
                )}
                title={p}
                onClick={() => {
                  const fi = files.findIndex((f) => f.path === p || f.path.endsWith(p));
                  setIdx(fi >= 0 ? fi : i);
                  setPendingLineGoto(p, 1, 1);
                  requestOpenWorkbenchFile(p);
                }}
              >
                {p.split("/").pop()}
              </button>
            );
          })}
        </aside>
        <div className="min-h-0 min-w-0 flex-1 overflow-auto p-2 font-mono text-[11px] leading-relaxed">
          {loading ? (
            <p className="text-muted-foreground">加载 Diff…</p>
          ) : err ? (
            <p className="text-destructive">{err}</p>
          ) : (
            <>
              <p className="mb-2 truncate text-[12px] text-foreground/80">{current?.path}</p>
              {display.kind === "preview" ? (
                <div>
                  {display.preview!.map((line, i) => (
                    <div
                      key={i}
                      className={cn(
                        "chat-file-edit-line",
                        line.kind === "add" && "chat-file-edit-line--add",
                        line.kind === "del" && "chat-file-edit-line--del",
                        line.kind === "ctx" && "text-muted-foreground",
                        line.kind === "fold" && "text-muted-foreground",
                      )}
                    >
                      {line.kind === "fold"
                        ? line.text
                        : `${line.prefix ?? " "}${line.text}`}
                    </div>
                  ))}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap break-all">
                  {display.raw!.map((line, i) => (
                    <div key={i}>{highlightDiffLine(line, "diff")}</div>
                  ))}
                </pre>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
