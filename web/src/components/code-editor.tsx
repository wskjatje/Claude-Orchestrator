import { useEffect } from "react";
import { FileText, Save, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { fileIconClass, fileIconFor } from "@/lib/file-tree-icons";
import { CodemirrorWorkbench } from "@/components/codemirror-workbench";
import { BinaryFileViewer } from "@/components/binary-file-viewer";

type EditorTab = {
  id: string;
  path: string;
  name: string;
  content: string;
  language: string;
  dirty: boolean;
  binary?: boolean;
  size?: number;
  binaryBase64?: string | null;
  previewBytes?: number;
  truncated?: boolean;
};

interface CodeEditorProps {
  activeTab?: EditorTab | null;
  tabs?: EditorTab[];
  onTabChange?: (tabId: string) => void;
  onTabClose?: (tabId: string) => void;
  onContentChange?: (tabId: string, content: string) => void;
  onSave?: (tabId: string) => void;
}

export function CodeEditor({
  activeTab,
  tabs = [],
  onTabChange,
  onTabClose,
  onContentChange,
  onSave,
}: CodeEditorProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!activeTab || activeTab.binary) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        onSave?.(activeTab.id);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeTab, onSave]);

  if (tabs.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center bg-code-bg/30">
        <FileText className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-[13px] font-medium text-foreground/80">没有打开的文件</p>
        <p className="mt-1 text-[12px] text-muted-foreground">从左侧文件树选择文件开始编辑</p>
      </div>
    );
  }

  const ext = activeTab?.name.includes(".") ? activeTab.name.split(".").pop() : undefined;
  const TabIcon = fileIconFor(ext, activeTab?.name);

  return (
    <div className="flex h-full min-h-0 flex-col bg-code-bg/30">
      <div className="flex shrink-0 items-stretch border-b border-border bg-surface-elevated/80">
        <div className="flex min-w-0 flex-1 items-stretch overflow-x-auto scrollbar-thin">
          {tabs.map((tab) => {
            const active = activeTab?.id === tab.id;
            const tabExt = tab.name.includes(".") ? tab.name.split(".").pop() : undefined;
            const Icon = fileIconFor(tabExt, tab.name);
            return (
              <div
                key={tab.id}
                className={cn(
                  "group flex max-w-[220px] shrink-0 items-center border-r border-border/60",
                  active ? "bg-code-bg text-foreground" : "bg-surface-elevated/40 text-muted-foreground hover:bg-secondary/50",
                )}
              >
                <button
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  className={cn(
                    "flex min-w-0 flex-1 items-center gap-1.5 px-3 py-[7px] text-left text-[12px]",
                    active && "border-t-2 border-t-primary pt-[5px]",
                  )}
                >
                  <Icon className={cn("h-3.5 w-3.5 shrink-0", fileIconClass(tabExt, tab.name))} />
                  <span className="truncate">{tab.name}</span>
                  {tab.dirty ? <span className="text-[10px] text-primary">●</span> : null}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabClose?.(tab.id);
                  }}
                  className="mr-1 flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 transition hover:bg-background hover:text-foreground group-hover:opacity-100"
                  aria-label="关闭"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => activeTab && onSave?.(activeTab.id)}
          disabled={!activeTab?.dirty || activeTab?.binary}
          className="flex w-9 shrink-0 items-center justify-center border-l border-border/60 text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:opacity-30"
          title="保存"
        >
          <Save className="h-3.5 w-3.5" />
        </button>
      </div>

      {activeTab ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="flex shrink-0 items-center gap-2 border-b border-border/50 bg-surface-elevated/40 px-3 py-1">
            <TabIcon className={cn("h-3.5 w-3.5 shrink-0", fileIconClass(ext, activeTab.name))} />
            <span className="min-w-0 truncate font-mono text-[11px] text-muted-foreground">{activeTab.path}</span>
          </div>
          {activeTab.binary ? (
            <BinaryFileViewer
              relPath={activeTab.path}
              size={activeTab.size}
              previewBytes={activeTab.previewBytes}
              base64={activeTab.binaryBase64}
              truncated={activeTab.truncated}
            />
          ) : (
            <CodemirrorWorkbench
              value={activeTab.content}
              relPath={activeTab.path}
              onChange={(v) => onContentChange?.(activeTab.id, v)}
            />
          )}
        </div>
      ) : null}
    </div>
  );
}

export { type EditorTab };
