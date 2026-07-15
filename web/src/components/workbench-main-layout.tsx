import { memo, useEffect, type ReactNode, type Ref } from "react";
import { useDefaultLayout, usePanelRef } from "react-resizable-panels";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { WorkbenchProblemsProvider } from "@/contexts/workbench-problems-context";
import { WorkbenchWorkspaceProvider } from "@/contexts/workbench-workspace-context";
import { WorkbenchComposerBridgeProvider } from "@/contexts/workbench-composer-bridge-context";
import { WorkbenchTerminalBridgeProvider } from "@/contexts/workbench-terminal-bridge-context";
import { WorkbenchComposerFileSync } from "@/components/workbench-composer-file-sync";
import { WorkbenchCenterPanel } from "@/components/workbench-center-panel";
import { WorkbenchLeftSidebar } from "@/components/workbench-side-panels";
import { WorkbenchChatComposerBridge } from "@/components/workbench-chat-composer-bridge";
import { WorkbenchStatusBar } from "@/components/workbench-status-bar";
import { ssrSafeLayoutStorage } from "@/lib/ssr-safe-layout-storage";
import { initWorkbenchBottomPanels } from "@/lib/workbench-panel-init";
import { useTheme } from "@/hooks/use-theme";
import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";
import type { DomElementPayload } from "@/lib/dom-element-meta";

/** v4：数字 = 像素，字符串 = 百分比；侧栏默认约 22% / 38% / 40% */
const PANEL_IDS = ["workbench-left", "workbench-center", "workbench-chat"] as const;
const FALLBACK_LAYOUT = {
  "workbench-left": 22,
  "workbench-center": 38,
  "workbench-chat": 40,
};

export function WorkbenchMainLayout({
  chatHeader,
  chatBodyMountRef,
  onOpenChatPanel,
  onInsertTerminalSelection,
  onInsertDomElement,
  terminalOpen,
  onTerminalOpenChange,
  leftOpen,
  onLeftOpenChange,
  rightOpen,
  onRightOpenChange,
  onOpenProblems,
}: {
  /** 会话 / 模型控件置于聊天面板顶栏 */
  chatHeader?: ReactNode;
  /** Portal 挂载点：聊天主体在 ChatPage 中 createPortal，与工作区 Provider 解耦 */
  chatBodyMountRef: Ref<HTMLDivElement | null>;
  onOpenChatPanel: () => void;
  onInsertTerminalSelection: (payload: TerminalSelectionPayload) => void;
  onInsertDomElement: (payload: DomElementPayload) => void;
  terminalOpen: boolean;
  onTerminalOpenChange: (open: boolean) => void;
  leftOpen: boolean;
  onLeftOpenChange: (open: boolean) => void;
  rightOpen: boolean;
  onRightOpenChange: (open: boolean) => void;
  /** 状态栏点击问题计数时打开底部面板 */
  onOpenProblems?: () => void;
}) {
  const { prefsLoaded } = useTheme();
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
          onInsertDomElement={onInsertDomElement}
        />
        <WorkbenchProblemsProvider>
        <div className="workbench-shell flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-hidden">
            <ResizablePanelGroup
            key={prefsLoaded ? "workbench-cursor-ready" : "workbench-cursor-boot"}
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
                  <WorkbenchCenterPanel
                    terminalOpen={terminalOpen}
                    onTerminalOpenChange={onTerminalOpenChange}
                  />
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
          <WorkbenchStatusBar onOpenProblems={onOpenProblems} />
        </div>
        </WorkbenchProblemsProvider>
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
