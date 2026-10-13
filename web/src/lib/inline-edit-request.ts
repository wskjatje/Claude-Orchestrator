import { getDesktop } from "@/lib/desktop-api";
import { parseWorkspaceWriteItemsFromBubble } from "@/lib/assistant-reply";
import { applyUnifiedDiff } from "@/lib/apply-unified-diff";
import { cliPermissionModeForInteraction } from "@/lib/workbench-interaction-mode";

export type InlineEditInput = {
  relPath: string;
  fullText: string;
  selection: string;
  selectionFrom: number;
  selectionTo: number;
  instruction: string;
  model?: string;
  /** 流式增量（message_delta） */
  onDelta?: (chunk: string, accumulated: string) => void;
  signal?: AbortSignal;
};

export type InlineEditResult =
  | { ok: true; nextFullText: string }
  | { ok: false; error: string };

/**
 * 选区 Inline Edit：调用本机 claudeCodePrompt，解析 workspace-write / 代码块 / diff 得到全文。
 */
export async function runInlineEdit(input: InlineEditInput): Promise<InlineEditResult> {
  const api = getDesktop();
  if (!api?.claudeCodePrompt) {
    return { ok: false, error: "当前环境无法调用模型" };
  }
  const instruction = input.instruction.trim();
  if (!instruction) return { ok: false, error: "请输入修改说明" };
  if (!input.selection.trim()) return { ok: false, error: "请先选中要修改的代码" };

  const lineFrom = input.fullText.slice(0, input.selectionFrom).split("\n").length;
  const lineTo = input.fullText.slice(0, input.selectionTo).split("\n").length;

  const prompt = [
    "你是代码编辑助手。按用户说明修改选区。",
    "回复要求（择一）：",
    "1) 输出单个 ```workspace-write JSON，path 必须是下方路径，content 为修改后的**完整文件**；或",
    "2) 输出单个 ```diff 针对该文件的 unified diff；或",
    "3) 仅输出一个 ``` 代码块，内容为**替换选区后的新选区文本**（不要输出其它解释）。",
    `路径：${input.relPath}`,
    `选区行：${lineFrom}-${lineTo}`,
    `说明：${instruction}`,
    "选区原文：",
    "```\n" + input.selection + "\n```",
    "文件上下文（前后各约 40 行）：",
    "```\n" + contextWindow(input.fullText, input.selectionFrom, input.selectionTo) + "\n```",
  ].join("\n\n");

  const requestId = `inline-edit-${Date.now()}`;
  let accumulated = "";
  let offDelta: (() => void) | undefined;
  if (input.onDelta) {
    try {
      const { onBridgeEvent } = await import("@/lib/install-desktop-bridge");
      offDelta = onBridgeEvent("message_delta", (detail) => {
        const d = (detail || {}) as { requestId?: string; content?: string };
        if (d.requestId !== requestId || !d.content) return;
        accumulated += d.content;
        input.onDelta?.(d.content, accumulated);
      });
    } catch {
      /* 无桥事件时静默 */
    }
  }
  try {
    if (input.signal?.aborted) {
      return { ok: false, error: "已取消" };
    }
    const r = await api.claudeCodePrompt({
      prompt,
      model: input.model,
      requestId,
      timeoutMs: 120_000,
      isNewClaudeSession: true,
      permissionMode: cliPermissionModeForInteraction(),
    });
    if (input.signal?.aborted) {
      void api.claudeCodeAbort?.(requestId);
      return { ok: false, error: "已取消" };
    }
    if (!r.ok || !r.content?.trim()) {
      return { ok: false, error: r.error || "模型未返回内容" };
    }
    return applyInlineEditResponse(input, r.content);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  } finally {
    offDelta?.();
  }
}

function contextWindow(full: string, from: number, to: number): string {
  const lines = full.split("\n");
  const startLine = Math.max(0, full.slice(0, from).split("\n").length - 1 - 40);
  const endLine = Math.min(lines.length, full.slice(0, to).split("\n").length + 40);
  return lines.slice(startLine, endLine).join("\n");
}

export function applyInlineEditResponse(
  input: InlineEditInput,
  response: string,
): InlineEditResult {
  const items = parseWorkspaceWriteItemsFromBubble(response);
  const hit = items.find(
    (it) => it.path.replace(/\\/g, "/") === input.relPath.replace(/\\/g, "/"),
  );
  if (hit?.content != null) {
    return { ok: true, nextFullText: hit.content };
  }
  if (items[0]?.content != null && items.length === 1) {
    return { ok: true, nextFullText: items[0].content };
  }

  const diffM = response.match(/```diff\s*\n([\s\S]*?)```/i);
  if (diffM?.[1]) {
    const applied = applyUnifiedDiff(input.fullText, diffM[1]);
    if (applied != null) return { ok: true, nextFullText: applied };
  }

  const codeM = response.match(/```(?:\w+)?\s*\n([\s\S]*?)```/);
  if (codeM?.[1] != null) {
    const replacement = codeM[1].replace(/\n$/, "");
    const next =
      input.fullText.slice(0, input.selectionFrom) +
      replacement +
      input.fullText.slice(input.selectionTo);
    return { ok: true, nextFullText: next };
  }

  return { ok: false, error: "无法解析模型输出（需 workspace-write / diff / 代码块）" };
}
