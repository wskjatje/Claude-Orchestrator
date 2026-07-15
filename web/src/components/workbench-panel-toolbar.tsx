import {
  MessageCircle,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  TerminalSquare,
} from "lucide-react";
import { focusBottomPanel } from "@/lib/workbench-panel-init";
import { cn } from "@/lib/utils";

/** 编辑器区右上角：侧栏 / 聊天 / 终端开关（与聊天顶栏高度、按钮语义一致） */
export function WorkbenchPanelToolbar({
  leftOpen,
  onLeftOpenChange,
  chatOpen,
  onChatOpenChange,
  terminalOpen,
  onTerminalOpenChange,
  className,
}: {
  leftOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  chatOpen: boolean;
  onChatOpenChange: (open: boolean) => void;
  terminalOpen: boolean;
  onTerminalOpenChange: (open: boolean) => void;
  className?: string;
}) {
  return (
    <div className={cn("workbench-panel-toolbar flex items-center gap-0.5", className)}>
      <ToolbarBtn
        pressed={leftOpen}
        onClick={() => onLeftOpenChange(!leftOpen)}
        title={leftOpen ? "隐藏文件树" : "显示文件树"}
        ariaLabel={leftOpen ? "隐藏文件树" : "显示文件树"}
      >
        {leftOpen ? <PanelLeftClose className="h-3.5 w-3.5" /> : <PanelLeftOpen className="h-3.5 w-3.5" />}
      </ToolbarBtn>
      <ToolbarBtn
        pressed={chatOpen}
        onClick={() => onChatOpenChange(!chatOpen)}
        title={chatOpen ? "隐藏聊天" : "显示聊天"}
        ariaLabel={chatOpen ? "隐藏聊天" : "显示聊天"}
      >
        {chatOpen ? <PanelRightClose className="h-3.5 w-3.5" /> : <MessageCircle className="h-3.5 w-3.5" />}
      </ToolbarBtn>
      <ToolbarBtn
        pressed={terminalOpen}
        onClick={() => {
          const next = !terminalOpen;
          onTerminalOpenChange(next);
          if (next) focusBottomPanel("output");
        }}
        title={terminalOpen ? "隐藏底部面板" : "显示底部面板（控制台/终端）"}
        ariaLabel={terminalOpen ? "隐藏底部面板" : "显示底部面板"}
      >
        <TerminalSquare className="h-3.5 w-3.5" />
      </ToolbarBtn>
    </div>
  );
}

function ToolbarBtn({
  children,
  pressed,
  onClick,
  title,
  ariaLabel,
}: {
  children: React.ReactNode;
  pressed?: boolean;
  onClick: () => void;
  title: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      aria-pressed={pressed}
      className={cn("workbench-icon-btn", pressed && "workbench-icon-btn--active")}
    >
      {children}
    </button>
  );
}
