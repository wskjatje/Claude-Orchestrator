import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowUp, MoreHorizontal, Paperclip, Square, X } from "lucide-react";
import {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
  useSyncExternalStore,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
  type RefObject,
} from "react";
import { ChatModelSelector, type ModelPick } from "@/components/chat-model-selector";
import { ComposerSessionChip } from "@/components/composer-session-chip";
import { ComposerOrchHint } from "@/components/composer-orch-hint";
import { CodeIndexChip, GraphifyChip } from "@/components/chat/composer-chips";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ComposerFileAttachments, type PendingFileEntry } from "@/components/composer-file-attachments";
import {
  ComposerTerminalAttachments,
  type PendingTerminalSnippet,
} from "@/components/composer-terminal-attachments";
import { ComposerDomAttachments } from "@/components/composer-dom-attachments";
import { ImageLightbox } from "@/components/image-lightbox";
import { useGraphifyHealth } from "@/lib/use-graphify-status";
import { cn } from "@/lib/utils";
import { modelSupportsChatVision } from "@/lib/chat-image-attach";
import type { PendingDomElement } from "@/lib/dom-element-meta";
import type { UserImageAttachment } from "@/lib/ollama-messages";
import { getDesktop } from "@/lib/desktop-api";
import {
  detectAtMentionAtCursor,
  formatAtMentionLabel,
  groupCodebaseHits,
  loadComposerMentionPaths,
  matchAtMentionQuery,
  type CodebaseHit,
} from "@/lib/composer-at-mention";
import { useWorkbenchWorkspaceOptional } from "@/contexts/workbench-workspace-context";
import { setPendingLineGoto } from "@/lib/codemirror-pending-goto";
import {
  getCodebaseInjectPaths,
  setCodebaseInjectQuery,
  subscribeCodebaseInject,
  toggleCodebaseInjectPath,
} from "@/lib/codebase-inject-selection";

export type ChatComposerShellProps = {
  textareaRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  onInputChange: (v: string) => void;
  onSend: () => void;
  onStop: () => void;
  onPaste: (e: ClipboardEvent<HTMLTextAreaElement>) => void;
  /** 拖拽文件/图片到 Composer */
  onDropFiles?: (files: File[], cursor: number) => void;
  placeholder: string;
  disabled: boolean;
  workflowBusy: boolean;
  hasDesktopApi: boolean;
  canSend: boolean;
  pendingImages: (UserImageAttachment & { id: string })[];
  onRemoveImage: (id: string) => void;
  pendingFiles: PendingFileEntry[];
  onRemoveFile: (id: string) => void;
  pendingTerminalSnippets: PendingTerminalSnippet[];
  onRemoveTerminalSnippet: (id: string) => void;
  pendingDomElements: PendingDomElement[];
  onRemoveDomElement: (id: string) => void;
  onPickFiles: (opts?: { onlyImages?: boolean }) => void;
  orchMode: "claude-code" | "local-mcp";
  localAgentBasename: string;
  onAgentChange: (basename: string) => void;
  cloudModels: string[];
  localModels: string[];
  modelValue: string;
  modelFallback: string;
  onModelPick: (pick: ModelPick) => void;
  editHistoryActive?: boolean;
  onCancelEdit?: () => void;
  /** 顶部内联编辑 vs 底部 dock */
  variant?: "dock" | "inline";
  /** @ 补全优先路径（如最近打开的编辑器文件） */
  mentionPriorityPaths?: string[];
  /** 本轮可选注入的 Skill stem（空 = 不改发送路径） */
  selectedSkillStems?: string[];
  onSelectedSkillStemsChange?: (stems: string[]) => void;
};

/** Composer 主体（底栏与顶部内联编辑共用） */
export function ChatComposerShell({
  textareaRef,
  input,
  onInputChange,
  onSend,
  onStop,
  onPaste,
  onDropFiles,
  placeholder,
  disabled,
  workflowBusy,
  hasDesktopApi,
  canSend,
  pendingImages,
  onRemoveImage,
  pendingFiles,
  onRemoveFile,
  pendingTerminalSnippets,
  onRemoveTerminalSnippet,
  pendingDomElements,
  onRemoveDomElement,
  onPickFiles,
  orchMode,
  localAgentBasename,
  onAgentChange,
  cloudModels,
  localModels,
  modelValue,
  modelFallback,
  onModelPick,
  editHistoryActive,
  onCancelEdit,
  variant = "dock",
  mentionPriorityPaths = [],
  selectedSkillStems = [],
  onSelectedSkillStemsChange,
}: ChatComposerShellProps) {
  const inline = variant === "inline";
  const [dragOver, setDragOver] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const { health: graphHealth, buildGraph, openGraphHtml } = useGraphifyHealth();
  const [codeIndex, setCodeIndex] = useState<{
    ready: boolean | null;
    hybrid: boolean;
    chunkCount?: number;
    error?: string | null;
    ensuring?: boolean;
  }>({ ready: null, hybrid: false });
  const [mentionPaths, setMentionPaths] = useState<string[]>([]);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionHits, setMentionHits] = useState<string[]>([]);
  const [mentionIdx, setMentionIdx] = useState(0);
  const [codebasePreview, setCodebasePreview] = useState<
    { query: string; groups: ReturnType<typeof groupCodebaseHits> } | null
  >(null);
  const mentionRangeRef = useRef<{ start: number; end: number } | null>(null);
  const codebaseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const priorityKey = mentionPriorityPaths.join("\0");
  const ws = useWorkbenchWorkspaceOptional();
  const codebaseSelected = useSyncExternalStore(
    subscribeCodebaseInject,
    getCodebaseInjectPaths,
    getCodebaseInjectPaths,
  );

  const refreshMentionPaths = () => {
    if (!hasDesktopApi) return;
    void loadComposerMentionPaths(getDesktop(), mentionPriorityPaths).then(setMentionPaths);
  };

  useEffect(() => {
    refreshMentionPaths();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- priorityKey 已概括数组
  }, [hasDesktopApi, priorityKey]);

  const refreshCodeIndex = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceCodeIndexStatus) {
      setCodeIndex({ ready: false, hybrid: false, error: "索引接口不可用" });
      return;
    }
    try {
      const st = await api.workspaceCodeIndexStatus();
      setCodeIndex({
        ready: Boolean(st?.ready),
        hybrid: Boolean(st?.hybrid),
        chunkCount: st?.chunkCount,
        error: st?.error || null,
        ensuring: false,
      });
    } catch (e) {
      setCodeIndex({
        ready: false,
        hybrid: false,
        error: e instanceof Error ? e.message : String(e),
        ensuring: false,
      });
    }
  }, []);

  useEffect(() => {
    if (!hasDesktopApi) return;
    void refreshCodeIndex();
  }, [hasDesktopApi, refreshCodeIndex]);

  const ensureCodeIndex = useCallback(async () => {
    const api = getDesktop();
    if (!api?.workspaceCodeIndexEnsureHybrid) {
      setCodeIndex((c) => ({ ...c, error: "EnsureHybrid 不可用" }));
      return;
    }
    setCodeIndex((c) => ({ ...c, ensuring: true, error: null }));
    try {
      const r = await api.workspaceCodeIndexEnsureHybrid({});
      if (!r?.ok) {
        setCodeIndex((c) => ({
          ...c,
          ensuring: false,
          error: r?.error || "索引构建失败",
        }));
        await refreshCodeIndex();
        return;
      }
      setCodeIndex({
        ready: true,
        hybrid: Boolean(r.hybrid),
        chunkCount: r.chunkCount,
        ensuring: false,
        error: null,
      });
    } catch (e) {
      setCodeIndex((c) => ({
        ...c,
        ensuring: false,
        error: e instanceof Error ? e.message : String(e),
      }));
    }
  }, [refreshCodeIndex]);

  const scheduleCodebasePreview = (query: string) => {
    if (codebaseTimerRef.current) clearTimeout(codebaseTimerRef.current);
    const q = query.trim();
    if (!q || !hasDesktopApi) {
      setCodebasePreview(null);
      return;
    }
    setCodebaseInjectQuery(q);
    codebaseTimerRef.current = setTimeout(() => {
      const api = getDesktop();
      if (!api?.workspaceRipgrep && !api?.workspaceCodeIndexSearch) return;
      void Promise.all([
        api.workspaceRipgrep
          ? api.workspaceRipgrep({ query: q, maxResults: 24 })
          : Promise.resolve(null),
        api.workspaceCodeIndexSearch
          ? api.workspaceCodeIndexSearch({ query: q, maxResults: 12 })
          : Promise.resolve(null),
      ]).then(([rg, sem]) => {
        const merged = new Map<string, CodebaseHit>();
        for (const h of (sem?.hits || []) as CodebaseHit[]) {
          const key = `${h.relPath}:${h.line}`;
          if (!merged.has(key)) merged.set(key, h);
        }
        for (const h of (rg?.hits || []) as CodebaseHit[]) {
          const key = `${h.relPath}:${h.line}`;
          if (!merged.has(key)) merged.set(key, h);
        }
        setCodebasePreview({
          query: q,
          groups: groupCodebaseHits([...merged.values()]),
        });
      });
    }, 280);
  };

  const updateMentionFromInput = (value: string, cursor: number) => {
    const at = detectAtMentionAtCursor(value, cursor);
    if (!at || !mentionPaths.length) {
      setMentionOpen(false);
      mentionRangeRef.current = null;
      setCodebasePreview(null);
      return;
    }
    const hits = matchAtMentionQuery(mentionPaths, at.query);
    setMentionHits(hits);
    setMentionIdx(0);
    setMentionOpen(hits.length > 0);
    mentionRangeRef.current = { start: at.start, end: cursor };
    const m = at.query.match(/^codebase:?([\s\S]*)$/i);
    if (m) scheduleCodebasePreview(m[1] || "");
    else setCodebasePreview(null);
  };

  const insertMention = (path: string) => {
    const range = mentionRangeRef.current;
    if (!range) return;
    // codebase：插入 @codebase: 并把光标留在冒号后，便于继续敲关键词
    const isCodebaseBare = path === "codebase";
    const token = isCodebaseBare ? "codebase:" : path;
    const suffix = isCodebaseBare ? "" : " ";
    const next = `${input.slice(0, range.start)}@${token}${suffix}${input.slice(range.end)}`;
    onInputChange(next);
    setMentionOpen(false);
    mentionRangeRef.current = null;
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (!el) return;
      const pos = range.start + 1 + token.length + suffix.length;
      el.focus();
      el.setSelectionRange(pos, pos);
    });
  };

  const onComposerKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (mentionOpen && mentionHits.length) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIdx((i) => (i + 1) % mentionHits.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIdx((i) => (i - 1 + mentionHits.length) % mentionHits.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        insertMention(mentionHits[mentionIdx]!);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setMentionOpen(false);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!workflowBusy && canSend) onSend();
    }
  };

  const handleDragOver = (e: DragEvent) => {
    if (!onDropFiles || disabled || workflowBusy) return;
    if (!Array.from(e.dataTransfer.types).some((t) => t === "Files" || t === "application/x-moz-file")) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    setDragOver(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setDragOver(false);
  };

  const handleDrop = (e: DragEvent) => {
    setDragOver(false);
    if (!onDropFiles || disabled || workflowBusy) return;
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files ?? []);
    if (!files.length) return;
    const cursor = textareaRef.current?.selectionStart ?? input.length;
    onDropFiles(files, cursor);
  };

  const visionUnsupported = useMemo(() => {
    if (!pendingImages.length) return false;
    const v = modelValue || modelFallback || "";
    if (!v || v.toLowerCase() === "auto") return false;
    return !modelSupportsChatVision({ orchMode, modelId: v });
  }, [pendingImages.length, orchMode, modelValue, modelFallback]);

  return (
    <div
      data-workbench-composer=""
      className={cn(
        "chat-composer-cursor relative overflow-hidden rounded-xl border bg-background shadow-sm transition-all",
        dragOver
          ? "border-primary/60 ring-2 ring-primary/15"
          : "border-border/80 focus-within:border-primary/35",
        editHistoryActive && "ring-1 ring-primary/20",
        inline && "chat-composer-cursor--inline",
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 拖拽高亮蒙层 */}
      {dragOver && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/5">
          <div className="flex flex-col items-center gap-1.5 rounded-xl border-2 border-dashed border-primary/40 px-6 py-3">
            <ArrowUp className="h-5 w-5 rotate-180 text-primary/60" />
            <span className="text-[12px] font-medium text-primary/70">拖放图片或文件到此处</span>
          </div>
        </div>
      )}

      {/* 模型不支持视觉时的提示 */}
      {visionUnsupported ? (
        <div className="flex items-start gap-1.5 border-b border-amber-400/20 bg-amber-500/6 px-3 py-1.5 text-[11.5px] text-amber-700 dark:text-amber-300">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          <span>当前模型不支持图片。可切换支持视觉的模型（如 Claude Sonnet、Gemini），或移除图片后发送。</span>
        </div>
      ) : null}

      {editHistoryActive ? (
        <div className="chat-composer-edit-banner flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-3 py-1.5 text-[11.5px] text-foreground">
          <span>{inline ? "编辑此提问 · 发送后将从此处重新对话" : "正在编辑历史消息 · 发送后将从此处重新对话"}</span>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[12px] font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            onClick={onCancelEdit}
          >
            <X className="h-3 w-3" />
            取消
          </button>
        </div>
      ) : null}

      <div className="chat-composer-body px-3 pt-2.5">
        {/* 图片缩略图 — 56×56，无文件名，X 在图片上方 */}
        {pendingImages.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {pendingImages.map((img) => (
              <div
                key={img.id}
                className="group/img relative shrink-0 cursor-pointer overflow-hidden rounded-md border border-border/60 bg-muted/10 transition-shadow hover:shadow-sm"
                title={img.name || "图片"}
                onClick={() => setLightboxSrc(img.dataUrl)}
              >
                <img
                  src={img.dataUrl}
                  alt={img.name || ""}
                  className="h-14 w-14 object-cover"
                />
                {/* 删除按钮 — 图片右上角半透明圆形 */}
                <button
                  type="button"
                  className="absolute right-1 top-1 flex h-[18px] w-[18px] items-center justify-center rounded-full bg-black/45 text-white/90 opacity-0 shadow transition hover:bg-black/65 group-hover/img:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(img.id);
                  }}
                  aria-label="移除图片"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {/* 非图片文件 chip — 带 File 图标的 pill */}
        <ComposerFileAttachments files={pendingFiles} onRemove={onRemoveFile} className="mb-2" />

        <ComposerTerminalAttachments
          snippets={pendingTerminalSnippets}
          onRemove={onRemoveTerminalSnippet}
          className="!px-0 !pt-0 !pb-0 mb-2"
        />
        <ComposerDomAttachments
          elements={pendingDomElements}
          onRemove={onRemoveDomElement}
          className="!px-0 !pt-0 !pb-0 mb-2"
        />

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              const v = e.target.value;
              onInputChange(v);
              updateMentionFromInput(v, e.target.selectionStart ?? v.length);
            }}
            onClick={(e) => {
              const t = e.currentTarget;
              updateMentionFromInput(t.value, t.selectionStart ?? t.value.length);
            }}
            onFocus={() => refreshMentionPaths()}
            onPaste={onPaste}
            onKeyDown={onComposerKeyDown}
            placeholder={placeholder}
            rows={1}
            disabled={disabled}
            className="scrollbar-thin box-border block w-full min-w-0 resize-none bg-transparent py-1.5 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground disabled:opacity-60"
            style={{ minHeight: "28px", maxHeight: inline ? "180px" : "220px" }}
          />
          {mentionOpen && mentionHits.length > 0 && !codebasePreview?.query ? (
            <ul
              className="absolute bottom-full left-0 z-20 mb-1 max-h-48 w-full max-w-md overflow-auto rounded-md border border-border/80 bg-popover py-1 text-[12px] shadow-md"
              role="listbox"
            >
              {mentionHits.map((p, i) => (
                <li key={p}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === mentionIdx}
                    className={cn(
                      "flex w-full px-2.5 py-1 text-left font-mono hover:bg-muted/60",
                      i === mentionIdx && "bg-muted/50",
                    )}
                    onMouseDown={(ev) => {
                      ev.preventDefault();
                      insertMention(p);
                    }}
                  >
                    {formatAtMentionLabel(p)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {codebasePreview && codebasePreview.query ? (
            <div className="absolute bottom-full left-0 z-20 mb-1 max-h-56 w-full max-w-lg overflow-auto rounded-md border border-border/80 bg-popover px-2 py-1.5 text-[12px] shadow-md">
              <p className="mb-1 text-[12px] text-muted-foreground">
                @{`codebase:${codebasePreview.query}`} ·{" "}
                {codebasePreview.groups.length
                  ? `${codebasePreview.groups.length} 个文件`
                  : "无匹配"}
                {codebaseSelected.size
                  ? ` · 已选 ${codebaseSelected.size}（仅注入所选）`
                  : " · 勾选文件可限制注入"}
              </p>
              {codebasePreview.groups.slice(0, 8).map((g) => (
                <details key={g.relPath} className="mb-0.5" open={codebasePreview.groups.length <= 3}>
                  <summary className="flex cursor-pointer items-center gap-1.5 font-mono text-foreground/90">
                    <input
                      type="checkbox"
                      checked={codebaseSelected.has(g.relPath)}
                      onChange={() => toggleCodebaseInjectPath(g.relPath)}
                      onClick={(ev) => ev.stopPropagation()}
                      aria-label={`注入 ${g.relPath}`}
                    />
                    <span>
                      {g.relPath}
                      <span className="ml-1 text-muted-foreground">({g.lines.length})</span>
                    </span>
                  </summary>
                  <ul className="mt-0.5 space-y-0.5 pl-2 font-mono text-[11px] text-muted-foreground">
                    {g.lines.map((l) => (
                      <li key={`${g.relPath}:${l.line}`}>
                        <button
                          type="button"
                          className="text-left hover:underline"
                          onMouseDown={(ev) => {
                            ev.preventDefault();
                            setPendingLineGoto(g.relPath, l.line, 1);
                            void ws?.openFile?.(g.relPath);
                          }}
                        >
                          L{l.line}: {l.text.slice(0, 80)}
                        </button>
                      </li>
                    ))}
                  </ul>
                </details>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className="composer-cursor-footer flex min-w-0 items-center gap-1 px-2 pb-2 pt-0">
        <div className="composer-cursor-controls flex min-w-0 flex-1 items-center gap-0.5 overflow-visible">
          <ComposerSessionChip
            agentBasename={localAgentBasename}
            onAgentChange={onAgentChange}
            selectedSkillStems={selectedSkillStems}
            onSelectedSkillStemsChange={onSelectedSkillStemsChange}
            disabled={!hasDesktopApi || workflowBusy}
          />
          <ChatModelSelector
            orchMode={orchMode}
            cloudModels={cloudModels}
            localModels={localModels}
            modelValue={modelValue}
            onModelPick={onModelPick}
            modelFallback={modelFallback}
            disabled={!hasDesktopApi || workflowBusy}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "composer-chrome-chip relative",
                  (graphHealth.needsUpdate ||
                    graphHealth.buildError ||
                    graphHealth.cli === false ||
                    codeIndex.ready === false) &&
                    "text-amber-700 dark:text-amber-300",
                )}
                title={
                  graphHealth.buildError
                    ? `扩展 · 图谱：${graphHealth.buildError}`
                    : graphHealth.needsUpdate
                      ? "扩展 · 结构索引陈旧，请更新图谱"
                      : graphHealth.cli === false
                        ? "扩展 · 未安装 graphify"
                        : codeIndex.ready === false
                          ? "扩展 · 语义索引未就绪"
                          : "扩展"
                }
                aria-label="扩展：MCP 与图谱"
                disabled={workflowBusy}
              >
                <MoreHorizontal className="h-3 w-3" />
                {graphHealth.needsUpdate ||
                graphHealth.buildError ||
                graphHealth.cli === false ||
                codeIndex.ready === false ? (
                  <span
                    className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full bg-amber-500"
                    aria-hidden
                  />
                ) : null}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[min(100vw-2rem,18rem)] p-2">
              <DropdownMenuLabel className="px-1 text-[12px] font-medium text-muted-foreground">
                扩展
              </DropdownMenuLabel>
              <div className="flex flex-wrap items-center gap-1 px-0.5 py-1">
                <ComposerOrchHint orchMode={orchMode} />
                <GraphifyChip
                  graphJson={graphHealth.graphJson}
                  graphHtml={graphHealth.graphHtml}
                  needsUpdate={graphHealth.needsUpdate}
                  cli={graphHealth.cli}
                  building={graphHealth.building}
                  buildError={graphHealth.buildError}
                  onOpen={openGraphHtml}
                  onBuild={buildGraph}
                />
                <CodeIndexChip
                  ready={codeIndex.ready}
                  hybrid={codeIndex.hybrid}
                  chunkCount={codeIndex.chunkCount}
                  ensuring={codeIndex.ensuring}
                  error={codeIndex.error}
                  onEnsure={ensureCodeIndex}
                />
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/chains" search={{ q: "" }}>
                  任务链
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/comms">MCP 连接</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            title="添加文件"
            disabled={!hasDesktopApi || workflowBusy}
            onClick={() => onPickFiles({ onlyImages: false })}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground transition hover:bg-secondary/80 hover:text-foreground disabled:opacity-40"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>

          {workflowBusy ? (
            <button
              type="button"
              onClick={onStop}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-destructive/40 bg-destructive/10 text-destructive transition hover:bg-destructive/15"
              title="停止"
            >
              <Square className="h-3.5 w-3.5" fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onSend}
              disabled={!canSend || !hasDesktopApi}
              className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition hover:opacity-90 disabled:opacity-35"
              title="发送 (Enter)"
            >
              <ArrowUp className="h-3.5 w-3.5" strokeWidth={2.25} />
            </button>
          )}
        </div>
      </div>

      <ImageLightbox
        src={lightboxSrc || ""}
        open={Boolean(lightboxSrc)}
        onClose={() => setLightboxSrc(null)}
      />
    </div>
  );
}
