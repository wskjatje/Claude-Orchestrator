import type { ThemeMode } from '@/hooks/use-theme'
import { getDesktop } from '@/lib/desktop-api'

export type TerminalShellId = 'bash' | 'zsh'

export type UiPrefs = {
  themeMode: ThemeMode
  bridgeUrl: string
  localSecret: string
  defaultSessionTag: string
  layoutStorage: Record<string, string>
  skipCheckpointConfirm: boolean
  defaultTerminalShell: TerminalShellId
}

const LEGACY_THEME_KEY = 'app-theme-mode'
const LEGACY_BRIDGE_KEY = 'bridge-url'
const LEGACY_CHECKPOINT_SKIP_KEY = 'chat-checkpoint-confirm-skip'
const LEGACY_TERMINAL_SHELL_KEY = 'workbench-terminal-default-shell'
const LAYOUT_KEY_PREFIX = 'react-resizable-panels:'

const UI_PREFS_DEFAULTS: UiPrefs = {
  themeMode: 'system',
  bridgeUrl: '',
  localSecret: '',
  defaultSessionTag: 'claude:main',
  layoutStorage: {},
  skipCheckpointConfirm: false,
  defaultTerminalShell: 'zsh',
}

let prefsCache: UiPrefs = { ...UI_PREFS_DEFAULTS, layoutStorage: {} }
let prefsCacheReady = false
let saveTimer: ReturnType<typeof setTimeout> | null = null

function normalizeLayoutStorage(raw?: Record<string, string> | null): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof k === 'string' && typeof v === 'string') out[k] = v
  }
  return out
}

export function normalizeUiPrefs(raw?: Partial<UiPrefs> | null): UiPrefs {
  const themeMode =
    raw?.themeMode === 'light' || raw?.themeMode === 'dark' || raw?.themeMode === 'system'
      ? raw.themeMode
      : UI_PREFS_DEFAULTS.themeMode
  const defaultTerminalShell: TerminalShellId =
    raw?.defaultTerminalShell === 'bash' || raw?.defaultTerminalShell === 'zsh'
      ? raw.defaultTerminalShell
      : UI_PREFS_DEFAULTS.defaultTerminalShell
  return {
    themeMode,
    bridgeUrl: typeof raw?.bridgeUrl === 'string' ? raw.bridgeUrl : UI_PREFS_DEFAULTS.bridgeUrl,
    localSecret:
      typeof raw?.localSecret === 'string' ? raw.localSecret : UI_PREFS_DEFAULTS.localSecret,
    defaultSessionTag:
      typeof raw?.defaultSessionTag === 'string' && raw.defaultSessionTag.trim()
        ? raw.defaultSessionTag.trim()
        : UI_PREFS_DEFAULTS.defaultSessionTag,
    layoutStorage: normalizeLayoutStorage(raw?.layoutStorage),
    skipCheckpointConfirm: raw?.skipCheckpointConfirm === true,
    defaultTerminalShell,
  }
}

function applyPrefsCache(prefs: UiPrefs) {
  prefsCache = normalizeUiPrefs(prefs)
  prefsCacheReady = true
}

export function getUiPrefsCache(): UiPrefs {
  return prefsCache
}

export function getUiPrefsCacheReady(): boolean {
  return prefsCacheReady
}

export function patchUiPrefsCache(partial: Partial<UiPrefs>) {
  prefsCache = normalizeUiPrefs({
    ...prefsCache,
    ...partial,
    layoutStorage: partial.layoutStorage
      ? { ...prefsCache.layoutStorage, ...partial.layoutStorage }
      : prefsCache.layoutStorage,
  })
}

export function scheduleSaveUiPrefs(partial: Partial<UiPrefs>, debounceMs = 300) {
  patchUiPrefsCache(partial)
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    saveTimer = null
    void saveUiPrefsToProjectDb(prefsCache)
  }, debounceMs)
}

function collectLegacyBrowserPrefs(current: UiPrefs): Partial<UiPrefs> {
  const patch: Partial<UiPrefs> = {}
  if (typeof localStorage === 'undefined') return patch

  const t = localStorage.getItem(LEGACY_THEME_KEY)
  if ((t === 'light' || t === 'dark' || t === 'system') && current.themeMode === 'system' && t !== 'system') {
    patch.themeMode = t
  }

  const legacyBridge = localStorage.getItem(LEGACY_BRIDGE_KEY)?.trim() || ''
  if (legacyBridge && !current.bridgeUrl) {
    patch.bridgeUrl = legacyBridge
  }

  if (localStorage.getItem(LEGACY_CHECKPOINT_SKIP_KEY) === '1' && !current.skipCheckpointConfirm) {
    patch.skipCheckpointConfirm = true
  }

  const legacyShell = localStorage.getItem(LEGACY_TERMINAL_SHELL_KEY)
  if (
    (legacyShell === 'bash' || legacyShell === 'zsh') &&
    current.defaultTerminalShell === UI_PREFS_DEFAULTS.defaultTerminalShell
  ) {
    patch.defaultTerminalShell = legacyShell
  }

  const layoutStorage = { ...current.layoutStorage }
  let layoutChanged = false
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (!key?.startsWith(LAYOUT_KEY_PREFIX)) continue
    const value = localStorage.getItem(key)
    if (value && !layoutStorage[key]) {
      layoutStorage[key] = value
      layoutChanged = true
    }
  }
  if (layoutChanged) patch.layoutStorage = layoutStorage

  return patch
}

function clearLegacyBrowserPrefs() {
  if (typeof localStorage === 'undefined') return
  localStorage.removeItem(LEGACY_THEME_KEY)
  localStorage.removeItem(LEGACY_BRIDGE_KEY)
  localStorage.removeItem(LEGACY_CHECKPOINT_SKIP_KEY)
  localStorage.removeItem(LEGACY_TERMINAL_SHELL_KEY)
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i)
    if (key?.startsWith(LAYOUT_KEY_PREFIX)) keysToRemove.push(key)
  }
  for (const key of keysToRemove) localStorage.removeItem(key)
}

/** 一次性：把旧版 localStorage 偏好迁入项目 SQLite，并清除浏览器缓存项 */
export async function migrateBrowserPrefsToProjectDb(): Promise<UiPrefs | null> {
  const api = getDesktop()
  if (!api?.getUiPrefs || !api?.saveUiPrefs) return null

  const cur = await api.getUiPrefs()
  const prefs = normalizeUiPrefs(cur.ok ? cur.prefs : null)
  const patch = collectLegacyBrowserPrefs(prefs)

  if (Object.keys(patch).length) {
    const saved = await api.saveUiPrefs({ ...prefs, ...patch })
    if (saved.ok) {
      clearLegacyBrowserPrefs()
      const next = normalizeUiPrefs(saved.prefs)
      applyPrefsCache(next)
      return next
    }
  }

  applyPrefsCache(prefs)
  return prefs
}

export async function loadUiPrefsFromProjectDb(): Promise<UiPrefs> {
  const api = getDesktop()
  if (!api?.getUiPrefs) {
    applyPrefsCache(UI_PREFS_DEFAULTS)
    return { ...UI_PREFS_DEFAULTS, layoutStorage: {} }
  }
  const migrated = await migrateBrowserPrefsToProjectDb()
  if (migrated) return migrated
  const r = await api.getUiPrefs()
  const prefs = r.ok && r.prefs ? normalizeUiPrefs(r.prefs) : { ...UI_PREFS_DEFAULTS, layoutStorage: {} }
  applyPrefsCache(prefs)
  return prefs
}

export async function saveUiPrefsToProjectDb(partial: Partial<UiPrefs>): Promise<UiPrefs | null> {
  const api = getDesktop()
  if (!api?.saveUiPrefs) return null
  const cur = getUiPrefsCacheReady() ? getUiPrefsCache() : await loadUiPrefsFromProjectDb()
  const merged = normalizeUiPrefs({
    ...cur,
    ...partial,
    layoutStorage: partial.layoutStorage
      ? { ...cur.layoutStorage, ...partial.layoutStorage }
      : cur.layoutStorage,
  })
  const r = await api.saveUiPrefs(merged)
  if (r.ok) {
    applyPrefsCache(r.prefs ? normalizeUiPrefs(r.prefs) : merged)
    return getUiPrefsCache()
  }
  return null
}
