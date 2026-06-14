import type { ThemeMode } from '@/hooks/use-theme'
import { getDesktop } from '@/lib/desktop-api'

export type UiPrefs = {
  themeMode: ThemeMode
  bridgeUrl: string
  localSecret: string
  defaultSessionTag: string
}

const LEGACY_THEME_KEY = 'app-theme-mode'
const LEGACY_BRIDGE_KEY = 'bridge-url'

const UI_PREFS_DEFAULTS: UiPrefs = {
  themeMode: 'system',
  bridgeUrl: '',
  localSecret: '',
  defaultSessionTag: 'claude:main',
}

function normalizeUiPrefs(raw?: Partial<UiPrefs> | null): UiPrefs {
  const themeMode =
    raw?.themeMode === 'light' || raw?.themeMode === 'dark' || raw?.themeMode === 'system'
      ? raw.themeMode
      : UI_PREFS_DEFAULTS.themeMode
  return {
    themeMode,
    bridgeUrl: typeof raw?.bridgeUrl === 'string' ? raw.bridgeUrl : UI_PREFS_DEFAULTS.bridgeUrl,
    localSecret:
      typeof raw?.localSecret === 'string' ? raw.localSecret : UI_PREFS_DEFAULTS.localSecret,
    defaultSessionTag:
      typeof raw?.defaultSessionTag === 'string' && raw.defaultSessionTag.trim()
        ? raw.defaultSessionTag.trim()
        : UI_PREFS_DEFAULTS.defaultSessionTag,
  }
}

/** 一次性：把旧版 localStorage 偏好迁入项目 SQLite，并清除浏览器缓存项 */
export async function migrateBrowserPrefsToProjectDb(): Promise<UiPrefs | null> {
  const api = getDesktop()
  if (!api?.getUiPrefs || !api?.saveUiPrefs) return null

  let legacyTheme: ThemeMode | null = null
  let legacyBridge = ''
  if (typeof localStorage !== 'undefined') {
    const t = localStorage.getItem(LEGACY_THEME_KEY)
    if (t === 'light' || t === 'dark' || t === 'system') legacyTheme = t
    legacyBridge = localStorage.getItem(LEGACY_BRIDGE_KEY)?.trim() || ''
  }

  const cur = await api.getUiPrefs()
  const prefs = normalizeUiPrefs(cur.ok ? cur.prefs : null)

  const patch: Partial<UiPrefs> = {}
  if (legacyTheme && prefs.themeMode === 'system' && legacyTheme !== 'system') {
    patch.themeMode = legacyTheme
  }
  if (legacyBridge && !prefs.bridgeUrl) {
    patch.bridgeUrl = legacyBridge
  }

  if (Object.keys(patch).length) {
    const saved = await api.saveUiPrefs({ ...prefs, ...patch })
    if (saved.ok) {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem(LEGACY_THEME_KEY)
        localStorage.removeItem(LEGACY_BRIDGE_KEY)
      }
      return normalizeUiPrefs(saved.prefs)
    }
  }

  return prefs
}

export async function loadUiPrefsFromProjectDb(): Promise<UiPrefs> {
  const api = getDesktop()
  if (!api?.getUiPrefs) {
    return { ...UI_PREFS_DEFAULTS }
  }
  const migrated = await migrateBrowserPrefsToProjectDb()
  if (migrated) return migrated
  const r = await api.getUiPrefs()
  if (r.ok && r.prefs) return normalizeUiPrefs(r.prefs)
  return { ...UI_PREFS_DEFAULTS }
}

export async function saveUiPrefsToProjectDb(partial: Partial<UiPrefs>): Promise<UiPrefs | null> {
  const api = getDesktop()
  if (!api?.saveUiPrefs) return null
  const cur = await loadUiPrefsFromProjectDb()
  const r = await api.saveUiPrefs({ ...cur, ...partial })
  return r.ok ? normalizeUiPrefs(r.prefs) : null
}
