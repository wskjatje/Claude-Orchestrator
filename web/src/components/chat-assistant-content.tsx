import { useCallback, useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { toastWorkspaceWriteSuccess } from "@/lib/toast-workspace-write";
import { ChatFileEditCard } from "@/components/chat-file-edit-card";
import type { ChatFileEditActionResult } from "@/components/chat-file-edit-card";
import { ChatDockCollapsible } from "@/components/chat-dock-collapsible";
import { ChatMarkdown } from "@/components/chat-markdown";
import { ChatThoughtBlock } from "@/components/chat-thought-block";
import {
  ChatEditedFileRow,
  ChatToolActivityGroup,
  isFileEditTool,
  type ToolActivityItem,
} from "@/components/chat-tool-activity";
import { useWorkbenchWorkspaceOptional } from "@/contexts/workbench-workspace-context";
import { getWorkbenchInteractionMode } from "@/lib/workbench-interaction-mode";
import {
  applyPendingWorkspaceWrite,
  collapseAcceptedWorkspaceWriteForHistory,
} from "@/lib/assistant-reply";
import { parseAssistantContent, type AssistantBlock } from "@/lib/chat-assistant-parse";
import { getDesktop } from "@/lib/desktop-api";
import { clearRejectedWorkspaceWrite, rejectWorkspaceWrite } from "@/lib/rejected-workspace-writes";
import {
  buildEditPool,
  buildLineDiffPreview,
  dedupeEditsByPath,
  editsPreviewFromUnifiedDiff,
  parseChatFileEdits,
  splitWorkspaceEditPaths,
  editFromFilePatch,
  summaryEditForPath,
  takeEditForPath,
  type ChatFileEdit,
} from "@/lib/parse-chat-file-edits";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";
import { requestOpenWorkbenchFile } from "@/lib/workbench-open-file";
import {
  parseStreamEventsBlock,
  stripStreamEventsBlock,
  type StreamAgentEvent,
} from "@/lib/stream-agent-events";
import {
  isAgentTraceToolName,
  looksLikeAgentTurnReport,
  looksLikeUserFacingAnswer,
  mergeStreamEvents,
  shapeAgentTurnDisplay,
  stripDsmlToolMarkup,
  stripForceContinueMarkers,
  trailLinesToStreamEvents,
} from "@/lib/compress-agent-display";
import { sanitizeDirectChatReply } from "../../../shared/sanitize-direct-reply.mjs";
import type { AgentTurnMeta } from "@/lib/agent-turn-meta";
import {
  peekWorkspaceWriteCheckpoint,
  stashWorkspaceWriteCheckpoint,
  takeWorkspaceWriteCheckpoint,
} from "@/lib/workspace-write-checkpoint";
import { applyUnifiedDiff } from "@/lib/apply-unified-diff";
import { resolveWorkspaceEditContent } from "@/lib/resolve-workspace-edit-content";
import { isPlanDocumentPath, requestPlanBuild } from "@/lib/plan-build-request";
import { ComposerTurnFooterPanel } from "@/components/composer-turn-footer-panel";

function sanitizeThoughtForUnit(body: string): string {
  // 先剥伪工具协议（含 thinking 内模拟 Bash/DSML），再进 Thought 折叠
  let t = sanitizeDirectChatReply(body);
  t = stripForceContinueMarkers(stripDsmlToolMarkup(t).text);
  t = t.replace(/^要不要我[^\n]*\??\s*$/gm, "");
  return t.replace(/\n{3,}/g, "\n\n").trim();
}

function DockTerminalOutputBlock({
  title,
  body,
  done,
}: {
  title: string;
  body: string;
  done?: boolean;
}) {
  const trimmed = body.trim();
  // 短结果（如 143 passed）直接露出，不必再套一层折叠
  const compact = trimmed.length > 0 && trimmed.length <= 80 && !trimmed.includes("\n");
  const lineCount = trimmed ? trimmed.replace(/\r\n/g, "\n").split("\n").length : 0;
  return (
    <div className="chat-terminal-output">
      <div className="chat-terminal-output-head">
        <span className="chat-terminal-output-prompt" aria-hidden>
          &gt;_
        </span>
        <span className="chat-terminal-output-title">{title}</span>
      </div>
      {compact ? (
        <div className="chat-terminal-output-body chat-terminal-output-body--compact">
          <pre className="workbench-code m-0 whitespace-pre-wrap break-words">{trimmed}</pre>
        </div>
      ) : trimmed ? (
        <ChatDockCollapsible lineCount={lineCount} bodyClassName="chat-terminal-output-body">
          <pre className="workbench-code m-0 whitespace-pre-wrap break-words">{trimmed}</pre>
        </ChatDockCollapsible>
      ) : null}
      {done ? <div className="chat-terminal-output-done">DONE</div> : null}
    </div>
  );
}

type RenderUnit =
  | { kind: "thought"; title: string; body: string }
  | { kind: "tools"; items: ToolActivityItem[] }
  | { kind: "terminal"; title: string; body: string }
  | { kind: "markdown"; body: string }
  | { kind: "file-edit"; edit: ChatFileEdit }
  | { kind: "bulk-bar"; edits: ChatFileEdit[] };

/** 终端卡正文：优先 tool output，截成关键 1～3 行 */
function summarizeToolOutput(raw: string | undefined, maxLines = 3, maxChars = 480): string {
  const t = String(raw || "")
    .replace(/\r\n/g, "\n")
    .trim();
  if (!t) return "";
  const lines = t
    .split("\n")
    .map((l) => l.trimEnd())
    .filter((l) => l.trim());
  const pick = lines.slice(-Math.max(1, maxLines));
  let out = pick.join("\n");
  if (out.length > maxChars) out = `${out.slice(0, maxChars - 1)}…`;
  return out;
}

function streamEventsToToolItems(events: StreamAgentEvent[]): ToolActivityItem[] {
  return events
    .filter((e) => e.type === "tool" && isAgentTraceToolName(e.name || ""))
    .map((e) => {
      const path = e.path?.trim() || undefined;
      const arg = path || e.arg;
      const output = summarizeToolOutput(e.output);
      return {
        name: e.name || "Tool",
        arg,
        status: e.status === "running" ? "running" : e.status === "fail" ? "fail" : "ok",
        ...(output ? { output } : {}),
      } satisfies ToolActivityItem;
    });
}

function toolKey(t: ToolActivityItem): string {
  return `${t.name}\0${(t.arg || "").trim()}`;
}

function dedupeToolItems(items: ToolActivityItem[]): ToolActivityItem[] {
  const seen = new Set<string>();
  const out: ToolActivityItem[] = [];
  for (const t of items) {
    const k = toolKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function groupAgentTurnUnits(
  blocks: AssistantBlock[],
  edits: ChatFileEdit[],
  pool: Map<string, ChatFileEdit[]>,
  used: Set<string>,
  seq: { n: number },
  streamTools?: ToolActivityItem[],
): RenderUnit[] {
  const out: RenderUnit[] = [];
  let toolBuf: ToolActivityItem[] = [];
  const seenToolKeys = new Set<string>();

  const flushTools = () => {
    if (!toolBuf.length) return;
    out.push({ kind: "tools", items: [...toolBuf] });
    toolBuf = [];
  };

  const agentMode = getWorkbenchInteractionMode() === "agent";
  const usedPaths = new Set<string>();
  const pushFileEdit = (path: string) => {
    const parts = splitWorkspaceEditPaths(path);
    const paths = parts.length ? parts : [path.trim()].filter(Boolean);
    for (const one of paths) {
      const norm = one.replace(/\\/g, "/").replace(/^\.\//, "");
      if (usedPaths.has(norm)) continue;
      usedPaths.add(norm);
      const edit =
        takeEditForPath(one, pool, used) ??
        summaryEditForPath(one, seq, { applied: agentMode });
      const pendingWrite =
        !edit.summaryOnly &&
        edit.writeContent != null &&
        (edit.status === "pending" || edit.status == null);
      // Agent：无待 Accept → 仍推 file-edit（后续 git 富化成 Diff 卡）
      if (agentMode && !pendingWrite) {
        out.push({
          kind: "file-edit",
          edit: {
            ...edit,
            path: one,
            summaryOnly: true,
            status: "applied",
            source: edit.source || "summary",
          },
        });
        continue;
      }
      out.push({ kind: "file-edit", edit: { ...edit, path: one } });
    }
  };

  const absorbTools = (items: ToolActivityItem[]) => {
    for (const t of items) {
      if (/^(Edit|Write|MultiEdit|write_file|search_replace)$/i.test(t.name)) {
        // 可信路径 → Diff/Edit 卡；git 报错等垃圾 arg → 丢弃，勿渲染成「Edit fatal…」
        if (isFileEditTool(t.name, t.arg)) {
          flushTools();
          const pathArg = t.arg?.trim().replace(/^[`'"]|[`'"]$/g, "") ?? "";
          if (pathArg) pushFileEdit(pathArg);
        }
        continue;
      }
      // Bash → 终端卡；无有效命令/结果则跳过（避免空 pytest+DONE）
      if (/^(Bash|run_command|run_tests)$/i.test(t.name)) {
        flushTools();
        const raw = (t.arg || "").trim();
        if (!raw && !t.output) continue;
        // "pytest · 143 passed" → 标题 pytest，正文展示结果
        const split = raw.match(/^(.{1,80}?)\s*[·•]\s*(.+)$/);
        const title = (split?.[1] || raw || "命令").trim() || "命令";
        const fromArg = (split?.[2] || (/^\d+\s+passed/i.test(raw) ? raw : "")).trim();
        const body =
          summarizeToolOutput(t.output) ||
          fromArg ||
          (/passed|failed|error|===/i.test(raw) && raw !== title ? raw : "");
        // 合成的空 pytest：不展示
        if (!body && /^(pytest|python|命令)$/i.test(title) && raw.length < 24) {
          continue;
        }
        const k = `Bash\0${title}\0${body}`;
        if (seenToolKeys.has(k)) continue;
        seenToolKeys.add(k);
        out.push({
          kind: "terminal",
          title: title.length > 100 ? `${title.slice(0, 97)}…` : title,
          body,
        });
        continue;
      }
      const k = toolKey(t);
      if (seenToolKeys.has(k)) continue;
      seenToolKeys.add(k);
      toolBuf.push(t);
    }
  };

  // 结构化轨迹优先注入（与正文 ⋯ 行合并去重）
  if (streamTools?.length) {
    absorbTools(streamTools);
    flushTools();
  }

  for (const b of blocks) {
    if (b.kind === "tool") {
      absorbTools([{ name: b.name, arg: b.arg, status: b.status }]);
      continue;
    }
    flushTools();
    if (b.kind === "thought") {
      const thoughtBody = sanitizeThoughtForUnit(b.body);
      if (thoughtBody) out.push({ kind: "thought", title: b.title, body: thoughtBody });
    } else if (b.kind === "terminal") out.push({ kind: "terminal", title: b.title, body: b.body });
    else if (b.kind === "markdown") {
      const md = b.body.trim();
      if (md) out.push({ kind: "markdown", body: b.body });
    }
  }
  flushTools();

  for (const edit of edits) {
    const norm = edit.path.replace(/\\/g, "/").replace(/^\.\//, "");
    if (used.has(edit.id) || usedPaths.has(norm)) continue;
    used.add(edit.id);
    usedPaths.add(norm);
    out.push({ kind: "file-edit", edit });
  }

  const pendingEdits = edits.filter(
    (e) => (e.status === "pending" || e.status == null) && e.writeContent != null,
  );
  if (pendingEdits.length > 1) {
    out.unshift({ kind: "bulk-bar", edits: pendingEdits });
  }

  return out;
}

function hasRealPreview(edit: ChatFileEdit): boolean {
  return (edit.previewLines || []).some(
    (l) => l.kind === "add" || l.kind === "del" || (l.kind === "ctx" && l.text !== "正在生成改动…"),
  );
}

async function enrichEditsAgainstDisk(edits: ChatFileEdit[]): Promise<ChatFileEdit[]> {
  const api = getDesktop();
  const readFile = api?.readWorkspaceTextFile;
  let base = dedupeEditsByPath(edits);
  if (!base.length) return base;

  // ① 待审 fence/diff：对照磁盘填 preview
  if (readFile) {
    base = await Promise.all(
      base.map(async (edit) => {
        if (edit.summaryOnly) return edit;
        if (edit.status === "rejected" || edit.status === "applied") return edit;
        if (edit.source !== "fence" && edit.source !== "diff") return edit;
        if (edit.writeContent == null && !edit.diffBody) return edit;
        try {
          const r = await readFile(edit.path);
          const fileExists = Boolean(r?.ok);
          const before = r?.ok && typeof r.text === "string" ? r.text : "";
          if (edit.source === "fence" && edit.writeContent != null) {
            if (r?.ok && before === edit.writeContent) {
              return {
                ...edit,
                status: "applied" as const,
                summaryOnly: true,
                previewLines: [],
                added: 0,
                removed: 0,
                writeContent: undefined,
              };
            }
            const { previewLines, added, removed, isNewFile } = buildLineDiffPreview(
              before,
              edit.writeContent,
              64,
              { allowFullAdd: !fileExists || !before.length },
            );
            return {
              ...edit,
              previewLines,
              added,
              removed,
              isNewFile: isNewFile || edit.isNewFile,
            };
          }
          if (edit.source === "diff" && (edit.diffBody || edit.writeContent)) {
            const body = edit.diffBody || edit.writeContent || "";
            const after = applyUnifiedDiff(before, body);
            if (after != null && after === before) {
              return {
                ...edit,
                status: "applied" as const,
                summaryOnly: true,
                previewLines: [],
                added: 0,
                removed: 0,
              };
            }
            if (after != null) {
              const { previewLines, added, removed, isNewFile } = buildLineDiffPreview(
                before,
                after,
                64,
                { allowFullAdd: !fileExists || !before.length },
              );
              return {
                ...edit,
                previewLines,
                added,
                removed,
                isNewFile: isNewFile || edit.isNewFile,
              };
            }
          }
          return edit;
        } catch {
          return edit;
        }
      }),
    );
    base = dedupeEditsByPath(base);
  }

  // ② checkpoint before → 当前磁盘（优先于 git，不依赖 HEAD）
  if (readFile) {
    base = await Promise.all(
      base.map(async (edit) => {
        if (hasRealPreview(edit)) return edit;
        if (!(edit.summaryOnly || edit.status === "applied" || edit.source === "summary" || edit.source === "cli")) {
          return edit;
        }
        const before = peekWorkspaceWriteCheckpoint(edit.path);
        if (before === undefined) return edit;
        try {
          const r = await readFile(edit.path);
          const after = r?.ok && typeof r.text === "string" ? r.text : "";
          if (!after && before === "") return edit;
          const { previewLines, added, removed, isNewFile } = buildLineDiffPreview(
            before,
            after,
            64,
            { allowFullAdd: before === "" },
          );
          if (!previewLines.length && !added && !removed) return edit;
          return {
            ...edit,
            previewLines,
            added,
            removed,
            summaryOnly: true,
            status: "applied" as const,
            source: "summary" as const,
            isNewFile: isNewFile || (before === "" ? true : edit.isNewFile),
          };
        } catch {
          return edit;
        }
      }),
    );
    base = dedupeEditsByPath(base);
  }

  // ③ gitDiffPaths（有 HEAD / 未跟踪新文件）
  const needGit = base.filter(
    (e) =>
      (e.summaryOnly || e.status === "applied" || e.source === "summary" || e.source === "cli") &&
      !hasRealPreview(e),
  );
  if (needGit.length && api?.workspaceGetGitDiffPaths) {
    const pathList = [
      ...new Set(needGit.flatMap((e) => splitWorkspaceEditPaths(e.path) || [e.path])),
    ].slice(0, 40);
    try {
      const r = await api.workspaceGetGitDiffPaths({ paths: pathList });
      if (r?.ok && r.diff && !String(r.diff).includes("无差异") && !String(r.diff).includes("无文件内容")) {
        const seq = { n: 50_000 };
        const fromGit = editsPreviewFromUnifiedDiff(String(r.diff), seq);
        const byPath = new Map(fromGit.map((e) => [e.path.replace(/\\/g, "/"), e]));
        const byBase = new Map<string, ChatFileEdit>();
        for (const e of fromGit) {
          const b = e.path.split("/").pop() || e.path;
          if (!byBase.has(b)) byBase.set(b, e);
        }
        base = base.flatMap((edit) => {
          const parts = splitWorkspaceEditPaths(edit.path);
          const paths = parts.length ? parts : [edit.path];
          if (paths.length > 1 && !hasRealPreview(edit)) {
            return paths.map((one) => {
              const g = byPath.get(one) || byBase.get(one.split("/").pop() || one);
              if (g) {
                return {
                  ...edit,
                  id: `${one}::git`,
                  path: g.path,
                  added: g.added,
                  removed: g.removed,
                  previewLines: g.previewLines,
                  summaryOnly: true,
                  status: "applied" as const,
                  source: "summary" as const,
                  diffBody: g.diffBody,
                  isNewFile: g.isNewFile,
                };
              }
              return {
                ...edit,
                id: `${one}::sum`,
                path: one,
                summaryOnly: true,
                status: "applied" as const,
              };
            });
          }
          if (hasRealPreview(edit)) return [edit];
          const one = paths[0] || edit.path;
          const g = byPath.get(one) || byBase.get(one.split("/").pop() || one);
          if (!g) return [edit];
          return [
            {
              ...edit,
              path: g.path,
              added: g.added,
              removed: g.removed,
              previewLines: g.previewLines,
              summaryOnly: true,
              status: "applied" as const,
              source: "summary" as const,
              diffBody: g.diffBody,
              isNewFile: g.isNewFile,
            },
          ];
        });
        base = dedupeEditsByPath(base);
      }
    } catch {
      /* ignore */
    }
  }

  // ④ 仍无预览：仅 checkpoint 再试；禁止无基线时伪造全绿（掩盖修改型编辑）
  if (readFile) {
    base = await Promise.all(
      base.map(async (edit) => {
        if (hasRealPreview(edit)) return edit;
        if (!(edit.summaryOnly || edit.status === "applied" || edit.source === "summary" || edit.source === "cli")) {
          return edit;
        }
        try {
          const r = await readFile(edit.path);
          if (!r?.ok || typeof r.text !== "string" || !r.text.length) return edit;
          const before = peekWorkspaceWriteCheckpoint(edit.path);
          if (before === undefined) {
            // 无 checkpoint：保持 lite Edit 行，勿全文当 add
            return edit;
          }
          const { previewLines, added, removed, isNewFile } = buildLineDiffPreview(
            before,
            r.text,
            64,
            { allowFullAdd: before === "" },
          );
          if (!previewLines.length && !added && !removed) return edit;
          return {
            ...edit,
            previewLines,
            added,
            removed,
            summaryOnly: true,
            status: "applied" as const,
            source: "summary" as const,
            isNewFile: isNewFile || (before === "" ? true : edit.isNewFile),
          };
        } catch {
          return edit;
        }
      }),
    );
    base = dedupeEditsByPath(base);
  }

  return base;
}


function useFileEditActions(opts: {
  content: string;
  edits: ChatFileEdit[];
  filePatches?: AgentTurnMeta["filePatches"];
  onContentPatch?: (nextContent: string) => void | Promise<void>;
  onRejectedPaths?: (paths: string[]) => void;
  onUnrejectedPaths?: (paths: string[]) => void;
}) {
  const ws = useWorkbenchWorkspaceOptional();
  const { content, edits, filePatches, onContentPatch, onRejectedPaths, onUnrejectedPaths } =
    opts;
  const [bulkBusy, setBulkBusy] = useState(false);

  const applyOne = useCallback(async (edit: ChatFileEdit): Promise<boolean> => {
    const api = getDesktop();
    if (!api) {
      toast.error("无法写入");
      return false;
    }
    if (edit.writeContent == null && !edit.diffBody) {
      toast.error("无法写入");
      return false;
    }
    const resolved = await resolveWorkspaceEditContent({
      path: edit.path,
      content: edit.writeContent || edit.diffBody || "",
      source: edit.source,
      diffBody: edit.diffBody,
      readFile: api.readWorkspaceTextFile
        ? (p) => api.readWorkspaceTextFile!(p)
        : undefined,
    });
    if (!resolved.ok) {
      toast.error(resolved.error);
      return false;
    }
    stashWorkspaceWriteCheckpoint(edit.path, resolved.previous);
    const r = await applyPendingWorkspaceWrite(api, {
      path: edit.path,
      content: resolved.text,
    });
    if (!r.ok) {
      toast.error(r.error || "写入失败");
      return false;
    }
    clearRejectedWorkspaceWrite(edit.path, edit.diffBody || edit.writeContent || "");
    return true;
  }, []);

  const onApply = useCallback(
    async (edit: ChatFileEdit): Promise<ChatFileEditActionResult> => {
      const ok = await applyOne(edit);
      if (!ok) return false;
      const next = collapseAcceptedWorkspaceWriteForHistory(content, edit.path);
      if (next !== content && onContentPatch) await onContentPatch(next.replace(/\n{3,}/g, "\n\n").trim());
      void ws?.refreshFiles?.();
      void ws?.refreshDiff?.();
      // Plan Accept：对齐 Cursor——挂方案底栏；Plan 模式再打开文件供审阅后 Build
      if (isPlanDocumentPath(edit.path)) {
        const { toastWorkspaceWriteSuccess } = await import("@/lib/toast-workspace-write");
        // 静默：方案挂底栏 Open/Build，不弹「已保留」
        toastWorkspaceWriteSuccess("", {
          writtenPaths: [edit.path],
          refreshDiff: () => void ws?.refreshDiff?.(),
          refreshFiles: () => void ws?.refreshFiles?.(),
        });
      }
      return true;
    },
    [applyOne, content, onContentPatch, ws],
  );

  const onReject = useCallback(
    async (edit: ChatFileEdit): Promise<ChatFileEditActionResult> => {
      const key = edit.diffBody || edit.writeContent;
      if (key != null) {
        rejectWorkspaceWrite(edit.path, key);
        onRejectedPaths?.([edit.path]);
      }
      return true;
    },
    [onRejectedPaths],
  );

  const onUndoReject = useCallback(
    async (edit: ChatFileEdit): Promise<ChatFileEditActionResult> => {
      const key = edit.diffBody || edit.writeContent;
      if (key != null) clearRejectedWorkspaceWrite(edit.path, key);
      onUnrejectedPaths?.([edit.path]);
      return true;
    },
    [onUnrejectedPaths],
  );

  const onApplyAll = useCallback(async () => {
    const pending = edits.filter(
      (e) =>
        !e.summaryOnly &&
        (e.status === "pending" || e.status == null) &&
        e.writeContent != null,
    );
    if (!pending.length) return;
    setBulkBusy(true);
    try {
      let text = content;
      const writtenPaths: string[] = [];
      for (const edit of pending) {
        const ok = await applyOne(edit);
        if (ok) {
          text = collapseAcceptedWorkspaceWriteForHistory(text, edit.path);
          writtenPaths.push(edit.path);
        }
      }
      if (writtenPaths.length && onContentPatch) await onContentPatch(text);
      if (writtenPaths.length) {
        toastWorkspaceWriteSuccess("", {
          refreshDiff: () => ws?.refreshDiff?.(),
          refreshFiles: () => ws?.refreshFiles?.(),
          writtenPaths,
        });
      }
    } finally {
      setBulkBusy(false);
    }
  }, [edits, content, applyOne, onContentPatch, ws]);

  const onRejectAll = useCallback(async () => {
    const pending = edits.filter(
      (e) =>
        !e.summaryOnly &&
        (e.status === "pending" || e.status == null) &&
        e.writeContent != null,
    );
    const paths: string[] = [];
    for (const edit of pending) {
      const key = edit.diffBody || edit.writeContent;
      if (key != null) {
        rejectWorkspaceWrite(edit.path, key);
        paths.push(edit.path);
      }
    }
    onRejectedPaths?.(paths);
    toast.message(`已拒绝 ${pending.length} 个改动`);
  }, [edits, onRejectedPaths]);

  const onOpen = useCallback(
    async (edit: ChatFileEdit): Promise<ChatFileEditActionResult> => {
      const paths = splitWorkspaceEditPaths(edit.path);
      const path = (paths[0] || edit.path || "").trim();
      if (!path) {
        toast.error("无法打开文件");
        return false;
      }
      // 点对话中的文件 → 中栏打开并定位首处改动，不进 Diff Review
      const first = edit.previewLines?.find((l) => l.kind === "add" || l.kind === "del");
      const gotoLine =
        first?.kind === "add"
          ? first.newLine
          : first?.kind === "del"
            ? first.oldLine ?? first.newLine
            : undefined;
      if (gotoLine != null && gotoLine > 0) {
        setPendingLineGoto(path, gotoLine, 1);
      }
      try {
        if (ws?.openFile) await ws.openFile(path, gotoLine ? { line: gotoLine, column: 1 } : undefined);
        else requestOpenWorkbenchFile(path);
      } catch {
        requestOpenWorkbenchFile(path);
      }
      return true;
    },
    [ws],
  );

  const onRevert = useCallback(
    async (edit: ChatFileEdit): Promise<ChatFileEditActionResult> => {
      const api = getDesktop();
      // Cursor 对齐：Undo 仅还原写前快照；禁止默默 git discard 误伤同文件其它脏改动
      let snap = takeWorkspaceWriteCheckpoint(edit.path);
      if (snap === undefined && filePatches?.length) {
        const hit = filePatches.find(
          (p) => p.path.replace(/\\/g, "/") === edit.path.replace(/\\/g, "/"),
        );
        if (hit && hit.before !== undefined) snap = hit.before;
      }
      if (snap === undefined) {
        toast.error("无法精确撤销：缺少写前快照（请用 Git 自行还原）");
        return false;
      }
      if (!api?.workspaceApplyWriteFence) {
        toast.error("无法撤销");
        return false;
      }
      try {
        if (snap === "") {
          // 本轮新建：仅当仍无 HEAD 跟踪时 discard；否则写回空内容不安全 → 硬提示
          if (api.workspaceGitDiscardFile) {
            const d = await api.workspaceGitDiscardFile({ path: edit.path });
            if (d.ok) {
              void ws?.refreshFiles?.();
              void ws?.refreshDiff?.();
              return true;
            }
          }
          toast.error("无法撤销新建文件：请手动删除或用 Git 还原");
          return false;
        }
        const r = await api.workspaceApplyWriteFence([{ path: edit.path, content: snap }]);
        if (r?.written?.length) {
          void ws?.refreshFiles?.();
          void ws?.refreshDiff?.();
          return true;
        }
        toast.error(r?.error || "撤销写回失败");
        return false;
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "撤销失败");
        return false;
      }
    },
    [ws, filePatches],
  );

  const onBuildFromPlan = useCallback(
    async (edit: ChatFileEdit): Promise<ChatFileEditActionResult> => {
      if (!isPlanDocumentPath(edit.path)) return false;
      requestPlanBuild(edit.path);
      return true;
    },
    [],
  );

  return {
    onApply,
    onReject,
    onUndoReject,
    onOpen,
    onRevert,
    onBuildFromPlan,
    onApplyAll,
    onRejectAll,
    bulkBusy,
  };
}

function DockAssistantContent({
  units,
  actions,
  agentMode,
}: {
  units: RenderUnit[];
  actions: ReturnType<typeof useFileEditActions>;
  agentMode: boolean;
}) {
  const visible = units.filter((u) => {
    if (u.kind === "markdown") return Boolean(u.body.trim());
    if (u.kind === "thought") return Boolean(u.body.trim());
    if (u.kind === "tools") return u.items.length > 0;
    if (u.kind === "bulk-bar") return !agentMode && u.edits.length > 0;
    return true;
  });
  // 禁兜底：无可见单元时不合成伪结论；保留空容器避免空气泡壳异常
  if (visible.length === 0) {
    return <div className="chat-assistant-blocks chat-assistant-blocks--compact" />;
  }

  const pathKey = (p: string) => {
    const n = p.replace(/\\/g, "/").replace(/^\.\//, "");
    return { full: n, base: n.split("/").pop() || n };
  };
  const unitHasDiffLines = (edit: { previewLines?: { kind: string; text?: string }[] }) =>
    (edit.previewLines || []).some(
      (l) =>
        l.kind === "add" ||
        l.kind === "del" ||
        l.kind === "fold" ||
        (l.kind === "ctx" && l.text !== "正在生成改动…" && l.text !== "…"),
    );

  return (
    <div className="chat-assistant-blocks chat-assistant-blocks--compact">
      {visible.map((u, i) => {
        if (u.kind === "bulk-bar") {
          // Agent 已自动落盘：不显示「全部接受」
          if (agentMode) return null;
          const n = u.edits.length;
          return (
            <div key={`bulk:${i}`} className="chat-file-edit-bulk flex flex-wrap items-center gap-1.5 px-1 py-1">
              <span className="text-[12px] text-muted-foreground">{n} 个待应用</span>
              <button
                type="button"
                className="btn-row text-[11px]"
                disabled={actions.bulkBusy}
                onClick={() => void actions.onApplyAll()}
              >
                <Check className="h-3 w-3" /> 全部保留
              </button>
              <button
                type="button"
                className="btn-row text-[11px]"
                disabled={actions.bulkBusy}
                onClick={() => void actions.onRejectAll()}
              >
                <X className="h-3 w-3" /> 全部撤销
              </button>
            </div>
          );
        }
        if (u.kind === "thought") {
          return <ChatThoughtBlock key={`thought:${i}`} title={u.title} body={u.body} />;
        }
        if (u.kind === "tools") {
          return <ChatToolActivityGroup key={`tools:${i}`} items={u.items} />;
        }
        if (u.kind === "terminal") {
          return (
            <DockTerminalOutputBlock
              key={`term:${i}`}
              title={u.title}
              body={u.body}
              done
            />
          );
        }
        if (u.kind === "markdown") {
          return <ChatMarkdown key={`md:${i}`} content={u.body} />;
        }
        if (u.kind === "file-edit") {
          const e = u.edit;
          const hasDiff = unitHasDiffLines(e);
          const { full: normPath, base: baseName } = pathKey(e.path);
          // 同回合 units 中已有同路径 Diff 卡时，跳过轻量 Edit 行（按路径扫 units，勿用 visible 下标）
          const siblingHasDiff = units.some((other) => {
            if (other.kind !== "file-edit" || other.edit.id === e.id) return false;
            const op = pathKey(other.edit.path);
            if (op.full !== normPath && op.base !== baseName) return false;
            return (other.edit.previewLines || []).some(
              (l) => l.kind === "add" || l.kind === "del" || l.kind === "fold",
            );
          });
          const liteRow =
            agentMode &&
            !hasDiff &&
            !siblingHasDiff &&
            (e.summaryOnly ||
              e.status === "applied" ||
              e.source === "summary" ||
              e.source === "cli");
          if (liteRow) {
            const showBuild = Boolean(actions.onBuildFromPlan) && isPlanDocumentPath(e.path);
            return (
              <ChatEditedFileRow
                key={e.id}
                path={e.path}
                onOpen={() => void actions.onOpen?.(e)}
                onBuildFromPlan={
                  showBuild ? () => void actions.onBuildFromPlan?.(e) : undefined
                }
              />
            );
          }
          if (!hasDiff && siblingHasDiff) return null;
          return (
            <ChatFileEditCard key={e.id} edit={e} variant="dock" actions={actions} />
          );
        }
        return null;
      })}
    </div>
  );
}

export function ChatAssistantContent({
  content,
  onContentPatch,
  suppressFileEdits,
  agentTurn,
}: {
  content: string;
  /** Accept 成功后写回会话历史（折叠围栏 + 【工作区已写入】） */
  onContentPatch?: (nextContent: string) => void | Promise<void>;
  /** 请求失败等：禁止解析 Diff/待应用卡片 */
  suppressFileEdits?: boolean;
  /** 持久化过程轨迹（优先于正文内 stream-events） */
  agentTurn?: AgentTurnMeta | null;
}) {
  // 旧回合 / CLI 报告：展示层再 shape（有 backend 或报告特征即可，不单靠当前 mode）
  // 只读/Ask：禁止 shape 成 Edit 卡（底栏 Agent 也不例外）
  const shapedForDisplay = useMemo(() => {
    if (suppressFileEdits) return null;
    let source = content;
    // 旧数据：用户方案被误塞进 <thinking> → 拉回外露再 shape
    const think = content.match(/<thinking>([\s\S]*?)<\/thinking>/i);
    if (think?.[1] && looksLikeUserFacingAnswer(think[1])) {
      const rest = content.replace(/<thinking>[\s\S]*?<\/thinking>/i, "").trim();
      source = [think[1].trim(), rest.replace(/^已完成。\s*$/m, "").trim()]
        .filter(Boolean)
        .join("\n\n");
    } else if (/<thinking>/i.test(content)) {
      return null;
    }
    const mode = getWorkbenchInteractionMode();
    const agentish =
      mode === "agent" ||
      Boolean(agentTurn?.backend) ||
      Boolean(agentTurn?.writtenPaths?.length) ||
      Boolean(agentTurn?.streamEvents?.length) ||
      looksLikeAgentTurnReport(source) ||
      looksLikeUserFacingAnswer(source);
    if (!agentish) return null;
    // 直播中仅有 streamEvents 时不要 shape（避免边跑边把正文折进 Thought）；
    // 收尾后有 backend / 写盘 / 报告特征再 shape。
    if (
      !looksLikeAgentTurnReport(source) &&
      !looksLikeUserFacingAnswer(source) &&
      !agentTurn?.writtenPaths?.length &&
      !agentTurn?.backend
    ) {
      return null;
    }
    // 仅信任本轮 agentTurn 写盘/工具证据；禁止仅凭正文「像报告」就 shape 出 Edit 卡
    const written = agentTurn?.writtenPaths?.length ? agentTurn.writtenPaths : [];
    if (
      !written.length &&
      !agentTurn?.backend &&
      !looksLikeAgentTurnReport(source)
    ) {
      return null;
    }
    return shapeAgentTurnDisplay({
      content: source,
      streamEvents: agentTurn?.streamEvents,
      writtenPaths: written,
      verified: agentTurn?.verified,
      summary: agentTurn?.summary,
    });
  }, [agentTurn, content, suppressFileEdits]);




  const renderContent = shapedForDisplay?.content ?? content;

  const streamEvents = useMemo(
    () =>
      mergeStreamEvents(
        shapedForDisplay?.streamEvents,
        agentTurn?.streamEvents,
        parseStreamEventsBlock(renderContent),
        trailLinesToStreamEvents(renderContent),
      ),
    [agentTurn?.streamEvents, shapedForDisplay?.streamEvents, renderContent],
  );
  const streamTools = useMemo(
    () => dedupeToolItems(streamEventsToToolItems(streamEvents)),
    [streamEvents],
  );
  const contentWithoutEvents = useMemo(
    () => stripStreamEventsBlock(renderContent),
    [renderContent],
  );
  const { edits: parsedEdits, stripped } = useMemo(() => {
    if (suppressFileEdits) {
      return { edits: [] as ChatFileEdit[], stripped: contentWithoutEvents };
    }
    return parseChatFileEdits(contentWithoutEvents);
  }, [contentWithoutEvents, suppressFileEdits]);
  const [edits, setEdits] = useState(parsedEdits);
  const [rejectedPaths, setRejectedPaths] = useState<string[]>([]);
  useEffect(() => {
    if (suppressFileEdits) {
      setEdits([]);
      setRejectedPaths([]);
      return;
    }
    const patches = agentTurn?.filePatches || [];
    const written = [...(agentTurn?.writtenPaths || [])].flatMap((p) =>
      splitWorkspaceEditPaths(p),
    );
    const seq = { n: 20_000 };
    const fromTurn: ChatFileEdit[] = [];
    const seen = new Set(parsedEdits.map((e) => e.path.replace(/\\/g, "/")));
    // 优先真 Diff 卡（filePatches）；无补丁时回落路径摘要
    for (const patch of patches) {
      const n = String(patch.path || "").replace(/\\/g, "/");
      if (!n || seen.has(n)) continue;
      seen.add(n);
      fromTurn.push(editFromFilePatch(patch, seq));
    }
    for (const path of written) {
      const n = path.replace(/\\/g, "/");
      if (!n || seen.has(n)) continue;
      seen.add(n);
      fromTurn.push(summaryEditForPath(n, seq, { applied: true }));
    }
    const seed = dedupeEditsByPath([...parsedEdits, ...fromTurn]);
    setEdits(seed);
    setRejectedPaths([]);
    // Plan 产物出现即挂 Composer 底栏（对齐 Cursor 方案条，Accept 前也可 Open/Build）
    const planHit = seed.find((e) => isPlanDocumentPath(e.path));
    if (planHit) {
      void import("@/lib/workbench-composer-turn-footer").then(({ trackComposerCanvasPlan }) => {
        trackComposerCanvasPlan(planHit.path);
      });
    }
    let cancelled = false;
    void enrichEditsAgainstDisk(seed).then((next) => {
      if (!cancelled) setEdits(next);
    });
    return () => {
      cancelled = true;
    };
  }, [
    parsedEdits,
    agentTurn?.writtenPaths,
    agentTurn?.filePatches,
    renderContent,
    suppressFileEdits,
  ]);

  const editsForUi = useMemo(() => {
    if (!rejectedPaths.length) return edits;
    const set = new Set(rejectedPaths);
    return edits.map((e) =>
      set.has(e.path) ? { ...e, status: "rejected" as const } : e,
    );
  }, [edits, rejectedPaths]);

  const actions = useFileEditActions({
    content,
    edits: editsForUi,
    filePatches: agentTurn?.filePatches,
    onContentPatch,
    onRejectedPaths: (paths) =>
      setRejectedPaths((prev) => [...new Set([...prev, ...paths])]),
    onUnrejectedPaths: (paths) =>
      setRejectedPaths((prev) => prev.filter((p) => !paths.includes(p))),
  });
  const blocks = useMemo(() => parseAssistantContent(stripped), [stripped]);

  // 正文 tool 行与 streamEvents 合并去重（不再互斥丢掉一方）
  const cursorUnits = useMemo(() => {
    const used = new Set<string>();
    const pool = buildEditPool(editsForUi);
    const seq = { n: 10_000 };
    return groupAgentTurnUnits(blocks, editsForUi, pool, used, seq, streamTools);
  }, [blocks, editsForUi, streamTools]);

  const agentMode = getWorkbenchInteractionMode() === "agent";
  const frozenFooter = agentTurn?.turnFooter;
  const showFrozenSignals = Boolean(frozenFooter?.canvas || frozenFooter?.terminals?.length);
  return (
    <div className="flex flex-col gap-2">
      <DockAssistantContent units={cursorUnits} actions={actions} agentMode={agentMode} />
      {showFrozenSignals ? (
        <ComposerTurnFooterPanel
          canvas={frozenFooter?.canvas}
          terminals={frozenFooter?.terminals}
        />
      ) : null}
    </div>
  );
}
