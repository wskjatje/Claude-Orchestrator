import { useEffect } from "react";
import { useWorkbenchComposerBridge } from "@/contexts/workbench-composer-bridge-context";
import type { TerminalSelectionPayload } from "@/lib/terminal-selection-meta";

/** 挂在布局层（非 Portal 聊天体内），避免工作区重绘时重复挂载 */
export function WorkbenchChatComposerBridge({
  onOpenChatPanel,
  onInsertTerminalSelection,
}: {
  onOpenChatPanel: () => void;
  onInsertTerminalSelection: (payload: TerminalSelectionPayload) => void;
}) {
  const { registerComposerHandlers } = useWorkbenchComposerBridge();
  useEffect(() => {
    return registerComposerHandlers({
      openChatPanel: onOpenChatPanel,
      insertTerminalSelection: onInsertTerminalSelection,
    });
  }, [registerComposerHandlers, onOpenChatPanel, onInsertTerminalSelection]);
  return null;
}
