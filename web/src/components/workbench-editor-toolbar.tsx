import { Fragment, type ReactNode } from "react";
import { ChevronRight, Save } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileIconClass, fileIconFor } from "@/lib/file-tree-icons";
import { editorLanguageLabel, isMarkdownPath } from "@/lib/editor-file-kind";

export type EditorViewMode = "source" | "preview";

type Props = {
  relPath: string;
  dirty?: boolean;
  saving?: boolean;
  readOnly?: boolean;
  onSave?: () => void;
  viewMode?: EditorViewMode;
  onViewModeChange?: (mode: EditorViewMode) => void;
  extraActions?: ReactNode;
};

export function WorkbenchEditorToolbar({
  relPath,
  dirty,
  saving,
  readOnly,
  onSave,
  viewMode,
  onViewModeChange,
  extraActions,
}: Props) {
  const isMd = isMarkdownPath(relPath);
  const fileName = relPath.split("/").pop() || relPath;
  const ext = fileName.includes(".") ? fileName.split(".").pop() : undefined;
  const Icon = fileIconFor(ext, fileName);
  const segments = relPath.split("/").filter(Boolean);
  const dirs = segments.slice(0, -1);

  return (
    <div className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-surface-elevated/60 px-2 py-1 sm:px-3">
      <nav
        className="flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden text-[11px]"
        aria-label="文件路径"
      >
        {dirs.map((seg, i) => (
          <Fragment key={`${i}-${seg}`}>
            {i > 0 ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/45" /> : null}
            <span className="truncate text-muted-foreground" title={seg}>
              {seg}
            </span>
          </Fragment>
        ))}
        {dirs.length > 0 ? (
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/45" />
        ) : null}
        <Icon className={cn("h-3.5 w-3.5 shrink-0", fileIconClass(ext, fileName))} />
        <span className="truncate font-medium text-foreground" title={relPath}>
          {fileName}
        </span>
        <span className="ml-1.5 hidden shrink-0 rounded border border-border/70 bg-background/50 px-1.5 py-px text-[10px] text-muted-foreground sm:inline">
          {editorLanguageLabel(relPath)}
        </span>
      </nav>

      <div className="flex shrink-0 items-center gap-1.5">
        {extraActions}
        {isMd && viewMode && onViewModeChange ? (
          <div className="inline-flex rounded-md border border-border bg-background p-0.5">
            <ViewToggle
              active={viewMode === "preview"}
              onClick={() => onViewModeChange("preview")}
              label="Preview"
            />
            <ViewToggle
              active={viewMode === "source"}
              onClick={() => onViewModeChange("source")}
              label="Markdown"
            />
          </div>
        ) : null}
        {dirty ? <span className="text-[10px] font-medium text-primary">未保存</span> : null}
        {!readOnly && onSave ? (
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || saving}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium transition",
              dirty
                ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/15"
                : "border-border text-muted-foreground opacity-50",
            )}
          >
            <Save className={cn("h-3 w-3", saving && "animate-pulse")} />
            <span className="hidden sm:inline">{saving ? "保存中…" : "保存"}</span>
          </button>
        ) : null}
      </div>
    </div>
  );
}

function ViewToggle({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded px-2 py-0.5 text-[10.5px] font-medium transition",
        active
          ? "bg-secondary text-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground",
      )}
    >
      {label}
    </button>
  );
}
