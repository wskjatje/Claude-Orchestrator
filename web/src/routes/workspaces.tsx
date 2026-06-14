import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { InfoHint } from "@/components/info-hint";
import { PageContent, PageRoot, PageSection, SinglePaneLayout } from "@/components/page-layout";
import { Clock, FolderTree, FolderOpen, Trash2, X } from "lucide-react";
import { useDesktopReady, useHasDesktop } from "@/hooks/use-desktop-ready";
import { getDesktop, isWebBridge } from "@/lib/desktop-api";
import { chooseWorkspaceWithFeedback, openWorkspacePathWithFeedback } from "@/lib/choose-workspace";
import {
  formatWorkspaceHistoryLabel,
  formatWorkspaceHistoryTime,
  type WorkspaceHistoryEntry,
} from "@/lib/workspace-history";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/workspaces")({
  head: () => ({ meta: [{ title: "工作目录 · 本地代码助手" }] }),
  component: WorkspacesPage,
});

function WorkspacesPage() {
  const desktopReady = useDesktopReady();
  const desktop = useHasDesktop();
  const [cwd, setCwd] = useState<string | null>(null);
  const [history, setHistory] = useState<WorkspaceHistoryEntry[]>([]);
  const [hint, setHint] = useState("");

  const refresh = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    let p: string | null = null;
    try {
      p = await api.getWorkspace();
      setCwd(p);
    } catch {
      setCwd(null);
    }
    if (typeof api.getWorkspaceHistory !== "function") {
      setHistory(p ? [{ path: p, openedAt: Date.now() }] : []);
      setHint("打开记录 API 未就绪，请刷新页面；若仍为空请重启 npm run web:dev:full。");
      return;
    }
    try {
      const hist = await api.getWorkspaceHistory();
      setHistory(hist.entries ?? []);
      setHint("");
    } catch {
      setHistory(p ? [{ path: p, openedAt: Date.now() }] : []);
      setHint("无法读取打开记录，请重启 npm run web:dev:full 后刷新本页。");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const api = getDesktop();
    if (!api?.onWorkspaceChanged) return;
    const off = api.onWorkspaceChanged(() => {
      void refresh();
    });
    return () => {
      try {
        off?.();
      } catch {
        /* ignore */
      }
    };
  }, [refresh]);

  const choose = async () => {
    const api = getDesktop();
    if (!api) return;
    setHint("");
    const p = await chooseWorkspaceWithFeedback(api);
    if (p) {
      setCwd(p);
      void refresh();
    }
  };

  const openFromHistory = async (path: string) => {
    const api = getDesktop();
    if (!api) return;
    setHint("");
    const p = await openWorkspacePathWithFeedback(api, path);
    if (p) {
      setCwd(p);
      void refresh();
    }
  };

  const removeHistoryEntry = async (path: string) => {
    const api = getDesktop();
    if (!api?.removeWorkspaceHistoryEntry) return;
    const next = await api.removeWorkspaceHistoryEntry(path);
    setHistory(next.entries ?? []);
  };

  const clearHistory = async () => {
    const api = getDesktop();
    if (!api?.clearWorkspaceHistory) return;
    if (!window.confirm("确定清空全部打开记录？（不会删除磁盘上的项目文件夹）")) return;
    const next = await api.clearWorkspaceHistory();
    setHistory(next.entries ?? []);
    setHint("已清空打开记录。");
  };

  const clear = async () => {
    const api = getDesktop();
    if (!api) return;
    await api.clearWorkspace();
    setCwd(null);
    setHint("已清除工作区（聊天写入将受限直至重新选择）。");
  };

  return (
    <AppShell>
      <PageRoot>
        <PageHeader
          title="工作目录"
          description="选择项目根目录，供聊天、工作台与任务链读写"
        />
        <SinglePaneLayout>
          <PageContent className="space-y-4">
            {desktopReady && !desktop && (
              <div className="rounded-xl border border-warning/30 bg-warning/10 px-4 py-3 text-[12.5px] text-warning">
                未检测到桌面 API。请先运行 <code className="font-mono">npm run web:dev:full</code> 并刷新本页。
              </div>
            )}
            {desktopReady && desktop && isWebBridge() && (
              <div className="rounded-xl border border-border bg-secondary/40 px-4 py-3 text-[12.5px] text-muted-foreground">
                Web 模式：点击「浏览目录」将弹出 macOS 本机文件夹选择框（由 Web Bridge 调用）。
              </div>
            )}
            {hint ? (
              <div className="rounded-xl border border-border bg-secondary/50 px-4 py-3 text-[12px] text-muted-foreground">{hint}</div>
            ) : null}

            <PageSection title="当前工作区" hint={<InfoHint>全应用唯一可修改工作区的入口</InfoHint>}>
              <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                <div className="flex items-start gap-2 rounded-lg border border-border bg-surface px-3 py-2.5">
                  <FolderTree className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <div className="min-w-0 font-mono text-[12px] leading-relaxed text-foreground break-all">
                    {cwd ?? <span className="text-muted-foreground">（未设置）</span>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  <button
                    type="button"
                    onClick={() => void choose()}
                    disabled={!desktop}
                    className="btn-gradient-primary inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[12.5px] font-semibold shadow-sm transition hover:opacity-95 disabled:opacity-40"
                  >
                    <FolderOpen className="h-4 w-4" /> 浏览目录…
                  </button>
                  <button
                    type="button"
                    onClick={() => void refresh()}
                    disabled={!desktop}
                    className="rounded-lg border border-border bg-surface px-4 py-2 text-[12.5px] font-medium text-foreground transition hover:bg-secondary disabled:opacity-40"
                  >
                    刷新
                  </button>
                  <button
                    type="button"
                    onClick={() => void clear()}
                    disabled={!desktop || !cwd}
                    className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2 text-[12.5px] font-medium text-muted-foreground transition hover:border-destructive/40 hover:text-destructive disabled:opacity-40"
                  >
                    <Trash2 className="h-4 w-4" /> 清除
                  </button>
                </div>
              </div>
            </PageSection>

            <PageSection title="打开记录" hint={<InfoHint>点击条目可快速切换；清空仅删除记录，不删磁盘文件夹</InfoHint>}>
              {!history.length ? (
                <div className="rounded-lg border border-dashed border-border bg-surface/50 px-4 py-8 text-center text-[12px] text-muted-foreground">
                  暂无打开记录。选择工作区后会自动记录。
                </div>
              ) : (
                <div className="overflow-hidden rounded-lg border border-border bg-surface">
                  <ul className="divide-y divide-border/70">
                    {history.map((entry) => {
                      const active = cwd === entry.path;
                      return (
                        <li key={entry.path} className="flex items-stretch gap-1">
                          <button
                            type="button"
                            disabled={!desktop}
                            onClick={() => void openFromHistory(entry.path)}
                            className={cn(
                              "flex min-w-0 flex-1 items-start gap-2 px-3 py-2.5 text-left transition hover:bg-secondary/60 disabled:opacity-40",
                              active && "bg-primary/8",
                            )}
                          >
                            <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-mono text-[12px] text-foreground">
                                {formatWorkspaceHistoryLabel(entry.path)}
                              </span>
                              <span
                                className="mt-0.5 block truncate font-mono text-[10px] text-muted-foreground"
                                title={entry.path}
                              >
                                {entry.path}
                              </span>
                              <span className="mt-1 block text-[10px] text-muted-foreground">
                                {formatWorkspaceHistoryTime(entry.openedAt)}
                                {active ? " · 当前" : ""}
                              </span>
                            </span>
                          </button>
                          <button
                            type="button"
                            disabled={!desktop}
                            onClick={() => void removeHistoryEntry(entry.path)}
                            className="inline-flex w-9 shrink-0 items-center justify-center text-muted-foreground transition hover:bg-secondary hover:text-destructive disabled:opacity-40"
                            title="从记录中移除"
                            aria-label="从记录中移除"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="border-t border-border/70 px-3 py-2">
                    <button
                      type="button"
                      disabled={!desktop}
                      onClick={() => void clearHistory()}
                      className="text-[11px] text-muted-foreground transition hover:text-destructive disabled:opacity-40"
                    >
                      清空全部记录
                    </button>
                  </div>
                </div>
              )}
            </PageSection>
          </PageContent>
        </SinglePaneLayout>
      </PageRoot>
    </AppShell>
  );
}
