import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { MousePointer2, PanelRight, TerminalSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DomElementPayload } from "@/lib/dom-element-meta";
import {
  buildDomTree,
  describeDomElement,
  elementFromIframePoint,
  getElementOverlayRect,
  findElementBySelector,
  getIframeDocument,
  readElementMetrics,
  setupIframeConsoleBridge,
  type DomConsoleEntry,
  type DomTreeNode,
} from "@/lib/browser-dom-inspector";
import { useWorkbenchComposerBridgeOptional } from "@/contexts/workbench-composer-bridge-context";
import { useBrowserInspector } from "@/contexts/browser-inspector-context";

type InspectorToolsProps = {
  inspectable: boolean;
  pickerActive: boolean;
  devtoolsOpen: boolean;
  componentsOpen: boolean;
  onTogglePicker: () => void;
  onToggleDevtools: () => void;
  onToggleComponents: () => void;
};

export function BrowserInspectorToolbarButtons({
  inspectable,
  pickerActive,
  devtoolsOpen,
  componentsOpen,
  onTogglePicker,
  onToggleDevtools,
  onToggleComponents,
}: InspectorToolsProps) {
  return (
    <>
      <button
        type="button"
        disabled={!inspectable}
        onClick={onTogglePicker}
        title={inspectable ? "选择页面元素并添加到对话" : "页面加载完成后可用"}
        aria-pressed={pickerActive}
        className={cn("workbench-icon-btn workbench-icon-btn--sm", pickerActive && "workbench-icon-btn--active")}
      >
        <MousePointer2 className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={!inspectable}
        onClick={onToggleDevtools}
        title={inspectable ? "开发者工具" : "页面加载完成后可用"}
        aria-pressed={devtoolsOpen}
        className={cn("workbench-icon-btn workbench-icon-btn--sm", devtoolsOpen && "workbench-icon-btn--active")}
      >
        <TerminalSquare className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        disabled={!inspectable}
        onClick={onToggleComponents}
        title={inspectable ? "组件检查器" : "页面加载完成后可用"}
        aria-pressed={componentsOpen}
        className={cn("workbench-icon-btn workbench-icon-btn--sm", componentsOpen && "workbench-icon-btn--active")}
      >
        <PanelRight className="h-3.5 w-3.5" />
      </button>
    </>
  );
}

type BrowserInspectorHostProps = {
  iframe: ReactNode;
  native?: boolean;
};

export function BrowserInspectorHost({ iframe, native = false }: BrowserInspectorHostProps) {
  const {
    inspectable,
    state: {
      pageUrl,
      iframeRef,
      iframeKey,
      native: nativeBackend,
      pickerActive,
      devtoolsOpen,
      componentsOpen,
      selectedSelector,
    },
    setSelectedSelector,
    setPickerActive,
  } = useBrowserInspector();
  const isNative = native || nativeBackend;
  const bridge = useWorkbenchComposerBridgeOptional();
  const [hoverRect, setHoverRect] = useState<DOMRect | null>(null);
  const [hoverLabel, setHoverLabel] = useState("");
  const [domTree, setDomTree] = useState<DomTreeNode[]>([]);
  const [consoleLogs, setConsoleLogs] = useState<DomConsoleEntry[]>([]);
  const [devtoolsTab, setDevtoolsTab] = useState<"elements" | "console">("elements");
  const overlayRef = useRef<HTMLDivElement>(null);

  const refreshTree = useCallback(() => {
    const doc = getIframeDocument(iframeRef.current);
    if (!doc?.documentElement) {
      setDomTree([]);
      return;
    }
    setDomTree(buildDomTree(doc.documentElement));
  }, [iframeRef]);

  useEffect(() => {
    if (!inspectable) {
      setDomTree([]);
      setConsoleLogs([]);
      return;
    }
    const iframe = iframeRef.current;
    if (!iframe) return;

    const onLoad = () => {
      refreshTree();
      setConsoleLogs([]);
    };
    iframe.addEventListener("load", onLoad);
    const t = window.setTimeout(onLoad, 0);
    return () => {
      iframe.removeEventListener("load", onLoad);
      window.clearTimeout(t);
    };
  }, [iframeRef, iframeKey, inspectable, refreshTree]);

  useEffect(() => {
    if (!inspectable || !devtoolsOpen) return;
    const iframe = iframeRef.current;
    if (!iframe) return;
    return setupIframeConsoleBridge(iframe, (entry) => {
      setConsoleLogs((prev) => [...prev.slice(-199), entry]);
    });
  }, [iframeRef, iframeKey, inspectable, devtoolsOpen]);

  const selectedElement = useMemo(() => {
    const doc = getIframeDocument(iframeRef.current);
    if (!doc || !selectedSelector) return null;
    return findElementBySelector(doc, selectedSelector);
  }, [iframeRef, selectedSelector, domTree, iframeKey]);

  const selectedMetrics = useMemo(() => {
    if (!selectedElement) return null;
    return readElementMetrics(selectedElement);
  }, [selectedElement]);

  const updateHover = useCallback(
    (clientX: number, clientY: number) => {
      const iframe = iframeRef.current;
      if (!iframe) return;
      const el = elementFromIframePoint(iframe, clientX, clientY);
      if (!el || el === iframe) {
        setHoverRect(null);
        setHoverLabel("");
        return;
      }
      const described = describeDomElement(el, pageUrl);
      setHoverLabel(described.label);
      setHoverRect(getElementOverlayRect(iframe, el));
    },
    [iframeRef, pageUrl],
  );

  const addElementToChat = useCallback(
    (payload: DomElementPayload) => {
      bridge?.addDomElementToChat(payload);
      setPickerActive(false);
    },
    [bridge, setPickerActive],
  );

  const onOverlayMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerActive) return;
    updateHover(e.clientX, e.clientY);
  };

  const onOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!pickerActive) return;
    e.preventDefault();
    e.stopPropagation();
    const iframe = iframeRef.current;
    if (!iframe) return;
    const el = elementFromIframePoint(iframe, e.clientX, e.clientY);
    if (!el) return;
    const payload = describeDomElement(el, pageUrl);
    setSelectedSelector(payload.selector);
    addElementToChat(payload);
  };

  const pickerOverlay =
    !isNative && pickerActive && inspectable ? (
      <div
        ref={overlayRef}
        className="browser-dom-picker-overlay absolute inset-0 z-20 cursor-crosshair"
        onMouseMove={onOverlayMove}
        onMouseLeave={() => {
          setHoverRect(null);
          setHoverLabel("");
        }}
        onClick={onOverlayClick}
      >
        {hoverRect ? (
          <div
            className="browser-dom-picker-highlight pointer-events-none absolute border-2 border-primary bg-primary/10"
            style={{
              left: hoverRect.x,
              top: hoverRect.y,
              width: hoverRect.width,
              height: hoverRect.height,
            }}
          />
        ) : null}
        {hoverLabel ? (
          <div
            className="browser-dom-picker-badge pointer-events-none absolute z-30 max-w-[min(280px,90%)] truncate rounded-md border border-primary/40 bg-primary px-2 py-1 text-[11px] font-medium text-primary-foreground shadow-md"
            style={{ left: (hoverRect?.x ?? 8) + 4, top: Math.max((hoverRect?.y ?? 8) - 28, 4) }}
          >
            {hoverLabel}
          </div>
        ) : null}
      </div>
    ) : null;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="relative min-h-0 flex-1 bg-background">
          {iframe}
          {pickerOverlay}
        </div>
        {devtoolsOpen && !isNative && inspectable ? (
          <BrowserDevToolsPanel
            tab={devtoolsTab}
            onTabChange={setDevtoolsTab}
            tree={domTree}
            selectedSelector={selectedSelector}
            onSelect={setSelectedSelector}
            selectedElement={selectedElement}
            consoleLogs={consoleLogs}
            onRefreshTree={refreshTree}
          />
        ) : null}
      </div>
      {componentsOpen && !isNative && inspectable ? (
        <BrowserComponentsPanel
          tree={domTree}
          selectedSelector={selectedSelector}
          onSelect={setSelectedSelector}
          metrics={selectedMetrics}
          selectedLabel={selectedElement ? describeDomElement(selectedElement, pageUrl).label : null}
          onAddToChat={() => {
            if (!selectedElement) return;
            addElementToChat(describeDomElement(selectedElement, pageUrl));
          }}
        />
      ) : null}
    </div>
  );
}

function DomTreeList({
  nodes,
  depth,
  selectedSelector,
  onSelect,
}: {
  nodes: DomTreeNode[];
  depth: number;
  selectedSelector: string | null;
  onSelect: (selector: string) => void;
}) {
  return (
    <>
      {nodes.map((node) => (
        <div key={node.selector}>
          <button
            type="button"
            onClick={() => onSelect(node.selector)}
            className={cn(
              "flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left font-mono text-[11px] hover:bg-secondary/70",
              selectedSelector === node.selector && "bg-primary/12 text-primary",
            )}
            style={{ paddingLeft: `${depth * 12 + 4}px` }}
            title={node.selector}
          >
            <span className="text-muted-foreground">{node.tag}</span>
            <span className="truncate">{node.label}</span>
          </button>
          {node.children.length ? (
            <DomTreeList
              nodes={node.children}
              depth={depth + 1}
              selectedSelector={selectedSelector}
              onSelect={onSelect}
            />
          ) : null}
        </div>
      ))}
    </>
  );
}

function BrowserDevToolsPanel({
  tab,
  onTabChange,
  tree,
  selectedSelector,
  onSelect,
  selectedElement,
  consoleLogs,
  onRefreshTree,
}: {
  tab: "elements" | "console";
  onTabChange: (tab: "elements" | "console") => void;
  tree: DomTreeNode[];
  selectedSelector: string | null;
  onSelect: (selector: string) => void;
  selectedElement: Element | null;
  consoleLogs: DomConsoleEntry[];
  onRefreshTree: () => void;
}) {
  return (
    <div className="browser-devtools-panel flex h-[38%] min-h-[160px] shrink-0 flex-col border-t border-border bg-code-bg/95">
      <div className="flex shrink-0 items-center gap-1 border-b border-border/70 px-2 py-1">
        {(["elements", "console"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={cn(
              "rounded px-2 py-0.5 text-[11px] capitalize",
              tab === t ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t === "elements" ? "Elements" : "Console"}
          </button>
        ))}
        <button
          type="button"
          onClick={onRefreshTree}
          className="ml-auto text-[10px] text-muted-foreground hover:text-foreground"
        >
          刷新 DOM
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {tab === "elements" ? (
          <div className="grid h-full min-h-0 grid-cols-2 gap-2">
            <div className="min-h-0 overflow-auto rounded border border-border/60 bg-surface/40 p-1">
              <DomTreeList nodes={tree} depth={0} selectedSelector={selectedSelector} onSelect={onSelect} />
            </div>
            <div className="min-h-0 overflow-auto rounded border border-border/60 bg-surface/40 p-2 font-mono text-[10px] text-muted-foreground">
              {selectedElement ? (
                <pre className="whitespace-pre-wrap break-all">{selectedElement.outerHTML.slice(0, 2000)}</pre>
              ) : (
                <span>选择左侧节点查看 HTML</span>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-1 font-mono text-[11px]">
            {consoleLogs.length === 0 ? (
              <p className="text-muted-foreground">暂无控制台输出</p>
            ) : (
              consoleLogs.map((log) => (
                <div
                  key={log.id}
                  className={cn(
                    "rounded px-2 py-1",
                    log.level === "error" && "bg-destructive/10 text-destructive",
                    log.level === "warn" && "bg-warning/10 text-warning",
                  )}
                >
                  <span className="mr-2 opacity-60">{log.level}</span>
                  {log.args.join(" ")}
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function BrowserComponentsPanel({
  tree,
  selectedSelector,
  onSelect,
  metrics,
  selectedLabel,
  onAddToChat,
}: {
  tree: DomTreeNode[];
  selectedSelector: string | null;
  onSelect: (selector: string) => void;
  metrics: ReturnType<typeof readElementMetrics> | null;
  selectedLabel: string | null;
  onAddToChat: () => void;
}) {
  return (
    <aside className="browser-components-panel flex w-[min(280px,34%)] shrink-0 flex-col border-l border-border bg-surface-elevated/95">
      <div className="flex shrink-0 items-center justify-between border-b border-border/70 px-3 py-2">
        <span className="text-[12px] font-semibold">Components</span>
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        <DomTreeList nodes={tree} depth={0} selectedSelector={selectedSelector} onSelect={onSelect} />
      </div>
      <div className="shrink-0 border-t border-border/70 p-3">
        <div className="mb-2 text-[11px] font-medium text-foreground">Design</div>
        {selectedLabel ? (
          <p className="mb-2 truncate font-mono text-[10px] text-muted-foreground">{selectedLabel}</p>
        ) : (
          <p className="mb-2 text-[10px] text-muted-foreground">选择组件查看尺寸</p>
        )}
        {metrics ? (
          <dl className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground">
            <dt>X</dt>
            <dd className="text-foreground">{metrics.x} px</dd>
            <dt>Y</dt>
            <dd className="text-foreground">{metrics.y} px</dd>
            <dt>W</dt>
            <dd className="text-foreground">{metrics.width} px</dd>
            <dt>H</dt>
            <dd className="text-foreground">{metrics.height} px</dd>
            <dt>Padding</dt>
            <dd className="text-foreground">
              {metrics.paddingTop}/{metrics.paddingRight}/{metrics.paddingBottom}/{metrics.paddingLeft}
            </dd>
          </dl>
        ) : null}
        <button
          type="button"
          disabled={!selectedLabel}
          onClick={onAddToChat}
          className="mt-3 w-full rounded-md border border-border bg-background px-2 py-1.5 text-[11px] font-medium hover:bg-secondary disabled:opacity-40"
        >
          添加到对话
        </button>
      </div>
    </aside>
  );
}
