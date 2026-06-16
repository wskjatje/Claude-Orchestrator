import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { registerWorkbenchTerminalFocusTab } from "@/lib/workbench-terminal-run-bridge";
import { matchProblemFilter } from "@/lib/workbench-problems-filter";
import {
  clearOutput,
  getOutputSnapshot,
  OUTPUT_CHANNELS,
  subscribeOutputLog,
  type OutputChannelId,
} from "@/lib/workbench-output-log";
import {
  clearDebugLog,
  evalDebugExpression,
  getDebugEntries,
  subscribeDebugLog,
  type DebugEntry,
} from "@/lib/workbench-debug-log";
import {
  getForwardedPorts,
  registerPort,
  subscribePorts,
  type ForwardedPort,
} from "@/lib/workbench-ports-registry";
import { isFileTab } from "@/types/workbench-editor";
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Globe,
  Filter,
  LayoutList,
  Lock,
  MoreHorizontal,
  Plus,
  RefreshCw,
  SplitSquareHorizontal,
  Trash2,
  WrapText,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { getDesktop } from "@/lib/desktop-api";
import { useWorkbenchProblems } from "@/contexts/workbench-problems-context";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import type { WorkbenchProblem } from "@/types/workbench-problems";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TerminalSessionsView, type TerminalSessionsHeaderState } from "@/components/terminal-sessions-view";
import { TerminalSessionPicker } from "@/components/terminal-session-picker";
import {
  getDefaultTerminalShell,
  setDefaultTerminalShell,
  TERMINAL_SHELL_PROFILES,
  type TerminalShellId,
} from "@/lib/terminal-shell-profiles";
import type { WorkspaceTerminalMeta } from "@/components/workspace-terminal";

const PANEL_TABS = [
  { id: "problems", label: "问题" },
  { id: "output", label: "输出" },
  { id: "debug", label: "调试控制台" },
  { id: "terminal", label: "终端" },
  { id: "ports", label: "端口" },
] as const;

type PanelTabId = (typeof PANEL_TABS)[number]["id"];

type ProblemsSeverityFilter = {
  errors: boolean;
  warnings: boolean;
};

const DEFAULT_SEVERITY_FILTER: ProblemsSeverityFilter = { errors: true, warnings: true };

function channelLabel(id: OutputChannelId): string {
  return OUTPUT_CHANNELS.find((c) => c.id === id)?.label ?? id;
}

/** 中间栏底部面板（类 Cursor：问题 / 输出 / 调试 / 终端 / 端口） */
export function WorkbenchBottomPanel({ onClose }: { onClose: () => void }) {
  const { problems, errorCount, warningCount, lintOpenFiles, linting } = useWorkbenchProblems();
  const ws = useWorkbenchWorkspace();
  const terminalActionsRef = useRef<{
    addSession: (shell?: string) => void;
    restartActive: () => void;
    killActive: () => void;
    closeActive: () => void;
    splitActive: () => void;
    refitActive: () => void;
  } | null>(null);
  const [terminalHeader, setTerminalHeader] = useState<TerminalSessionsHeaderState | null>(null);
  const [activeTab, setActiveTab] = useState<PanelTabId>("terminal");
  const [meta, setMeta] = useState<WorkspaceTerminalMeta>({
    cwdLabel: "（加载工作区…）",
    cwdFull: null,
    shellLabel: "zsh",
    status: "idle",
    hint: null,
  });
  const [problemsFilter, setProblemsFilter] = useState("");
  const [problemsSeverity, setProblemsSeverity] = useState<ProblemsSeverityFilter>(DEFAULT_SEVERITY_FILTER);
  const [outputFilter, setOutputFilter] = useState("");
  const [outputChannel, setOutputChannel] = useState<OutputChannelId>("workbench");
  const [debugFilter, setDebugFilter] = useState("");
  const [debugInput, setDebugInput] = useState("");
  const [outputScrollLock, setOutputScrollLock] = useState(false);
  const outputEndRef = useRef<HTMLDivElement | null>(null);
  const prevErrorCountRef = useRef(0);

  const outputSnapshot = useSyncExternalStore(subscribeOutputLog, getOutputSnapshot, getOutputSnapshot);
  const debugEntries = useSyncExternalStore(subscribeDebugLog, getDebugEntries, getDebugEntries);
  const forwardedPorts = useSyncExternalStore(subscribePorts, getForwardedPorts, getForwardedPorts);

  const relintOpenFiles = useCallback(async () => {
    const paths = ws.editorTabs.filter(isFileTab).map((t) => t.relPath);
    if (!paths.length) {
      toast.message("没有已打开的文件可检查");
      return;
    }
    await lintOpenFiles(paths);
    toast.success(`已重新检查 ${paths.length} 个打开的文件`);
  }, [lintOpenFiles, ws.editorTabs]);

  useEffect(() => {
    if (errorCount > 0 && prevErrorCountRef.current === 0) {
      setActiveTab("problems");
    }
    prevErrorCountRef.current = errorCount;
  }, [errorCount]);

  const onMetaChange = useCallback((next: WorkspaceTerminalMeta) => {
    setMeta((prev) =>
      prev.cwdLabel === next.cwdLabel &&
      prev.cwdFull === next.cwdFull &&
      prev.shellLabel === next.shellLabel &&
      prev.status === next.status &&
      prev.hint === next.hint
        ? prev
        : next,
    );
  }, []);

  const registerTerminalActions = useCallback(
    (actions: {
      addSession: (shell?: string) => void;
      restartActive: () => void;
      killActive: () => void;
      closeActive: () => void;
      splitActive: () => void;
      refitActive: () => void;
    }) => {
      terminalActionsRef.current = actions;
    },
    [],
  );

  const registerTerminalHeader = useCallback((state: TerminalSessionsHeaderState | null) => {
    setTerminalHeader((prev) => {
      if (prev === state) return prev;
      if (!prev || !state) return state;
      if (
        prev.activeId === state.activeId &&
        prev.sessions === state.sessions &&
        prev.selectSession === state.selectSession &&
        prev.closeSession === state.closeSession &&
        prev.addSession === state.addSession &&
        prev.splitActive === state.splitActive &&
        prev.killActive === state.killActive &&
        prev.restartActive === state.restartActive &&
        prev.closeActive === state.closeActive
      ) {
        return prev;
      }
      return state;
    });
  }, []);

  const focusTerminal = useCallback(() => {
    setActiveTab("terminal");
  }, []);

  useEffect(() => {
    registerWorkbenchTerminalFocusTab(focusTerminal);
    return () => registerWorkbenchTerminalFocusTab(null);
  }, [focusTerminal]);

  useEffect(() => {
    if (activeTab !== "terminal") return;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        terminalActionsRef.current?.refitActive();
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, [activeTab]);

  useEffect(() => {
    if (outputScrollLock || activeTab !== "output") return;
    outputEndRef.current?.scrollIntoView({ block: "end" });
  }, [outputSnapshot, outputChannel, activeTab, outputScrollLock]);

  const copyPath = async () => {
    const text = meta.cwdFull || meta.cwdLabel;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制工作区路径");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="workbench-bottom-panel relative z-0 flex h-full min-h-0 flex-col border-t border-border bg-background">
      <PanelHeader
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onClose={onClose}
        errorCount={errorCount}
        warningCount={warningCount}
        problems={problems}
        problemsFilter={problemsFilter}
        onProblemsFilterChange={setProblemsFilter}
        problemsSeverity={problemsSeverity}
        onProblemsSeverityChange={setProblemsSeverity}
        onRelintOpenFiles={() => void relintOpenFiles()}
        linting={linting}
        outputFilter={outputFilter}
        onOutputFilterChange={setOutputFilter}
        outputChannel={outputChannel}
        onOutputChannelChange={setOutputChannel}
        debugFilter={debugFilter}
        onDebugFilterChange={setDebugFilter}
        onClearDebug={() => {
          clearDebugLog();
          toast.success("调试控制台已清除");
        }}
        outputScrollLock={outputScrollLock}
        onOutputScrollLockToggle={() => setOutputScrollLock((v) => !v)}
        onClearOutput={() => {
          clearOutput(outputChannel);
          toast.success(`已清除「${channelLabel(outputChannel)}」输出`);
        }}
        onNewTerminal={(shell) => {
          focusTerminal();
          terminalActionsRef.current?.addSession(shell);
        }}
        onSplitTerminal={() => {
          focusTerminal();
          terminalActionsRef.current?.splitActive();
        }}
        onRestartTerminal={() => {
          focusTerminal();
          terminalActionsRef.current?.restartActive();
        }}
        onKillTerminal={() => terminalActionsRef.current?.closeActive()}
        onCopyPath={copyPath}
        terminalHeader={terminalHeader}
        terminalHint={meta.hint}
      />

      <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
        <div className={cn("h-full min-h-0", activeTab !== "terminal" && "hidden")}>
          <TerminalSessionsView
            panelActive={activeTab === "terminal"}
            onActiveMetaChange={onMetaChange}
            onRegisterActions={registerTerminalActions}
            onRegisterHeader={registerTerminalHeader}
          />
        </div>

        {activeTab === "problems" ? (
          <ProblemsView filter={problemsFilter} severity={problemsSeverity} problems={problems} />
        ) : null}
        {activeTab === "output" ? (
          <OutputView
            filter={outputFilter}
            lines={outputSnapshot[outputChannel] ?? []}
            endRef={outputEndRef}
          />
        ) : null}
        {activeTab === "debug" ? (
          <DebugConsoleView
            filter={debugFilter}
            entries={debugEntries}
            input={debugInput}
            onInputChange={setDebugInput}
          />
        ) : null}
        {activeTab === "ports" ? <PortsView ports={forwardedPorts} /> : null}
      </div>
    </div>
  );
}

function PanelHeader({
  activeTab,
  onTabChange,
  onClose,
  errorCount,
  warningCount,
  problems,
  problemsFilter,
  onProblemsFilterChange,
  problemsSeverity,
  onProblemsSeverityChange,
  onRelintOpenFiles,
  linting,
  outputFilter,
  onOutputFilterChange,
  outputChannel,
  onOutputChannelChange,
  debugFilter,
  onDebugFilterChange,
  onClearDebug,
  outputScrollLock,
  onOutputScrollLockToggle,
  onClearOutput,
  onNewTerminal,
  onSplitTerminal,
  onRestartTerminal,
  onKillTerminal,
  onCopyPath,
  terminalHeader,
  terminalHint,
}: {
  activeTab: PanelTabId;
  onTabChange: (tab: PanelTabId) => void;
  onClose: () => void;
  errorCount: number;
  warningCount: number;
  problems: WorkbenchProblem[];
  problemsFilter: string;
  onProblemsFilterChange: (v: string) => void;
  problemsSeverity: ProblemsSeverityFilter;
  onProblemsSeverityChange: (v: ProblemsSeverityFilter) => void;
  onRelintOpenFiles: () => void;
  linting: boolean;
  outputFilter: string;
  onOutputFilterChange: (v: string) => void;
  outputChannel: OutputChannelId;
  onOutputChannelChange: (v: OutputChannelId) => void;
  debugFilter: string;
  onDebugFilterChange: (v: string) => void;
  onClearDebug: () => void;
  outputScrollLock: boolean;
  onOutputScrollLockToggle: () => void;
  onClearOutput: () => void;
  onNewTerminal: (shell?: string) => void;
  onSplitTerminal: () => void;
  onRestartTerminal: () => void;
  onKillTerminal: () => void;
  onCopyPath: () => void;
  terminalHeader: TerminalSessionsHeaderState | null;
  terminalHint: string | null;
}) {
  return (
    <div className="workbench-bottom-panel-header flex h-[35px] shrink-0 items-stretch gap-0 border-b border-border bg-surface-elevated/95">
      <div className="flex min-w-0 shrink-0 items-center gap-0.5 overflow-x-auto scrollbar-thin pl-1">
        {PANEL_TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "shrink-0 px-2.5 py-1.5 text-[11px] font-medium uppercase tracking-wide transition",
                active
                  ? "border-b-2 border-primary text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground hover:text-foreground",
              )}
              aria-current={active ? "true" : undefined}
            >
              <span>{tab.label}</span>
              {tab.id === "problems" && (errorCount > 0 || warningCount > 0) ? (
                <span
                  className={cn(
                    "ml-1.5 inline-flex min-w-[1.1rem] items-center justify-center rounded px-1 text-[10px] font-semibold tabular-nums",
                    errorCount > 0
                      ? "bg-destructive/90 text-destructive-foreground"
                      : "bg-amber-500/90 text-white",
                  )}
                >
                  {errorCount > 0 ? errorCount : warningCount}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="min-w-0 flex-1" aria-hidden />

      <div className="flex min-w-0 shrink-0 items-center justify-end gap-0.5 pr-0.5">
        {activeTab === "problems" ? (
          <>
            <FilterInput
              value={problemsFilter}
              onChange={onProblemsFilterChange}
              placeholder="筛选 (例如 text, **/*.ts, !**/node_modules/**)"
              className="max-w-[min(100%,22rem)]"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <HeaderIcon title="筛选选项">
                  <Filter className="h-3.5 w-3.5" />
                </HeaderIcon>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() =>
                    onProblemsSeverityChange({ ...problemsSeverity, errors: !problemsSeverity.errors })
                  }
                >
                  {problemsSeverity.errors ? "✓ " : ""}显示错误
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() =>
                    onProblemsSeverityChange({ ...problemsSeverity, warnings: !problemsSeverity.warnings })
                  }
                >
                  {problemsSeverity.warnings ? "✓ " : ""}显示警告
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <HeaderIcon
              title={linting ? "正在检查…" : "重新检查已打开的文件"}
              onClick={onRelintOpenFiles}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", linting && "animate-spin")} />
            </HeaderIcon>
            <HeaderIcon
              title="复制问题列表"
              onClick={() => {
                void copyProblemsList(problems, problemsFilter, problemsSeverity);
              }}
            >
              <LayoutList className="h-3.5 w-3.5" />
            </HeaderIcon>
            <HeaderIcon
              title="换行显示"
              onClick={() => toast.message("问题列表已启用自动换行")}
            >
              <WrapText className="h-3.5 w-3.5" />
            </HeaderIcon>
          </>
        ) : null}

        {activeTab === "output" ? (
          <>
            <FilterInput
              value={outputFilter}
              onChange={onOutputFilterChange}
              placeholder="筛选"
              className="max-w-[8rem]"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex max-w-[10rem] items-center gap-1 rounded border border-border bg-background px-2 py-0.5 text-[11px] text-foreground transition hover:bg-secondary"
                >
                  <span className="truncate">{channelLabel(outputChannel)}</span>
                  <ChevronDown className="h-3 w-3 shrink-0 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {OUTPUT_CHANNELS.map((c) => (
                  <DropdownMenuItem key={c.id} onClick={() => onOutputChannelChange(c.id)}>
                    {c.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <HeaderIcon title="清除输出" onClick={onClearOutput}>
              <Trash2 className="h-3.5 w-3.5" />
            </HeaderIcon>
            <HeaderIcon
              title={outputScrollLock ? "解除滚动锁定" : "锁定滚动"}
              onClick={onOutputScrollLockToggle}
              active={outputScrollLock}
            >
              <Lock className="h-3.5 w-3.5" />
            </HeaderIcon>
          </>
        ) : null}

        {activeTab === "debug" ? (
          <>
            <FilterInput
              value={debugFilter}
              onChange={onDebugFilterChange}
              placeholder="筛选（如 text、!exclude、\\escape）"
              className="max-w-[min(100%,20rem)]"
            />
            <HeaderIcon title="清除控制台" onClick={onClearDebug}>
              <Trash2 className="h-3.5 w-3.5" />
            </HeaderIcon>
          </>
        ) : null}

        {activeTab === "terminal" ? (
          <>
            {terminalHeader ? (
              <TerminalSessionPicker
                sessions={terminalHeader.sessions}
                activeId={terminalHeader.activeId}
                onSelect={terminalHeader.selectSession}
              />
            ) : null}
            <HeaderIcon title="拆分终端" onClick={onSplitTerminal}>
              <SplitSquareHorizontal className="h-3.5 w-3.5" />
            </HeaderIcon>
            <NewTerminalSplitButton onNew={onNewTerminal} onSplit={onSplitTerminal} />
            <HeaderIcon title="关闭终端" onClick={onKillTerminal}>
              <Trash2 className="h-3.5 w-3.5" />
            </HeaderIcon>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  title="更多操作"
                  aria-label="更多操作"
                  className="flex h-[22px] w-[22px] items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[12rem]">
                <DropdownMenuItem onClick={onRestartTerminal}>
                  <RefreshCw className="mr-2 h-3.5 w-3.5" />
                  重启终端
                </DropdownMenuItem>
                {terminalHint ? (
                  <DropdownMenuItem disabled className="max-w-[16rem] text-[11px] text-amber-700 dark:text-amber-300">
                    {terminalHint}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onCopyPath}>
                  <Copy className="mr-2 h-3.5 w-3.5" />
                  复制工作区路径
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onClose}>
                  <X className="mr-2 h-3.5 w-3.5" />
                  关闭面板
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-0.5 border-l border-border/60 pl-1 pr-0.5">
        <HeaderIcon title="最大化面板" onClick={() => toast.message("拖动分隔条可调整高度")}>
          <ChevronUp className="h-3.5 w-3.5" />
        </HeaderIcon>
        <HeaderIcon title="关闭面板" onClick={onClose}>
          <X className="h-3.5 w-3.5" />
        </HeaderIcon>
      </div>
    </div>
  );
}

function NewTerminalSplitButton({
  onNew,
  onSplit,
}: {
  onNew: (shell?: string) => void;
  onSplit?: () => void;
}) {
  const defaultShell = getDefaultTerminalShell();

  return (
    <div className="inline-flex h-[22px] overflow-hidden rounded border border-border/80 bg-background">
      <button
        type="button"
        title="新建终端（默认 Shell）"
        aria-label="新建终端"
        onClick={() => onNew()}
        className="flex h-full w-[22px] items-center justify-center text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            title="选择 Shell 新建终端"
            aria-label="选择 Shell 新建终端"
            className="flex h-full w-[18px] items-center justify-center border-l border-border/80 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <ChevronDown className="h-3 w-3" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[12rem]">
          {TERMINAL_SHELL_PROFILES.map((profile) => (
            <DropdownMenuItem key={profile.id} onClick={() => onNew(profile.id)}>
              {profile.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuItem disabled className="text-muted-foreground/70">
            JavaScript Debug Terminal
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>拆分终端</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              <DropdownMenuItem onClick={() => (onSplit ?? onNew)()}>
                向右拆分
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => toast.message("请在设置页配置本机连接与工作目录")}
          >
            配置终端设置…
          </DropdownMenuItem>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>选择默认配置文件</DropdownMenuSubTrigger>
            <DropdownMenuSubContent>
              {TERMINAL_SHELL_PROFILES.map((profile) => (
                <DropdownMenuItem
                  key={profile.id}
                  onClick={() => {
                    setDefaultTerminalShell(profile.id as TerminalShellId);
                    toast.success(`默认终端已设为 ${profile.label}`);
                  }}
                >
                  {profile.label}
                  {defaultShell === profile.id ? " ✓" : ""}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>运行任务…</DropdownMenuItem>
          <DropdownMenuItem disabled>配置任务…</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function FilterInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  className?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        "h-[22px] min-w-[5rem] flex-1 rounded border border-border bg-background px-2 text-[11px] text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-primary/50 focus:ring-1 focus:ring-primary/25",
        className,
      )}
    />
  );
}

function HeaderIcon({
  children,
  title,
  onClick,
  active,
}: {
  children: ReactNode;
  title: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground",
        active && "bg-secondary text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function matchDebugFilter(entry: DebugEntry, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  if (q.startsWith("!")) return !entry.text.toLowerCase().includes(q.slice(1));
  return entry.text.toLowerCase().includes(q);
}

function filterVisibleProblems(
  problems: WorkbenchProblem[],
  filter: string,
  severity: ProblemsSeverityFilter,
): WorkbenchProblem[] {
  return problems.filter((p) => {
    if (p.severity === "error" && !severity.errors) return false;
    if (p.severity === "warning" && !severity.warnings) return false;
    return matchProblemFilter(p, filter);
  });
}

async function copyProblemsList(
  problems: WorkbenchProblem[],
  filter: string,
  severity: ProblemsSeverityFilter,
) {
  const visible = filterVisibleProblems(problems, filter, severity);
  if (!visible.length) {
    toast.message("暂无问题可复制");
    return;
  }
  const text = visible
    .map(
      (p) =>
        `${p.severity === "error" ? "错误" : "警告"}\t${p.relPath}:${p.line}:${p.column}\t${p.message}${p.rule ? ` [${p.rule}]` : ""}`,
    )
    .join("\n");
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`已复制 ${visible.length} 条问题`);
  } catch {
    toast.error("复制失败");
  }
}

function ProblemsView({
  filter,
  severity,
  problems,
}: {
  filter: string;
  severity: ProblemsSeverityFilter;
  problems: WorkbenchProblem[];
}) {
  const ws = useWorkbenchWorkspace();
  const visible = useMemo(
    () => filterVisibleProblems(problems, filter, severity),
    [problems, filter, severity],
  );

  if (!visible.length) {
    return (
      <div className="flex h-full items-start p-4">
        <p className="text-[13px] text-muted-foreground">
          {filter.trim() || !severity.errors || !severity.warnings
            ? "筛选条件下无匹配问题。"
            : problems.length
              ? "筛选条件下无匹配问题。"
              : "工作区未检测到任何问题。"}
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto scrollbar-thin">
      <table className="w-full table-fixed border-collapse text-left text-[12px]">
        <colgroup>
          <col className="w-[22px]" />
          <col className="w-[min(38%,14rem)]" />
          <col className="w-[4.5rem]" />
          <col />
        </colgroup>
        <tbody>
          {visible.map((p, i) => (
            <tr
              key={`${p.relPath}:${p.line}:${p.column}:${i}`}
              className="group cursor-pointer border-b border-border/50 hover:bg-secondary/40"
              onClick={() => void ws.openFile(p.relPath, { line: p.line, column: p.column })}
            >
              <td className="px-2 py-1 align-top">
                {p.severity === "error" ? (
                  <AlertCircle className="h-3.5 w-3.5 text-destructive" aria-label="错误" />
                ) : (
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-label="警告" />
                )}
              </td>
              <td className="truncate px-1 py-1 align-top font-mono text-[11.5px] text-foreground/90" title={p.relPath}>
                {p.relPath}
              </td>
              <td className="whitespace-nowrap px-1 py-1 align-top font-mono text-[11px] text-muted-foreground tabular-nums">
                {p.line}:{p.column}
              </td>
              <td className="px-2 py-1 align-top text-foreground/90">
                <span className="line-clamp-2">{p.message}</span>
                {p.rule ? (
                  <span className="ml-1 font-mono text-[10.5px] text-muted-foreground/80">({p.rule})</span>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OutputView({
  filter,
  lines,
  endRef,
}: {
  filter: string;
  lines: readonly string[];
  endRef: React.RefObject<HTMLDivElement | null>;
}) {
  const visible = lines.filter((l) => !filter.trim() || l.toLowerCase().includes(filter.toLowerCase()));
  if (!visible.length) {
    return (
      <div className="h-full overflow-auto p-1 font-mono text-[12px] text-muted-foreground">
        <span className="opacity-40">|</span>
        <div ref={endRef} />
      </div>
    );
  }
  return (
    <div className="h-full overflow-auto p-2 font-mono text-[12px] leading-relaxed text-foreground">
      {visible.map((line, i) => (
        <div key={i} className="whitespace-pre-wrap break-all">
          {line}
        </div>
      ))}
      <div ref={endRef} />
    </div>
  );
}

function DebugConsoleView({
  filter,
  entries,
  input,
  onInputChange,
}: {
  filter: string;
  entries: readonly DebugEntry[];
  input: string;
  onInputChange: (v: string) => void;
}) {
  const visible = entries.filter((e) => matchDebugFilter(e, filter));
  const submit = () => {
    if (!input.trim()) return;
    evalDebugExpression(input);
    onInputChange("");
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-auto p-2 font-mono text-[12px] leading-relaxed">
        {!visible.length ? (
          <p className="text-muted-foreground">
            {filter.trim()
              ? `未找到匹配「${filter}」的输出。`
              : "在下方输入 JavaScript 表达式以评估；页面 console 输出也会显示在此。"}
          </p>
        ) : (
          visible.map((e) => (
            <div
              key={e.id}
              className={cn(
                "whitespace-pre-wrap break-all py-0.5",
                e.level === "error" && "text-destructive",
                e.level === "warn" && "text-amber-600 dark:text-amber-400",
                e.level === "input" && "text-primary",
                e.level === "result" && "text-foreground",
                (e.level === "log" || e.level === "info") && "text-muted-foreground",
              )}
            >
              {e.level === "input" ? e.text : e.text}
            </div>
          ))
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2 border-t border-border px-2 py-1.5">
        <span className="text-primary">&gt;</span>
        <input
          type="text"
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
          placeholder="评估表达式"
          className="min-w-0 flex-1 bg-transparent font-mono text-[12px] outline-none placeholder:text-muted-foreground/60"
        />
      </div>
    </div>
  );
}

async function openPortInBrowser(url: string) {
  const api = getDesktop();
  if (api?.openExternal) {
    await api.openExternal(url);
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

function PortsView({ ports }: { ports: readonly ForwardedPort[] }) {
  const addPort = () => {
    const raw = window.prompt("输入要转发的端口号（例如 3000）", "3000");
    if (!raw) return;
    const port = Number(raw.trim());
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      toast.error("端口号无效");
      return;
    }
    registerPort(port, `Port ${port}`, "手动转发");
    toast.success(`已添加端口 ${port}`);
  };

  if (!ports.length) {
    return (
      <div className="flex h-full flex-col items-start gap-4 p-4">
        <p className="max-w-lg text-[13px] leading-relaxed text-muted-foreground">
          暂无转发的端口。运行 dev server 或终端输出中的 localhost 地址会自动出现在此。
        </p>
        <button
          type="button"
          onClick={addPort}
          className="rounded-md bg-primary/90 px-4 py-1.5 text-[12px] font-medium text-primary-foreground transition hover:bg-primary"
        >
          转发端口
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 items-center justify-end gap-2 border-b border-border/60 px-3 py-1.5">
        <button
          type="button"
          onClick={addPort}
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <Plus className="h-3 w-3" />
          添加端口
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto scrollbar-thin">
        <table className="w-full border-collapse text-left text-[12px]">
          <thead className="sticky top-0 bg-background/95 text-[11px] uppercase tracking-wide text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="px-3 py-1.5 font-medium">端口</th>
              <th className="px-3 py-1.5 font-medium">地址</th>
              <th className="px-3 py-1.5 font-medium">来源</th>
              <th className="px-3 py-1.5 font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {ports.map((p) => (
              <tr key={p.id} className="border-b border-border/40 hover:bg-secondary/30">
                <td className="px-3 py-1.5 font-mono tabular-nums">{p.port}</td>
                <td className="px-3 py-1.5">
                  <span className="font-mono text-[11px]">{p.address}</span>
                  {p.label ? (
                    <span className="ml-2 text-[11px] text-muted-foreground">{p.label}</span>
                  ) : null}
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">{p.source}</td>
                <td className="px-3 py-1.5">
                  <button
                    type="button"
                    title="在浏览器中打开"
                    onClick={() => void openPortInBrowser(p.url)}
                    className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-primary transition hover:bg-secondary"
                  >
                    <Globe className="h-3 w-3" />
                    打开
                    <ExternalLink className="h-3 w-3 opacity-60" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** @deprecated 使用 WorkbenchBottomPanel */
export { WorkbenchBottomPanel as WorkspaceCenterTerminalPanel };

export function WorkspaceBottomPanel({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  if (!open) return null;
  return <WorkbenchBottomPanel onClose={() => onOpenChange(false)} />;
}
