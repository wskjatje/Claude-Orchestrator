import type { DomElementPayload } from "@/lib/dom-element-meta";

export { isInspectableBrowserUrl } from "@/lib/workbench-browser-frame";

export type DomTreeNode = {
  id: string;
  tag: string;
  label: string;
  selector: string;
  children: DomTreeNode[];
};

export type DomConsoleEntry = {
  id: string;
  level: "log" | "warn" | "error" | "info";
  args: string[];
  ts: number;
};

export type DomElementMetrics = {
  x: number;
  y: number;
  width: number;
  height: number;
  paddingTop: number;
  paddingRight: number;
  paddingBottom: number;
  paddingLeft: number;
};

const MAX_TREE_NODES = 400;
const MAX_HTML_SNIPPET = 1200;
const MAX_TEXT_PREVIEW = 200;

export function getIframeDocument(iframe: HTMLIFrameElement | null): Document | null {
  if (!iframe) return null;
  try {
    return iframe.contentDocument;
  } catch {
    return null;
  }
}

export function getSelectorPath(el: Element, root: Element = el.ownerDocument.documentElement): string {
  const segments: string[] = [];
  let node: Element | null = el;
  while (node && node !== root && node.nodeType === 1) {
    const tag = node.tagName.toLowerCase();
    if (node.id) {
      segments.unshift(`${tag}#${CSS.escape(node.id)}`);
      break;
    }
    const parent = node.parentElement;
    if (!parent) {
      segments.unshift(tag);
      break;
    }
    const siblings = Array.from(parent.children).filter((c) => c.tagName === node!.tagName);
    const idx = siblings.indexOf(node) + 1;
    const cls =
      typeof node.className === "string" && node.className.trim()
        ? `.${node.className.trim().split(/\s+/).slice(0, 2).map(CSS.escape).join(".")}`
        : "";
    segments.unshift(siblings.length > 1 ? `${tag}${cls}:nth-of-type(${idx})` : `${tag}${cls}`);
    node = parent;
  }
  return segments.join(" > ");
}

export function findElementBySelector(doc: Document, selector: string): Element | null {
  try {
    return doc.querySelector(selector);
  } catch {
    return null;
  }
}

function readableLabel(el: Element): string {
  const tag = el.tagName.toLowerCase();
  const id = el.id?.trim();
  if (id) return `${id} · ${tag}`;
  const cls =
    typeof el.className === "string"
      ? el.className
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .join(".")
      : "";
  if (cls) return `${cls} · ${tag}`;
  return tag;
}

export function describeDomElement(el: Element, pageUrl: string): DomElementPayload {
  const tag = el.tagName.toLowerCase();
  const selector = getSelectorPath(el);
  const textPreview = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, MAX_TEXT_PREVIEW);
  let outerHtmlSnippet = "";
  try {
    outerHtmlSnippet = (el as HTMLElement).outerHTML?.slice(0, MAX_HTML_SNIPPET) || "";
  } catch {
    outerHtmlSnippet = "";
  }
  return {
    tag,
    label: readableLabel(el),
    selector,
    textPreview,
    outerHtmlSnippet,
    pageUrl,
  };
}

/** 父窗口 client 坐标 → iframe 布局视口坐标（供 elementFromPoint 使用，不含 scroll 偏移） */
export function clientPointToIframeViewport(
  iframe: HTMLIFrameElement,
  clientX: number,
  clientY: number,
): { x: number; y: number } {
  const rect = iframe.getBoundingClientRect();
  return {
    x: clientX - rect.left - iframe.clientLeft,
    y: clientY - rect.top - iframe.clientTop,
  };
}

export function isNestedBrowsingContextElement(el: Element): boolean {
  const view = el.ownerDocument?.defaultView;
  return !!view && view !== window;
}

/** 元素高亮框在 iframe 覆盖层（absolute inset-0）内的位置 */
export function getElementOverlayRect(iframe: HTMLIFrameElement, el: Element): DOMRect {
  const elRect = el.getBoundingClientRect();
  if (isNestedBrowsingContextElement(el)) {
    return new DOMRect(elRect.x, elRect.y, elRect.width, elRect.height);
  }
  const iframeRect = iframe.getBoundingClientRect();
  return new DOMRect(
    elRect.left - iframeRect.left - iframe.clientLeft,
    elRect.top - iframeRect.top - iframe.clientTop,
    elRect.width,
    elRect.height,
  );
}

export function elementFromIframePoint(
  iframe: HTMLIFrameElement,
  clientX: number,
  clientY: number,
): Element | null {
  const doc = getIframeDocument(iframe);
  if (!doc) return null;
  const { x, y } = clientPointToIframeViewport(iframe, clientX, clientY);
  return doc.elementFromPoint(x, y);
}

export function buildDomTree(root: Element): DomTreeNode[] {
  const nodes: DomTreeNode[] = [];
  let count = 0;

  const walk = (el: Element, depth: number): DomTreeNode | null => {
    if (count >= MAX_TREE_NODES) return null;
    if (depth > 24) return null;
    const tag = el.tagName.toLowerCase();
    if (tag === "script" || tag === "style" || tag === "link") return null;
    count += 1;
    const selector = getSelectorPath(el);
    const node: DomTreeNode = {
      id: selector,
      tag,
      label: readableLabel(el),
      selector,
      children: [],
    };
    for (const child of Array.from(el.children)) {
      const next = walk(child, depth + 1);
      if (next) node.children.push(next);
    }
    return node;
  };

  const body = root.ownerDocument.body || root;
  const top = walk(body, 0);
  if (top) nodes.push(top);
  return nodes;
}

export function readElementMetrics(el: Element): DomElementMetrics {
  const rect = el.getBoundingClientRect();
  const style = el.ownerDocument.defaultView?.getComputedStyle(el);
  const num = (v: string | undefined) => Number.parseFloat(v || "0") || 0;
  return {
    x: Math.round(rect.x),
    y: Math.round(rect.y),
    width: Math.round(rect.width),
    height: Math.round(rect.height),
    paddingTop: num(style?.paddingTop),
    paddingRight: num(style?.paddingRight),
    paddingBottom: num(style?.paddingBottom),
    paddingLeft: num(style?.paddingLeft),
  };
}

const CONSOLE_BRIDGE_FLAG = "__claudeOrchestratorConsoleBridge";

export function setupIframeConsoleBridge(
  iframe: HTMLIFrameElement,
  onEntry: (entry: DomConsoleEntry) => void,
): () => void {
  const win = iframe.contentWindow;
  const doc = getIframeDocument(iframe);
  if (!win || !doc) return () => {};

  try {
    if (!(win as unknown as Record<string, boolean>)[CONSOLE_BRIDGE_FLAG]) {
      const script = doc.createElement("script");
      script.textContent = `(() => {
        if (window.${CONSOLE_BRIDGE_FLAG}) return;
        window.${CONSOLE_BRIDGE_FLAG} = true;
        const levels = ["log", "info", "warn", "error"];
        for (const level of levels) {
          const orig = console[level].bind(console);
          console[level] = (...args) => {
            try {
              parent.postMessage({
                type: "browser-console",
                level,
                args: args.map((a) => {
                  try {
                    if (typeof a === "string") return a;
                    return JSON.stringify(a);
                  } catch { return String(a); }
                }),
              }, "*");
            } catch {}
            orig(...args);
          };
        }
      })();`;
      doc.documentElement.appendChild(script);
      script.remove();
    }
  } catch {
    return () => {};
  }

  const onMessage = (event: MessageEvent) => {
    if (event.source !== win) return;
    const data = event.data;
    if (!data || data.type !== "browser-console") return;
    onEntry({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      level: data.level || "log",
      args: Array.isArray(data.args) ? data.args.map(String) : [String(data.args ?? "")],
      ts: Date.now(),
    });
  };

  window.addEventListener("message", onMessage);
  return () => window.removeEventListener("message", onMessage);
}
