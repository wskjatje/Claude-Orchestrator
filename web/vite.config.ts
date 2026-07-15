// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";
import { createLogger } from "vite";
import {
  getBridgeWsUrl,
  getWorkbenchHttpPort,
  getWorkbenchUiPort,
  getWorkbenchWsPort,
} from "../server/bridge-constants.mjs";
import { BROWSER_PROXY_UI_PATH } from "./src/lib/workbench-app-shell-guard";
import { resolveStrayBrowserNavFromProxyReferer } from "../server/workbench-browser-stray-nav.mjs";

const workbenchHttpPort = getWorkbenchHttpPort();
const workbenchUiPort = getWorkbenchUiPort();
const workbenchWsPort = getWorkbenchWsPort();
const bridgeWsUrl = getBridgeWsUrl();
const browserProxyUiPath = BROWSER_PROXY_UI_PATH;
const viteLogger = createLogger();
const bridgeProxyErrorRe = /http proxy error:\s*\/(rpc|health)/i;

/** 仅拦截主窗口顶层 document；iframe 导航也是 navigate，不能拦 */
function isTopLevelBrowserProxyRequest(req: import("node:http").IncomingMessage): boolean {
  const url = req.url || "";
  if (!url.startsWith(browserProxyUiPath)) return false;
  if (req.method !== "GET" && req.method !== "HEAD") return false;
  const dest = String(req.headers["sec-fetch-dest"] || "").toLowerCase();
  return dest === "document";
}

export default defineConfig({
  vite: {
    customLogger: {
      ...viteLogger,
      error(msg, options) {
        if (typeof msg === "string" && bridgeProxyErrorRe.test(msg)) return;
        viteLogger.error(msg, options);
      },
    },
    plugins: [
      {
        name: "workbench-block-proxy-top-navigation",
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            const stray = resolveStrayBrowserNavFromProxyReferer(
              req.url,
              req.headers.referer,
              browserProxyUiPath,
            );
            if (stray) {
              res.writeHead(302, { Location: stray });
              res.end();
              return;
            }
            if (!isTopLevelBrowserProxyRequest(req)) {
              next();
              return;
            }
            res.writeHead(302, { Location: "/" });
            res.end();
          });
        },
      },
    ],
    define: {
      "import.meta.env.VITE_WORKBENCH_HTTP_PORT": JSON.stringify(
        String(workbenchHttpPort),
      ),
      "import.meta.env.VITE_WORKBENCH_UI_PORT": JSON.stringify(
        String(workbenchUiPort),
      ),
      "import.meta.env.VITE_WORKBENCH_WS_PORT": JSON.stringify(
        String(workbenchWsPort),
      ),
      "import.meta.env.VITE_BRIDGE_WS_URL": JSON.stringify(bridgeWsUrl),
    },
    build: {
      outDir: "dist-electron",
      emptyOutDir: true,
    },
    server: {
      proxy: {
        "/api": {
          target: `http://127.0.0.1:${workbenchHttpPort}`,
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
          /** 本地 MCP + Ollama 单轮可 >2min；默认代理超时会导致浏览器 fetch failed */
          timeout: 600_000,
          proxyTimeout: 600_000,
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              if (!res || res.headersSent) return;
              res.writeHead(503, { "Content-Type": "application/json" });
              res.end(
                JSON.stringify({
                  ok: false,
                  error:
                    "本机 Bridge 暂不可用（可能正在热重启），请稍后刷新。若持续失败请重启 npm run web:dev:full",
                }),
              );
            });
          },
        },
      },
    },
  },
});
