import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  FileCode,
  Globe,
  Plus,
  RefreshCw,
  RotateCw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { getDesktop } from "@/lib/desktop-api";
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
  const iframeMode = useInPaneIframeBrowser();
  return (
      <div className="workbench-empty-state flex h-full min-h-0 flex-col items-center justify-center border-r border-border bg-code-bg/20 p-6 text-center">
        <FileCode className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="workbench-empty-title text-[13px] font-medium text-foreground/80">预览 / 编辑</p>
        <p className="workbench-empty-desc mt-1 max-w-sm text-[12px] text-muted-foreground">
          在左侧文件树中打开多个文件。浏览器标签在项目内嵌浏览器中打开任意网站。
        </p>
        {iframeMode ? (
          <p className="workbench-empty-desc mt-2 max-w-sm text-[11px] text-muted-foreground/80">
            Web 代理预览：Cookie / 登录态受限，不持久化站点会话。
          </p>
        ) : null}
        <button
          type="button"
          onClick={onOpenBrowser}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-medium hover:bg-secondary"
        >
          <Globe className="h-3.5 w-3.5" />
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
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-r border-border bg-code-bg/30">
      <EditorTabBar
        tabs={ws.editorTabs}
        activeId={ws.activeEditorTabId}
        onSelect={ws.setActiveEditorTab}
        onClose={ws.closeEditorTab}
        onNewBrowser={() => ws.openBrowserTab()}
      />
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
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
      </div>
    </div>
  );
}

function EditorTabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onNewBrowser,
}: {
  tabs: WorkbenchEditorTab[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onClose: (id: string) => void;
  onNewBrowser: () => void;
}) {
  return (
    <div className="flex shrink-0 items-stretch border-b border-border bg-surface-elevated/80">
      <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto scrollbar-thin">
        {tabs.map((tab) => {
          const active = tab.id === activeId;
          const fileExt = isFileTab(tab) ? tab.relPath.split(".").pop() : undefined;
          const fileName = isFileTab(tab) ? tab.label : undefined;
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
                <span className="truncate">{tab.label}</span>
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
      <button
        type="button"
        onClick={onNewBrowser}
        title="新建浏览器标签"
        aria-label="新建浏览器标签"
        className="flex w-9 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function FileTabContent({ tab }: { tab: Extract<WorkbenchEditorTab, { kind: "file" }> }) {
  const ws = useWorkbenchWorkspace();
  const [previewing, setPreviewing] = useState(false);
  const isHtml = /\.html?$/i.test(tab.relPath);

  const previewHtmlInline = useCallback(() => {
    if (!tab.content) return;
    const blob = new Blob([tab.content], { type: "text/html;charset=utf-8" });
    const blobUrl = URL.createObjectURL(blob);
    ws.openBrowserTab(undefined, { label: `${tab.label} 预览`, blobUrl });
  }, [tab.content, tab.label, ws]);

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
        className="shrink-0 rounded border border-border bg-background px-2 py-0.5 text-[10.5px] hover:bg-secondary disabled:opacity-50"
      >
        内嵌预览
      </button>
      <button
        type="button"
        disabled={previewing || tab.loading}
        onClick={() => void previewHtmlServer()}
        className="shrink-0 rounded border border-border bg-background px-2 py-0.5 text-[10.5px] hover:bg-secondary disabled:opacity-50"
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
                <p className="shrink-0 border-b border-amber-500/20 bg-amber-500/10 px-3 py-1 text-[10.5px] text-amber-700 dark:text-amber-400">
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
        }
      } finally {
        setHostConnecting(false);
      }
    },
    [api, iframeMode, tab.id],
  );

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
    if (resolved === "about:blank") {
      setFrameState("idle");
      setIframeSrc("about:blank");
      return;
    }
    if (iframeMode) {
      setIframeSrc(resolveBrowserFrameSrc(resolved));
      setFrameState("loading");
      return;
    }
    if (!shellReady || !api) {
      setFrameState("idle");
      return;
    }
    void runNavigation(resolved);
  }, [api, iframeMode, runNavigation, shellReady, tab.id, tab.url]);

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
  const overlayVisible = !addressFocused && !showBlank && frameState !== "error";

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

