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
import { fileIconClass, fileIconFor } from "@/lib/file-tree-icons";
import {
  isBrowserTab,
  isFileTab,
  normalizeBrowserUrl,
  type WorkbenchEditorTab,
} from "@/types/workbench-editor";

export function WorkbenchCenterEditor() {
  const ws = useWorkbenchWorkspace();

  if (!ws.editorTabs.length) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center border-r border-border bg-code-bg/20 p-6 text-center">
        <FileCode className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-[13px] font-medium text-foreground/80">预览 / 编辑</p>
        <p className="mt-1 max-w-sm text-[12px] text-muted-foreground">
          在左侧文件树中打开多个文件；点击「浏览器」可内嵌浏览网页。
        </p>
        <button
          type="button"
          onClick={() => ws.openBrowserTab()}
          className="mt-4 inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-[12px] font-medium hover:bg-secondary"
        >
          <Globe className="h-3.5 w-3.5" />
          打开浏览器
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden border-r border-border bg-code-bg/30">
      <EditorTabBar
        tabs={ws.editorTabs}
        activeId={ws.activeEditorTabId}
        onSelect={ws.setActiveEditorTab}
        onClose={ws.closeEditorTab}
        onNewBrowser={() => ws.openBrowserTab()}
      />
      {ws.activeEditorTab ? (
        isFileTab(ws.activeEditorTab) ? (
          <FileTabContent tab={ws.activeEditorTab} />
        ) : (
          <BrowserTabContent
            tab={ws.activeEditorTab}
            onNavigate={(url) => ws.navigateBrowserTab(ws.activeEditorTab!.id, url)}
          />
        )
      ) : null}
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
  onNavigate,
}: {
  tab: Extract<WorkbenchEditorTab, { kind: "browser" }>;
  onNavigate: (url: string) => void;
}) {
  const [address, setAddress] = useState(tab.url === "about:blank" ? "" : tab.url);
  const [iframeKey, setIframeKey] = useState(0);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [historyLength, setHistoryLength] = useState(1);
  const historyRef = useRef<string[]>([tab.url]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    setAddress(tab.url === "about:blank" ? "" : tab.url);
    historyRef.current = [tab.url];
    setHistoryIndex(0);
    setHistoryLength(1);
    setIframeKey((k) => k + 1);
  }, [tab.id]);

  useEffect(() => {
    setAddress(tab.url === "about:blank" ? "" : tab.url);
  }, [tab.url]);

  const go = useCallback(
    (raw?: string) => {
      const target = normalizeBrowserUrl(raw ?? address);
      const next = historyRef.current.slice(0, historyIndex + 1);
      next.push(target);
      historyRef.current = next;
      setHistoryIndex(next.length - 1);
      setHistoryLength(next.length);
      onNavigate(target);
      setIframeKey((k) => k + 1);
    },
    [address, historyIndex, onNavigate],
  );

  const goBack = () => {
    if (historyIndex <= 0) return;
    const idx = historyIndex - 1;
    setHistoryIndex(idx);
    const url = historyRef.current[idx] ?? "about:blank";
    onNavigate(url);
    setIframeKey((k) => k + 1);
  };

  const goForward = () => {
    if (historyIndex >= historyRef.current.length - 1) return;
    const idx = historyIndex + 1;
    setHistoryIndex(idx);
    const url = historyRef.current[idx] ?? "about:blank";
    onNavigate(url);
    setIframeKey((k) => k + 1);
  };

  const reload = () => setIframeKey((k) => k + 1);

  const openExternal = () => {
    if (tab.url && tab.url !== "about:blank") void openExternalUrl(tab.url);
  };

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < historyLength - 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-1 border-b border-border/60 bg-surface-elevated/50 px-2 py-1">
        <NavBtn onClick={goBack} disabled={!canGoBack} title="后退">
          <ArrowLeft className="h-3.5 w-3.5" />
        </NavBtn>
        <NavBtn onClick={goForward} disabled={!canGoForward} title="前进">
          <ArrowRight className="h-3.5 w-3.5" />
        </NavBtn>
        <NavBtn onClick={reload} title="刷新">
          <RotateCw className="h-3.5 w-3.5" />
        </NavBtn>
        <form
          className="flex min-w-0 flex-1 items-center gap-1"
          onSubmit={(e) => {
            e.preventDefault();
            go();
          }}
        >
          <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="输入 URL 后回车"
            className="min-w-0 flex-1 rounded border border-border bg-background px-2 py-1 font-mono text-[11px] outline-none focus:ring-1 focus:ring-primary/40"
            spellCheck={false}
          />
        </form>
        <NavBtn onClick={openExternal} title="在系统浏览器打开" disabled={!tab.url || tab.url === "about:blank"}>
          <ExternalLink className="h-3.5 w-3.5" />
        </NavBtn>
      </div>
      <div className="relative min-h-0 flex-1 bg-background">
        {tab.url === "about:blank" ? (
          <div className="flex h-full items-center justify-center text-[12px] text-muted-foreground">
            在上方地址栏输入网址后回车
          </div>
        ) : (
          <iframe
            key={iframeKey}
            ref={iframeRef}
            src={tab.url}
            title={tab.label}
            className="absolute inset-0 h-full w-full border-0 bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-downloads"
          />
        )}
      </div>
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
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30"
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

