import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { AlertCircle, AlertTriangle, GitBranch } from "lucide-react";
import { toast } from "sonner";
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

type LspLangStatus = {
  id: string;
  detected: boolean;
  commandAvailable?: boolean;
  serverHint: string | null;
  installHint?: string | null;
  running?: boolean;
  lastError?: string | null;
};

/** 工作台底部状态栏：分支、工作区名、LSP 就绪、问题计数 */
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
  const [lspHint, setLspHint] = useState<string | null>(null);
  const [lspInstallHint, setLspInstallHint] = useState<string | null>(null);
  const [lspMissing, setLspMissing] = useState(false);

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

  const loadLspStatus = useCallback(async () => {
    const api = getDesktop();
    const fn = api?.workspaceExternalLspStatus || api?.workspaceDetectExternalLsp;
    if (!fn) {
      setLspHint(null);
      setLspInstallHint(null);
      setLspMissing(false);
      return;
    }
    try {
      const r = await fn();
      if (!r?.ok || !r.languages?.length) {
        setLspHint(null);
        setLspInstallHint(null);
        setLspMissing(false);
        return;
      }
      const langs = r.languages as LspLangStatus[];
      const missing = langs.filter((l) => l.detected && l.commandAvailable === false);
      const errored = langs.filter((l) => l.lastError);
      const running = langs.filter((l) => l.running);
      if (missing.length) {
        const first = missing[0]!;
        setLspHint(`缺 ${first.serverHint || first.id}`);
        setLspInstallHint(
          first.installHint ||
            (first.serverHint ? `请安装并加入 PATH：${first.serverHint}` : null),
        );
        setLspMissing(true);
        return;
      }
      if (errored.length && !running.length) {
        setLspHint(errored[0]!.lastError?.slice(0, 36) || "LSP 异常");
        setLspInstallHint(null);
        setLspMissing(false);
        return;
      }
      if (running.length) {
        setLspHint(running.map((l) => l.id).join("+"));
        setLspInstallHint(null);
        setLspMissing(false);
        return;
      }
      setLspHint(null);
      setLspInstallHint(null);
      setLspMissing(false);
    } catch {
      setLspHint(null);
      setLspInstallHint(null);
      setLspMissing(false);
    }
  }, []);

  useEffect(() => {
    void loadGitMeta();
  }, [loadGitMeta, ws.rootLabel]);

  useEffect(() => {
    void loadLspStatus();
    const t = setInterval(() => void loadLspStatus(), 20_000);
    return () => clearInterval(t);
  }, [loadLspStatus, ws.rootLabel]);

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

  const openProblems = (ev?: MouseEvent) => {
    if (ev?.shiftKey) {
      void import("@/lib/workbench-side-tab").then(({ requestPrefillComposer, requestWorkbenchLayoutToggle }) => {
        requestWorkbenchLayoutToggle("chat", { ensure: true });
        requestPrefillComposer("@problems ");
      });
      return;
    }
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
                "workbench-status-bar__item text-[12px]",
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
        {lspHint ? (
          <>
            <span className="workbench-status-bar__sep" aria-hidden />
            <button
              type="button"
              className={cn(
                "workbench-status-bar__item text-[12px]",
                /缺|异常|退出|未找到/.test(lspHint)
                  ? "text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground",
              )}
              title={
                lspInstallHint
                  ? `外部 LSP：${lspHint}\n安装：${lspInstallHint}`
                  : `外部 LSP：${lspHint}`
              }
              onClick={() => {
                if (lspMissing && lspInstallHint) {
                  toast.message("安装语言服务", {
                    description: lspInstallHint,
                    duration: 12_000,
                  });
                }
                openProblems();
              }}
            >
              LSP · {lspHint}
            </button>
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
          onClick={errorCount > 0 ? (e) => openProblems(e) : undefined}
          disabled={errorCount === 0}
          title={errorCount > 0 ? "查看问题（Shift+点击添加到对话）" : "无错误"}
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
          onClick={warningCount > 0 ? (e) => openProblems(e) : undefined}
          disabled={warningCount === 0}
          title={warningCount > 0 ? "查看警告（Shift+点击添加到对话）" : "无警告"}
        >
          <AlertTriangle className="h-3 w-3" aria-hidden />
          <span>{warningCount}</span>
        </button>
      </div>
    </footer>
  );
}
