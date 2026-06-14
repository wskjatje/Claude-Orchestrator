import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CodemirrorWorkbench } from "@/components/codemirror-workbench";
import { WorkbenchEditorToolbar, type EditorViewMode } from "@/components/workbench-editor-toolbar";
import { WorkbenchMarkdownPreview } from "@/components/workbench-markdown-preview";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { getDesktop } from "@/lib/desktop-api";
import { isMarkdownPath } from "@/lib/editor-file-kind";

type Props = {
  content: string;
  relPath: string;
  readOnly?: boolean;
  dirty?: boolean;
  onChange?: (content: string) => void;
  onSave?: () => void;
  saving?: boolean;
  toolbarExtras?: ReactNode;
};

export function WorkbenchCodeEditor({
  content,
  relPath,
  readOnly,
  dirty,
  onChange,
  onSave,
  saving,
  toolbarExtras,
}: Props) {
  const ws = useWorkbenchWorkspace();
  const isMd = isMarkdownPath(relPath);
  const [viewMode, setViewMode] = useState<EditorViewMode>("source");

  const readWorkspaceFile = useCallback(async (path: string) => {
    const api = getDesktop();
    if (!api?.readWorkspaceTextFile) return null;
    const tryRead = async (p: string) => {
      try {
        const r = await api.readWorkspaceTextFile(p);
        if (!r.ok || r.binary) return null;
        return r.text ?? null;
      } catch {
        return null;
      }
    };
    return tryRead(path);
  }, []);

  useEffect(() => {
    setViewMode("source");
  }, [relPath]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (readOnly || !onSave || viewMode !== "source") return;
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [readOnly, onSave, viewMode]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <WorkbenchEditorToolbar
        relPath={relPath}
        dirty={dirty}
        saving={saving}
        readOnly={readOnly}
        onSave={onSave}
        viewMode={isMd ? viewMode : undefined}
        onViewModeChange={isMd ? setViewMode : undefined}
        extraActions={toolbarExtras}
      />
      {isMd && viewMode === "preview" ? (
        <WorkbenchMarkdownPreview content={content} />
      ) : (
        <CodemirrorWorkbench
          value={content}
          relPath={relPath}
          readOnly={readOnly}
          onChange={onChange}
          onOpenFile={ws.openFile}
          readWorkspaceFile={readWorkspaceFile}
        />
      )}
    </div>
  );
}
