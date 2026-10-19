import { useState } from "react";
import { Paintbrush } from "lucide-react";
import type {
  BackgroundTerminalRun,
  ComposerCanvasPlan,
  ComposerTurnFooterFile,
} from "@/lib/workbench-composer-turn-footer";
import { focusBottomPanel } from "@/lib/workbench-panel-init";
import { requestOpenWorkbenchFile } from "@/lib/workbench-open-file";
import { requestPlanBuild } from "@/lib/plan-build-request";
import { PLAN_BUILD_BUTTON } from "@/lib/ui-copy";

export function ComposerTurnFooterPanel({
  canvas,
  terminals,
  files,
  onUndoAll,
  onReview,
}: {
  canvas?: ComposerCanvasPlan | null;
  terminals?: BackgroundTerminalRun[];
  files?: ComposerTurnFooterFile[];
  onUndoAll?: (() => void) | null;
  onReview?: (() => void) | null;
}) {
  const [termsOpen, setTermsOpen] = useState(false);
  const [filesOpen, setFilesOpen] = useState(false);
  const termCount = terminals?.length ?? 0;
  const fileCount = files?.length ?? 0;
  if (!canvas && termCount === 0 && fileCount === 0) return null;

  return (
    <div
      className="composer-turn-footer composer-file-changes-bar mb-1.5 overflow-hidden rounded-md border"
      role="status"
    >
      {canvas ? (
        <div className="composer-turn-footer-row flex items-center gap-2 px-2.5 py-1.5">
          <Paintbrush className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-[length:var(--font-size-xs)] font-medium text-foreground">
            {canvas.title}
          </span>
          <button
            type="button"
            className="shrink-0 rounded-md px-2 py-0.5 text-[length:var(--font-size-xs)] text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
            onClick={() => requestOpenWorkbenchFile(canvas.path)}
          >
            Open
          </button>
          <button
            type="button"
            className="shrink-0 rounded-md bg-secondary px-2.5 py-0.5 text-[length:var(--font-size-xs)] font-medium text-foreground transition hover:bg-secondary/80"
            onClick={() => requestPlanBuild(canvas.path)}
          >
            {PLAN_BUILD_BUTTON}
          </button>
        </div>
      ) : null}
      {termCount > 0 ? (
        <div className="composer-turn-footer-row">
          <button
            type="button"
            className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition hover:bg-secondary/40"
            aria-expanded={termsOpen}
            onClick={() => {
              setTermsOpen((v) => !v);
              focusBottomPanel("terminal");
            }}
          >
            <span className="composer-file-changes-bar-count min-w-0 flex-1 truncate text-[length:var(--font-size-xs)] text-muted-foreground">
              {termCount} {termCount === 1 ? "background terminal" : "background terminals"}
            </span>
          </button>
          {termsOpen ? (
            <ul className="border-t border-border/40 px-2.5 py-1">
              {terminals!.map((t, i) => (
                <li
                  key={`${t.sessionId}-${i}`}
                  className="truncate py-0.5 font-mono text-[length:var(--font-size-xs)] text-muted-foreground"
                  title={t.command}
                >
                  {t.command}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
      {fileCount > 0 ? (
        <div className="composer-turn-footer-row">
          <div className="flex items-center gap-2 px-2.5 py-1.5">
            <button
              type="button"
              className="composer-file-changes-bar-count min-w-0 flex-1 truncate text-left text-[length:var(--font-size-xs)] font-medium text-foreground"
              aria-expanded={filesOpen}
              onClick={() => setFilesOpen((v) => !v)}
            >
              {fileCount} {fileCount === 1 ? "File" : "Files"}
            </button>
            {onUndoAll ? (
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-0.5 text-[length:var(--font-size-xs)] text-muted-foreground transition hover:bg-secondary/60 hover:text-foreground"
                onClick={() => onUndoAll()}
              >
                Undo All
              </button>
            ) : null}
            {onReview ? (
              <button
                type="button"
                className="shrink-0 rounded-md bg-secondary px-2.5 py-0.5 text-[length:var(--font-size-xs)] font-medium text-foreground transition hover:bg-secondary/80"
                onClick={() => onReview()}
              >
                Review
              </button>
            ) : null}
          </div>
          {filesOpen ? (
            <ul className="border-t border-border/40 px-2.5 py-1">
              {files!.map((f) => {
                const stats =
                  (f.added ?? 0) > 0 || (f.removed ?? 0) > 0
                    ? `+${f.added ?? 0} −${f.removed ?? 0}`
                    : "";
                return (
                  <li key={f.path}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 py-0.5 text-left text-[length:var(--font-size-xs)] text-muted-foreground hover:text-foreground"
                      onClick={() => requestOpenWorkbenchFile(f.path)}
                    >
                      <span className="min-w-0 flex-1 truncate font-mono">{f.path}</span>
                      {stats ? (
                        <span className="shrink-0 tabular-nums text-foreground/80">{stats}</span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
