import { RPC_CONNECTION_ERROR } from "@/lib/ui-copy";

/** 与 server/bridge-constants.mjs 同源：Vite 在 vite.config 注入 VITE_WORKBENCH_* */
export function getWorkbenchHttpPort(): number {
  const fromEnv = Number(import.meta.env.VITE_WORKBENCH_HTTP_PORT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 18790;
}

export function getWorkbenchUiPort(): number {
  const fromEnv = Number(import.meta.env.VITE_WORKBENCH_UI_PORT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 5188;
}

export function getWorkbenchWsPort(): number {
  const fromEnv = Number(import.meta.env.VITE_WORKBENCH_WS_PORT);
  return Number.isFinite(fromEnv) && fromEnv > 0 ? fromEnv : 18789;
}

export function getBridgeWsUrl(host = "127.0.0.1"): string {
  const fromEnv = String(import.meta.env.VITE_BRIDGE_WS_URL || "").trim();
  if (fromEnv) return fromEnv;
  return `ws://${host}:${getWorkbenchWsPort()}`;
}

export function isBridgeConnectionError(message: string): boolean {
  const msg = String(message || "");
  if (!msg) return false;
  const bridgePort = getWorkbenchHttpPort();
  const uiPort = getWorkbenchUiPort();
  const wsPort = getWorkbenchWsPort();
  for (const port of [bridgePort, uiPort, wsPort]) {
    const loopback = new RegExp(`(?:127\\.0\\.0\\.1|localhost|\\[::1\\]):${port}\\b`);
    if (loopback.test(msg)) return true;
    if (
      /ECONNREFUSED|fetch failed|Failed to fetch|socket hang up|NetworkError|502/i.test(msg) &&
      new RegExp(`:${port}\\b`).test(msg)
    ) {
      return true;
    }
  }
  return false;
}

export function formatBridgeConnectionError(detail?: string): string {
  const port = getWorkbenchHttpPort();
  const devHint =
    typeof import.meta.env.DEV !== "undefined" && import.meta.env.DEV
      ? "；开发模式请运行 npm run web:dev:full 或 npm run desktop"
      : "；请退出后重新打开应用";
  return `${RPC_CONNECTION_ERROR(
    detail || `127.0.0.1:${port}`,
  )}${devHint}`;
}

/** 所有 RPC 通道共用的错误归一化（供应商无关） */
export function normalizeRpcErrorMessage(message?: string | null): string {
  const msg = String(message || "").trim();
  if (!msg) return "";
  if (isBridgeConnectionError(msg)) return formatBridgeConnectionError(msg);
  return msg;
}

export function normalizeRpcPayload<T extends Record<string, unknown>>(result: T): T {
  if (!result || typeof result !== "object") return result;
  if ("error" in result && result.error) {
    return {
      ...result,
      error: normalizeRpcErrorMessage(String(result.error)),
    } as T;
  }
  return result;
}

/** 获取云模型列表等 RPC 失败时的统一文案 */
export function formatFetchModelsError(message: string, providerName?: string): string {
  const normalized = normalizeRpcErrorMessage(message);
  if (normalized) return normalized;
  return `无法从「${providerName || "供应商"}」获取模型列表，请检查 API Key 与端点`;
}
