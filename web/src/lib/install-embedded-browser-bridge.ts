/**
 * Web 预览：内嵌浏览器在编辑器内容区用 iframe 展示（见 embedded-browser-pane）。
 * 不再默认注入 Bridge overlay API。
 */
import type { EmbeddedBrowserApi } from "@/lib/embedded-browser-native";
import { onBridgeEvent } from "@/lib/bridge-events";

type RpcResult = { ok?: boolean; error?: string; back?: boolean; forward?: boolean };

async function embeddedRpc<T extends RpcResult>(
  channel: string,
  ...args: unknown[]
): Promise<T> {
  const res = await fetch("/api/rpc", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ channel, args }),
  });
  const data = (await res.json()) as T & { error?: string };
  if (!res.ok) {
    return { ok: false, error: data.error || `RPC ${channel} failed` } as T;
  }
  return data;
}

function notifyEmbeddedBrowserReady() {
  window.dispatchEvent(new Event("embedded-browser:ready"));
}

function installOverlayEmbeddedBrowserBridge() {
  const api: EmbeddedBrowserApi = {
    create: (tabId) => embeddedRpc("embedded-browser:create", tabId),
    destroy: (tabId) => embeddedRpc("embedded-browser:destroy", tabId),
    setLayout: (tabId, layout) => embeddedRpc("embedded-browser:setLayout", tabId, layout),
    focus: (tabId) => embeddedRpc("embedded-browser:focus", tabId),
    loadURL: (tabId, url) => embeddedRpc("embedded-browser:loadURL", tabId, url),
    reload: (tabId) => embeddedRpc("embedded-browser:reload", tabId),
    goBack: (tabId) => embeddedRpc("embedded-browser:goBack", tabId),
    goForward: (tabId) => embeddedRpc("embedded-browser:goForward", tabId),
    canNav: (tabId) =>
      embeddedRpc<{ ok: boolean; back: boolean; forward: boolean }>(
        "embedded-browser:canNav",
        tabId,
      ),
    openDevTools: (tabId) => embeddedRpc("embedded-browser:openDevTools", tabId),
    setPickerActive: (tabId, active) =>
      embeddedRpc("embedded-browser:setPickerActive", tabId, active),
    onNavigated: (fn) =>
      onBridgeEvent("embedded-browser:navigated", fn as (detail: unknown) => void),
    onDomReady: (fn) =>
      onBridgeEvent("embedded-browser:dom-ready", fn as (detail: unknown) => void),
    onLoadingState: (fn) =>
      onBridgeEvent("embedded-browser:loading-state", fn as (detail: unknown) => void),
    onLoadFailed: (fn) =>
      onBridgeEvent("embedded-browser:load-failed", fn as (detail: unknown) => void),
    onTitleUpdated: (fn) =>
      onBridgeEvent("embedded-browser:title-updated", fn as (detail: unknown) => void),
    onElementPicked: (fn) =>
      onBridgeEvent("embedded-browser:element-picked", fn as (detail: unknown) => void),
  };

  window.__EMBEDDED_BROWSER_REMOTE__ = true;
  window.embeddedBrowser = api;
}

export function installEmbeddedBrowserBridge() {
  if (typeof window === "undefined") return;
  if (window.__ELECTRON_DESKTOP__) return;
  if (window.embeddedBrowser) return;

  if (window.__USE_OVERLAY_EMBEDDED_BROWSER__) {
    installOverlayEmbeddedBrowserBridge();
  }
  notifyEmbeddedBrowserReady();
}

export async function pingEmbeddedBrowserHost(): Promise<boolean> {
  try {
    const res = await embeddedRpc<{ ok?: boolean }>("embedded-browser:ping");
    return res.ok !== false;
  } catch {
    return false;
  }
}
