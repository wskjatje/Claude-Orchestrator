import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { getDesktop } from "@/lib/desktop-api";
import { useDesktopReady } from "@/hooks/use-desktop-ready";
import type { WorkspacePanelTreeNode } from "@/types/desktop";
import { WORKSPACE_TREE_OFFLINE } from "@/lib/ui-copy";
import {
  fileNameFromRel,
  isBrowserTab,
  isFileTab,
  normalizeBrowserUrl,
  type WorkbenchBrowserTab,
  type WorkbenchEditorTab,
  type WorkbenchFileTab,
} from "@/types/workbench-editor";
import { isBinaryFileResult } from "@/lib/is-binary-file";
import { normalizeFileContentForEditor } from "@/lib/format-file-content";
import { buildExplorerGitDecor, parseGitStatusShortBranch } from "@/lib/explorer-git-decor";
import { requestWorkbenchLint } from "@/lib/workbench-lint-bridge";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";

function shortenHomeInPath(abs: string): string {
  const m = abs.match(/^(\/Users\/[^/]+)(\/.*)?$/);
  if (m) return `~${m[2] ?? ""}` || "~";
  const w = abs.match(/^(\/home\/[^/]+)(\/.*)?$/);
  if (w) return `~${w[2] ?? ""}` || "~";
  return abs;
}

function makeTabId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function revokeBlobUrl(tab: WorkbenchEditorTab) {
  if (isBrowserTab(tab) && tab.blobUrl?.startsWith("blob:")) {
    try {
      URL.revokeObjectURL(tab.blobUrl);
    } catch {
      /* ignore */
    }
  }
}

type WorkbenchWorkspaceContextValue = {
  rootLabel: string;
  tree: WorkspacePanelTreeNode[];
  /** git 状态字母（路径 → U/M/A/…） */
  gitStatusByPath: Map<string, string>;
  /** 含 git 变更的文件及其祖先目录（用于蓝色圆点） */
  gitHasDecoration: Set<string>;
  filesErr: string | null;
  loadingFiles: boolean;
  /** Active file tab path — for file tree highlight */
  selectedRelPath: string | null;
  editorTabs: WorkbenchEditorTab[];
  activeEditorTabId: string | null;
  activeEditorTab: WorkbenchEditorTab | null;
  shellText: string;
  shellErr: string | null;
  loadingShell: boolean;
  diffText: string;
  diffErr: string | null;
  statusLine: string;
  loadingDiff: boolean;
  openFile: (relPath: string, opts?: { line?: number; column?: number }) => Promise<void>;
  openBrowserTab: (url?: string, opts?: { label?: string; blobUrl?: string | null }) => void;
  navigateBrowserTab: (tabId: string, url: string) => void;
  setActiveEditorTab: (tabId: string) => void;
  closeEditorTab: (tabId: string) => void;
  closePreview: () => void;
  updateFileTabContent: (tabId: string, content: string) => void;
  saveFileTab: (tabId: string) => Promise<void>;
  refreshFiles: () => Promise<void>;
  refreshShell: () => Promise<void>;
  refreshDiff: () => Promise<void>;
};

const WorkbenchWorkspaceContext = createContext<WorkbenchWorkspaceContextValue | null>(null);

export function WorkbenchWorkspaceProvider({ children }: { children: ReactNode }) {
  const desktopReady = useDesktopReady();
  const [rootLabel, setRootLabel] = useState("（未选择工作区）");
  const [tree, setTree] = useState<WorkspacePanelTreeNode[]>([]);
  const [gitStatusByPath, setGitStatusByPath] = useState<Map<string, string>>(() => new Map());
  const [gitHasDecoration, setGitHasDecoration] = useState<Set<string>>(() => new Set());
  const [filesErr, setFilesErr] = useState<string | null>(null);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [editorTabs, setEditorTabs] = useState<WorkbenchEditorTab[]>([]);
  const [activeEditorTabId, setActiveEditorTabId] = useState<string | null>(null);
  const [shellText, setShellText] = useState("");
  const [shellErr, setShellErr] = useState<string | null>(null);
  const [loadingShell, setLoadingShell] = useState(false);
  const [diffText, setDiffText] = useState("");
  const [diffErr, setDiffErr] = useState<string | null>(null);
  const [statusLine, setStatusLine] = useState("");
  const [loadingDiff, setLoadingDiff] = useState(false);

  const activeEditorTab = useMemo(
    () => editorTabs.find((t) => t.id === activeEditorTabId) ?? null,
    [editorTabs, activeEditorTabId],
  );

  const selectedRelPath = useMemo(
    () => (activeEditorTab && isFileTab(activeEditorTab) ? activeEditorTab.relPath : null),
    [activeEditorTab],
  );

  const refreshFiles = useCallback(async () => {
    const api = getDesktop();
    if (!api?.listWorkspacePanelTree) {
      setFilesErr(WORKSPACE_TREE_OFFLINE);
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
        setGitStatusByPath(new Map());
        setGitHasDecoration(new Set());
        setFilesErr(r.error || "无法列出文件");
        return;
      }
      const root = r.root?.trim() || "";
      setRootLabel(root ? shortenHomeInPath(root) : "（未选择工作区）");
      setTree(Array.isArray(r.tree) ? r.tree : []);

      let gitEntries = Array.isArray(r.gitStatus)
        ? r.gitStatus
        : Array.isArray(r.gitChanged)
          ? r.gitChanged.map((p) => ({ path: p, letter: "M" as const }))
          : [];

      if (!gitEntries.length && api.workspaceGetGitDiff) {
        try {
          const diff = await api.workspaceGetGitDiff();
          if (diff.ok && diff.statusLine) {
            gitEntries = parseGitStatusShortBranch(diff.statusLine);
          }
        } catch {
          /* 忽略 git 回退失败 */
        }
      }

      const decor = buildExplorerGitDecor(gitEntries);
      setGitStatusByPath(decor.statusByPath);
      setGitHasDecoration(decor.hasDecoration);
      if (!root) setFilesErr("请先在「工作目录」中选择工作区。");
    } catch (e) {
      setFilesErr(e instanceof Error ? e.message : String(e));
      setTree([]);
      setGitStatusByPath(new Map());
      setGitHasDecoration(new Set());
    } finally {
      setLoadingFiles(false);
    }
  }, []);

  const refreshShell = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceGetShellSnapshot) {
      setShellErr("当前环境不支持 Git 快照。");
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

  const refreshDiff = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceGetGitDiff) {
      setDiffErr("当前环境不支持改动预览。");
      setDiffText("");
      return;
    }
    setLoadingDiff(true);
    setDiffErr(null);
    try {
      const r = await api.workspaceGetGitDiff();
      if (!r.ok) {
        setDiffText("");
        setDiffErr(r.error || "读取失败");
        setStatusLine("");
        return;
      }
      setStatusLine((r.statusLine || "").trim());
      setDiffText((r.diff || "").trim() || "（无未提交改动）");
    } catch (e) {
      setDiffErr(e instanceof Error ? e.message : String(e));
      setDiffText("");
    } finally {
      setLoadingDiff(false);
    }
  }, []);

  const loadFileTabContent = useCallback(async (tabId: string, relPath: string) => {
    const api = getDesktop();
    if (!api?.readWorkspaceTextFile) return;
    try {
      const r = await api.readWorkspaceTextFile(relPath);
      setEditorTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId || !isFileTab(t)) return t;
          if (!r.ok) {
            return { ...t, loading: false, error: r.error || "读取失败", content: "" };
          }
          const binary = isBinaryFileResult(relPath, r.text, r.binary);
          if (binary) {
            return {
              ...t,
              loading: false,
              error: null,
              content: "",
              savedContent: "",
              dirty: false,
              saving: false,
              truncated: Boolean(r.truncated),
              binary: true,
              size: r.size,
              binaryBase64: r.base64 ?? null,
              previewBytes: r.previewBytes,
            };
          }
          const text = normalizeFileContentForEditor(relPath, r.text ?? "");
          return {
            ...t,
            loading: false,
            error: null,
            content: text,
            savedContent: text,
            dirty: false,
            saving: false,
            truncated: Boolean(r.truncated),
            binary: false,
            size: r.size,
            binaryBase64: null,
            previewBytes: undefined,
          };
        }),
      );
      if (!r.ok || isBinaryFileResult(relPath, r.text, r.binary)) return;
      try {
        requestWorkbenchLint([relPath], "open");
      } catch {
        /* lint 不应阻断文件打开 */
      }
    } catch (e) {
      setEditorTabs((prev) =>
        prev.map((t) => {
          if (t.id !== tabId || !isFileTab(t)) return t;
          return {
            ...t,
            loading: false,
            error: e instanceof Error ? e.message : String(e),
            content: "",
          };
        }),
      );
    }
  }, []);

  const openFile = useCallback(
    async (relPath: string, opts?: { line?: number; column?: number }) => {
      if (opts?.line != null) {
        setPendingLineGoto(relPath, opts.line, opts.column ?? 1);
      }

      const api = getDesktop();
      if (!api?.readWorkspaceTextFile) return;

      const existing = editorTabs.find((t) => isFileTab(t) && t.relPath === relPath);
      if (existing) {
        setActiveEditorTabId(existing.id);
        if (!existing.dirty) {
          void loadFileTabContent(existing.id, relPath);
        }
        return;
      }

      const tabId = makeTabId("file");
      const label = fileNameFromRel(relPath);
      const newTab: WorkbenchFileTab = {
        id: tabId,
        kind: "file",
        relPath,
        label,
        content: "",
        savedContent: "",
        dirty: false,
        saving: false,
        loading: true,
        error: null,
        truncated: false,
        binary: false,
      };
      setEditorTabs((prev) => [...prev, newTab]);
      setActiveEditorTabId(tabId);
      await loadFileTabContent(tabId, relPath);
    },
    [editorTabs, loadFileTabContent],
  );

  const openBrowserTab = useCallback(
    (url?: string, opts?: { label?: string; blobUrl?: string | null }) => {
      const resolved = opts?.blobUrl ?? (url ? normalizeBrowserUrl(url) : "about:blank");
      const label =
        opts?.label ||
        (resolved === "about:blank"
          ? "浏览器"
          : (() => {
              try {
                return new URL(resolved).host || "浏览器";
              } catch {
                return "浏览器";
              }
            })());

      const tabId = makeTabId("browser");
      const newTab: WorkbenchBrowserTab = {
        id: tabId,
        kind: "browser",
        url: resolved,
        label,
        blobUrl: opts?.blobUrl ?? null,
      };
      setEditorTabs((prev) => [...prev, newTab]);
      setActiveEditorTabId(tabId);
    },
    [],
  );

  const navigateBrowserTab = useCallback((tabId: string, url: string) => {
    const resolved = normalizeBrowserUrl(url);
    setEditorTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId || !isBrowserTab(t)) return t;
        if (t.blobUrl?.startsWith("blob:")) {
          try {
            URL.revokeObjectURL(t.blobUrl);
          } catch {
            /* ignore */
          }
        }
        let label = "浏览器";
        try {
          label = new URL(resolved).host || "浏览器";
        } catch {
          /* keep default */
        }
        return { ...t, url: resolved, label, blobUrl: null };
      }),
    );
  }, []);

  const setActiveEditorTab = useCallback((tabId: string) => {
    setActiveEditorTabId(tabId);
  }, []);

  const closeEditorTab = useCallback(
    (tabId: string) => {
      const closing = editorTabs.find((t) => t.id === tabId);
      if (closing) revokeBlobUrl(closing);

      setEditorTabs((prev) => {
        const next = prev.filter((t) => t.id !== tabId);
        if (activeEditorTabId === tabId) {
          const idx = prev.findIndex((t) => t.id === tabId);
          const fallback = next[idx] ?? next[idx - 1] ?? null;
          setActiveEditorTabId(fallback?.id ?? null);
        }
        return next;
      });
    },
    [editorTabs, activeEditorTabId],
  );

  const closePreview = useCallback(() => {
    if (activeEditorTabId) closeEditorTab(activeEditorTabId);
  }, [activeEditorTabId, closeEditorTab]);

  const updateFileTabContent = useCallback((tabId: string, content: string) => {
    setEditorTabs((prev) =>
      prev.map((t) => {
        if (t.id !== tabId || !isFileTab(t)) return t;
        return { ...t, content, dirty: content !== t.savedContent };
      }),
    );
  }, []);

  const saveFileTab = useCallback(async (tabId: string) => {
    const tab = editorTabs.find((t) => t.id === tabId && isFileTab(t));
    if (!tab || !isFileTab(tab)) return;
    const api = getDesktop();
    if (!api?.workspaceApplyWriteFence) {
      toast.error("无法保存文件");
      return;
    }
    setEditorTabs((prev) =>
      prev.map((t) => (t.id === tabId && isFileTab(t) ? { ...t, saving: true } : t)),
    );
    try {
      const result = await api.workspaceApplyWriteFence([{ path: tab.relPath, content: tab.content }]);
      if (result.ok && result.written?.length) {
        setEditorTabs((prev) =>
          prev.map((t) => {
            if (t.id !== tabId || !isFileTab(t)) return t;
            return { ...t, savedContent: t.content, dirty: false, saving: false };
          }),
        );
        toast.success("文件已保存");
        try {
          requestWorkbenchLint([tab.relPath]);
        } catch {
          /* lint 不应阻断保存 */
        }
        void refreshFiles();
      } else {
        toast.error(result.error || "保存失败");
        setEditorTabs((prev) =>
          prev.map((t) => (t.id === tabId && isFileTab(t) ? { ...t, saving: false } : t)),
        );
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "保存失败");
      setEditorTabs((prev) =>
        prev.map((t) => (t.id === tabId && isFileTab(t) ? { ...t, saving: false } : t)),
      );
    }
  }, [editorTabs, refreshFiles]);

  useEffect(() => {
    if (!desktopReady) return;
    void refreshFiles();
  }, [desktopReady, refreshFiles]);

  useEffect(() => {
    const api = getDesktop();
    if (!api?.onWorkspaceChanged) return;
    const off = api.onWorkspaceChanged(() => {
      void refreshFiles();
    });
    return () => {
      try {
        off?.();
      } catch {
        /* ignore */
      }
    };
  }, [refreshFiles]);

  const value = useMemo(
    () => ({
      rootLabel,
      tree,
      gitStatusByPath,
      gitHasDecoration,
      filesErr,
      loadingFiles,
      selectedRelPath,
      editorTabs,
      activeEditorTabId,
      activeEditorTab,
      shellText,
      shellErr,
      loadingShell,
      diffText,
      diffErr,
      statusLine,
      loadingDiff,
      openFile,
      openBrowserTab,
      navigateBrowserTab,
      setActiveEditorTab,
      closeEditorTab,
      closePreview,
      updateFileTabContent,
      saveFileTab,
      refreshFiles,
      refreshShell,
      refreshDiff,
    }),
    [
      rootLabel,
      tree,
      gitStatusByPath,
      gitHasDecoration,
      filesErr,
      loadingFiles,
      selectedRelPath,
      editorTabs,
      activeEditorTabId,
      activeEditorTab,
      shellText,
      shellErr,
      loadingShell,
      diffText,
      diffErr,
      statusLine,
      loadingDiff,
      openFile,
      openBrowserTab,
      navigateBrowserTab,
      setActiveEditorTab,
      closeEditorTab,
      closePreview,
      updateFileTabContent,
      saveFileTab,
      refreshFiles,
      refreshShell,
      refreshDiff,
    ],
  );

  return (
    <WorkbenchWorkspaceContext.Provider value={value}>{children}</WorkbenchWorkspaceContext.Provider>
  );
}

export function useWorkbenchWorkspace() {
  const ctx = useContext(WorkbenchWorkspaceContext);
  if (!ctx) throw new Error("useWorkbenchWorkspace must be used within WorkbenchWorkspaceProvider");
  return ctx;
}
