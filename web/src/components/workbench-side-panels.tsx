import { forwardRef, useEffect, useRef, useState, type ComponentType } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  ChevronDown,
  ChevronRight,
  Crosshair,
  ChevronsDownUp,
  CircleHelp,
  Download,
  Files,
  GitBranch,
  GitGraph,
  RefreshCw,
  ScanSearch,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { useHasDesktop } from "@/hooks/use-desktop-ready";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { WorkbenchCenterEditor } from "@/components/workbench-center-editor";
import { ExplorerTreeRow } from "@/components/explorer-tree-row";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { gitBranchFromStatusLine } from "@/lib/explorer-git-decor";
import { explorerGitStatusClass, gitStatusTone } from "@/lib/explorer-tree-theme";
import { runScmDiffCodeReview } from "@/lib/scm-run-code-review";
import { MSG_API_NOT_READY, WORKBENCH_SIDEPANEL_OFFLINE } from "@/lib/ui-copy";

type SideTab = "files" | "git";

const SIDE_TABS: { id: SideTab; icon: typeof Files; label: string }[] = [
  { id: "files", icon: Files, label: "资源管理器" },
  { id: "git", icon: GitGraph, label: "源代码管理" },
];

export function WorkbenchLeftSidebar() {
  const [tab, setTab] = useState<SideTab>("files");
  const ws = useWorkbenchWorkspace();

  const selectTab = (next: SideTab) => {
    setTab(next);
    if (next === "files") void ws.refreshFiles();
    if (next === "git") {
      void ws.refreshDiff();
      void ws.refreshGitLog();
      void ws.refreshFiles();
    }
  };

  return (
    <div className="workbench-explorer-sidebar flex h-full min-h-0 flex-col border-r border-[var(--explorer-border)] bg-[var(--explorer-bg)]">
      <SidePanelTabBar tab={tab} onSelect={selectTab} />
      <div className="workbench-side-panel min-h-0 flex-1 overflow-hidden">
        {tab === "files" && <FileTreePanel />}
        {tab === "git" && <GitPanel />}
      </div>
    </div>
  );
}

function SidePanelTabBar({ tab, onSelect }: { tab: SideTab; onSelect: (t: SideTab) => void }) {
  return (
    <div className="workbench-side-tabs shrink-0 border-b border-[var(--explorer-border)]" role="tablist">
      {SIDE_TABS.map(({ id, icon: Icon, label }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(id)}
            className={cn("workbench-side-tab", active && "workbench-side-tab--active")}
            title={label}
            aria-label={label}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden />
          </button>
        );
      })}
    </div>
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
    <div className="sc-panel flex h-full min-h-0 flex-col overflow-y-auto scrollbar-thin">
      <div className="sc-panel-title-row">
        <span className="sc-panel-title">资源管理器</span>
        <button
          type="button"
          className="workbench-icon-btn workbench-icon-btn--sm"
          title="刷新"
          aria-label="刷新文件树"
          onClick={() => void ws.refreshFiles()}
        >
          <RefreshCw className={cn("h-3.5 w-3.5", ws.loadingFiles && "animate-spin")} />
        </button>
      </div>

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

function GitPanel() {
  const ws = useWorkbenchWorkspace();
  const [changesExpanded, setChangesExpanded] = useState(true);
  const [reviewExpanded, setReviewExpanded] = useState(true);
  const [graphExpanded, setGraphExpanded] = useState(true);
  const [commitMessage, setCommitMessage] = useState("");
  const [committing, setCommitting] = useState(false);
  const [reviewRunning, setReviewRunning] = useState(false);
  const [graphAutoRefresh, setGraphAutoRefresh] = useState(true);
  const [syncingRemote, setSyncingRemote] = useState<"fetch" | "pull" | "push" | null>(null);
  const graphScrollRef = useRef<HTMLDivElement>(null);
  const graphHeadRef = useRef<HTMLLIElement>(null);
  const branch = gitBranchFromStatusLine(ws.statusLine);
  const changedPaths = Array.from(ws.gitStatusByPath.entries()).sort(([a], [b]) => a.localeCompare(b));

  useEffect(() => {
    if (!graphAutoRefresh) return;
    void ws.refreshGitLog();
  }, [graphAutoRefresh, ws.statusLine, ws.gitStatusByPath.size, ws.refreshGitLog]);

  const refreshGitAll = () => {
    void ws.refreshDiff();
    void ws.refreshGitLog();
    void ws.refreshFiles();
  };

  const handleCommit = async (opts?: { stageAll?: boolean; pushAfter?: boolean }) => {
    const api = getDesktop();
    if (!api?.workspaceGitCommit) {
      toast.error(MSG_API_NOT_READY);
      return;
    }
    const message = commitMessage.trim();
    if (!message) {
      toast.warning("请填写提交说明");
      return;
    }
    setCommitting(true);
    try {
      const r = await api.workspaceGitCommit({ message, stageAll: opts?.stageAll !== false });
      if (!r.ok) {
        toast.error(r.error || "提交失败");
        return;
      }
      toast.success("已提交");
      setCommitMessage("");
      refreshGitAll();
      if (opts?.pushAfter && api.workspaceGitRemoteSync) {
        const pushR = await api.workspaceGitRemoteSync({ action: "push" });
        if (pushR.ok) toast.success("已推送到远程");
        else toast.error(pushR.error || "推送失败");
      }
    } finally {
      setCommitting(false);
    }
  };

  const handleRemoteSync = async (action: "fetch" | "pull" | "push") => {
    const api = getDesktop();
    if (!api?.workspaceGitRemoteSync) {
      toast.error(MSG_API_NOT_READY);
      return;
    }
    setSyncingRemote(action);
    try {
      const r = await api.workspaceGitRemoteSync({ action });
      if (!r.ok) {
        toast.error(r.error || "远程操作失败");
        return;
      }
      toast.success(action === "fetch" ? "已 fetch" : action === "pull" ? "已 pull" : "已 push");
      refreshGitAll();
    } finally {
      setSyncingRemote(null);
    }
  };

  const handleFindIssues = async () => {
    setReviewRunning(true);
    try {
      await runScmDiffCodeReview();
    } finally {
      setReviewRunning(false);
    }
  };

  const focusGraphHead = () => {
    graphHeadRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };

  return (
    <div className="sc-panel flex h-full min-h-0 flex-col overflow-hidden">
      <div className="sc-panel-title-row shrink-0">
        <span className="sc-panel-title">源代码管理</span>
        <button
          type="button"
          className="workbench-icon-btn workbench-icon-btn--sm"
          title="刷新"
          aria-label="刷新 Git"
          onClick={refreshGitAll}
        >
          <RefreshCw
            className={cn(
              "h-3.5 w-3.5",
              (ws.loadingDiff || ws.loadingGitLog || ws.loadingFiles) && "animate-spin",
            )}
          />
        </button>
      </div>

      {branch ? <p className="sc-branch-line shrink-0 px-3 pb-1 font-mono">{branch}</p> : null}

      <ScCommitComposer
        message={commitMessage}
        onMessageChange={setCommitMessage}
        committing={committing}
        disabled={committing || !commitMessage.trim()}
        onCommit={() => void handleCommit()}
        onCommitAll={() => void handleCommit({ stageAll: true })}
        onCommitPush={() => void handleCommit({ stageAll: true, pushAfter: true })}
      />

      <div className="sc-panel-scroll-regions">
        <ScSection
          title="更改"
          badge={changedPaths.length}
          expanded={changesExpanded}
          onToggle={() => setChangesExpanded((v) => !v)}
          scrollable
        >
          {changedPaths.length === 0 ? (
            <p className="sc-empty-hint">无未提交更改</p>
          ) : (
            <ul className="git-changes-list">
              {changedPaths.map(([path, letter]) => {
                const tone = gitStatusTone(letter);
                const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
                const name = path.split("/").pop() || path;
                return (
                  <li key={path}>
                    <button type="button" className="git-changes-row" onClick={() => void ws.openFile(path)} title={path}>
                      <span className="git-changes-name truncate">{name}</span>
                      {dir ? <span className="git-changes-dir truncate">{dir}</span> : null}
                      <span className={cn("git-changes-letter", explorerGitStatusClass(tone))}>{letter}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </ScSection>

        <ScSection
          title="代理审查"
          expanded={reviewExpanded}
          onToggle={() => setReviewExpanded((v) => !v)}
          compact
        >
          <div className="sc-section-actions">
            <ScSplitActionButton
              label="查找问题"
              icon={ScanSearch}
              busy={reviewRunning}
              onPrimary={() => void handleFindIssues()}
              menuItems={[
                { label: "对照 main 审查 diff", onSelect: () => void handleFindIssues() },
              ]}
            />
          </div>
          <p className="sc-review-hint">
            对照 main 审查 diff。
            <CircleHelp className="sc-review-hint-icon" aria-hidden />
          </p>
        </ScSection>

        <ScSection
          title="提交图谱"
          expanded={graphExpanded}
          onToggle={() => setGraphExpanded((v) => !v)}
          scrollable
          scrollRef={graphScrollRef}
          headerActions={
            <GitGraphToolbar
              autoRefresh={graphAutoRefresh}
              onToggleAuto={() => setGraphAutoRefresh((v) => !v)}
              onFocusHead={focusGraphHead}
              onFetch={() => void handleRemoteSync("fetch")}
              onPull={() => void handleRemoteSync("pull")}
              onPush={() => void handleRemoteSync("push")}
              onRefresh={refreshGitAll}
              syncing={syncingRemote}
              loadingLog={ws.loadingGitLog}
            />
          }
        >
          {ws.gitLogErr ? <p className="sc-empty-hint text-destructive">{ws.gitLogErr}</p> : null}
          {ws.loadingGitLog && !ws.gitCommits.length ? <p className="sc-empty-hint">加载中…</p> : null}
          {!ws.loadingGitLog && !ws.gitCommits.length && !ws.gitLogErr ? (
            <p className="sc-empty-hint">（暂无提交）</p>
          ) : null}
          <ul className="git-graph-list">
            {ws.gitCommits.map((c, i) => (
              <GitGraphRow
                key={c.hash}
                ref={i === 0 ? graphHeadRef : undefined}
                hash={c.hash}
                subject={c.subject}
                isHead={i === 0}
                branch={i === 0 ? branch : null}
              />
            ))}
          </ul>
        </ScSection>
      </div>
    </div>
  );
}

const GitGraphRow = forwardRef<
  HTMLLIElement,
  {
    hash: string;
    subject: string;
    isHead?: boolean;
    branch?: string | null;
  }
>(function GitGraphRow({ hash, subject, isHead, branch }, ref) {
  return (
    <li ref={ref} className="git-graph-row">
      <span
        className={cn("git-graph-dot", isHead ? "git-graph-dot--head" : "git-graph-dot--commit")}
        aria-hidden
      />
      <div className="min-w-0 flex-1">
        <p className="git-graph-subject truncate" title={subject}>
          {subject}
        </p>
        <div className="git-graph-meta">
          {isHead && branch ? <span className="git-graph-branch">{branch}</span> : null}
          <span className="git-graph-hash font-mono">{hash}</span>
        </div>
      </div>
    </li>
  );
});

function ScCommitComposer({
  message,
  onMessageChange,
  committing,
  disabled,
  onCommit,
  onCommitAll,
  onCommitPush,
}: {
  message: string;
  onMessageChange: (v: string) => void;
  committing: boolean;
  disabled?: boolean;
  onCommit: () => void;
  onCommitAll: () => void;
  onCommitPush: () => void;
}) {
  return (
    <div className="sc-commit-compose shrink-0">
      <textarea
        className="sc-commit-input"
        rows={2}
        placeholder="提交说明"
        value={message}
        onChange={(e) => onMessageChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
            e.preventDefault();
            onCommit();
          }
        }}
      />
      <ScSplitActionButton
        label="提交"
        icon={Check}
        busy={committing}
        disabled={disabled}
        onPrimary={onCommit}
        menuItems={[
          { label: "提交全部", onSelect: onCommitAll },
          { label: "提交并推送", onSelect: onCommitPush },
        ]}
      />
    </div>
  );
}

function ScSplitActionButton({
  label,
  icon: Icon,
  busy,
  disabled,
  onPrimary,
  menuItems,
}: {
  label: string;
  icon: ComponentType<{ className?: string }>;
  busy?: boolean;
  disabled?: boolean;
  onPrimary: () => void;
  menuItems: { label: string; onSelect: () => void }[];
}) {
  return (
    <div className="sc-split-btn">
      <button
        type="button"
        className="sc-split-btn-main"
        disabled={disabled || busy}
        onClick={onPrimary}
      >
        <Icon className="h-3.5 w-3.5 shrink-0" />
        <span>{busy ? "处理中…" : label}</span>
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="sc-split-btn-menu"
            disabled={disabled || busy}
            aria-label={`${label} 更多选项`}
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[9.5rem]">
          {menuItems.map((item) => (
            <DropdownMenuItem key={item.label} onClick={item.onSelect}>
              {item.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function GitGraphToolbar({
  autoRefresh,
  onToggleAuto,
  onFocusHead,
  onFetch,
  onPull,
  onPush,
  onRefresh,
  syncing,
  loadingLog,
}: {
  autoRefresh: boolean;
  onToggleAuto: () => void;
  onFocusHead: () => void;
  onFetch: () => void;
  onPull: () => void;
  onPush: () => void;
  onRefresh: () => void;
  syncing: "fetch" | "pull" | "push" | null;
  loadingLog: boolean;
}) {
  return (
    <div className="sc-graph-toolbar" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        className={cn("sc-graph-toolbar-chip", autoRefresh && "sc-graph-toolbar-chip--active")}
        title={autoRefresh ? "自动刷新已开启" : "自动刷新已关闭"}
        aria-pressed={autoRefresh}
        onClick={onToggleAuto}
      >
        <GitBranch className="h-3 w-3 shrink-0" />
        <span>自动</span>
      </button>
      <button type="button" className="sc-graph-toolbar-btn" title="定位 HEAD" aria-label="定位 HEAD" onClick={onFocusHead}>
        <Crosshair className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className="sc-graph-toolbar-btn"
        title="Fetch"
        aria-label="Fetch"
        disabled={syncing != null}
        onClick={onFetch}
      >
        <Download className={cn("h-3.5 w-3.5", syncing === "fetch" && "animate-pulse")} />
      </button>
      <button
        type="button"
        className="sc-graph-toolbar-btn"
        title="Pull"
        aria-label="Pull"
        disabled={syncing != null}
        onClick={onPull}
      >
        <ArrowDownToLine className={cn("h-3.5 w-3.5", syncing === "pull" && "animate-pulse")} />
      </button>
      <button
        type="button"
        className="sc-graph-toolbar-btn"
        title="Push"
        aria-label="Push"
        disabled={syncing != null}
        onClick={onPush}
      >
        <ArrowUpFromLine className={cn("h-3.5 w-3.5", syncing === "push" && "animate-pulse")} />
      </button>
      <button
        type="button"
        className="sc-graph-toolbar-btn"
        title="刷新图谱"
        aria-label="刷新图谱"
        onClick={onRefresh}
      >
        <RefreshCw className={cn("h-3.5 w-3.5", loadingLog && "animate-spin")} />
      </button>
    </div>
  );
}

function ScSection({
  title,
  badge,
  expanded,
  onToggle,
  scrollable,
  compact,
  headerActions,
  scrollRef,
  children,
}: {
  title: string;
  badge?: number;
  expanded: boolean;
  onToggle: () => void;
  scrollable?: boolean;
  compact?: boolean;
  headerActions?: React.ReactNode;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
  children: React.ReactNode;
}) {
  return (
    <section
      className={cn(
        "sc-section",
        scrollable && expanded && "sc-section--scrollable",
        compact && expanded && "sc-section--compact",
      )}
    >
      <div className="sc-section-header-row">
        <button type="button" className="sc-section-header" onClick={onToggle}>
          {expanded ? (
            <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-80" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-80" />
          )}
          <span className="sc-section-title">{title}</span>
          {badge != null && badge > 0 ? <span className="sc-section-badge">{badge}</span> : null}
        </button>
        {headerActions && expanded ? headerActions : null}
      </div>
      {expanded ? (
        <div
          ref={scrollRef}
          className={cn("sc-section-body", scrollable && "sc-section-body--scroll")}
        >
          {children}
        </div>
      ) : null}
    </section>
  );
}

function ExplorerSection({
  title,
  titleTitle,
  badge,
  expanded,
  onToggle,
  onCollapseAll,
  children,
}: {
  title: string;
  titleTitle?: string;
  badge?: number;
  expanded: boolean;
  onToggle: () => void;
  onCollapseAll?: () => void;
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
          {badge != null && badge > 0 ? <span className="sc-section-badge ml-1">{badge}</span> : null}
        </button>
        <div className="explorer-section-actions flex shrink-0 items-center">
          {onCollapseAll ? (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onCollapseAll();
              }}
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

export function WorkbenchCenterPreview() {
  return <WorkbenchCenterEditor />;
}
