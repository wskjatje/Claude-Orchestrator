import type { DesktopApi } from "@/types/desktop";

export type DiskMsg = { role: string; content: string; ts?: number; requestError?: boolean };

/** 从会话历史中收集可批量落盘的助手正文（含代码块或 workspace-write 的优先） */
export function collectAssistantTextsForBulkWrite(history: DiskMsg[]): string[] {
  const out: string[] = [];
  for (const m of history) {
    if (m.role !== "assistant") continue;
    if (m.requestError) continue;
    const c = typeof m.content === "string" ? m.content.trim() : "";
    if (!c || c === "__WAITING__") continue;
    if (/任务链执行异常|任务链在第 .* 步执行失败|流程未完成，已暂停/.test(c) && !/```/.test(c)) {
      continue;
    }
    const hasCode = /```/.test(c);
    const hasPaths = /###\s*涉及文件路径/i.test(c) || /【任务链】/.test(c);
    const hasWriteFence = /workspace-write/i.test(c);
    if (hasCode || hasWriteFence || hasPaths) out.push(c);
  }
  return out;
}

export async function performBulkWriteFromHistory(
  api: DesktopApi,
  history: DiskMsg[],
): Promise<{
  ok: boolean;
  written: string[];
  displayText: string;
  error?: string;
  scanned?: number;
}> {
  if (!api.workspaceBulkIngestFromHistory) {
    return { ok: false, written: [], displayText: "", error: "当前 Bridge 不支持批量落盘，请重启 npm run web:dev:full" };
  }
  const texts = collectAssistantTextsForBulkWrite(history);
  if (!texts.length) {
    return {
      ok: false,
      written: [],
      displayText: "",
      error: "会话历史中没有含代码块或文件路径的助手回复，无法批量落盘。",
    };
  }
  const res = await api.workspaceBulkIngestFromHistory({ texts });
  const written = res?.written ?? [];
  const displayText =
    (typeof res?.displayText === "string" && res.displayText.trim()) ||
    (written.length
      ? `【批量落盘】已写入 ${written.length} 个文件：\n${written.map((p) => `- \`${p}\``).join("\n")}`
      : "");
  return {
    ok: Boolean(res?.ok && written.length > 0),
    written,
    displayText,
    error: res?.error,
    scanned: typeof res?.scanned === "number" ? res.scanned : texts.length,
  };
}
