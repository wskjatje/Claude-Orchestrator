import { toast } from "sonner";
import { MISSING_WORKSPACE_WRITE_TOAST, replySoundsLikeClaimedDiskWrite } from "@/lib/workspace-write-guard";

/**
 * 若模型在正文中宣称「已落盘/完成/基线」等，但整段回复里没有任何 `workspace-write` 写盘块，
 * 则极可能仅为会话文字，磁盘上无文件 — 提醒用户，避免误以为已生成 PRD。
 * 检测逻辑与根目录 `workspace-write-guard.cjs`（renderer）及本文件引用的 `@/lib/workspace-write-guard` 一致。
 */
export function maybeToastMissingWorkspaceWrite(replyRaw: string): void {
  try {
    const r = replyRaw.trim();
    if (r.length < 160) return;
    if (!replySoundsLikeClaimedDiskWrite(r)) return;

    toast.warning(MISSING_WORKSPACE_WRITE_TOAST, { duration: 10_000 });
  } catch (e) {
    console.error("maybeToastMissingWorkspaceWrite", e);
  }
}
