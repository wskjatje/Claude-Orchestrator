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
        error: "本轮未能写入文件（写盘格式无效）。请重试，或明确指出要改的文件路径。",
        parsed: 0,
        written: written.length,
        failed: failed.length,
      };
    }
    if (replySoundsLikeClaimedDiskWrite(raw)) {
      return {
        ok: false,
        error: "本轮声称已改文件，但实际未写入。请重试或改用更明确的改文件指令。",
        parsed: 0,
        written: written.length,
        failed: failed.length,
      };
    }
    if (requireWrite && written.length === 0) {
      return {
        ok: false,
        error: "本轮需要改文件，但未写入任何内容。请重试或说明要改哪些文件。",
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
      error: "本轮需要改文件，但未写入任何内容。请重试或说明要改哪些文件。",
      parsed,
      written: 0,
      failed: failed.length,
    };
  }

  return { ok: true, parsed, written: written.length, failed: 0 };
}

/**
 * 历史气泡里的工具协议 / 连接堆栈横幅不原样展示。
 * 新文案不含这些词时仍原样显示。
 */
export function softenStoredRequestError(detail: string | undefined): {
  text: string | null;
  suppressErrorChrome: boolean;
} {
  const t = String(detail || "").trim();
  if (!t) return { text: null, suppressErrorChrome: false };
  if (/search_replace|write_file|workspace-write|落盘意图|未写入任何文件/.test(t)) {
    return { text: null, suppressErrorChrome: true };
  }
  if (
    /无法连接本机服务|本机桥接服务|本机 Bridge|Failed to fetch|web:dev:full|npm run desktop|npm run web:dev/i.test(
      t,
    )
  ) {
    return {
      text: "无法连接本机服务。请确认应用已启动后重试。",
      suppressErrorChrome: false,
    };
  }
  return { text: t, suppressErrorChrome: false };
}

/** 历史助手正文里的连接失败句收成可重试短句。 */
export function softenStoredAssistantFailure(content: string): string {
  const t = String(content || "");
  if (
    !/无法连接本机服务|本机桥接服务|本机 Bridge|Failed to fetch|请求异常：.*Failed to fetch|web:dev:full/i.test(
      t,
    )
  ) {
    return t;
  }
  return "无法连接本机服务。请确认应用已启动后重试。";
}
