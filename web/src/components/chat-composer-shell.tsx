import { ArrowUp, Paperclip, Square, X } from "lucide-react";
import { useState, type ClipboardEvent, type DragEvent, type RefObject } from "react";
import { ChatAgentSelector } from "@/components/chat-agent-selector";
import { ChatModelSelector, type ModelPick } from "@/components/chat-model-selector";
import { ComposerFileAttachments, type PendingFileEntry } from "@/components/composer-file-attachments";
import { ComposerTerminalAttachments } from "@/components/composer-terminal-attachments";
import { ImageLightbox } from "@/components/image-lightbox";
import { cn } from "@/lib/utils";
import type { PendingTerminalSnippet } from "@/lib/chat-terminal-paste";
import type { UserImageAttachment } from "@/lib/ollama-messages";

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
}: ChatComposerShellProps) {
  const inline = variant === "inline";
  const [dragOver, setDragOver] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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

  const hasAttachments = pendingImages.length > 0 || pendingFiles.length > 0;

  return (
    <div
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

      {editHistoryActive ? (
        <div className="chat-composer-edit-banner flex items-center justify-between gap-2 border-b border-border/60 bg-muted/20 px-3 py-1.5 text-[11.5px] text-foreground">
          <span>{inline ? "编辑此提问 · 发送后将从此处重新对话" : "正在编辑历史消息 · 发送后将从此处重新对话"}</span>
          <button
            type="button"
            className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
            onClick={onCancelEdit}
          >
            <X className="h-3 w-3" />
            取消
          </button>
        </div>
      ) : null}

      <div className={cn("chat-composer-body px-3", hasAttachments ? "pt-2.5" : "pt-3")}>
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

        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => onInputChange(e.target.value)}
          onPaste={onPaste}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (!workflowBusy && canSend) onSend();
            }
          }}
          placeholder={placeholder}
          rows={1}
          disabled={disabled}
          className="scrollbar-thin box-border block w-full min-w-0 resize-none bg-transparent py-1.5 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/60 disabled:opacity-60"
          style={{ minHeight: "28px", maxHeight: inline ? "180px" : "220px" }}
        />
      </div>

      <div className="composer-cursor-footer flex min-w-0 items-center gap-1 px-2 pb-2 pt-0.5">
        <div className="composer-cursor-controls flex min-w-0 flex-1 items-center gap-0.5 overflow-visible">
          <ChatAgentSelector
            agentBasename={localAgentBasename}
            onAgentChange={onAgentChange}
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
