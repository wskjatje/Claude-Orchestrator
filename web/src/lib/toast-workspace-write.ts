import { toast } from "sonner";
import { requestOpenGitScmPanel } from "@/lib/workbench-side-tab";
import { markRecentlyWrittenPaths } from "@/lib/recent-written-paths";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";
import { requestOpenWorkbenchFile } from "@/lib/workbench-open-file";
import { openAgentWrittenReview } from "@/lib/agent-written-review";

/** Agent / 批量写盘成功后的 toast：刷新树/SCM；Review 仅「查看改动」主动打开 */
export function toastWorkspaceWriteSuccess(
  message: string,
  opts?: {
    refreshDiff?: () => void | Promise<void>;
    refreshFiles?: () => void | Promise<void>;
    writtenPaths?: string[];
    /** 默认 true：自动打开源代码管理 */
    autoOpenScm?: boolean;
    /** 默认 true：打开首个写入文件（不抢 Review） */
    autoOpenFirstFile?: boolean;
    /** 默认 false：不自动打开聚合 Diff Review（点「查看改动」才开） */
    autoOpenReview?: boolean;
  },
) {
  if (opts?.writtenPaths?.length) {
    markRecentlyWrittenPaths(opts.writtenPaths);
    if (opts.autoOpenReview === true) {
      openAgentWrittenReview(opts.writtenPaths);
    }
  }
  void opts?.refreshFiles?.();
  void opts?.refreshDiff?.();
  if (opts?.autoOpenScm !== false) {
    requestOpenGitScmPanel();
  }
  const first = opts?.writtenPaths?.[0];
  const openFirst =
    Boolean(first) &&
    opts?.autoOpenFirstFile !== false &&
    opts?.autoOpenReview !== true;
  if (openFirst && first) {
    setPendingLineGoto(first, 1, 1);
    requestOpenWorkbenchFile(first);
  }
  toast.success(message, {
    action: {
      label: "查看改动",
      onClick: () => {
        if (opts?.writtenPaths?.length) openAgentWrittenReview(opts.writtenPaths);
        requestOpenGitScmPanel();
        void opts?.refreshDiff?.();
        void opts?.refreshFiles?.();
      },
    },
  });
}
