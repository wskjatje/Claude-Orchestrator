import { toast } from "sonner";
import { requestOpenGitScmPanel } from "@/lib/workbench-side-tab";
import { markRecentlyWrittenPaths } from "@/lib/recent-written-paths";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";
import { requestOpenWorkbenchFile } from "@/lib/workbench-open-file";
import {
  openAgentWrittenReview,
  trackAgentWrittenPaths,
} from "@/lib/agent-written-review";
import { preferGitCommitMessage } from "@/lib/workbench-git-prefills";
import { isPlanDocumentPath } from "@/lib/plan-build-request";
import { trackComposerCanvasPlan } from "@/lib/workbench-composer-turn-footer";
import { getWorkbenchInteractionMode } from "@/lib/workbench-interaction-mode";

/**
 * Agent / 批量写盘成功后的反馈。
 * 对齐 Cursor：默认安静（登记路径 / 刷新 / 底栏），不弹 success toast；
 * 仅显式 `quiet: false` 且有文案时才 toast（失败仍走 toast.error）。
 */
export function toastWorkspaceWriteSuccess(
  message: string,
  opts?: {
    refreshDiff?: () => void | Promise<void>;
    refreshFiles?: () => void | Promise<void>;
    writtenPaths?: string[];
    /** 默认 false：不自动打开源代码管理（对齐 Cursor） */
    autoOpenScm?: boolean;
    /** 默认 false：不自动打开首个写入文件 */
    autoOpenFirstFile?: boolean;
    /** 默认 false：不自动进聚合 Diff Review */
    autoOpenReview?: boolean;
    /** 预填 Git 提交说明（不因此切页签） */
    preferCommitMessage?: string;
    /**
     * 默认 true（安静）。传 false 才弹 success toast。
     * 兼容旧调用：未传时也按安静处理。
     */
    quiet?: boolean;
  },
) {
  const openReview = opts?.autoOpenReview === true;
  if (opts?.writtenPaths?.length) {
    markRecentlyWrittenPaths(opts.writtenPaths);
    trackAgentWrittenPaths(opts.writtenPaths);
    const planPath = opts.writtenPaths.find((p) => isPlanDocumentPath(p));
    if (planPath) {
      trackComposerCanvasPlan(planPath);
      // Cursor Plan：方案落盘后打开可审 Markdown；Agent 业务写盘仍不自动开文件
      if (getWorkbenchInteractionMode() === "plan") {
        setPendingLineGoto(planPath, 1, 1);
        requestOpenWorkbenchFile(planPath);
      }
    }
    if (openReview) {
      openAgentWrittenReview(opts.writtenPaths);
    }
  }
  void opts?.refreshFiles?.();
  void opts?.refreshDiff?.();
  if (opts?.autoOpenScm === true) {
    requestOpenGitScmPanel();
  }
  if (opts?.preferCommitMessage) {
    preferGitCommitMessage(opts.preferCommitMessage);
  } else if (opts?.writtenPaths?.length) {
    const names = opts.writtenPaths
      .slice(0, 4)
      .map((p) => p.split("/").pop() || p)
      .join(", ");
    preferGitCommitMessage(`update: ${names}`);
  }
  const first = opts?.writtenPaths?.[0];
  if (opts?.autoOpenFirstFile === true && first) {
    setPendingLineGoto(first, 1, 1);
    requestOpenWorkbenchFile(first);
  }
  // 默认安静：须显式 quiet: false 才弹
  if (opts?.quiet !== false) return;
  const msg = String(message || "").trim();
  if (!msg) return;
  toast.success(msg, {
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
