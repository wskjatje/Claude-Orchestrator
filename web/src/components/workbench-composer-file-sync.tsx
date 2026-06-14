import { useEffect, useMemo } from "react";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { isFileTab } from "@/types/workbench-editor";
import { setComposerFileBarState } from "@/lib/workbench-composer-file-bar";

/** 在工作区 Provider 内同步未保存文件数，供聊天 Composer 文件条使用 */
export function WorkbenchComposerFileSync() {
  const ws = useWorkbenchWorkspace();

  const count = useMemo(
    () => ws.editorTabs.filter((t) => isFileTab(t) && t.dirty).length,
    [ws.editorTabs],
  );

  useEffect(() => {
    setComposerFileBarState({
      count,
      undoAll: () => {
        for (const tab of ws.editorTabs) {
          if (isFileTab(tab) && tab.dirty) {
            ws.updateFileTabContent(tab.id, tab.savedContent);
          }
        }
      },
      review: () => {
        const first = ws.editorTabs.find((t) => isFileTab(t) && t.dirty);
        if (first && isFileTab(first)) void ws.openFile(first.relPath);
      },
    });
    return () => setComposerFileBarState({ count: 0, undoAll: null, review: null });
  }, [count, ws]);

  return null;
}
