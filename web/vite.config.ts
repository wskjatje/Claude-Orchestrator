// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  vite: {
    server: {
      proxy: {
        "/api": {
          target: "http://127.0.0.1:18790",
          changeOrigin: true,
          rewrite: (p) => p.replace(/^\/api/, ""),
          /** 本地 MCP + Ollama 单轮可 >2min；默认代理超时会导致浏览器 fetch failed */
          timeout: 600_000,
          proxyTimeout: 600_000,
        },
      },
    },
  },
});
