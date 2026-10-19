import { useMemo, type ReactNode, type RefObject } from "react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { copyTextToClipboard } from "@/lib/copy-to-clipboard";
import { buildFenceOnlyWriteItems } from "@/lib/confirm-write";
import { parseActiveChainFromBubbleText } from "@/lib/parse-active-chain";
import { toast } from "sonner";

function copyShortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl+C";
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘C" : "Ctrl+C";
}

function selectAllShortcutLabel() {
  if (typeof navigator === "undefined") return "Ctrl+A";
  return /Mac|iPhone|iPad/i.test(navigator.platform) ? "⌘A" : "Ctrl+A";
}

function copyTextForMessage(content: string, container: HTMLElement | null): string {
  const selection = window.getSelection();
  const selected = selection?.toString().trim() ?? "";
  if (selected && container && selection?.rangeCount) {
    const node = selection.getRangeAt(0).commonAncestorContainer;
    if (container.contains(node)) return selected;
  }
  return content;
}

type ChatMessageContextMenuProps = {
  role: "user" | "assistant";
  rowRef: RefObject<HTMLDivElement | null>;
  content: string;
  disabled?: boolean;
  hasDesktopApi?: boolean;
  historyIndex?: number | null;
  onWriteToWorkspace?: (content: string) => void;
  onGenerateChain?: (content: string) => void;
  onEdit?: () => void;
  onResend?: () => void;
  onRetry?: () => void;
  children: ReactNode;
};

/**
 * 聊天气泡右键：按角色只暴露已接线能力（无灰项占位）。
 * - 用户：复制 / 全选 / 编辑 / 重发
 * - 助手：复制 / 全选 / 围栏写入 / 可解析时生成链 / 失败时可重试
 */
export function ChatMessageContextMenu({
  role,
  rowRef,
  content,
  disabled,
  hasDesktopApi,
  historyIndex,
  onWriteToWorkspace,
  onGenerateChain,
  onEdit,
  onResend,
  onRetry,
  children,
}: ChatMessageContextMenuProps) {
  const actionable =
    !disabled && typeof content === "string" && content.trim().length > 0 && content !== "__WAITING__";

  const canWriteFence = useMemo(() => {
    if (role !== "assistant" || !actionable || !hasDesktopApi || !onWriteToWorkspace) return false;
    return buildFenceOnlyWriteItems(content).length > 0;
  }, [role, actionable, content, hasDesktopApi, onWriteToWorkspace]);

  const canChain = useMemo(() => {
    if (role !== "assistant" || !actionable || !hasDesktopApi || !onGenerateChain) return false;
    return parseActiveChainFromBubbleText(content).ok;
  }, [role, actionable, content, hasDesktopApi, onGenerateChain]);

  const canEdit = role === "user" && actionable && historyIndex != null && typeof onEdit === "function";
  const canResend =
    role === "user" && actionable && historyIndex != null && typeof onResend === "function";
  const canRetry = role === "assistant" && actionable && typeof onRetry === "function";

  const onCopy = async () => {
    if (!actionable) return;
    const text = copyTextForMessage(content, rowRef.current);
    const ok = await copyTextToClipboard(text);
    if (ok) toast.success("已复制");
    else toast.error("复制失败");
  };

  const onSelectAll = () => {
    if (!actionable || !rowRef.current) return;
    const range = document.createRange();
    range.selectNodeContents(rowRef.current);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  if (!actionable) {
    return <>{children}</>;
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onSelect={() => void onCopy()}>
          复制
          <ContextMenuShortcut>{copyShortcutLabel()}</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onSelect={onSelectAll}>
          全选
          <ContextMenuShortcut>{selectAllShortcutLabel()}</ContextMenuShortcut>
        </ContextMenuItem>

        {role === "user" && (canEdit || canResend) ? (
          <>
            <ContextMenuSeparator />
            {canEdit ? (
              <ContextMenuItem onSelect={() => onEdit!()}>编辑此消息</ContextMenuItem>
            ) : null}
            {canResend ? (
              <ContextMenuItem onSelect={() => onResend!()}>重新发送</ContextMenuItem>
            ) : null}
          </>
        ) : null}

        {role === "assistant" && (canWriteFence || canChain || canRetry) ? (
          <>
            <ContextMenuSeparator />
            {canWriteFence ? (
              <ContextMenuItem onSelect={() => onWriteToWorkspace!(content)}>
                将本条气泡写入工作区
              </ContextMenuItem>
            ) : null}
            {canChain ? (
              <ContextMenuItem onSelect={() => onGenerateChain!(content)}>
                从本条生成任务链
              </ContextMenuItem>
            ) : null}
            {canRetry ? (
              <ContextMenuItem onSelect={() => onRetry!()}>重试本轮</ContextMenuItem>
            ) : null}
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}
