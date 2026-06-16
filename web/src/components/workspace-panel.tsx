import { useCallback, useEffect, useState } from "react";
import {
  X,
  FolderTree,
  GitBranch,
  GitCompare,
  ChevronRight,
  ChevronDown,
  FileText,
  FileCode,
  FileJson,
  Folder,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getDesktop, hasDesktopRuntime } from "@/lib/desktop-api";
import { useDesktopReady, useHasDesktop } from "@/hooks/use-desktop-ready";
import { performProjectPreview } from "@/lib/project-preview";
import { toast } from "sonner";
import { isBinaryFileResult } from "@/lib/is-binary-file";
import { normalizeFileContentForEditor } from "@/lib/format-file-content";
import { BinaryFileViewer } from "@/components/binary-file-viewer";
import type { WorkspacePanelTreeNode } from "@/types/desktop";
import {
  GIT_DIFF_OFFLINE,
  GIT_STATUS_OFFLINE,
  PREVIEW_BUTTON,
  PREVIEW_FILE_HINT,
  PREVIEW_STARTING,
  WORKSPACE_PANEL_OFFLINE,
} from "@/lib/ui-copy";

type Tab = "files" | "shell" | "diff";

export type WorkspacePanelTab = Tab;

function shortenHomeInPath(abs: string): string {
  const m = abs.match(/^(\/Users\/[^/]+)(\/.*)?$/);
  if (m) return `~${m[2] ?? ""}` || "~";
  const w = abs.match(/^(\/home\/[^/]+)(\/.*)?$/);
  if (w) return `~${w[2] ?? ""}` || "~";
  return abs;
}

export function WorkspacePanel({
  open,
  onClose,
  tab: controlledTab,
  onTabChange,
}: {
  open: boolean;
  onClose: () => void;
  tab?: Tab;
  onTabChange?: (tab: Tab) => void;
}) {
  const desktopReady = useDesktopReady();
  const [internalTab, setInternalTab] = useState<Tab>("files");
  const tab = controlledTab ?? internalTab;
  const setTab = (next: Tab) => {
    onTabChange?.(next);
    if (controlledTab === undefined) setInternalTab(next);
  };
  const [rootLabel, setRootLabel] = useState<string>("（未选择工作区）");
  const [tree, setTree] = useState<WorkspacePanelTreeNode[]>([]);
  const [shellText, setShellText] = useState<string>("");
  const [diffText, setDiffText] = useState<string>("");
  const [statusLine, setStatusLine] = useState<string>("");
  const [filesErr, setFilesErr] = useState<string | null>(null);
  const [shellErr, setShellErr] = useState<string | null>(null);
  const [diffErr, setDiffErr] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [loadingShell, setLoadingShell] = useState(false);
  const [loadingDiff, setLoadingDiff] = useState(false);

  const loadFiles = useCallback(async () => {
    const api = getDesktop();
    if (!api?.listWorkspacePanelTree) {
      setFilesErr("当前环境不支持工作区树（请使用桌面端）。");
      setTree([]);
      return;
    }
    setLoadingFiles(true);
    setFilesErr(null);
    try {
      const r = await api.listWorkspacePanelTree();
      if (!r.ok) {
        setRootLabel(r.root ? shortenHomeInPath(r.root) : "（未选择工作区）");
        setTree([]);
        setFilesErr(r.error || "无法列出文件");
        return;
      }
      const root = r.root?.trim() || "";
      setRootLabel(root ? shortenHomeInPath(root) : "（未选择工作区）");
      setTree(Array.isArray(r.tree) ? r.tree : []);
      if (!root) setFilesErr("请先在「工作目录」中选择工作区。");
    } catch (e) {
      setFilesErr(e instanceof Error ? e.message : String(e));
      setTree([]);
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const loadShell = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceGetShellSnapshot) {
      setShellErr("当前环境不支持 Shell 快照。");
      setShellText("");
      return;
    }
    setLoadingShell(true);
    setShellErr(null);
    try {
      const r = await api.workspaceGetShellSnapshot();
      if (!r.ok) {
        setShellText("");
        setShellErr(r.error || "读取失败");
        return;
      }
      setShellText((r.text || "").trim() || "（无输出）");
    } catch (e) {
      setShellErr(e instanceof Error ? e.message : String(e));
      setShellText("");
    } finally {
      setLoadingShell(false);
    }
  }, []);

  const loadDiff = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceGetGitDiff) {
      setDiffErr("当前环境不支持改动预览。");
      setDiffText("");
      setStatusLine("");
      return;
    }
    setLoadingDiff(true);
    setDiffErr(null);
    try {
      const r = await api.workspaceGetGitDiff();
      if (!r.ok) {
        setDiffText("");
        setStatusLine("");
        setDiffErr(r.error || "读取失败");
        return;
      }
      setStatusLine((r.statusLine || "").trim());
      setDiffText((r.diff || "").trim() || "（无差异）");
    } catch (e) {
      setDiffErr(e instanceof Error ? e.message : String(e));
      setDiffText("");
      setStatusLine("");
    } finally {
      setLoadingDiff(false);
    }
  }, []);

  const refreshTab = useCallback(
    async (t: Tab) => {
      if (t === "files") await loadFiles();
      if (t === "shell") await loadShell();
      if (t === "diff") await loadDiff();
    },
    [loadFiles, loadShell, loadDiff],
  );

  useEffect(() => {
    if (!open) return;
    void refreshTab(tab);
  }, [open, tab, refreshTab]);

  useEffect(() => {
    if (!open || !desktopReady || !hasDesktopRuntime()) return;
    const api = getDesktop();
    if (!api?.onWorkspaceChanged) return;
    const off = api.onWorkspaceChanged(() => {
      void refreshTab(tab);
    });
    return () => {
      try {
        off?.();
      } catch {
        /* ignore */
      }
    };
  }, [open, tab, refreshTab, desktopReady]);

  return (
    <aside
      className={cn(
        "absolute right-0 top-0 z-30 h-full border-l border-border bg-surface-elevated shadow-[-8px_0_24px_-12px_oklch(0_0_0/0.18)] transition-transform duration-200",
        open ? "translate-x-0" : "translate-x-full",
      )}
      style={{ width: "min(420px, 38vw)" }}
    >
      <div className="flex h-11 items-center justify-between border-b border-border px-2">
        <div className="flex">
          <TabBtn active={tab === "files"} onClick={() => setTab("files")} icon={FolderTree} label="文件" />
          <TabBtn active={tab === "shell"} onClick={() => setTab("shell")} icon={GitBranch} label="Git" />
          <TabBtn active={tab === "diff"} onClick={() => setTab("diff")} icon={GitCompare} label="改动" />
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => void refreshTab(tab)}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            title="刷新当前页签"
            aria-label="刷新当前页签"
          >
            <RefreshCw
              className={cn(
                "h-3.5 w-3.5",
                (tab === "files" && loadingFiles) ||
                  (tab === "shell" && loadingShell) ||
                  (tab === "diff" && loadingDiff)
                  ? "animate-spin"
                  : "",
              )}
            />
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            aria-label="关闭面板"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100%-2.75rem)] min-h-0 flex-col overflow-hidden">
        {tab === "files" && (
          <FilesView rootLabel={rootLabel} tree={tree} error={filesErr} loading={loadingFiles} />
        )}
        {tab === "shell" && (
          <div className="h-full overflow-y-auto scrollbar-thin">
            <ShellView text={shellText} error={shellErr} loading={loadingShell} />
          </div>
        )}
        {tab === "diff" && (
          <div className="h-full overflow-y-auto scrollbar-thin">
            <DiffView
              statusLine={statusLine}
              diff={diffText}
              error={diffErr}
              loading={loadingDiff}
              onRefresh={() => void loadDiff()}
            />
          </div>
        )}
      </div>
    </aside>
  );
}

function TabBtn({
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
        "inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12px] font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground",
      )}
      style={{ marginBottom: "-1px" }}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function FilesView({
  rootLabel,
  tree,
  error,
  loading,
}: {
  rootLabel: string;
  tree: WorkspacePanelTreeNode[];
  error: string | null;
  loading: boolean;
}) {
  const hasDesktopApi = useHasDesktop();
  const [selectedRelPath, setSelectedRelPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [fileLoading, setFileLoading] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [binary, setBinary] = useState(false);
  const [binaryBase64, setBinaryBase64] = useState<string | null>(null);
  const [previewBytes, setPreviewBytes] = useState<number | undefined>();
  const [fileSize, setFileSize] = useState<number | undefined>();
  const [previewing, setPreviewing] = useState(false);

  const openFile = useCallback(async (relPath: string) => {
    const api = getDesktop();
    if (!api?.readWorkspaceTextFile) {
      toast.error("当前环境无法读取工作区文件");
      return;
    }
    setSelectedRelPath(relPath);
    setFileLoading(true);
    setFileErr(null);
    setFileContent("");
    setBinary(false);
    setBinaryBase64(null);
    setPreviewBytes(undefined);
    setFileSize(undefined);
    try {
      const r = await api.readWorkspaceTextFile(relPath);
      if (!r.ok) {
        setFileErr(r.error || "读取失败");
        return;
      }
      const binary = isBinaryFileResult(relPath, r.text, r.binary);
      setBinary(binary);
      setFileSize(r.size);
      setBinaryBase64(binary ? (r.base64 ?? null) : null);
      setPreviewBytes(r.previewBytes);
      setFileContent(binary ? "" : normalizeFileContentForEditor(relPath, r.text ?? ""));
      setTruncated(Boolean(r.truncated));
    } catch (e) {
      setFileErr(e instanceof Error ? e.message : String(e));
    } finally {
      setFileLoading(false);
    }
  }, []);

  const previewHtml = useCallback(async () => {
    if (!selectedRelPath) return;
    const api = getDesktop();
    if (!api) return;
    setPreviewing(true);
    try {
      const res = await performProjectPreview(api, `预览 ${selectedRelPath}`, {
        entryRel: selectedRelPath,
        preferStatic: true,
      });
      if (res.ok) toast.success("已在浏览器打开预览");
      else toast.warning(res.error || "预览未能启动");
    } finally {
      setPreviewing(false);
    }
  }, [selectedRelPath]);

  if (!hasDesktopApi) {
    return (
      <div className="p-4 text-[12px] leading-relaxed text-muted-foreground">
        {WORKSPACE_PANEL_OFFLINE}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 p-2">
        <div className="mb-2 flex items-start justify-between gap-2 px-2">
          <div className="min-w-0 flex-1">
            <div className="break-all font-mono text-[11px] text-muted-foreground" title={rootLabel}>
              {rootLabel}
            </div>
            {error ? <p className="mt-1 text-[11px] text-destructive">{error}</p> : null}
          </div>
        </div>
        {loading && !tree.length ? (
          <p className="px-2 text-[12px] text-muted-foreground">加载中…</p>
        ) : null}
        {!loading && !tree.length && !error ? (
          <p className="px-2 text-[12px] text-muted-foreground">该目录下没有可展示的文件（或均为被忽略的依赖目录）。</p>
        ) : null}
        <ul className="max-h-[min(42vh,360px)] space-y-0.5 overflow-y-auto scrollbar-thin">
          {tree.map((n, i) => (
            <TreeRow
              key={`${n.name}-${i}`}
              node={n}
              depth={0}
              pathKey=""
              selectedRelPath={selectedRelPath}
              onOpenFile={openFile}
            />
          ))}
        </ul>
      </div>
      {selectedRelPath ? (
        <FilePreviewPane
          relPath={selectedRelPath}
          content={fileContent}
          loading={fileLoading}
          error={fileErr}
          truncated={truncated}
          binary={binary}
          binaryBase64={binaryBase64}
          previewBytes={previewBytes}
          size={fileSize}
          previewing={previewing}
          onPreview={previewHtml}
          onClose={() => {
            setSelectedRelPath(null);
            setFileContent("");
            setFileErr(null);
            setBinary(false);
            setBinaryBase64(null);
            setPreviewBytes(undefined);
            setFileSize(undefined);
          }}
        />
      ) : (
        <div className="mt-auto border-t border-border px-4 py-3 text-[11px] text-muted-foreground">
          {PREVIEW_FILE_HINT}
        </div>
      )}
    </div>
  );
}

function FilePreviewPane({
  relPath,
  content,
  loading,
  error,
  truncated,
  binary,
  binaryBase64,
  previewBytes,
  size,
  previewing,
  onPreview,
  onClose,
}: {
  relPath: string;
  content: string;
  loading: boolean;
  error: string | null;
  truncated: boolean;
  binary: boolean;
  binaryBase64?: string | null;
  previewBytes?: number;
  size?: number;
  previewing: boolean;
  onPreview: () => void;
  onClose: () => void;
}) {
  const isHtml = /\.html?$/i.test(relPath);
  const fileName = relPath.split("/").pop() || relPath;
  return (
    <div className="flex min-h-0 flex-1 flex-col border-t border-border bg-code-bg/40">
      <div className="flex shrink-0 items-center gap-2 border-b border-border px-2 py-1.5">
        <FileCode className="h-3.5 w-3.5 shrink-0 text-primary" />
        <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-foreground" title={relPath}>
          {fileName}
        </span>
        {isHtml ? (
          <button
            type="button"
            disabled={previewing}
            onClick={() => void onPreview()}
            className="shrink-0 rounded-md border border-border bg-surface px-2 py-0.5 text-[10.5px] font-medium text-foreground hover:bg-secondary disabled:opacity-50"
          >
            {previewing ? PREVIEW_STARTING : PREVIEW_BUTTON}
          </button>
        ) : null}
        <button
          type="button"
          onClick={onClose}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="关闭预览"
        >
          <X className="h-3 w-3" />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2 scrollbar-thin">
        {loading ? <p className="text-[12px] text-muted-foreground">读取中…</p> : null}
        {error ? <p className="text-[12px] text-destructive">{error}</p> : null}
        {!loading && !error ? (
          binary ? (
            <BinaryFileViewer
              relPath={relPath}
              size={size}
              previewBytes={previewBytes}
              base64={binaryBase64}
              truncated={truncated}
              className="min-h-[200px]"
            />
          ) : (
            <>
              {truncated ? (
                <p className="mb-2 text-[10.5px] text-amber-600 dark:text-amber-400">文件较大，仅显示前 512KB</p>
              ) : null}
              <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-foreground/90">
                {content || "（空文件）"}
              </pre>
            </>
          )
        ) : null}
      </div>
    </div>
  );
}

function TreeRow({
  node,
  depth,
  pathKey,
  selectedRelPath,
  onOpenFile,
}: {
  node: WorkspacePanelTreeNode;
  depth: number;
  pathKey: string;
  selectedRelPath: string | null;
  onOpenFile: (relPath: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const isDir = node.type === "dir";
  const key = pathKey ? `${pathKey}/${node.name}` : node.name;
  const selected = !isDir && selectedRelPath === key;
  const Icon = isDir ? Folder : iconFor(node.ext);

  const handleClick = () => {
    if (isDir) {
      setExpanded((v) => !v);
      return;
    }
    onOpenFile(key);
  };

  return (
    <li>
      <button
        type="button"
        onClick={handleClick}
        className={cn(
          "flex w-full items-center gap-1 rounded-md px-1.5 py-1 text-left text-[12.5px] transition hover:bg-secondary",
          selected && "bg-primary-soft text-primary",
        )}
        style={{ paddingLeft: `${depth * 12 + 6}px` }}
        title={isDir ? key : `打开 ${key}`}
      >
        {isDir ? (
          expanded ? (
            <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
          )
        ) : (
          <span className="w-3 shrink-0" />
        )}
        <Icon className={cn("h-3.5 w-3.5 shrink-0", isDir ? "text-amber-500" : "text-muted-foreground")} />
        <span className={cn("truncate", isDir ? "font-medium text-foreground" : "text-foreground/85")}>
          {node.name}
        </span>
      </button>
      {isDir && expanded && node.children?.length ? (
        <ul className="space-y-0.5">
          {node.children.map((c, i) => (
            <TreeRow
              key={`${key}/${c.name}-${i}`}
              node={c}
              depth={depth + 1}
              pathKey={key}
              selectedRelPath={selectedRelPath}
              onOpenFile={onOpenFile}
            />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

function iconFor(ext?: string) {
  if (ext === "json") return FileJson;
  if (ext === "ts" || ext === "tsx" || ext === "js" || ext === "jsx" || ext === "mjs" || ext === "cjs")
    return FileCode;
  return FileText;
}

function ShellView({ text, error, loading }: { text: string; error: string | null; loading: boolean }) {
  const hasDesktopApi = useHasDesktop();

  if (!hasDesktopApi) {
    return (
      <div className="p-4 text-[12px] text-muted-foreground">
        {GIT_STATUS_OFFLINE}
      </div>
    );
  }
  return (
    <div className="flex h-full min-h-[200px] flex-col">
      <div className="flex-1 space-y-2 overflow-y-auto p-3 font-mono text-[11.5px] leading-relaxed">
        {error ? <p className="text-destructive">{error}</p> : null}
        {loading && !text ? <p className="text-muted-foreground">加载中…</p> : null}
        <pre className="whitespace-pre-wrap break-words text-foreground/90">{text || "（暂无数据，点击刷新）"}</pre>
      </div>
      <div className="border-t border-border px-3 py-2 text-[11px] leading-snug text-muted-foreground">
        说明：此处为工作区内只读 Git 快照。交互式终端请使用底部「终端」面板（默认 cwd 为当前工作区）。
      </div>
    </div>
  );
}

function DiffView({
  statusLine,
  diff,
  error,
  loading,
  onRefresh,
}: {
  statusLine: string;
  diff: string;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const hasDesktopApi = useHasDesktop();

  if (!hasDesktopApi) {
    return (
      <div className="p-4 text-[12px] text-muted-foreground">
        {GIT_DIFF_OFFLINE}
      </div>
    );
  }
  return (
    <div className="p-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-foreground">
          {statusLine ? (
            <span className="font-mono text-[11px] text-muted-foreground">{statusLine}</span>
          ) : loading ? (
            "加载中…"
          ) : (
            "未提交改动"
          )}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-foreground hover:bg-secondary"
        >
          刷新
        </button>
      </div>
      {error ? <p className="mb-2 text-[11px] text-destructive">{error}</p> : null}
      <pre className="max-h-[min(70vh,560px)] overflow-auto rounded-md border border-border bg-code-bg p-3 font-mono text-[11.5px] leading-relaxed">
        {diff.split("\n").map((line, i) => {
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
