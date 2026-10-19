import { useMemo, useSyncExternalStore, type RefObject } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { ChatComposerShell, type ChatComposerShellProps } from "@/components/chat-composer-shell";
import { ChainQuickTrigger, type QuickChainOption } from "@/components/chain-quick-trigger";
import { ComposerTurnFooterPanel } from "@/components/composer-turn-footer-panel";
import { cn } from "@/lib/utils";
import {
  getComposerFileBarState,
  subscribeComposerFileBar,
} from "@/lib/workbench-composer-file-bar";
import {
  getComposerBackgroundTerminalRuns,
  getComposerCanvasPlan,
  subscribeComposerTurnFooter,
} from "@/lib/workbench-composer-turn-footer";
import {
  getPendingWritesState,
  subscribePendingWrites,
} from "@/lib/workbench-pending-writes";
import { useWorkbenchWorkspaceOptional } from "@/contexts/workbench-workspace-context";
import { isFileTab } from "@/types/workbench-editor";

export type WorkbenchChatComposerProps = ChatComposerShellProps & {
  dockRef: RefObject<HTMLDivElement | null>;
  chainStatusLabel: string;
  chainStatusTone: "active" | "paused" | "done" | "neutral" | "idle";
  /** 进行中 / 暂停时停止链（复用 orchestrationStopChainRun） */
  onStopChain?: () => void;
  /** 快速添加 / 触发任务链的回调 */
  onAddTask?: (chainId: string) => Promise<void>;
  /** 可选的任务链选项列表 */
  chainOptions?: QuickChainOption[];
};

/** Composer：底部始终保留输入框；历史编辑在顶部内联 Composer。 */
export function WorkbenchChatComposer({
  dockRef,
  chainStatusLabel,
  chainStatusTone,
  onStopChain,
  onAddTask,
  chainOptions,
  editHistoryActive,
  onCancelEdit,
  ...shellProps
}: WorkbenchChatComposerProps) {
  const fileBar = useSyncExternalStore(
    subscribeComposerFileBar,
    getComposerFileBarState,
    getComposerFileBarState,
  );
  const canvasPlan = useSyncExternalStore(
    subscribeComposerTurnFooter,
    getComposerCanvasPlan,
    getComposerCanvasPlan,
  );
  const backgroundTerminals = useSyncExternalStore(
    subscribeComposerTurnFooter,
    getComposerBackgroundTerminalRuns,
    getComposerBackgroundTerminalRuns,
  );
  const pending = useSyncExternalStore(
    subscribePendingWrites,
    getPendingWritesState,
    getPendingWritesState,
  );
  const ws = useWorkbenchWorkspaceOptional();
  const mentionPriorityPaths = useMemo(() => {
    if (!ws?.editorTabs?.length) return [];
    const paths = ws.editorTabs.filter(isFileTab).map((t) => t.relPath);
    const active =
      ws.activeEditorTab && isFileTab(ws.activeEditorTab) ? ws.activeEditorTab.relPath : null;
    if (active) return [active, ...paths.filter((p) => p !== active)];
    return paths;
  }, [ws?.editorTabs, ws?.activeEditorTab]);

  const pendingCount = pending.items.length;
  const showPendingBar = pendingCount > 0 && Boolean(pending.applyAll || pending.rejectAll);
  const showTurnFooter =
    Boolean(canvasPlan) || backgroundTerminals.length > 0 || fileBar.count > 0;

  return (
    <div ref={dockRef} className="chat-pane-composer border-t border-border/60">
      {showPendingBar ? (
        <div className="composer-pending-bar" role="status">
          <span className="min-w-0 flex-1 truncate text-[12px] text-foreground/90">
            {pendingCount} 个待确认写入
          </span>
          {pending.applyAll ? (
            <button
              type="button"
              className="btn-row shrink-0 text-[11px] font-medium"
              onClick={() => {
                void (async () => {
                  try {
                    await pending.applyAll?.();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "全部接受失败");
                  }
                })();
              }}
            >
              <Check className="h-3 w-3" /> 全部接受
            </button>
          ) : null}
          {pending.rejectAll ? (
            <button
              type="button"
              className="btn-row shrink-0 text-[11px]"
              onClick={() => {
                void (async () => {
                  try {
                    await pending.rejectAll?.();
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "全部拒绝失败");
                  }
                })();
              }}
            >
              <X className="h-3 w-3" /> 全部拒绝
            </button>
          ) : null}
        </div>
      ) : null}

      {showTurnFooter ? (
        <ComposerTurnFooterPanel
          canvas={canvasPlan}
          terminals={backgroundTerminals}
          files={fileBar.paths.map((path) => ({ path }))}
          onUndoAll={fileBar.undoAll}
          onReview={fileBar.review}
        />
      ) : null}

      <ChatComposerShell
        {...shellProps}
        editHistoryActive={editHistoryActive}
        onCancelEdit={onCancelEdit}
        variant="dock"
        mentionPriorityPaths={mentionPriorityPaths}
      />

      {chainStatusLabel &&
      chainStatusLabel !== "链：—" &&
      chainStatusTone !== "done" ? (
        <div className="mt-1 flex items-center justify-between gap-2 px-0.5">
          <span
            className={cn(
              "inline-flex max-w-full truncate rounded-full border px-2 py-0.5 text-[11px] font-medium",
              chainStatusTone === "active" &&
                "border-emerald-400/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              chainStatusTone === "idle" &&
                "border-sky-400/40 bg-sky-500/10 text-sky-800 dark:text-sky-300",
              chainStatusTone === "paused" &&
                "border-amber-400/45 bg-amber-500/12 text-amber-800 dark:text-amber-300",
              chainStatusTone === "neutral" &&
                "border-border/70 bg-background/35 text-muted-foreground",
            )}
            title="任务链状态"
          >
            {chainStatusLabel}
          </span>
          <div className="flex shrink-0 items-center gap-1">
            {onStopChain ? (
              <button
                type="button"
                className="rounded-md border border-border/70 px-2 py-0.5 text-[11px] text-muted-foreground transition hover:bg-secondary/70 hover:text-foreground"
                onClick={onStopChain}
                title="停止任务链"
              >
                停止
              </button>
            ) : null}
            {onAddTask && chainOptions && chainOptions.length > 0 ? (
              <ChainQuickTrigger
                disabled={Boolean(shellProps.disabled)}
                chains={chainOptions}
                onTriggerChain={onAddTask}
              />
            ) : null}
          </div>
        </div>
      ) : null}
      {!chainStatusLabel && onAddTask && chainOptions && chainOptions.length > 0 ? (
        <div className="mt-1 flex justify-end px-0.5">
          <ChainQuickTrigger
            disabled={Boolean(shellProps.disabled)}
            chains={chainOptions}
            onTriggerChain={onAddTask}
          />
        </div>
      ) : null}
    </div>
  );
}
