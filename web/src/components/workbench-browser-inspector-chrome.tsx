import { MousePointer2, PanelRight, TerminalSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { useBrowserInspectorOptional } from "@/contexts/browser-inspector-context";
import { isBrowserTab } from "@/types/workbench-editor";
import { useWorkbenchWorkspace } from "@/contexts/workbench-workspace-context";

/** 浏览器标签激活时，在编辑器标签栏右侧展示检查器按钮 */
export function WorkbenchBrowserInspectorChrome() {
  const ws = useWorkbenchWorkspace();
  const inspector = useBrowserInspectorOptional();
  const active = ws.activeEditorTab;
  const isBrowser = active && isBrowserTab(active);

  if (!isBrowser || !inspector) return null;

  const { inspectable, state, togglePicker, toggleDevtools, toggleComponents } = inspector;

  return (
    <div
      className="browser-inspector-chrome flex shrink-0 items-center gap-0.5 border-l border-border/60 pl-1 pr-2"
      role="toolbar"
      aria-label="浏览器检查器"
    >
      <ChromeBtn
        active={state.pickerActive}
        disabled={!inspectable}
        title={inspectable ? "选择页面元素并添加到对话" : "页面加载完成后可用"}
        onClick={togglePicker}
      >
        <MousePointer2 className="h-3.5 w-3.5" />
      </ChromeBtn>
      <ChromeBtn
        active={state.devtoolsOpen}
        disabled={!inspectable}
        title={inspectable ? "开发者工具" : "页面加载完成后可用"}
        onClick={toggleDevtools}
      >
        <TerminalSquare className="h-3.5 w-3.5" />
      </ChromeBtn>
      <ChromeBtn
        active={state.componentsOpen}
        disabled={!inspectable}
        title={inspectable ? "组件检查器" : "页面加载完成后可用"}
        onClick={toggleComponents}
      >
        <PanelRight className="h-3.5 w-3.5" />
      </ChromeBtn>
    </div>
  );
}

function ChromeBtn({
  children,
  active,
  disabled,
  title,
  onClick,
}: {
  children: React.ReactNode;
  active: boolean;
  disabled?: boolean;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={cn(
        "browser-inspector-chrome-btn inline-flex h-7 w-7 items-center justify-center rounded-md border border-border/70 bg-surface/80 text-muted-foreground shadow-xs transition",
        "hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35",
        active && "border-primary/40 bg-primary/12 text-primary",
      )}
    >
      {children}
    </button>
  );
}
