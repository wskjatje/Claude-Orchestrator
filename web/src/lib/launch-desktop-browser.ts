import { getDesktop } from "@/lib/desktop-api";

const HANDOFF_COOLDOWN_MS = 4000;
let lastHandoffAt = 0;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** 启动后台 browser-host（无桌面窗口），供 Web 内嵌浏览器使用 */
export async function launchDesktopBrowserHandoff(
  browserUrl?: string,
): Promise<{ ok: boolean; error?: string }> {
  const now = Date.now();
  if (now - lastHandoffAt < HANDOFF_COOLDOWN_MS) {
    return { ok: true };
  }
  lastHandoffAt = now;

  const desktop = getDesktop();
  if (!desktop?.launchDesktopApp) {
    return {
      ok: false,
      error: "本机 Bridge 未连接。请先运行 npm run web:dev:full，或使用 npm run desktop 启动桌面版。",
    };
  }

  const opts: { browserUrl?: string; browserHostOnly: boolean } = { browserHostOnly: true };
  if (browserUrl?.trim()) opts.browserUrl = browserUrl.trim();
  let lastError = "无法启动内嵌浏览器服务";

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await desktop.launchDesktopApp(opts);
      if (res?.ok !== false) return { ok: true };
      lastError = res?.error || lastError;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    if (attempt < 5) await sleep(600);
  }

  return { ok: false, error: lastError };
}

export function resolveBrowserHandoffUrl(...candidates: Array<string | undefined>): string | undefined {
  for (const raw of candidates) {
    const trimmed = String(raw || "").trim();
    if (!trimmed || trimmed === "about:blank") continue;
    return trimmed;
  }
  return undefined;
}
