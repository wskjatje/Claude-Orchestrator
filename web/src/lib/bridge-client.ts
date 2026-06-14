/**
 * Bridge WebSocket client — connects to local Claude CLI Bridge daemon.
 * Default endpoint: ws://127.0.0.1:18789
 * Falls back gracefully when daemon is offline; UI continues to render
 * cached/static data and surfaces an "offline" banner.
 */

export type BridgeStatus = "connecting" | "online" | "offline";

export type BridgeEvent =
  | { type: "hello"; payload: { version: string; account?: string; subscription?: string } }
  | { type: "tool_use"; payload: { name: string; input: unknown } }
  | { type: "tool_result"; payload: { name: string; result: unknown } }
  | { type: "message_delta"; payload: { content: string; tokens_in?: number; tokens_out?: number } }
  | { type: "session_update"; payload: { id: string; title?: string } }
  | { type: "mcp_status"; payload: { servers: { name: string; ok: boolean }[] } }
  | { type: "error"; payload: { message: string } };

type Listener = (e: BridgeEvent) => void;

class BridgeClient {
  private ws: WebSocket | null = null;
  private status: BridgeStatus = "offline";
  private listeners = new Set<Listener>();
  private statusListeners = new Set<(s: BridgeStatus, version?: string) => void>();
  private version: string | undefined;
  private url = "ws://127.0.0.1:18789";
  private retry = 0;
  private retryTimer: ReturnType<typeof setTimeout> | null = null;
  private destroyed = false;

  setUrl(url: string) {
    this.url = url;
    this.disconnect();
    this.connect();
  }

  connect() {
    if (typeof window === "undefined") return;
    if (this.destroyed) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) return;

    this.setStatus("connecting");
    try {
      this.ws = new WebSocket(this.url);
    } catch {
      this.setStatus("offline");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.retry = 0;
      this.setStatus("online");
    };
    this.ws.onclose = () => {
      this.ws = null;
      this.setStatus("offline");
      this.scheduleReconnect();
    };
    this.ws.onerror = () => {
      // close handler will fire next
    };
    this.ws.onmessage = (ev) => {
      try {
        const e = JSON.parse(ev.data) as BridgeEvent;
        if (e.type === "hello") this.version = e.payload.version;
        this.listeners.forEach((l) => l(e));
      } catch {
        // ignore malformed
      }
    };
  }

  send(payload: unknown) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload));
      return true;
    }
    return false;
  }

  disconnect() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.retryTimer = null;
    this.ws?.close();
    this.ws = null;
  }

  destroy() {
    this.destroyed = true;
    this.disconnect();
    this.listeners.clear();
    this.statusListeners.clear();
  }

  on(cb: Listener) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  onStatus(cb: (s: BridgeStatus, version?: string) => void) {
    cb(this.status, this.version);
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  getStatus() {
    return this.status;
  }

  getVersion() {
    return this.version;
  }

  private setStatus(s: BridgeStatus) {
    this.status = s;
    this.statusListeners.forEach((cb) => cb(s, this.version));
  }

  private scheduleReconnect() {
    if (this.destroyed) return;
    if (this.retryTimer) return;
    const delay = Math.min(30000, 2000 * 2 ** Math.min(this.retry, 4));
    this.retry++;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.connect();
    }, delay);
  }
}

let singleton: BridgeClient | null = null;
export function getBridge() {
  if (!singleton) singleton = new BridgeClient();
  return singleton;
}
