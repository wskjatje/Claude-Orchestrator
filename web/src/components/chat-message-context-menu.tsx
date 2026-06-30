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
  rowRef: RefObject<HTMLDivElement | null>;
  content: string;
  disabled?: boolean;
  hasDesktopApi?: boolean;
  onWriteToWorkspace?: (content: string) => void;
  onGenerateChain?: (content: string) => void;
  children: ReactNode;
};

/** 聊天气泡右键：复制 / 写入工作区 / 从本条生成任务链 */
export function ChatMessageContextMenu({
  rowRef,
  content,
  disabled,
  hasDesktopApi,
  onWriteToWorkspace,
  onGenerateChain,
  children,
}: ChatMessageContextMenuProps) {
  const actionable =
    !disabled && typeof content === "string" && content.trim().length > 0 && content !== "__WAITING__";

  const canChain = useMemo(() => {
    if (!actionable || !hasDesktopApi || !onGenerateChain) return false;
    return parseActiveChainFromBubbleText(content).ok;
  }, [actionable, content, hasDesktopApi, onGenerateChain]);

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
        {hasDesktopApi && onWriteToWorkspace ? (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onSelect={() => onWriteToWorkspace(content)}>
              将本条气泡写入工作区
            </ContextMenuItem>
            {canChain && onGenerateChain ? (
              <ContextMenuItem onSelect={() => onGenerateChain(content)}>
                从本条生成任务链
              </ContextMenuItem>
            ) : null}
          </>
        ) : null}
      </ContextMenuContent>
    </ContextMenu>
  );
}
