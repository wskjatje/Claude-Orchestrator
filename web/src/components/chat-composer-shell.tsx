import { ArrowUp, Paperclip, StopCircle, X } from "lucide-react";
import type { ClipboardEvent, RefObject } from "react";
import { ChatAgentSelector } from "@/components/chat-agent-selector";
import { ChatModelSelector, type ModelPick } from "@/components/chat-model-selector";
import { ComposerTerminalAttachments } from "@/components/composer-terminal-attachments";
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
  placeholder: string;
  disabled: boolean;
  workflowBusy: boolean;
  hasDesktopApi: boolean;
  canSend: boolean;
  pendingImages: (UserImageAttachment & { id: string })[];
  onRemoveImage: (id: string) => void;
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

/** Cursor 式 Composer 主体（底栏与顶部内联编辑共用） */
export function ChatComposerShell({
  textareaRef,
  input,
  onInputChange,
  onSend,
  onStop,
  onPaste,
  placeholder,
  disabled,
  workflowBusy,
  hasDesktopApi,
  canSend,
  pendingImages,
  onRemoveImage,
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

  return (
    <div
      className={cn(
        "chat-composer-cursor overflow-hidden rounded-xl border border-border/80 bg-background/80 shadow-sm transition focus-within:border-primary/35",
        editHistoryActive && "ring-1 ring-primary/20",
        inline && "chat-composer-cursor--inline",
      )}
    >
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

      <div className="chat-composer-body px-3 pt-2.5">
        {pendingImages.length > 0 ? (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingImages.map((img) => (
              <div
                key={img.id}
                className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-border/70 bg-muted/20"
              >
                <img src={img.dataUrl} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  className="absolute right-0.5 top-0.5 rounded-full bg-background/90 p-0.5 opacity-0 shadow-sm transition group-hover:opacity-100"
                  onClick={() => onRemoveImage(img.id)}
                  aria-label="移除图片"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        <ComposerTerminalAttachments
          snippets={pendingTerminalSnippets}
          onRemove={onRemoveTerminalSnippet}
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
          className="scrollbar-thin box-border block w-full min-w-0 resize-none bg-transparent py-1.5 text-[13px] leading-relaxed outline-none placeholder:text-muted-foreground/75 disabled:opacity-60"
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
            title="添加文件或图片"
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
              <StopCircle className="h-3.5 w-3.5" />
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
    </div>
  );
}
