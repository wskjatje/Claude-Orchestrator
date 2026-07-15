/**
 * @deprecated 已统一为项目内嵌 WebContentsView，见 use-embedded-browser-ready.ts
 */
export { useEmbeddedBrowserReady as useWorkbenchBrowserBackend } from "@/hooks/use-embedded-browser-ready";

export function isNativeBrowserBackend(): boolean {
  return true;
}

export function backendLabel(): string {
  return "WebContentsView";
}
