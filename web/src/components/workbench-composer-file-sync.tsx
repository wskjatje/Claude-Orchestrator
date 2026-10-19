import { useEffect, useMemo, useSyncExternalStore } from "react";
import { toast } from "sonner";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { isFileTab } from "@/types/workbench-editor";
import { getDesktop } from "@/lib/desktop-api";
import { setComposerFileBarState } from "@/lib/workbench-composer-file-bar";
import {
  getPendingWritesState,
  subscribePendingWrites,
} from "@/lib/workbench-pending-writes";
import {
  clearAgentWrittenReview,
  getAgentWrittenReviewState,
  openAgentWrittenReview,
  subscribeAgentWrittenReview,
} from "@/lib/agent-written-review";
import {
  clearRecentlyWrittenPaths,
  getRecentlyWrittenPaths,
  subscribeRecentlyWrittenPaths,
} from "@/lib/recent-written-paths";
import { takeWorkspaceWriteCheckpoint } from "@/lib/workspace-write-checkpoint";

async function undoWrittenPathsOnDisk(paths: string[]): Promise<number> {
  const api = getDesktop();
  if (!api) return 0;
  let ok = 0;
  for (const path of paths) {
    const snap = takeWorkspaceWriteCheckpoint(path);
    try {
      if (snap !== undefined && api.workspaceApplyWriteFence) {
        if (snap === "") {
          if (api.workspaceGitDiscardFile) {
            const d = await api.workspaceGitDiscardFile({ path });
            if (d.ok) ok += 1;
          }
        } else {
          const r = await api.workspaceApplyWriteFence([{ path, content: snap }]);
          if (r?.written?.length) ok += 1;
        }
        continue;
      }
      if (api.workspaceGitDiscardFile) {
        const d = await api.workspaceGitDiscardFile({ path });
        if (d.ok) ok += 1;
      }
    } catch {
      /* 单文件失败继续 */
    }
  }
  return ok;
}

/** 合并 dirty 标签 + 待确认写入 + Agent 已写路径，供 Composer 文件条真实计数 */
export function WorkbenchComposerFileSync() {
  const ws = useWorkbenchWorkspace();
  const pending = useSyncExternalStore(
    subscribePendingWrites,
    getPendingWritesState,
    getPendingWritesState,
  );
  const written = useSyncExternalStore(
    subscribeAgentWrittenReview,
    getAgentWrittenReviewState,
    getAgentWrittenReviewState,
  );
  const recent = useSyncExternalStore(
    subscribeRecentlyWrittenPaths,
    getRecentlyWrittenPaths,
    getRecentlyWrittenPaths,
  );

  const dirtyPaths = useMemo(
    () =>
      ws.editorTabs
        .filter((t) => isFileTab(t) && t.dirty)
        .map((t) => (isFileTab(t) ? t.relPath.replace(/\\/g, "/") : ""))
        .filter(Boolean),
    [ws.editorTabs],
  );

  const pendingPaths = useMemo(
    () =>
      pending.items
        .map((it) => String(it.path || "").replace(/\\/g, "/").replace(/^\.\//, "").trim())
        .filter(Boolean),
    [pending.items],
  );

  const writtenPaths = useMemo(
    () =>
      (written.paths || [])
        .map((p) => String(p || "").replace(/\\/g, "/").replace(/^\.\//, "").trim())
        .filter(Boolean),
    [written.paths],
  );

  const recentPaths = useMemo(() => [...recent], [recent]);

  const allPaths = useMemo(() => {
    const set = new Set<string>();
    for (const p of dirtyPaths) set.add(p);
    for (const p of pendingPaths) set.add(p);
    for (const p of writtenPaths) set.add(p);
    for (const p of recentPaths) set.add(p);
    return [...set];
  }, [dirtyPaths, pendingPaths, writtenPaths, recentPaths]);

  useEffect(() => {
    const count = allPaths.length;
    const diskPaths = [...new Set([...writtenPaths, ...recentPaths])];
    setComposerFileBarState({
      count,
      paths: allPaths,
      undoAll: () => {
        void (async () => {
          // 1) 编辑器未保存 → 回滚缓冲
          for (const tab of ws.editorTabs) {
            if (isFileTab(tab) && tab.dirty) {
              ws.updateFileTabContent(tab.id, tab.savedContent);
            }
          }
          // 2) 待确认 Propose → 全部拒绝
          if (pending.rejectAll && pending.items.length) {
            try {
              await pending.rejectAll();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "全部拒绝失败");
            }
          }
          // 3) 已写盘 → 检查点/git 还原（对齐 Cursor Undo All）
          if (diskPaths.length) {
            const n = await undoWrittenPathsOnDisk(diskPaths);
            clearAgentWrittenReview();
            clearRecentlyWrittenPaths();
            void ws.refreshFiles?.();
            void ws.refreshDiff?.();
            if (n > 0) toast.success(`已撤销 ${n} 个文件`);
            else if (diskPaths.length) toast.error("无法撤销已写盘改动");
          }
        })();
      },
      review: () => {
        if (diskPaths.length) {
          openAgentWrittenReview(diskPaths);
          return;
        }
        if (pendingPaths.length) {
          const first = pendingPaths[0]!;
          void ws.openFile(first);
          return;
        }
        const firstDirty = ws.editorTabs.find((t) => isFileTab(t) && t.dirty);
        if (firstDirty && isFileTab(firstDirty)) void ws.openFile(firstDirty.relPath);
      },
    });
    return () => setComposerFileBarState({ count: 0, paths: [], undoAll: null, review: null });
  }, [allPaths, pending, pendingPaths, writtenPaths, recentPaths, ws]);

  return null;
}
