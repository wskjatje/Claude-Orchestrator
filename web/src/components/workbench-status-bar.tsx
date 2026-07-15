import { useCallback, useEffect, useState } from "react";
import { AlertCircle, AlertTriangle, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { hasEmbeddedBrowserNative } from "@/lib/embedded-browser-native";
import { useDesktopReady } from "@/hooks/use-desktop-ready";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { useWorkbenchProblems } from "@/contexts/workbench-problems-context";
import { gitBranchFromStatusLine } from "@/lib/explorer-git-decor";
import { focusProblemsPanel } from "@/lib/workbench-panel-init";

function workspaceFolderName(rootLabel: string): string {
  const trimmed = rootLabel.trim();
  if (!trimmed || trimmed.startsWith("（")) return "工作区";
  const parts = trimmed.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] || "工作区";
}

/** 工作台底部状态栏：分支、工作区名、问题计数 */
export function WorkbenchStatusBar({
  onOpenProblems,
}: {
  onOpenProblems?: () => void;
}) {
  const ws = useWorkbenchWorkspace();
  const desktopReady = useDesktopReady();
  const { errorCount, warningCount } = useWorkbenchProblems();
  const [branch, setBranch] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const loadGitMeta = useCallback(async () => {
    const api = getDesktop();
    if (api?.workbenchGitStatus) {
      try {
        const st = await api.workbenchGitStatus();
        if (st.ok && st.branch) {
          setBranch(st.branch);
          setDirty(Boolean(st.dirty));
          return;
        }
      } catch {
        /* 回退 statusLine */
      }
    }
    const fromLine = gitBranchFromStatusLine(ws.statusLine);
    setBranch(fromLine);
    setDirty(false);
  }, [ws.statusLine]);

  useEffect(() => {
    void loadGitMeta();
  }, [loadGitMeta, ws.rootLabel]);

  useEffect(() => {
    if (ws.statusLine) {
      const fromLine = gitBranchFromStatusLine(ws.statusLine);
      if (fromLine) setBranch(fromLine);
    }
  }, [ws.statusLine]);

  const folder = workspaceFolderName(ws.rootLabel);
  const branchLabel = branch ? `${branch}${dirty ? "*" : ""}` : "—";
  const runtimeLabel = !desktopReady
    ? null
    : hasEmbeddedBrowserNative()
      ? "应用壳 · 内嵌浏览"
      : "Web 预览";

  const openProblems = () => {
    onOpenProblems?.();
    focusProblemsPanel();
  };

  return (
    <footer className="workbench-status-bar shrink-0" translate="no">
      <div className="workbench-status-bar__left">
        <span className="workbench-status-bar__item" title="当前分支">
          <GitBranch className="h-3 w-3 shrink-0 opacity-70" aria-hidden />
          <span className="font-mono">{branchLabel}</span>
        </span>
        <span className="workbench-status-bar__sep" aria-hidden />
        <span className="workbench-status-bar__item workbench-status-bar__item--muted" title={ws.rootLabel}>
          {folder}
        </span>
        {runtimeLabel ? (
          <>
            <span className="workbench-status-bar__sep" aria-hidden />
            <span
              className={cn(
                "workbench-status-bar__item text-[10px]",
                runtimeLabel === "Web 预览" && "text-muted-foreground",
              )}
              title={
                runtimeLabel === "Web 预览"
                  ? "请在应用壳中打开以使用内嵌 WebContentsView"
                  : "Electron 应用壳 · WebContentsView"
              }
            >
              {runtimeLabel}
            </span>
          </>
        ) : null}
      </div>
      <div className="workbench-status-bar__right">
        <button
          type="button"
          className={cn(
            "workbench-status-bar__count",
            errorCount > 0 && "workbench-status-bar__count--error",
          )}
          onClick={errorCount > 0 ? openProblems : undefined}
          disabled={errorCount === 0}
          title={errorCount > 0 ? "查看问题" : "无错误"}
        >
          <AlertCircle className="h-3 w-3" aria-hidden />
          <span>{errorCount}</span>
        </button>
        <button
          type="button"
          className={cn(
            "workbench-status-bar__count",
            warningCount > 0 && "workbench-status-bar__count--warning",
          )}
          onClick={warningCount > 0 ? openProblems : undefined}
          disabled={warningCount === 0}
          title={warningCount > 0 ? "查看警告" : "无警告"}
        >
          <AlertTriangle className="h-3 w-3" aria-hidden />
          <span>{warningCount}</span>
        </button>
      </div>
    </footer>
  );
}
