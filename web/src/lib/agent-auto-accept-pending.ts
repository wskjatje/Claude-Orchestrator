import { getDesktop } from "@/lib/desktop-api";
import {
  applyPendingWorkspaceWrite,
  collapseAcceptedWorkspaceWriteForHistory,
  collapseWorkspaceWriteForHistory,
} from "@/lib/assistant-reply";
import type { AgentFilePatch } from "@/lib/agent-file-patch";
import { mergeAgentFilePatches } from "@/lib/agent-file-patch";
import { dedupeEditsByPath, parseChatFileEdits } from "@/lib/parse-chat-file-edits";
import { stripStreamEventsBlock } from "@/lib/stream-agent-events";
import { resolveWorkspaceEditContent } from "@/lib/resolve-workspace-edit-content";
import { stashWorkspaceWriteCheckpoint } from "@/lib/workspace-write-checkpoint";
import { clearRejectedWorkspaceWrite } from "@/lib/rejected-workspace-writes";
import { getWorkbenchInteractionMode } from "@/lib/workbench-interaction-mode";

function normPath(p: string): string {
  return String(p || "")
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .trim();
}

/**
 * Agent 模式：对本轮助手正文中的 pending 写入自动 Accept（真实写盘）。
 * Ask/Propose 不调用。
 * alreadyWrittenPaths：Host Agent 已直写的路径，只折叠卡片、不再二次写盘。
 */
export async function autoAcceptPendingFromAssistantReply(
  assistantContent: string,
  opts?: {
    alreadyWrittenPaths?: string[];
    /** Host/本地工具已返回的写前/写后 */
    alreadyPatches?: AgentFilePatch[];
  },
): Promise<{
  written: string[];
  nextContent: string;
  failed: string[];
  patches: AgentFilePatch[];
}> {
  if (getWorkbenchInteractionMode() !== "agent") {
    return { written: [], nextContent: assistantContent, failed: [], patches: [] };
  }
  const api = getDesktop();
  if (!api) {
    return { written: [], nextContent: assistantContent, failed: [], patches: [] };
  }

  const already = new Set(
    (opts?.alreadyWrittenPaths || []).map(normPath).filter(Boolean),
  );
  let text = assistantContent;
  const written: string[] = [];
  const failed: string[] = [];
  const patches: AgentFilePatch[] = [];

  for (const p of opts?.alreadyPatches || []) {
    const path = normPath(p.path);
    if (!path) continue;
    if (p.before !== undefined) stashWorkspaceWriteCheckpoint(path, p.before);
    patches.push({ ...p, path });
  }

  // 已直写：统一标成已写入，避免「半写半挂」
  for (const p of already) {
    text = collapseAcceptedWorkspaceWriteForHistory(text, p);
    written.push(p);
  }

  const { edits } = parseChatFileEdits(stripStreamEventsBlock(text));
  const pending = dedupeEditsByPath(edits).filter(
    (e) =>
      !e.summaryOnly &&
      !already.has(normPath(e.path)) &&
      (e.writeContent != null || e.diffBody != null) &&
      (e.status === "pending" || e.status == null),
  );
  if (!pending.length) {
    const uniq = [...new Set(written)];
    return {
      written: uniq,
      nextContent: uniq.length ? collapseWorkspaceWriteForHistory(text, uniq) : text,
      failed,
      patches: mergeAgentFilePatches(patches),
    };
  }

  for (const edit of pending) {
    const path = normPath(edit.path);
    const resolved = await resolveWorkspaceEditContent({
      path,
      content: edit.writeContent || edit.diffBody || "",
      source: edit.source,
      diffBody: edit.diffBody,
      readFile: api.readWorkspaceTextFile
        ? (p) => api.readWorkspaceTextFile!(p)
        : undefined,
    });
    if (!resolved.ok) {
      // diff 基线不匹配：若磁盘已是目标态则视为已写入
      if (edit.source === "fence" && edit.writeContent != null && api.readWorkspaceTextFile) {
        try {
          const cur = await api.readWorkspaceTextFile(path);
          if (cur?.ok && cur.text === edit.writeContent) {
            text = collapseAcceptedWorkspaceWriteForHistory(text, path);
            written.push(path);
            continue;
          }
        } catch {
          /* ignore */
        }
      }
      failed.push(path);
      continue;
    }
    // 与磁盘相同则只折叠
    if (resolved.text === resolved.previous) {
      text = collapseAcceptedWorkspaceWriteForHistory(text, path);
      written.push(path);
      continue;
    }
    stashWorkspaceWriteCheckpoint(path, resolved.previous);
    const r = await applyPendingWorkspaceWrite(api, {
      path,
      content: resolved.text,
    });
    if (!r.ok) {
      failed.push(path);
      continue;
    }
    clearRejectedWorkspaceWrite(path, edit.diffBody || edit.writeContent || "");
    text = collapseAcceptedWorkspaceWriteForHistory(text, path);
    written.push(path);
    patches.push({
      path,
      before: resolved.previous,
      after: resolved.text,
      isNewFile: resolved.previous === "",
    });
  }
  const uniq = [...new Set(written)];
  // Host 已写或刚 Accept：折叠整文件代码块，只留路径摘要
  const nextContent = uniq.length ? collapseWorkspaceWriteForHistory(text, uniq) : text;
  return {
    written: uniq,
    nextContent,
    failed: [...new Set(failed)],
    patches: mergeAgentFilePatches(patches),
  };
}
