import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Columns2,
  Copy,
  ExternalLink,
  Files,
  Globe,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import {
  getPendingWritesState,
  subscribePendingWrites,
} from "@/lib/workbench-pending-writes";
import {
  getAgentWrittenReviewState,
  subscribeAgentWrittenReview,
  closeAgentWrittenReview,
  openAgentWrittenReview,
} from "@/lib/agent-written-review";
import { WorkbenchDiffReview } from "@/components/workbench-diff-review";
import { WorkbenchAppliedDiffReview } from "@/components/workbench-applied-diff-review";
import { WorkbenchReferencesPeek } from "@/components/workbench-references-peek";
import { WorkbenchCallHierarchyPeek } from "@/components/workbench-call-hierarchy-peek";
import { getDesktop } from "@/lib/desktop-api";
import { wrapHtmlForWorkbenchPreview } from "@/lib/html-preview-theme";
import { useTheme } from "@/hooks/use-theme";
import { performProjectPreview } from "@/lib/project-preview";
import { openExternalUrl } from "@/lib/open-external";
import { toast } from "sonner";
import { WorkbenchCodeEditor } from "@/components/workbench-code-editor";
import { BinaryFileViewer } from "@/components/binary-file-viewer";
import {
  BrowserInspectorHost,
} from "@/components/browser-tab-inspector";
import { BrowserInspectorProvider, useBrowserInspector } from "@/contexts/browser-inspector-context";
import { WorkbenchBrowserInspectorChrome } from "@/components/workbench-browser-inspector-chrome";
import {
  browserUrlsEquivalent,
  isBlankBrowserUrl,
  resolveBrowserFrameSrc,
  sanitizeBrowserNavigationUrl,
} from "@/lib/workbench-browser-frame";
import {
  isStrayEmbeddedBrowserAppUrl,
  recoverUpstreamFromStrayAppPath,
} from "@/lib/workbench-app-shell-guard";
import { WORKBENCH_BROWSER_FRAME_NAV_MESSAGE, WORKBENCH_BROWSER_NAVIGATE_MESSAGE } from "@/lib/workbench-browser-messages";
import { EmbeddedBrowserPane } from "@/components/embedded-browser-pane";
import { getEmbeddedBrowserNative, useInPaneIframeBrowser } from "@/lib/embedded-browser-native";
import { getIframeDocument } from "@/lib/browser-dom-inspector";
import {
  destroyEmbeddedBrowserTab,
  markEmbeddedBrowserLoaded,
  navigateEmbeddedBrowserTab,
  reloadEmbeddedBrowserTab,
  setEmbeddedBrowserLayout,
} from "@/lib/embedded-browser-session";
import { useEmbeddedBrowserReady } from "@/hooks/use-embedded-browser-ready";
import { useWorkbenchComposerBridgeOptional } from "@/contexts/workbench-composer-bridge-context";
import { fileIconClass, fileIconFor } from "@/lib/file-tree-icons";
import {
  isBrowserTab,
  isFileTab,
  type WorkbenchEditorTab,
} from "@/types/workbench-editor";

export function WorkbenchCenterEditor() {
  const ws = useWorkbenchWorkspace();

  return (
    <BrowserInspectorProvider>
      {!ws.editorTabs.length ? (
        <EmptyEditorState onOpenBrowser={() => ws.openBrowserTab()} />
      ) : (
        <EditorWithTabs ws={ws} />
      )}
    </BrowserInspectorProvider>
  );
}

function EmptyEditorState({ onOpenBrowser }: { onOpenBrowser: () => void }) {
  return (
    <div className="workbench-empty-state flex h-full min-h-0 flex-col items-center justify-center bg-[var(--code-bg)] px-6 text-center">
      <p className="workbench-empty-title text-[length:var(--font-size-sm)] text-muted-foreground">
        打开文件开始编辑
      </p>
      <p className="workbench-empty-desc mt-1.5 text-[length:var(--font-size-xs)] text-muted-foreground/80">
        ⌘P 转到文件
      </p>
      <button
        type="button"
        onClick={onOpenBrowser}
        className="mt-4 text-[length:var(--font-size-xs)] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
      >
        打开浏览器
      </button>
    </div>
  );
}

function EditorWithTabs({
  ws,
}: {
  ws: ReturnType<typeof useWorkbenchWorkspace>;
}) {
  const pending = useSyncExternalStore(
    subscribePendingWrites,
    getPendingWritesState,
    getPendingWritesState,
  );
  const applied = useSyncExternalStore(
    subscribeAgentWrittenReview,
    getAgentWrittenReviewState,
    getAgentWrittenReviewState,
  );
  const [reviewOpen, setReviewOpen] = useState(false);
  /** 拆分：右侧可独立选另一已打开文件并编辑 */
  const [splitOpen, setSplitOpen] = useState(false);
  const [splitTabId, setSplitTabId] = useState<string | null>(null);
  const pendingCount = pending.items.length;
  const appliedCount = applied.open ? applied.paths.length : 0;
  const showPendingReview = reviewOpen && pendingCount > 0;
  const showAppliedReview = applied.open && appliedCount > 0 && pendingCount === 0;
  const fileTabs = ws.editorTabs.filter(isFileTab);
  const activeFileForSplit =
    ws.activeEditorTab && isFileTab(ws.activeEditorTab) ? ws.activeEditorTab : null;
  const splitTab =
    (splitTabId && fileTabs.find((t) => t.id === splitTabId)) ||
    fileTabs.find((t) => t.id !== activeFileForSplit?.id) ||
    activeFileForSplit;

  useEffect(() => {
    if (pendingCount > 0) {
      setReviewOpen(true);
      if (applied.open) closeAgentWrittenReview();
    }
    if (pendingCount === 0) setReviewOpen(false);
  }, [pendingCount, applied.open]);

  useEffect(() => {
    if (applied.open && appliedCount > 0 && pendingCount === 0) {
      setReviewOpen(false);
    }
  }, [applied.open, appliedCount, pendingCount]);

  // 写盘后聚合 Review 打开时，确保中栏处于 Review（不被其它状态盖住）
  useEffect(() => {
    if (!applied.open || !appliedCount || pendingCount > 0) return;
    setReviewOpen(false);
  }, [applied.open, applied.paths.join("\0"), appliedCount, pendingCount]);

  useEffect(() => {
    if (!splitOpen) return;
    if (!fileTabs.length) {
      setSplitOpen(false);
      setSplitTabId(null);
      return;
    }
    if (splitTabId && !fileTabs.some((t) => t.id === splitTabId)) {
      setSplitTabId(fileTabs.find((t) => t.id !== ws.activeEditorTabId)?.id ?? fileTabs[0]?.id ?? null);
    }
  }, [splitOpen, fileTabs, splitTabId, ws.activeEditorTabId]);

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-r border-border bg-code-bg/30">
      <EditorTabBar
        tabs={ws.editorTabs}
        activeId={
          showPendingReview || showAppliedReview
            ? "__diff_review__"
            : ws.activeEditorTabId
        }
        onSelect={(id) => {
          if (id === "__diff_review__") {
            if (pendingCount > 0) setReviewOpen(true);
            return;
          }
          setReviewOpen(false);
          if (applied.open) closeAgentWrittenReview();
          ws.setActiveEditorTab(id);
        }}
        onClose={ws.closeEditorTab}
        onCloseOthers={ws.closeOtherEditorTabs}
        onNewBrowser={() => ws.openBrowserTab()}
        splitOpen={splitOpen}
        onToggleSplit={() => {
          if (splitOpen) {
            setSplitOpen(false);
            setSplitTabId(null);
            return;
          }
          if (!activeFileForSplit) {
            toast.message("请先打开文件再拆分编辑器");
            return;
          }
          const other = fileTabs.find((t) => t.id !== activeFileForSplit.id);
          setSplitTabId(other?.id ?? activeFileForSplit.id);
          setSplitOpen(true);
        }}
        pendingCount={pendingCount || appliedCount}
        reviewOpen={showPendingReview || showAppliedReview}
        onOpenReview={() => {
          if (pendingCount > 0) setReviewOpen(true);
          else if (applied.paths.length) openAgentWrittenReview(applied.paths);
        }}
        reviewLabel={appliedCount > 0 && pendingCount === 0 ? "已写入" : "Review"}
      />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {showPendingReview ? (
          <WorkbenchDiffReview onClose={() => setReviewOpen(false)} />
        ) : showAppliedReview ? (
          <WorkbenchAppliedDiffReview onClose={() => closeAgentWrittenReview()} />
        ) : splitOpen && activeFileForSplit && splitTab ? (
          <ResizablePanelGroup orientation="horizontal" className="h-full min-h-0">
            <ResizablePanel defaultSize={50} minSize={25} className="min-h-0">
              <div className="relative flex h-full min-h-0 flex-col overflow-hidden">
                {ws.editorTabs.map((tab) =>
                  isBrowserTab(tab) ? (
                    <BrowserTabContent
                      key={tab.id}
                      tab={tab}
                      active={ws.activeEditorTabId === tab.id}
                      onNavigate={(url) => ws.navigateBrowserTab(tab.id, url)}
                    />
                  ) : null,
                )}
                {ws.activeEditorTab && isFileTab(ws.activeEditorTab) ? (
                  <FileTabContent tab={ws.activeEditorTab} />
                ) : null}
                <WorkbenchReferencesPeek />
                <WorkbenchCallHierarchyPeek />
              </div>
            </ResizablePanel>
            <ResizableHandle />
            <ResizablePanel defaultSize={50} minSize={25} className="min-h-0 border-l border-border">
              <div className="flex h-full min-h-0 flex-col overflow-hidden">
                <div className="flex shrink-0 items-center gap-1 border-b border-border/60 px-2 py-1 text-[11px]">
                  <select
                    className="min-w-0 flex-1 truncate rounded border border-border bg-background px-1.5 py-0.5 text-[11px] outline-none"
                    value={splitTab.id}
                    aria-label="拆分编辑器文件"
                    onChange={(e) => setSplitTabId(e.target.value)}
                  >
                    {fileTabs.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="workbench-icon-btn workbench-icon-btn--sm"
                    title="关闭拆分"
                    aria-label="关闭拆分"
                    onClick={() => {
                      setSplitOpen(false);
                      setSplitTabId(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <FileTabContent tab={splitTab} />
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        ) : (
          <>
            {ws.editorTabs.map((tab) =>
              isBrowserTab(tab) ? (
                <BrowserTabContent
                  key={tab.id}
                  tab={tab}
                  active={ws.activeEditorTabId === tab.id}
                  onNavigate={(url) => ws.navigateBrowserTab(tab.id, url)}
                />
              ) : null,
            )}
            {ws.activeEditorTab && isFileTab(ws.activeEditorTab) ? (
              <FileTabContent tab={ws.activeEditorTab} />
            ) : null}
            <WorkbenchReferencesPeek />
            <WorkbenchCallHierarchyPeek />
          </>
        )}
      </div>
    </div>
  );
}

function EditorTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onCloseOthers,
  onNewBrowser,
  splitOpen,
  onToggleSplit,
  pendingCount = 0,
  reviewOpen = false,
  onOpenReview,
  reviewLabel = "Review",
}: {
  tabs: WorkbenchEditorTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onCloseOthers: (keepTabId: string) => void;
  onNewBrowser: () => void;
  splitOpen: boolean;
  onToggleSplit: () => void;
  pendingCount?: number;
  reviewOpen?: boolean;
  onOpenReview?: () => void;
  reviewLabel?: string;
}) {
  const activeTab = tabs.find((t) => t.id === activeId) ?? null;

  const copyActivePath = async () => {
    if (!activeTab) return;
    const text = isFileTab(activeTab) ? activeTab.relPath : activeTab.url;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("已复制");
    } catch {
      toast.error("复制失败");
    }
  };

  return (
    <div className="flex shrink-0 items-stretch border-b border-border bg-surface-elevated/80">
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto scrollbar-thin">
        {pendingCount > 0 ? (
          <div
            className={cn(
              "group flex max-w-[200px] shrink-0 items-center border-r border-border/60",
              reviewOpen ? "bg-code-bg text-foreground" : "bg-surface-elevated/40 text-muted-foreground hover:bg-secondary/50",
            )}
          >
            <button
              type="button"
              onClick={() => onOpenReview?.()}
              className={cn(
                "flex min-w-0 flex-1 items-center gap-1.5 px-3 py-[7px] text-left text-[12px] transition",
                reviewOpen && "border-t-2 border-t-primary pt-[5px]",
              )}
              title={reviewLabel === "已写入" ? "Agent 已写入 Diff Review" : "待确认写入 Diff Review"}
            >
              <Files className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
              <span className="truncate">{reviewLabel}</span>
              <span className="rounded bg-amber-500/15 px-1 font-mono text-[11px] text-amber-700 dark:text-amber-300">
                {pendingCount}
              </span>
            </button>
          </div>
        ) : null}
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const fileName = isFileTab(tab)
            ? (tab.relPath.split("/").pop() ?? tab.label)
            : undefined;
          const fileExt = fileName?.includes(".")
            ? fileName.split(".").pop()
            : undefined;
          const Icon = isBrowserTab(tab) ? Globe : fileIconFor(fileExt, fileName);
          const iconCls = isFileTab(tab) ? fileIconClass(fileExt, fileName) : "text-muted-foreground/80";
          return (
            <div
              key={tab.id}
              className={cn(
                "group flex max-w-[220px] shrink-0 items-center border-r border-border/60",
                active ? "bg-code-bg text-foreground" : "bg-surface-elevated/40 text-muted-foreground hover:bg-secondary/50",
              )}
            >
              <button
                type="button"
                onClick={() => onSelect(tab.id)}
                className={cn(
                  "flex min-w-0 flex-1 items-center gap-1.5 px-3 py-[7px] text-left text-[12px] transition",
                  active && "border-t-2 border-t-primary pt-[5px]",
                )}
                title={isFileTab(tab) ? tab.relPath : tab.url}
              >
                <Icon className={cn("h-3.5 w-3.5 shrink-0", iconCls)} />
                <span
                  className={cn(
                    "truncate",
                    isFileTab(tab) && tab.preview && "italic text-muted-foreground",
                  )}
                >
                  {tab.label}
                </span>
                {isFileTab(tab) && tab.dirty ? (
                  <span className="text-[9px] text-primary" title="未保存">●</span>
                ) : null}
                {isFileTab(tab) && tab.loading ? (
                  <RefreshCw className="h-2.5 w-2.5 shrink-0 animate-spin opacity-60" />
                ) : null}
              </button>
              <button
                type="button"
                onClick={() => onClose(tab.id)}
                className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-background hover:text-foreground group-hover:opacity-100"
                aria-label="关闭标签页"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>
      <WorkbenchBrowserInspectorChrome />
      <div className="flex shrink-0 items-center gap-0.5 border-l border-border/60 px-0.5">
        <button
          type="button"
          onClick={onToggleSplit}
          title={splitOpen ? "关闭拆分编辑器" : "拆分编辑器"}
          aria-label={splitOpen ? "关闭拆分编辑器" : "拆分编辑器"}
          aria-pressed={splitOpen}
          className={cn(
            "workbench-icon-btn workbench-icon-btn--sm",
            splitOpen && "workbench-icon-btn--active",
          )}
        >
          <Columns2 className="h-3.5 w-3.5" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="workbench-icon-btn workbench-icon-btn--sm"
              title="更多操作"
              aria-label="更多操作"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10.5rem]">
            <DropdownMenuItem onClick={onNewBrowser}>新建浏览器标签</DropdownMenuItem>
            <DropdownMenuItem disabled={!activeTab} onClick={() => void copyActivePath()}>
              <Copy className="mr-2 h-3.5 w-3.5" />
              复制路径 / URL
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              disabled={!activeTab || activeId === "__diff_review__"}
              onClick={() => activeTab && onClose(activeTab.id)}
            >
              关闭
            </DropdownMenuItem>
            <DropdownMenuItem
              disabled={!activeTab || tabs.length < 2}
              onClick={() => activeTab && onCloseOthers(activeTab.id)}
            >
              关闭其他
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <button
          type="button"
          onClick={onNewBrowser}
          title="新建浏览器标签"
          aria-label="新建浏览器标签"
          className="workbench-icon-btn workbench-icon-btn--sm"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function FileTabContent({
  tab,
}: {
  tab: Extract<WorkbenchEditorTab, { kind: "file" }>;
}) {
  const ws = useWorkbenchWorkspace();
  const { resolved: themeResolved } = useTheme();
  const [previewing, setPreviewing] = useState(false);
  const isHtml = /\.html?$/i.test(tab.relPath);

  const previewHtmlInline = useCallback(() => {
    if (!tab.content) return;
    const wrapped = wrapHtmlForWorkbenchPreview(tab.content, themeResolved === "dark");
    const blob = new Blob([wrapped], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    ws.openBrowserTab(undefined, { label: `${tab.label} 预览`, blobUrl });
  }, [tab.content, tab.label, themeResolved, ws]);

  const previewHtmlServer = useCallback(async () => {
    const api = getDesktop();
    if (!api) return;
    setPreviewing(true);
    try {
      const res = await performProjectPreview(api, `预览 ${tab.relPath}`, {
        entryRel: tab.relPath,
        preferStatic: true,
      });
      if (res.ok && res.url) {
        ws.openBrowserTab(res.url, { label: fileHostLabel(res.url) });
        toast.success("已在编辑器内打开预览");
      } else {
        toast.warning(res.error || "预览未能启动");
      }
    } finally {
      setPreviewing(false);
    }
  }, [tab.relPath, ws]);

  const htmlToolbarExtras = isHtml ? (
    <>
      <button
        type="button"
        disabled={previewing || tab.loading}
        onClick={previewHtmlInline}
        className="shrink-0 rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-secondary disabled:opacity-50"
      >
        内嵌预览
      </button>
      <button
        type="button"
        disabled={previewing || tab.loading}
        onClick={() => void previewHtmlServer()}
        className="shrink-0 rounded border border-border bg-background px-2 py-0.5 text-[11px] hover:bg-secondary disabled:opacity-50"
      >
        {previewing ? "启动中…" : "本地服务预览"}
      </button>
    </>
  ) : null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="workbench-editor-pane flex min-h-0 flex-1 flex-col overflow-hidden">
        {tab.loading ? (
          <p className="p-3 text-[12px] text-muted-foreground">读取中…</p>
        ) : null}
        {tab.error ? <p className="p-3 text-[12px] text-destructive">{tab.error}</p> : null}
        {!tab.loading && !tab.error ? (
          tab.binary ? (
            <BinaryFileViewer
              relPath={tab.relPath}
              size={tab.size}
              previewBytes={tab.previewBytes}
              base64={tab.binaryBase64}
              truncated={tab.truncated}
            />
          ) : (
            <>
              {tab.truncated ? (
                <p className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[11px] text-amber-700 dark:text-amber-400">
                  文件较大，仅显示前 512KB（不可编辑）
                </p>
              ) : null}
              <WorkbenchCodeEditor
                content={tab.content || ""}
                relPath={tab.relPath}
                readOnly={tab.truncated}
                dirty={tab.dirty}
                saving={tab.saving}
                toolbarExtras={htmlToolbarExtras}
                onChange={(c) => ws.updateFileTabContent(tab.id, c)}
                onSave={() => void ws.saveFileTab(tab.id)}
              />
            </>
          )
        ) : null}
      </div>
    </div>
  );
}

function BrowserTabContent({
  tab,
  active,
  onNavigate,
}: {
  tab: Extract<WorkbenchEditorTab, { kind: "browser" }>;
  active: boolean;
  onNavigate: (url: string) => void;
}) {
  const iframeMode = useInPaneIframeBrowser();
  const shellReady = useEmbeddedBrowserReady();
  const api = iframeMode ? null : getEmbeddedBrowserNative();
  const composerBridge = useWorkbenchComposerBridgeOptional();
  const {
    registerBrowser,
    registerNativeBrowser,
    unregisterBrowser,
    notifyFrameLoaded,
    setPickerActive,
  } = useBrowserInspector();

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeKey, setIframeKey] = useState(0);

  const [address, setAddress] = useState(() => {
    const u = sanitizeBrowserNavigationUrl(tab.url);
    return u === "about:blank" ? "" : u;
  });
  const [pageUrl, setPageUrl] = useState(() => sanitizeBrowserNavigationUrl(tab.url));
  const [iframeSrc, setIframeSrc] = useState(() => {
    const resolved = sanitizeBrowserNavigationUrl(tab.url);
    return isBlankBrowserUrl(resolved) ? "about:blank" : resolveBrowserFrameSrc(resolved);
  });
  const pageUrlRef = useRef(pageUrl);
  pageUrlRef.current = pageUrl;
  const iframeSrcRef = useRef(iframeSrc);
  iframeSrcRef.current = iframeSrc;
  const addressEditingRef = useRef(false);
  const [addressFocused, setAddressFocused] = useState(false);
  /** 由页面内导航（重定向等）触发的 tab.url 更新，不再二次 loadURL */
  const skipNavForTabUrlRef = useRef(false);

  const [frameState, setFrameState] = useState<"idle" | "loading" | "loaded" | "error">(() =>
    isBlankBrowserUrl(sanitizeBrowserNavigationUrl(tab.url)) ? "idle" : "loading",
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [canGoForward, setCanGoForward] = useState(false);
  const [hostConnecting, setHostConnecting] = useState(false);

  const syncPageUrl = useCallback(
    (logicalUrl: string) => {
      const resolved = sanitizeBrowserNavigationUrl(logicalUrl);
      if (isBlankBrowserUrl(resolved)) return;
      if (
        iframeMode &&
        typeof window !== "undefined" &&
        isStrayEmbeddedBrowserAppUrl(resolved, window.location.origin)
      ) {
        const recovered = recoverUpstreamFromStrayAppPath(
          new URL(resolved).pathname + new URL(resolved).search + new URL(resolved).hash,
          pageUrlRef.current !== "about:blank" ? pageUrlRef.current : tab.url,
        );
        if (recovered) {
          const fixed = sanitizeBrowserNavigationUrl(recovered);
          if (!browserUrlsEquivalent(fixed, tab.url)) {
            skipNavForTabUrlRef.current = true;
            onNavigate(fixed);
          }
          setPageUrl(fixed);
          if (!addressEditingRef.current) {
            setAddress(fixed === "about:blank" ? "" : fixed);
          }
        }
        return;
      }
      if (!iframeMode) markEmbeddedBrowserLoaded(tab.id, resolved);
      setPageUrl(resolved);
      if (!addressEditingRef.current) {
        setAddress(resolved === "about:blank" ? "" : resolved);
      }
      if (!browserUrlsEquivalent(resolved, tab.url)) {
        skipNavForTabUrlRef.current = true;
        onNavigate(resolved);
      }
    },
    [iframeMode, onNavigate, tab.id, tab.url],
  );

  const refreshIframeCanNav = useCallback(() => {
    const win = iframeRef.current?.contentWindow;
    if (!win) {
      setCanGoBack(false);
      setCanGoForward(false);
      return;
    }
    try {
      setCanGoBack(win.history.length > 1);
      setCanGoForward(false);
    } catch {
      setCanGoBack(false);
      setCanGoForward(false);
    }
  }, []);

  const handleIframeLoad = useCallback(() => {
    const iframe = iframeRef.current;
    const logicalBase =
      pageUrlRef.current !== "about:blank" ? pageUrlRef.current : tab.url;
    if (iframe && logicalBase && logicalBase !== "about:blank") {
      try {
        const win = iframe.contentWindow;
        if (win) {
          const frameLoc = win.location;
          const frameHref = frameLoc.href;
          if (isStrayEmbeddedBrowserAppUrl(frameHref, window.location.origin)) {
            const recovered = recoverUpstreamFromStrayAppPath(
              frameLoc.pathname + frameLoc.search + frameLoc.hash,
              logicalBase,
            );
            if (recovered) {
              const target = resolveBrowserFrameSrc(recovered);
              if (target !== frameHref) {
                win.location.replace(target);
                return;
              }
            }
          }
        }
      } catch {
        /* ignore */
      }
    }
    setFrameState("loaded");
    setLoadError(null);
    const doc = getIframeDocument(iframeRef.current);
    notifyFrameLoaded(tab.id, !!doc);
    refreshIframeCanNav();
  }, [notifyFrameLoaded, refreshIframeCanNav, tab.id, tab.url]);

  const refreshCanNav = useCallback(async () => {
    if (iframeMode) {
      refreshIframeCanNav();
      return;
    }
    if (!api) return;
    const nav = await api.canNav(tab.id);
    if (nav.ok) {
      setCanGoBack(nav.back);
      setCanGoForward(nav.forward);
    }
  }, [api, iframeMode, refreshIframeCanNav, tab.id]);

  const runNavigation = useCallback(
    async (target: string) => {
      const resolved = sanitizeBrowserNavigationUrl(target);
      if (isBlankBrowserUrl(resolved)) {
        setFrameState("idle");
        setLoadError(null);
        return;
      }
      setFrameState("loading");
      setLoadError(null);
      if (iframeMode) return;
      if (!api) return;
      try {
        const res = await navigateEmbeddedBrowserTab(tab.id, resolved);
        if (!res.ok) {
          setFrameState("error");
          setLoadError(res.error || "导航失败");
          return;
        }
        // 同 URL 复用：主进程不会再发 did-stop-loading，必须本地收口，否则卡在「正在加载…」
        if (res.reused) {
          setFrameState("loaded");
          setLoadError(null);
          void refreshCanNav();
        }
      } finally {
        setHostConnecting(false);
      }
    },
    [api, iframeMode, refreshCanNav, tab.id],
  );

  useEffect(() => {
    if (addressEditingRef.current) return;
    if (skipNavForTabUrlRef.current) {
      skipNavForTabUrlRef.current = false;
      const resolved = sanitizeBrowserNavigationUrl(tab.url);
      setAddress(resolved === "about:blank" ? "" : resolved);
      setPageUrl(resolved);
      return;
    }
    const resolved = sanitizeBrowserNavigationUrl(tab.url);
    setAddress(resolved === "about:blank" ? "" : resolved);
    setPageUrl(resolved);
    setLoadError(null);
    // 历史脏数据：tab.url 曾被写成代理壳 → 写回逻辑上游（只改一次）
    if (!isBlankBrowserUrl(resolved) && !browserUrlsEquivalent(resolved, tab.url)) {
      skipNavForTabUrlRef.current = true;
      onNavigate(resolved);
    }
    if (resolved === "about:blank") {
      setFrameState("idle");
      setIframeSrc("about:blank");
      return;
    }
    if (iframeMode) {
      const nextSrc = resolveBrowserFrameSrc(resolved);
      if (nextSrc === iframeSrcRef.current) {
        setFrameState((prev) => (prev === "error" ? prev : "loaded"));
      } else {
        setIframeSrc(nextSrc);
        setFrameState("loading");
      }
      return;
    }
    if (!shellReady || !api) {
      setFrameState("idle");
      return;
    }
    void runNavigation(resolved);
  }, [api, iframeMode, onNavigate, runNavigation, shellReady, tab.id, tab.url]);

  useEffect(() => {
    if (!iframeMode) return;
    return () => unregisterBrowser(tab.id);
  }, [iframeMode, tab.id, unregisterBrowser]);

  useEffect(() => {
    if (!iframeMode) return;
    if (!active || isBlankBrowserUrl(pageUrl)) {
      unregisterBrowser(tab.id);
      return;
    }
    registerBrowser(tab.id, pageUrl, iframeRef, iframeKey);
    return () => unregisterBrowser(tab.id);
  }, [active, iframeKey, iframeMode, pageUrl, registerBrowser, tab.id, unregisterBrowser]);

  useEffect(() => {
    if (!iframeMode) return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; logicalUrl?: string } | null;
      if (!data?.type) return;
      const frameWin = iframeRef.current?.contentWindow;
      if (frameWin && event.source !== frameWin) return;

      if (data.type === WORKBENCH_BROWSER_NAVIGATE_MESSAGE) {
        if (typeof data.logicalUrl !== "string") return;
        const resolved = sanitizeBrowserNavigationUrl(data.logicalUrl);
        if (isBlankBrowserUrl(resolved)) return;
        const nextSrc = resolveBrowserFrameSrc(resolved);
        if (nextSrc !== iframeSrcRef.current) {
          setIframeSrc(nextSrc);
          setFrameState("loading");
          setLoadError(null);
        }
        skipNavForTabUrlRef.current = true;
        setPageUrl(resolved);
        if (!addressEditingRef.current) {
          setAddress(resolved === "about:blank" ? "" : resolved);
        }
        if (!browserUrlsEquivalent(resolved, tab.url)) {
          onNavigate(resolved);
        }
        return;
      }

      if (data.type !== WORKBENCH_BROWSER_FRAME_NAV_MESSAGE) return;
      if (typeof data.logicalUrl === "string") {
        syncPageUrl(data.logicalUrl);
        refreshIframeCanNav();
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [iframeMode, onNavigate, refreshIframeCanNav, syncPageUrl, tab.id, tab.url]);

  useEffect(() => {
    if (iframeMode) return;
    return () => {
      void destroyEmbeddedBrowserTab(tab.id);
    };
  }, [iframeMode, tab.id]);

  useEffect(() => {
    if (iframeMode || !active || isBlankBrowserUrl(pageUrl)) {
      if (!iframeMode && (!active || isBlankBrowserUrl(pageUrl))) unregisterBrowser(tab.id);
      return;
    }
    registerNativeBrowser(tab.id, pageUrl);
    return () => unregisterBrowser(tab.id);
  }, [active, iframeMode, pageUrl, registerNativeBrowser, tab.id, unregisterBrowser]);

  useEffect(() => {
    if (iframeMode || !shellReady || !api) return;

    const offNav = api.onNavigated(({ tabId, url }) => {
      if (tabId !== tab.id) return;
      syncPageUrl(url);
      setFrameState("loaded");
      setLoadError(null);
      notifyFrameLoaded(tab.id, true);
      void refreshCanNav();
    });
    const offReady = api.onDomReady(({ tabId }) => {
      if (tabId !== tab.id) return;
      notifyFrameLoaded(tab.id, true);
      setFrameState("loaded");
      void refreshCanNav();
    });
    const offLoading = api.onLoadingState(({ tabId, loading }) => {
      if (tabId !== tab.id) return;
      if (loading) {
        setFrameState("loading");
        setLoadError(null);
      } else {
        setFrameState((prev) => (prev === "error" ? prev : "loaded"));
        void refreshCanNav();
      }
    });
    const offFailed = api.onLoadFailed(({ tabId, error, errorCode }) => {
      if (tabId !== tab.id) return;
      if (errorCode === -3) return;
      setFrameState("error");
      const msg =
        errorCode === -101 || /ERR_CONNECTION_RESET|SSL|handshake/i.test(String(error || ""))
          ? "网络连接被重置（SSL/TLS）。请检查网络或代理后重试。"
          : error || "加载失败";
      setLoadError(msg);
      notifyFrameLoaded(tab.id, false);
      void refreshCanNav();
    });
    const offPick = api.onElementPicked(({ tabId, payload }) => {
      if (tabId !== tab.id) return;
      composerBridge?.addDomElementToChat(payload);
      setPickerActive(false);
    });

    return () => {
      offNav();
      offReady();
      offLoading();
      offFailed();
      offPick();
    };
  }, [
    api,
    composerBridge,
    iframeMode,
    notifyFrameLoaded,
    refreshCanNav,
    setPickerActive,
    shellReady,
    syncPageUrl,
    tab.id,
  ]);

  const go = useCallback(
    (raw?: string) => {
      addressEditingRef.current = false;
      const target = sanitizeBrowserNavigationUrl(raw ?? address);
      setAddress(target === "about:blank" ? "" : target);
      setPageUrl(target);
      setLoadError(null);
      if (!isBlankBrowserUrl(target) && iframeMode) {
        const nextSrc = resolveBrowserFrameSrc(target);
        if (nextSrc !== iframeSrcRef.current) {
          setIframeSrc(nextSrc);
          setFrameState("loading");
        }
      } else if (isBlankBrowserUrl(target)) {
        setIframeSrc("about:blank");
        setFrameState("idle");
      }
      onNavigate(target);
    },
    [address, iframeMode, onNavigate],
  );

  const goBack = () => {
    if (iframeMode) {
      try {
        iframeRef.current?.contentWindow?.history.back();
        setFrameState("loading");
      } catch {
        /* ignore */
      }
      return;
    }
    if (!api) return;
    void api.goBack(tab.id).then(() => refreshCanNav());
  };

  const goForward = () => {
    if (iframeMode) {
      try {
        iframeRef.current?.contentWindow?.history.forward();
        setFrameState("loading");
      } catch {
        /* ignore */
      }
      return;
    }
    if (!api) return;
    void api.goForward(tab.id).then(() => refreshCanNav());
  };

  const reload = () => {
    if (pageUrl === "about:blank") return;
    setFrameState("loading");
    setLoadError(null);
    if (iframeMode) {
      setIframeKey((k) => k + 1);
      setIframeSrc(resolveBrowserFrameSrc(pageUrl));
      return;
    }
    if (!api) return;
    void reloadEmbeddedBrowserTab(tab.id);
  };

  const openExternal = () => {
    const url = pageUrl || tab.url;
    if (url && url !== "about:blank") void openExternalUrl(url);
  };

  const showBlank = pageUrl === "about:blank";
  const browserReady = iframeMode || (shellReady && !!api);
  const canReload = browserReady && !showBlank;
  const navBack = browserReady ? canGoBack : false;
  const navForward = browserReady ? canGoForward : false;
  // native WebContentsView 不受 CSS invisible 影响：非活动页签必须关掉 visible，否则盖住其它页签点击
  const overlayVisible =
    active && !addressFocused && !showBlank && frameState !== "error";

  // 对齐 Cursor：切走立刻隐藏 native view；切回等两帧布局后再 focus，避免旧 view 挡页签
  useEffect(() => {
    if (iframeMode || !api) return;
    if (!overlayVisible) {
      void setEmbeddedBrowserLayout(tab.id, { visible: false });
      return;
    }
    let cancelled = false;
    let inner = 0;
    const outer = window.requestAnimationFrame(() => {
      inner = window.requestAnimationFrame(() => {
        if (cancelled) return;
        void api.focus(tab.id).then(() => {
          if (cancelled) return;
          // 切回已加载页：同 URL 不重载时主进程无 stop 事件，收口 loading 遮罩
          setFrameState((prev) => (prev === "loading" ? "loaded" : prev));
        });
      });
    });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(outer);
      if (inner) window.cancelAnimationFrame(inner);
    };
  }, [active, api, iframeMode, overlayVisible, tab.id]);

  const renderFrame = () => {
    if (showBlank) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center text-[12px] text-muted-foreground">
          <p>在上方地址栏输入网址后回车</p>
          <p className="max-w-md text-[11px] text-muted-foreground/80">
            {iframeMode
              ? "本地与外部网站均在本内容区打开（外网经工作台代理）。Cookie / 登录态受限，不持久化站点会话。"
              : "任意网站将在项目内嵌浏览器（WebContentsView）中打开。"}
          </p>
        </div>
      );
    }

    if (!browserReady) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
          <Globe className="h-8 w-8 animate-pulse text-muted-foreground/50" />
          <p className="text-[13px] font-medium text-foreground">
            {hostConnecting ? "正在连接内嵌浏览器…" : "正在准备内嵌浏览器…"}
          </p>
        </div>
      );
    }

    return (
      <>
        {frameState === "loading" ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-center bg-background/70 py-2 text-[11px] text-muted-foreground">
            正在加载…
          </div>
        ) : null}
        {frameState === "error" ? (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/95 p-4 text-center text-[12px] text-muted-foreground">
            <p>{loadError || "页面加载失败"}</p>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={reload}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-medium hover:bg-secondary"
              >
                重试
              </button>
              <button
                type="button"
                onClick={openExternal}
                className="rounded-md border border-border bg-surface px-3 py-1.5 text-[11px] font-medium hover:bg-secondary"
              >
                在系统浏览器打开
              </button>
            </div>
          </div>
        ) : null}
        <EmbeddedBrowserPane
          tabId={tab.id}
          navigateSrc={iframeSrc}
          iframeMode={iframeMode}
          iframeRef={iframeRef}
          iframeKey={iframeKey}
          overlayVisible={overlayVisible}
          onIframeLoad={iframeMode ? handleIframeLoad : undefined}
        />
      </>
    );
  };

  // 非活动标签不用 display:none：iframe 在 hidden 下加载会出现白屏，需再点一下才重绘。
  // 用 absolute + visibility 保活，始终占满内容区尺寸。
  return (
    <div
      className={cn(
        "absolute inset-0 flex min-h-0 flex-col",
        active ? "z-10" : "invisible pointer-events-none z-0",
      )}
      aria-hidden={!active}
    >
      <div className="relative z-30 flex shrink-0 items-center gap-1 border-b border-border/60 bg-surface-elevated/50 px-2 py-1">
        <NavBtn onClick={goBack} disabled={!navBack} title="后退">
          <ArrowLeft className="h-3.5 w-3.5" />
        </NavBtn>
        <NavBtn onClick={goForward} disabled={!navForward} title="前进">
          <ArrowRight className="h-3.5 w-3.5" />
        </NavBtn>
        <NavBtn onClick={reload} title="刷新" disabled={!canReload}>
          <RotateCw className={cn("h-3.5 w-3.5", frameState === "loading" && "animate-spin")} />
        </NavBtn>
        <form
          className="relative z-40 flex min-w-0 flex-1 items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            const next =
              (e.currentTarget.elements.namedItem("browser-address") as HTMLInputElement | null)?.value ??
              address;
            go(next);
          }}
        >
          <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            name="browser-address"
            type="text"
            value={address}
            autoComplete="off"
            onFocus={() => {
              addressEditingRef.current = true;
              setAddressFocused(true);
            }}
            onBlur={() => {
              addressEditingRef.current = false;
              setAddressFocused(false);
            }}
            onChange={(e) => setAddress(e.target.value)}
            placeholder={iframeMode ? "URL（代理预览，Cookie 受限）" : "输入 URL 后回车"}
            className="relative z-40 min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] outline-none focus:ring-1 focus:ring-primary/40"
            spellCheck={false}
          />
        </form>
        <NavBtn onClick={openExternal} title="在系统浏览器打开" disabled={showBlank}>
          <ExternalLink className="h-3.5 w-3.5" />
        </NavBtn>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="workbench-icon-btn"
              title="更多操作"
              aria-label="浏览器更多操作"
            >
              <MoreHorizontal className="h-3.5 w-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[10rem]">
            <DropdownMenuItem
              disabled={showBlank}
              onClick={() => {
                void navigator.clipboard.writeText(pageUrl).then(
                  () => toast.success("已复制 URL"),
                  () => toast.error("复制失败"),
                );
              }}
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              复制 URL
            </DropdownMenuItem>
            <DropdownMenuItem disabled={!canReload} onClick={reload}>
              <RotateCw className="mr-2 h-3.5 w-3.5" />
              刷新
            </DropdownMenuItem>
            <DropdownMenuItem disabled={showBlank} onClick={openExternal}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              在系统浏览器打开
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <BrowserInspectorHost native={!iframeMode && shellReady} iframe={renderFrame()} />
    </div>
  );
}

function NavBtn({
  children,
  onClick,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn("workbench-icon-btn", disabled && "opacity-30")}
    >
      {children}
    </button>
  );
}

function fileHostLabel(url: string): string {
  try {
    return new URL(url).host || "预览";
  } catch {
    return "预览";
  }
}

