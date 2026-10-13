import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CodemirrorWorkbench } from "@/components/codemirror-workbench";
import { WorkbenchEditorToolbar, type EditorViewMode } from "@/components/workbench-editor-toolbar";
import { WorkbenchMarkdownPreview } from "@/components/workbench-markdown-preview";
import { WorkbenchSvgPreview } from "@/components/workbench-svg-preview";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";
import { getDesktop } from "@/lib/desktop-api";
import { inlinePreviewKind } from "@/lib/editor-file-kind";

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
  const previewKind = inlinePreviewKind(relPath);
  const [viewMode, setViewMode] = useState<EditorViewMode>("source");

  const readWorkspaceFile = useCallback(async (path: string) => {
    const readFn = getDesktop()?.readWorkspaceTextFile;
    if (!readFn) return null;
    const tryRead = async (p: string) => {
      try {
        const r = await readFn(p);
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

  const showPreview = Boolean(previewKind) && viewMode === "preview";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--code-bg)]">
      <WorkbenchEditorToolbar
        relPath={relPath}
        dirty={dirty}
        saving={saving}
        readOnly={readOnly}
        onSave={onSave}
        viewMode={previewKind ? viewMode : undefined}
        onViewModeChange={previewKind ? setViewMode : undefined}
        extraActions={toolbarExtras}
      />
      {showPreview && previewKind === "markdown" ? (
        <WorkbenchMarkdownPreview content={content} />
      ) : showPreview && previewKind === "svg" ? (
        <WorkbenchSvgPreview content={content} />
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
