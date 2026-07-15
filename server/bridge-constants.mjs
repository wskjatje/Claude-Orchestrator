/**
 * 本机 Web Bridge 端口与 URL（与 web/vite 代理、Electron preload 保持一致）。
 * 统一读取 WORKBENCH_* 环境变量，避免多处硬编码。
 */

export function getWorkbenchHttpPort() {
  const n = Number(process.env.WORKBENCH_HTTP_PORT);
  return Number.isFinite(n) && n > 0 ? n : 18790;
}

export function getWorkbenchUiPort() {
  const n = Number(process.env.WORKBENCH_UI_PORT);
  return Number.isFinite(n) && n > 0 ? n : 5188;
}

/** Bridge 状态推送 WebSocket 端口（与 HTTP RPC 分离） */
export function getWorkbenchWsPort() {
  const n = Number(process.env.WORKBENCH_WS_PORT);
  return Number.isFinite(n) && n > 0 ? n : 18789;
}

export function getBridgeHealthUrl(host = "127.0.0.1") {
  return `http://${host}:${getWorkbenchHttpPort()}/health`;
}

export function getBridgeRpcUrl(host = "127.0.0.1") {
  return `http://${host}:${getWorkbenchHttpPort()}/rpc`;
}

export function getBridgeWsUrl(host = "127.0.0.1") {
  return `ws://${host}:${getWorkbenchWsPort()}`;
}

/** UI 服务（Vite / packaged-ui-server）上的 Bridge 反向代理入口 */
export function getUiProxyRpcUrl(host = "127.0.0.1") {
  return `http://${host}:${getWorkbenchUiPort()}/api/rpc`;
}

/** 内嵌浏览器 iframe 使用的公开代理路径（经 UI /api 转发到 Bridge） */
export function getWorkbenchBrowserProxyPublicPath() {
  return "/api/workbench-browser/proxy";
}

/** Bridge 侧代理路径（无 /api 前缀） */
export function getWorkbenchBrowserProxyBridgePath() {
  return "/workbench-browser/proxy";
}

export function getUiProxyHealthUrl(host = "127.0.0.1") {
  return `http://${host}:${getWorkbenchUiPort()}/api/health`;
}

/** Node 连接错误是否指向本机 Bridge（而非云供应商 API） */
export function isBridgeLoopbackConnectionError(message) {
  const msg = String(message || "");
  if (!msg) return false;
  const bridgePort = getWorkbenchHttpPort();
  const uiPort = getWorkbenchUiPort();
  const wsPort = getWorkbenchWsPort();
  for (const port of [bridgePort, uiPort, wsPort]) {
    const portPattern = new RegExp(
      `(?:127\\.0\\.0\\.1|localhost|\\[::1\\]):${port}\\b`,
    );
    if (portPattern.test(msg)) return true;
    if (
      /ECONNREFUSED|fetch failed|Failed to fetch|socket hang up|502/i.test(msg) &&
      new RegExp(`:${port}\\b`).test(msg)
    ) {
      return true;
    }
  }
  return false;
}

export function formatBridgeConnectionError(detail) {
  const port = getWorkbenchHttpPort();
  const base = `无法连接本机桥接服务（127.0.0.1:${port}）。请确认 Claude Orchestrator 已完整启动`;
  const devHint =
    process.env.NODE_ENV !== "production"
      ? "；开发模式可运行 npm run web:dev:full 或 npm run desktop"
      : "；若仍失败请退出后重新打开应用";
  const tail = detail ? `（${String(detail).slice(0, 200)}）` : "";
  return `${base}${devHint}${tail}`;
}

/** 统一归一化 RPC / 代理层错误（所有供应商共用，不区分 DeepSeek/Gemini 等） */
export function normalizeRpcErrorMessage(message) {
  const msg = String(message || "").trim();
  if (!msg) return msg;
  if (isBridgeLoopbackConnectionError(msg)) {
    return formatBridgeConnectionError(msg);
  }
  return msg;
}

/** 归一化 RPC 响应体中的 error 字段 */
export function normalizeRpcPayload(result) {
  if (!result || typeof result !== "object") return result;
  if ("error" in result && result.error) {
    return {
      ...result,
      error: normalizeRpcErrorMessage(result.error),
    };
  }
  return result;
}
