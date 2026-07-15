/**
 * 内嵌浏览器 tab 生命周期：串行 ensure → load，避免 create/loadURL 竞态与 ERR_ABORTED (-3)。
 */
import type { EmbeddedBrowserLayout } from "@/lib/embedded-browser-native";
import { getEmbeddedBrowserNative, isRemoteEmbeddedBrowser } from "@/lib/embedded-browser-native";
import { pingEmbeddedBrowserHost } from "@/lib/install-embedded-browser-bridge";
import { launchDesktopBrowserHandoff } from "@/lib/launch-desktop-browser";
import {
  browserUrlsEquivalent,
  isBlankBrowserUrl,
  sanitizeBrowserNavigationUrl,
} from "@/lib/workbench-browser-frame";

type TabSession = {
  ensurePromise: Promise<boolean> | null;
  lastLoadedUrl: string | null;
  navPromise: Promise<{ ok: boolean; error?: string }> | null;
};

const sessions = new Map<string, TabSession>();

function sessionFor(tabId: string): TabSession {
  const id = String(tabId || "").trim();
  let session = sessions.get(id);
  if (!session) {
    session = { ensurePromise: null, lastLoadedUrl: null, navPromise: null };
    sessions.set(id, session);
  }
  return session;
}

async function ensureBrowserHostConnected(browserUrl?: string): Promise<boolean> {
  if (!isRemoteEmbeddedBrowser()) return true;
  if (await pingEmbeddedBrowserHost()) return true;
  await launchDesktopBrowserHandoff(browserUrl);
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 400));
    if (await pingEmbeddedBrowserHost()) return true;
  }
  return false;
}

/** 确保 tab 已在主进程创建 view（幂等） */
export async function ensureEmbeddedBrowserTab(
  tabId: string,
  browserUrl?: string,
): Promise<boolean> {
  const id = String(tabId || "").trim();
  if (!id) return false;
  const api = getEmbeddedBrowserNative();
  if (!api) return false;

  const session = sessionFor(id);
  if (!session.ensurePromise) {
    session.ensurePromise = (async () => {
      if (!(await ensureBrowserHostConnected(browserUrl))) return false;
      const res = await api.create(id);
      return res.ok !== false;
    })();
  }
  return session.ensurePromise;
}

async function doNavigate(
  tabId: string,
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const id = String(tabId || "").trim();
  const api = getEmbeddedBrowserNative();
  if (!api) return { ok: false, error: "embedded browser unavailable" };

  const trimmed = sanitizeBrowserNavigationUrl(url);
  if (isBlankBrowserUrl(trimmed)) {
    await api.setLayout(id, { visible: false });
    sessionFor(id).lastLoadedUrl = null;
    return { ok: true };
  }

  const session = sessionFor(id);
  if (session.lastLoadedUrl && browserUrlsEquivalent(session.lastLoadedUrl, trimmed)) {
    return { ok: true };
  }

  const ready = await ensureEmbeddedBrowserTab(id, trimmed);
  if (!ready) return { ok: false, error: "browser-host-unavailable" };

  const res = await api.loadURL(id, trimmed);
  if (res.ok === false) return { ok: false, error: res.error || "导航失败" };
  session.lastLoadedUrl = trimmed;
  return { ok: true };
}

export async function navigateEmbeddedBrowserTab(
  tabId: string,
  url: string,
): Promise<{ ok: boolean; error?: string }> {
  const id = String(tabId || "").trim();
  const session = sessionFor(id);
  const prev = session.navPromise ?? Promise.resolve({ ok: true });
  const job = prev
    .catch(() => ({ ok: false as const, error: "aborted" }))
    .then(() => doNavigate(id, url));
  session.navPromise = job;
  return job;
}

export async function setEmbeddedBrowserLayout(
  tabId: string,
  layout: EmbeddedBrowserLayout,
): Promise<void> {
  const id = String(tabId || "").trim();
  const api = getEmbeddedBrowserNative();
  if (!api) return;
  if (layout.visible === false) {
    await api.setLayout(id, layout);
    return;
  }
  const ready = await ensureEmbeddedBrowserTab(id);
  if (!ready) return;
  await api.setLayout(id, layout);
}

export async function reloadEmbeddedBrowserTab(tabId: string): Promise<{ ok: boolean; error?: string }> {
  const id = String(tabId || "").trim();
  const api = getEmbeddedBrowserNative();
  if (!api) return { ok: false, error: "embedded browser unavailable" };
  sessionFor(id).lastLoadedUrl = null;
  const ready = await ensureEmbeddedBrowserTab(id);
  if (!ready) return { ok: false, error: "browser-host-unavailable" };
  const res = await api.reload(id);
  return { ok: res.ok !== false, error: res.error };
}

export async function destroyEmbeddedBrowserTab(tabId: string): Promise<void> {
  const id = String(tabId || "").trim();
  sessions.delete(id);
  const api = getEmbeddedBrowserNative();
  if (!api) return;
  await api.setLayout(id, { visible: false });
  await api.destroy(id);
}

export function resetEmbeddedBrowserSession(tabId: string): void {
  sessions.delete(String(tabId || "").trim());
}

export function markEmbeddedBrowserLoaded(tabId: string, url: string): void {
  const trimmed = sanitizeBrowserNavigationUrl(url);
  if (isBlankBrowserUrl(trimmed)) return;
  sessionFor(tabId).lastLoadedUrl = trimmed;
}
