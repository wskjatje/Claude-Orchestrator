import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type ChatCursorCollapsibleProps = {
  lineCount: number;
  collapseAfterLines?: number;
  children: ReactNode;
  bodyClassName?: string;
  /** 受控展开（与文件卡片头部 chevron 联动） */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  /** 隐藏底部 chevron，仅配合外部头部切换 */
  hideToggle?: boolean;
};

/** Cursor 式：默认收起约 4 行，底部 overlay chevron 或头部 chevron 展开 */
export function ChatCursorCollapsible({
  lineCount,
  collapseAfterLines = 4,
  children,
  bodyClassName,
  expanded: expandedProp,
  onExpandedChange,
  hideToggle = false,
}: ChatCursorCollapsibleProps) {
  const [expandedLocal, setExpandedLocal] = useState(false);
  const expanded = expandedProp ?? expandedLocal;
  const setExpanded = onExpandedChange ?? setExpandedLocal;
  const collapsible = lineCount > collapseAfterLines;

  const toggle = () => {
    if (!collapsible) return;
    setExpanded(!expanded);
  };

  if (!collapsible) {
    return <div className={cn("chat-cursor-collapsible-body", bodyClassName)}>{children}</div>;
  }

  return (
    <div
      className={cn(
        "chat-cursor-collapsible",
        !expanded && "chat-cursor-collapsible--collapsed",
        expanded && "chat-cursor-collapsible--expanded",
      )}
    >
      <div
        className={cn(
          "chat-cursor-collapsible-body",
          bodyClassName,
          !expanded && "chat-cursor-collapsible-body--collapsed",
          expanded && "chat-cursor-collapsible-body--expanded",
        )}
      >
        {children}
      </div>
      {!hideToggle ? (
        <button
          type="button"
          className="chat-cursor-collapsible-toggle"
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={expanded ? "收起" : "展开全部"}
        >
          <ChevronDown
            className={cn(
              "chat-cursor-collapsible-chevron",
              expanded && "chat-cursor-collapsible-chevron--open",
            )}
          />
        </button>
      ) : null}
    </div>
  );
}

/** 文件卡片头部左侧 chevron（Cursor 式） */
export function ChatCursorCollapsibleChevron({
  expanded,
  collapsible,
}: {
  expanded: boolean;
  collapsible: boolean;
}) {
  if (!collapsible) {
    return <span className="chat-file-edit-card-chevron-spacer" aria-hidden />;
  }
  return (
    <ChevronRight
      className={cn(
        "chat-file-edit-card-head-chevron",
        expanded && "chat-file-edit-card-head-chevron--open",
      )}
      aria-hidden
    />
  );
}

export function useCursorCollapsibleState(lineCount: number, collapseAfterLines = 4) {
  const [expanded, setExpanded] = useState(false);
  const collapsible = lineCount > collapseAfterLines;
  return { expanded, setExpanded, collapsible, toggle: () => collapsible && setExpanded((v) => !v) };
}
