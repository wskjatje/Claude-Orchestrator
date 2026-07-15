import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  type RefObject,
} from "react";
import { cn } from "@/lib/utils";
import { isElectronInPaneBrowser } from "@/lib/embedded-browser-native";
import { setEmbeddedBrowserLayout } from "@/lib/embedded-browser-session";

type EmbeddedBrowserPaneProps = {
  tabId: string;
  /** 仅用户主动导航时更新；页内链接/表单导航不应触发 React 改 src */
  navigateSrc: string;
  /** iframe 模式：在内容区渲染；native 模式：WebContentsView 布局宿主 */
  iframeMode: boolean;
  iframeRef?: RefObject<HTMLIFrameElement | null>;
  iframeKey?: number;
  /** 是否显示（false 时 native 仅隐藏 view，iframe 仍占位） */
  overlayVisible: boolean;
  onIframeLoad?: () => void;
};

function readWindowZoomFactor() {
  if (typeof window === "undefined") return 1;
  const raw = Number((window as Window & { devicePixelRatio?: number }).devicePixelRatio);
  if (!Number.isFinite(raw) || raw <= 0) return 1;
  return Math.min(3, Math.max(0.5, raw));
}

export function EmbeddedBrowserPane({
  tabId,
  navigateSrc,
  iframeMode,
  iframeRef,
  iframeKey = 0,
  overlayVisible,
  onIframeLoad,
}: EmbeddedBrowserPaneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const layoutFrameRef = useRef<number | null>(null);
  const urlRef = useRef(navigateSrc);
  const overlayVisibleRef = useRef(overlayVisible);

  urlRef.current = navigateSrc;
  overlayVisibleRef.current = overlayVisible;

  const syncLayout = useCallback(() => {
    if (iframeMode) return;
    if (!hostRef.current) return;
    if (layoutFrameRef.current != null) {
      cancelAnimationFrame(layoutFrameRef.current);
    }
    layoutFrameRef.current = requestAnimationFrame(() => {
      layoutFrameRef.current = null;
      const el = hostRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const showNative =
        overlayVisibleRef.current &&
        urlRef.current !== "about:blank" &&
        rect.width > 0 &&
        rect.height > 0;
      void setEmbeddedBrowserLayout(tabId, {
        bounds: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height,
        },
        visible: showNative,
        zoomFactor: readWindowZoomFactor(),
        coordinateSpace: "window",
      });
    });
  }, [iframeMode, tabId]);

  useLayoutEffect(() => {
    if (iframeMode) return;
    syncLayout();
    const el = hostRef.current;
    if (!el) return;

    const ro = new ResizeObserver(syncLayout);
    ro.observe(el);
    window.addEventListener("resize", syncLayout);
    window.addEventListener("scroll", syncLayout, true);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", syncLayout);
      window.removeEventListener("scroll", syncLayout, true);
      if (layoutFrameRef.current != null) {
        cancelAnimationFrame(layoutFrameRef.current);
      }
      void setEmbeddedBrowserLayout(tabId, { visible: false });
    };
  }, [iframeMode, syncLayout, tabId]);

  useEffect(() => {
    if (iframeMode) return;
    syncLayout();
  }, [iframeMode, overlayVisible, syncLayout]);

  if (iframeMode) {
    const frameSrc = navigateSrc;
    if (frameSrc === "about:blank") return null;
    return (
      <iframe
        key={iframeKey}
        ref={iframeRef}
        data-workbench-browser-frame="1"
        src={frameSrc}
        title="内嵌浏览器"
        allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        className={cn(
          "embedded-browser-pane absolute inset-0 h-full w-full border-0 bg-background",
        )}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
        onLoad={onIframeLoad}
      />
    );
  }

  return (
    <div
      ref={hostRef}
      className={cn("embedded-browser-pane pointer-events-none absolute inset-0 min-h-0")}
      aria-hidden={!overlayVisible}
      data-native-pane={isElectronInPaneBrowser() ? "1" : undefined}
    />
  );
}
