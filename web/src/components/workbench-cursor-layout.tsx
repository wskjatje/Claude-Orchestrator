import { memo, useEffect, type ReactNode, type Ref } from "react";
import { PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen } from "lucide-react";
import { useDefaultLayout, usePanelRef } from "react-resizable-panels";
import { cn } from "@/lib/utils";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { WorkbenchProblemsProvider } from "@/contexts/workbench-problems-context";
import { WorkbenchWorkspaceProvider } from "@/contexts/workbench-workspace-context";
import { WorkbenchComposerBridgeProvider } from "@/contexts/workbench-composer-bridge-context";
import { WorkbenchTerminalBridgeProvider } from "@/contexts/workbench-terminal-bridge-context";
import { WorkbenchComposerFileSync } from "@/components/workbench-composer-file-sync";
import { WorkbenchCenterPanel } from "@/components/workbench-center-panel";
import { WorkbenchLeftSidebar } from "@/components/workbench-side-panels";
import { WorkbenchChatComposerBridge } from "@/components/workbench-chat-composer-bridge";
import { ssrSafeLayoutStorage } from "@/lib/ssr-safe-layout-storage";
import { initWorkbenchBottomPanels } from "@/lib/workbench-panel-init";
import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";

/** v4：数字 = 像素，字符串 = 百分比；侧栏默认约 22% / 38% / 40% */
const PANEL_IDS = ["workbench-left", "workbench-center", "workbench-chat"] as const;
const FALLBACK_LAYOUT = {
  "workbench-left": 22,
  "workbench-center": 38,
  "workbench-chat": 40,
};

export function WorkbenchCursorLayout({
  chatHeader,
  chatBodyMountRef,
  onOpenChatPanel,
  onInsertTerminalSelection,
  centerToolbar,
  terminalOpen,
  onTerminalOpenChange,
  leftOpen,
  onLeftOpenChange,
  rightOpen,
  onRightOpenChange,
}: {
  /** Cursor 式：会话 / 模型控件置于聊天面板顶栏 */
  chatHeader?: ReactNode;
  /** Portal 挂载点：聊天主体在 ChatPage 中 createPortal，与工作区 Provider 解耦 */
  chatBodyMountRef: Ref<HTMLDivElement | null>;
  onOpenChatPanel: () => void;
  onInsertTerminalSelection: (payload: TerminalSelectionPayload) => void;
  /** 编辑器区浮动工具条（终端、侧栏开关等） */
  centerToolbar?: ReactNode;
  terminalOpen: boolean;
  onTerminalOpenChange: (open: boolean) => void;
  leftOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  rightOpen: boolean;
  onRightOpenChange: (open: boolean) => void;
}) {
  const leftPanelRef = usePanelRef();
  const chatPanelRef = usePanelRef();
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "workbench-cursor-v3",
    panelIds: [...PANEL_IDS],
    storage: ssrSafeLayoutStorage,
  });

  useEffect(() => {
    initWorkbenchBottomPanels();
  }, []);

  useEffect(() => {
    const panel = leftPanelRef.current;
    if (!panel) return;
    if (leftOpen) panel.expand();
    else panel.collapse();
  }, [leftOpen, leftPanelRef]);

  useEffect(() => {
    const panel = chatPanelRef.current;
    if (!panel) return;
    if (rightOpen) panel.expand();
    else panel.collapse();
  }, [rightOpen, chatPanelRef]);

  return (
    <WorkbenchWorkspaceProvider>
      <WorkbenchComposerFileSync />
      <WorkbenchComposerBridgeProvider>
        <WorkbenchTerminalBridgeProvider>
        <WorkbenchChatComposerBridge
          onOpenChatPanel={onOpenChatPanel}
          onInsertTerminalSelection={onInsertTerminalSelection}
        />
        <div className="workbench-shell flex min-h-0 flex-1 flex-col overflow-hidden">
          <ResizablePanelGroup
            orientation="horizontal"
            className="h-full min-h-0 flex-1"
            id="workbench-cursor-v3"
            defaultLayout={defaultLayout ?? FALLBACK_LAYOUT}
            onLayoutChanged={onLayoutChanged}
          >
            <ResizablePanel
              id="workbench-left"
              panelRef={leftPanelRef}
              collapsible
              collapsedSize="0"
              defaultSize="22"
              minSize="16"
              maxSize="38"
            >
              <div className="h-full min-w-0 overflow-hidden">
                <WorkbenchLeftSidebar />
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel id="workbench-center" defaultSize="38" minSize="22">
              <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
                {!leftOpen ? (
                  <PanelToggle
                    className="absolute left-1.5 top-1.5 z-20"
                    onClick={() => onLeftOpenChange(true)}
                    side="left"
                    expand
                  />
                ) : null}
                {!rightOpen ? (
                  <PanelToggle
                    className="absolute right-1.5 top-1.5 z-20"
                    onClick={() => onRightOpenChange(true)}
                    side="right"
                    expand
                  />
                ) : null}
                <WorkbenchProblemsProvider>
                  <WorkbenchCenterPanel
                    terminalOpen={terminalOpen}
                    onTerminalOpenChange={onTerminalOpenChange}
                    panelToggles={centerToolbar}
                  />
                </WorkbenchProblemsProvider>
              </div>
            </ResizablePanel>
            <ResizableHandle withHandle />
            <ResizablePanel
              id="workbench-chat"
              panelRef={chatPanelRef}
              collapsible
              collapsedSize="0"
              defaultSize="40"
              minSize="28"
              maxSize="58"
            >
              <WorkbenchChatPaneShell header={chatHeader} bodyMountRef={chatBodyMountRef} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
        </WorkbenchTerminalBridgeProvider>
      </WorkbenchComposerBridgeProvider>
    </WorkbenchWorkspaceProvider>
  );
}

/** 仅渲染顶栏 + Portal 空挂载点，避免工作区状态更新时重绘聊天内容 */
const WorkbenchChatPaneShell = memo(function WorkbenchChatPaneShell({
  header,
  bodyMountRef,
}: {
  header?: ReactNode;
  bodyMountRef: Ref<HTMLDivElement | null>;
}) {
  return (
    <div className="workbench-chat-pane flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      {header}
      <div
        ref={bodyMountRef}
        className="workbench-chat-mount relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
      />
    </div>
  );
});

function PanelToggle({
  onClick,
  side,
  expand,
  className,
}: {
  onClick: () => void;
  side: "left" | "right";
  expand?: boolean;
  className?: string;
}) {
  const Icon =
    side === "left"
      ? expand
        ? PanelLeftOpen
        : PanelLeftClose
      : expand
        ? PanelRightOpen
        : PanelRightClose;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded-md border border-border/80 bg-surface/90 text-muted-foreground shadow-sm backdrop-blur-sm transition hover:bg-secondary hover:text-foreground",
        className,
      )}
      title={
        expand
          ? side === "left"
            ? "显示文件树"
            : "显示聊天"
          : side === "left"
            ? "隐藏文件树"
            : "隐藏聊天"
      }
      aria-label={expand ? "展开侧栏" : "收起侧栏"}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}
