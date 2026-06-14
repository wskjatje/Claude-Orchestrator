import { useEffect, useRef, type ReactNode } from "react";
import { useDefaultLayout } from "react-resizable-panels";
import { useWorkbenchProblems } from "@/contexts/workbench-problems-context";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { WorkbenchCenterPreview } from "@/components/workbench-side-panels";
import { WorkbenchBottomPanel } from "@/components/workbench-bottom-panel";
import { ssrSafeLayoutStorage } from "@/lib/ssr-safe-layout-storage";

const CENTER_PANEL_IDS = ["workbench-center-preview", "workbench-center-terminal"] as const;
const CENTER_FALLBACK = {
  "workbench-center-preview": 62,
  "workbench-center-terminal": 38,
};

export function WorkbenchCenterPanel({
  terminalOpen,
  onTerminalOpenChange,
  panelToggles,
}: {
  terminalOpen: boolean;
  onTerminalOpenChange: (open: boolean) => void;
  panelToggles?: ReactNode;
}) {
  const { errorCount } = useWorkbenchProblems();
  const prevErrorCountRef = useRef(0);
  const { defaultLayout, onLayoutChanged } = useDefaultLayout({
    id: "workbench-center-v1",
    panelIds: [...CENTER_PANEL_IDS],
    storage: ssrSafeLayoutStorage,
  });

  useEffect(() => {
    if (errorCount > 0 && prevErrorCountRef.current === 0) {
      onTerminalOpenChange(true);
    }
    prevErrorCountRef.current = errorCount;
  }, [errorCount, onTerminalOpenChange]);

  if (!terminalOpen) {
    return (
      <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        {panelToggles}
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <WorkbenchCenterPreview />
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      {panelToggles}
      <ResizablePanelGroup
        orientation="vertical"
        className="h-full min-h-0 flex-1"
        id="workbench-center-v1"
        defaultLayout={defaultLayout ?? CENTER_FALLBACK}
        onLayoutChanged={onLayoutChanged}
      >
        <ResizablePanel id="workbench-center-preview" defaultSize="62" minSize="28">
          <div className="h-full min-h-0 w-full overflow-hidden">
            <WorkbenchCenterPreview />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle className="z-10 bg-border" />
        <ResizablePanel id="workbench-center-terminal" defaultSize="38" minSize="18" maxSize="72">
          <div className="h-full min-h-0 w-full overflow-hidden">
            <WorkbenchBottomPanel onClose={() => onTerminalOpenChange(false)} />
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
