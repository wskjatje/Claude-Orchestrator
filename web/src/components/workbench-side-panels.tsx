import { useEffect, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  FolderTree,
  GitBranch,
  GitCompare,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { WorkbenchCenterEditor } from "@/components/workbench-center-editor";
import { ExplorerTreeRow } from "@/components/explorer-tree-row";
import { WORKBENCH_SIDEPANEL_OFFLINE } from "@/lib/ui-copy";

type SideTab = "files" | "git" | "diff";

export function WorkbenchLeftSidebar() {
  const [tab, setTab] = useState<SideTab>("files");
  const ws = useWorkbenchWorkspace();

  return (
    <div className="workbench-explorer-sidebar flex h-full min-h-0 flex-col border-r border-[var(--explorer-border)] bg-[var(--explorer-bg)]">
      <div className="explorer-panel-toolbar flex shrink-0 items-center border-b border-border">
        <SideTabBtn active={tab === "files"} onClick={() => setTab("files")} icon={FolderTree} label="文件" />
        <SideTabBtn active={tab === "git"} onClick={() => { setTab("git"); void ws.refreshShell(); }} icon={GitBranch} label="Git" />
        <SideTabBtn active={tab === "diff"} onClick={() => { setTab("diff"); void ws.refreshDiff(); }} icon={GitCompare} label="改动" />
        <button
          type="button"
          onClick={() => void (tab === "files" ? ws.refreshFiles() : tab === "git" ? ws.refreshShell() : ws.refreshDiff())}
          className="ml-auto mr-1 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          title="刷新"
          aria-label="刷新"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", ws.loadingFiles && tab === "files" ? "animate-spin" : "")} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-hidden">
        {tab === "files" && <FileTreePanel />}
        {tab === "git" && <GitSnapshotPanel />}
        {tab === "diff" && <DiffSnapshotPanel />}
      </div>
    </div>
  );
}

function SideTabBtn({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 border-b-2 px-2.5 py-2 text-[11px] font-medium transition-colors",
        active
          ? "border-[var(--explorer-modified-dot)] text-[var(--explorer-row-active-fg)]"
          : "border-transparent text-[#cccccc99] hover:text-[#cccccc]",
      )}
    >
      <Icon className="h-3 w-3" />
      {label}
    </button>
  );
}

function FileTreePanel() {
  const hasDesktop = useHasDesktop();
  const ws = useWorkbenchWorkspace();
  const [workspaceExpanded, setWorkspaceExpanded] = useState(true);
  const [expandedDirs, setExpandedDirs] = useState<Set<string>>(() => new Set());

  const workspaceName = workspaceFolderName(ws.rootLabel);

  useEffect(() => {
    if (!ws.selectedRelPath) return;
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      const parts = ws.selectedRelPath!.split("/");
      for (let i = 1; i < parts.length; i++) {
        next.add(parts.slice(0, i).join("/"));
      }
      return next;
    });
  }, [ws.selectedRelPath]);

  const toggleDir = (key: string) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  if (!hasDesktop) {
    return (
      <p className="p-3 text-[11px] leading-relaxed text-muted-foreground">
        {WORKBENCH_SIDEPANEL_OFFLINE}
      </p>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto scrollbar-thin">
      {ws.filesErr ? (
        <p className="px-3 py-2 text-[11px] text-destructive">{ws.filesErr}</p>
      ) : null}
      {ws.loadingFiles && !ws.tree.length ? (
        <p className="px-3 py-2 text-[11px] text-muted-foreground">加载中…</p>
      ) : null}

      <ExplorerSection
        title={workspaceName}
        expanded={workspaceExpanded}
        onToggle={() => setWorkspaceExpanded((v) => !v)}
        titleTitle={ws.rootLabel}
        onCollapseAll={() => setExpandedDirs(new Set())}
        onRefresh={() => void ws.refreshFiles()}
        refreshing={ws.loadingFiles}
      >
        {workspaceExpanded ? (
          <ul className="explorer-tree-root">
            {ws.tree.map((n, i) => (
              <ExplorerTreeRow
                key={`${n.name}-${i}`}
                node={n}
                depth={0}
                pathKey=""
                selectedRelPath={ws.selectedRelPath}
                expandedDirs={expandedDirs}
                onToggleDir={toggleDir}
                gitStatusByPath={ws.gitStatusByPath}
                gitHasDecoration={ws.gitHasDecoration}
                onOpenFile={(p) => void ws.openFile(p)}
              />
            ))}
          </ul>
        ) : null}
      </ExplorerSection>
    </div>
  );
}

function ExplorerSection({
  title,
  titleTitle,
  expanded,
  onToggle,
  onCollapseAll,
  onRefresh,
  refreshing,
  children,
}: {
  title: string;
  titleTitle?: string;
  expanded: boolean;
  onToggle: () => void;
  onCollapseAll?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="explorer-section">
      <div className="explorer-section-header-row flex w-full items-center pr-1">
        <button
          type="button"
          onClick={onToggle}
          className="explorer-section-header flex min-w-0 flex-1 items-center gap-0.5 px-2 py-0 hover:text-sidebar-foreground"
          title={titleTitle}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
          ) : (
            <ChevronRight className="h-4 w-4 shrink-0 opacity-80" />
          )}
          <span className="min-w-0 truncate">{title}</span>
        </button>
        <div className="explorer-section-actions flex shrink-0 items-center">
          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="explorer-section-action"
              title="刷新"
              aria-label="刷新"
            >
              <RefreshCw className={cn("h-3.5 w-3.5", refreshing ? "animate-spin" : "")} />
            </button>
          ) : null}
          {onCollapseAll ? (
            <button
              type="button"
              onClick={onCollapseAll}
              className="explorer-section-action"
              title="全部折叠"
              aria-label="全部折叠"
            >
              <ChevronsDownUp className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      </div>
      {expanded ? children : null}
    </section>
  );
}

function workspaceFolderName(rootLabel: string): string {
  const trimmed = rootLabel.trim();
  if (!trimmed || trimmed.startsWith("（")) return "工作区";
  const parts = trimmed.replace(/\/$/, "").split("/");
  return parts[parts.length - 1] || "工作区";
}

function GitSnapshotPanel() {
  const ws = useWorkbenchWorkspace();
  return (
    <div className="h-full overflow-y-auto p-2 font-mono text-[11px] leading-relaxed scrollbar-thin">
      {ws.shellErr ? <p className="text-destructive">{ws.shellErr}</p> : null}
      {ws.loadingShell && !ws.shellText ? <p className="text-muted-foreground">加载中…</p> : null}
      <pre className="whitespace-pre-wrap break-words text-foreground/90">{ws.shellText || "（暂无数据）"}</pre>
    </div>
  );
}

function DiffSnapshotPanel() {
  const ws = useWorkbenchWorkspace();
  return (
    <div className="h-full overflow-y-auto p-2 scrollbar-thin">
      {ws.statusLine ? (
        <p className="mb-2 font-mono text-[10.5px] text-muted-foreground">{ws.statusLine}</p>
      ) : null}
      {ws.diffErr ? <p className="mb-2 text-[11px] text-destructive">{ws.diffErr}</p> : null}
      <pre className="workbench-code text-foreground/90">
        {ws.diffText.split("\n").map((line, i) => {
          const cls =
            line.startsWith("+") && !line.startsWith("+++")
              ? "text-[var(--diff-add)]"
              : line.startsWith("-") && !line.startsWith("---")
                ? "text-[var(--diff-del)]"
                : line.startsWith("@@")
                  ? "text-primary"
                  : "text-foreground/70";
          return (
            <div key={i} className={cls}>
              {line || " "}
            </div>
          );
        })}
      </pre>
    </div>
  );
}

export function WorkbenchCenterPreview() {
  return <WorkbenchCenterEditor />;
}

