/**
 * Agent 自动写盘硬闭环：解析数与落盘数必须对齐，禁止「声称已写 / 半成功」。
 * 无静默兜底：失败返回 error，由调用方标 requestError。
 */
import {
  hasWorkspaceWriteFence,
  replySoundsLikeClaimedDiskWrite,
} from "@/lib/workspace-write-guard";
import { parseWorkspaceWriteItemsFromBubble } from "@/lib/assistant-reply";

export type WriteCloseLoopInput = {
  allowWrites: boolean;
  autoApplyWrites: boolean;
  /** 自动落盘前的助手原文 */
  replyRaw: string;
  /** 已成功写入的相对路径 */
  written: string[];
  /** 尝试失败的路径 */
  failed: string[];
  /**
   * Agent 自动写盘回合：必须至少成功写入 1 个文件。
   * 对齐 Cursor：用户要执行/落盘却 0 文件 → 不算成功。
   */
  requireAppliedWrite?: boolean;
};

export type WriteCloseLoopResult =
  | { ok: true; parsed: number; written: number; failed: number }
  | { ok: false; error: string; parsed: number; written: number; failed: number };

/**
 * Agent + autoApply 时校验写盘闭环。
 * Plan（暂存）与 Ask（禁写）跳过。
 */
export function assertAgentWriteCloseLoop(input: WriteCloseLoopInput): WriteCloseLoopResult {
  if (!input.allowWrites || !input.autoApplyWrites) {
    return { ok: true, parsed: 0, written: 0, failed: 0 };
  }
  const raw = String(input.replyRaw || "");
  const items = parseWorkspaceWriteItemsFromBubble(raw);
  const parsed = items.length;
  const written = [...new Set((input.written || []).filter(Boolean))];
  const failed = [...new Set((input.failed || []).filter(Boolean))];
  const requireWrite = Boolean(input.requireAppliedWrite);

  if (parsed === 0) {
    if (hasWorkspaceWriteFence(raw)) {
      return {
        ok: false,
        error:
          "本轮出现 workspace-write 围栏但无法解析为有效 JSON（须显式 path 与 content|contents；禁止 YAML）。未写入任何文件。",
        parsed: 0,
        written: written.length,
        failed: failed.length,
      };
    }
    if (replySoundsLikeClaimedDiskWrite(raw)) {
      return {
        ok: false,
        error:
          "助手声称已写盘/已完成文件，但未解析到任何 workspace-write 载荷。未写入任何文件（禁止当作成功）。",
        parsed: 0,
        written: written.length,
        failed: failed.length,
      };
    }
    if (requireWrite && written.length === 0) {
      return {
        ok: false,
        error:
          "本轮为变更/落盘意图，但未写入任何文件。须用 search_replace / write_file 或 ```workspace-write``` 实际改盘后再结束。",
        parsed: 0,
        written: 0,
        failed: failed.length,
      };
    }
    // 工具已写盘（written>0）但无围栏：视为成功（本地 Agent 与 Cursor Edit 同构）
    return { ok: true, parsed: 0, written: written.length, failed: failed.length };
  }

  if (failed.length > 0) {
    return {
      ok: false,
      error: `写盘未全部成功：已解析 ${parsed} 个，成功 ${written.length}，失败 ${failed.length}（${failed.slice(0, 5).join(", ")}${failed.length > 5 ? "…" : ""}）。`,
      parsed,
      written: written.length,
      failed: failed.length,
    };
  }

  if (written.length < parsed) {
    const missing = items
      .map((i) => i.path)
      .filter((p) => !written.includes(p))
      .slice(0, 5);
    return {
      ok: false,
      error: `写盘不完整：解析 ${parsed} 个，仅成功 ${written.length}。未写入：${missing.join(", ") || "—"}。`,
      parsed,
      written: written.length,
      failed: failed.length,
    };
  }

  if (requireWrite && written.length === 0) {
    return {
      ok: false,
      error:
        "本轮为变更/落盘意图，但未写入任何文件。须用 search_replace / write_file 或 ```workspace-write``` 实际改盘后再结束。",
      parsed,
      written: 0,
      failed: failed.length,
    };
  }

  return { ok: true, parsed, written: written.length, failed: 0 };
}
