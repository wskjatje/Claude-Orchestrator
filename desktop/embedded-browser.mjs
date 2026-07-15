/**
 * Electron WebContentsView 内嵌浏览器（主进程）
 * 架构对齐 VS Code Integrated Browser：原生 Chromium 视图 + IPC 布局 + 直连导航。
 * 支持 in-window（应用壳内）与 overlay（Web 预览通过 Bridge 屏幕坐标叠层）。
 */
import { BrowserWindow, ipcMain, shell, WebContentsView } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PRELOAD = path.join(__dirname, 'embedded-browser-preload.cjs')
const SESSION_PARTITION = 'persist:workbench-embedded-browser'

function sharedBrowserWebPreferences() {
  return {
    sandbox: false,
    contextIsolation: true,
    nodeIntegration: false,
    webviewTag: false,
    partition: SESSION_PARTITION,
    preload: PRELOAD,
  }
}

/** @typedef {{ x: number, y: number, width: number, height: number }} BrowserBounds */

/**
 * @typedef {object} InWindowEntry
 * @property {'in-window'} kind
 * @property {import('electron').WebContentsView} view
 * @property {boolean} userVisible
 * @property {boolean} laidOut
 */

/**
 * @typedef {object} OverlayEntry
 * @property {'overlay'} kind
 * @property {import('electron').BrowserWindow} window
 * @property {boolean} userVisible
 * @property {boolean} laidOut
 */

/** @typedef {InWindowEntry | OverlayEntry} BrowserViewEntry */

export class EmbeddedBrowserManager {
  /** @type {() => import('electron').BrowserWindow | null} */
  #getWindow

  /** @type {Map<string, BrowserViewEntry>} */
  #views = new Map()

  /** @type {((tabId: string, channel: string, payload: object) => void) | null} */
  #bridgeEventSink = null

  /** @param {() => import('electron').BrowserWindow | null} getWindow */
  constructor(getWindow) {
    this.#getWindow = getWindow
  }

  /** @param {(tabId: string, channel: string, payload: object) => void} fn */
  setBridgeEventSink(fn) {
    this.#bridgeEventSink = fn
  }

  /** @param {string} tabId */
  #entry(tabId) {
    return this.#views.get(String(tabId || '').trim())
  }

  #defaultHost() {
    const win = this.#getWindow()
    return win && !win.isDestroyed() ? 'in-window' : 'overlay'
  }

  /** @param {string} id @param {'in-window' | 'overlay'} [host] */
  #ensureEntry(id, host) {
    if (this.#entry(id)) return this.#entry(id)
    const mode = host || this.#defaultHost()
    this.create(id, { host: mode })
    return this.#entry(id)
  }

  /** @param {BrowserViewEntry} entry */
  #applyVisible(entry) {
    if (entry.kind === 'in-window') {
      entry.view.setVisible(entry.userVisible && entry.laidOut)
      return
    }
    if (entry.userVisible && entry.laidOut) {
      if (!entry.window.isDestroyed()) entry.window.showInactive()
    } else if (!entry.window.isDestroyed()) {
      entry.window.hide()
    }
  }

  /** @param {string} tabId @param {string} channel @param {object} payload */
  #emit(tabId, channel, payload = {}) {
    const detail = { tabId, ...payload }
    const win = this.#getWindow()
    if (win && !win.isDestroyed()) {
      win.webContents.send(channel, detail)
    }
    this.#bridgeEventSink?.(tabId, channel, detail)
  }

  /** @param {string} tabId @param {import('electron').WebContents} wc */
  #wireEvents(tabId, wc) {
    wc.on('did-start-loading', () => {
      this.#emit(tabId, 'embedded-browser:loading-state', { loading: true })
    })
    wc.on('did-stop-loading', () => {
      this.#emit(tabId, 'embedded-browser:loading-state', { loading: false })
    })
    wc.on('did-fail-load', (_ev, errorCode, errorDescription, _validatedURL, isMainFrame) => {
      if (!isMainFrame) return
      // -3 ERR_ABORTED：新导航打断旧导航，非真实失败
      if (errorCode === -3) return
      this.#emit(tabId, 'embedded-browser:load-failed', {
        errorCode,
        error: errorDescription,
      })
      this.#emit(tabId, 'embedded-browser:loading-state', { loading: false })
    })
    wc.on('did-navigate', (_ev, url) => {
      this.#emit(tabId, 'embedded-browser:navigated', { url })
    })
    wc.on('did-navigate-in-page', (_ev, url) => {
      this.#emit(tabId, 'embedded-browser:navigated', { url })
    })
    wc.on('dom-ready', () => {
      this.#emit(tabId, 'embedded-browser:dom-ready', {})
    })
    wc.on('page-title-updated', (_ev, title) => {
      this.#emit(tabId, 'embedded-browser:title-updated', { title })
    })
  }

  /** @param {string} tabId @param {{ host?: 'in-window' | 'overlay' }} [options] */
  create(tabId, options = {}) {
    const id = String(tabId || '').trim()
    if (!id) return { ok: false, error: 'missing tabId' }
    if (this.#views.has(id)) return { ok: true }

    const host = options.host === 'overlay' ? 'overlay' : 'in-window'
    if (host === 'overlay') {
      return this.#createOverlay(id)
    }
    return this.#createInWindow(id)
  }

  /** @param {string} id */
  #createInWindow(id) {
    const win = this.#getWindow()
    if (!win) return { ok: false, error: 'no window' }

    const view = new WebContentsView({
      webPreferences: sharedBrowserWebPreferences(),
    })

    view.setBackgroundColor('#ffffff')
    win.contentView.addChildView(view)
    view.setVisible(false)
    view.setBounds({ x: 0, y: 0, width: 1, height: 1 })

    view.webContents.setWindowOpenHandler(({ url }) => {
      void view.webContents.loadURL(url)
      return { action: 'deny' }
    })

    /** @type {InWindowEntry} */
    const entry = { kind: 'in-window', view, userVisible: false, laidOut: false }
    this.#views.set(id, entry)
    this.#wireEvents(id, view.webContents)

    return { ok: true }
  }

  /** @param {string} id */
  #createOverlay(id) {
    const overlay = new BrowserWindow({
      frame: false,
      show: false,
      skipTaskbar: true,
      focusable: true,
      hasShadow: false,
      resizable: false,
      movable: false,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      webPreferences: sharedBrowserWebPreferences(),
    })

    overlay.setBackgroundColor('#ffffff')
    overlay.webContents.setWindowOpenHandler(({ url }) => {
      void overlay.webContents.loadURL(url)
      return { action: 'deny' }
    })

    /** @type {OverlayEntry} */
    const entry = { kind: 'overlay', window: overlay, userVisible: false, laidOut: false }
    this.#views.set(id, entry)
    this.#wireEvents(id, overlay.webContents)

    overlay.on('closed', () => {
      if (this.#views.get(id) === entry) this.#views.delete(id)
    })

    return { ok: true }
  }

  /** @param {string} tabId */
  destroy(tabId) {
    const id = String(tabId || '').trim()
    const entry = this.#entry(id)
    if (!entry) return { ok: true }

    if (entry.kind === 'in-window') {
      const win = this.#getWindow()
      try {
        win?.contentView.removeChildView(entry.view)
      } catch {
        /* ignore */
      }
      try {
        entry.view.webContents.close()
      } catch {
        /* ignore */
      }
    } else if (!entry.window.isDestroyed()) {
      entry.window.destroy()
    }

    this.#views.delete(id)
    return { ok: true }
  }

  /** @param {BrowserViewEntry} entry @param {BrowserBounds} bounds */
  #applyBounds(entry, bounds) {
    const width = Math.max(0, Math.round(bounds.width))
    const height = Math.max(0, Math.round(bounds.height))
    if (width <= 0 || height <= 0) {
      entry.laidOut = false
      return
    }
    if (entry.kind === 'in-window') {
      entry.view.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width,
        height,
      })
    } else if (!entry.window.isDestroyed()) {
      entry.window.setBounds({
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        width,
        height,
      })
    }
    entry.laidOut = true
  }

  /** @param {string} tabId @param {{ bounds?: BrowserBounds, visible?: boolean, zoomFactor?: number, coordinateSpace?: 'screen' | 'window' }} layout */
  setLayout(tabId, layout) {
    const id = String(tabId || '').trim()
    let entry = this.#entry(id)
    if (!entry) {
      if (layout?.visible === false) return { ok: true }
      entry = this.#ensureEntry(id)
      if (!entry) return { ok: false, error: 'missing view' }
    }

    if (layout.bounds) {
      const space = layout.coordinateSpace || (entry.kind === 'overlay' ? 'screen' : 'window')
      if (entry.kind === 'overlay' && space !== 'screen') {
        return { ok: false, error: 'overlay requires screen coordinates' }
      }
      this.#applyBounds(entry, layout.bounds)
    }

    if (layout.zoomFactor != null && Number.isFinite(layout.zoomFactor)) {
      const zoom = Math.min(3, Math.max(0.25, Number(layout.zoomFactor)))
      const wc = entry.kind === 'in-window' ? entry.view.webContents : entry.window.webContents
      try {
        wc.setZoomFactor(zoom)
      } catch {
        /* ignore */
      }
    }

    if (layout.visible !== undefined) {
      entry.userVisible = !!layout.visible
    }

    this.#applyVisible(entry)
    return { ok: true }
  }

  /** @param {string} tabId */
  focus(tabId) {
    const entry = this.#entry(tabId)
    if (!entry) return { ok: false, error: 'missing view' }
    try {
      if (entry.kind === 'in-window') {
        entry.view.webContents.focus()
      } else if (!entry.window.isDestroyed()) {
        entry.window.focus()
        entry.window.webContents.focus()
      }
    } catch {
      /* ignore */
    }
    return { ok: true }
  }

  /** @param {string} tabId @param {string} url */
  async loadURL(tabId, url) {
    const id = String(tabId || '').trim()
    const trimmed = String(url || '').trim()
    if (!trimmed || trimmed === 'about:blank') {
      const entry = this.#entry(id)
      if (entry) {
        entry.userVisible = false
        this.#applyVisible(entry)
      }
      return { ok: true }
    }
    const entry = this.#ensureEntry(id)
    if (!entry) return { ok: false, error: 'missing view' }
    const wc = entry.kind === 'in-window' ? entry.view.webContents : entry.window.webContents
    try {
      await wc.loadURL(trimmed)
      return { ok: true }
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
  }

  /** @param {string} tabId */
  reload(tabId) {
    const entry = this.#ensureEntry(String(tabId || '').trim())
    if (!entry) return { ok: false, error: 'missing view' }
    const wc = entry.kind === 'in-window' ? entry.view.webContents : entry.window.webContents
    wc.reload()
    return { ok: true }
  }

  /** @param {string} tabId */
  goBack(tabId) {
    const entry = this.#entry(tabId)
    const wc = entry
      ? entry.kind === 'in-window'
        ? entry.view.webContents
        : entry.window.webContents
      : null
    if (wc?.canGoBack()) wc.goBack()
    return { ok: true }
  }

  /** @param {string} tabId */
  goForward(tabId) {
    const entry = this.#entry(tabId)
    const wc = entry
      ? entry.kind === 'in-window'
        ? entry.view.webContents
        : entry.window.webContents
      : null
    if (wc?.canGoForward()) wc.goForward()
    return { ok: true }
  }

  /** @param {string} tabId */
  canNav(tabId) {
    const entry = this.#entry(tabId)
    const wc = entry
      ? entry.kind === 'in-window'
        ? entry.view.webContents
        : entry.window.webContents
      : null
    return {
      ok: true,
      back: wc?.canGoBack() ?? false,
      forward: wc?.canGoForward() ?? false,
    }
  }

  /** @param {string} tabId */
  openDevTools(tabId) {
    const entry = this.#entry(tabId)
    const wc = entry
      ? entry.kind === 'in-window'
        ? entry.view.webContents
        : entry.window.webContents
      : null
    wc?.openDevTools({ mode: 'detach' })
    return { ok: true }
  }

  /** @param {string} tabId @param {boolean} active */
  setPickerActive(tabId, active) {
    const entry = this.#entry(tabId)
    const wc = entry
      ? entry.kind === 'in-window'
        ? entry.view.webContents
        : entry.window.webContents
      : null
    wc?.send('embedded-browser:picker', { active: !!active })
    return { ok: true }
  }

  /** @param {number} senderId @param {unknown} payload */
  forwardElementPicked(senderId, payload) {
    for (const [tabId, entry] of this.#views) {
      const wc = entry.kind === 'in-window' ? entry.view.webContents : entry.window.webContents
      if (wc.id === senderId) {
        this.#emit(tabId, 'embedded-browser:element-picked', { payload })
        return
      }
    }
  }

  /** Bridge RPC 入口（overlay 模式） */
  async invoke(method, args = []) {
    const list = Array.isArray(args) ? args : []
    switch (method) {
      case 'ping':
        return { ok: true }
      case 'create':
        return this.create(String(list[0] || ''), { host: 'overlay' })
      case 'destroy':
        return this.destroy(String(list[0] || ''))
      case 'setLayout': {
        const tabId = String(list[0] || '')
        const layout = list[1] || {}
        if (!this.#entry(tabId) && layout?.visible === false) return { ok: true }
        await this.create(tabId, { host: 'overlay' })
        return this.setLayout(tabId, layout)
      }
      case 'focus':
        return this.focus(String(list[0] || ''))
      case 'loadURL': {
        const tabId = String(list[0] || '')
        const url = String(list[1] || '')
        await this.create(tabId, { host: 'overlay' })
        return this.loadURL(tabId, url)
      }
      case 'reload':
        return this.reload(String(list[0] || ''))
      case 'goBack':
        return this.goBack(String(list[0] || ''))
      case 'goForward':
        return this.goForward(String(list[0] || ''))
      case 'canNav':
        return this.canNav(String(list[0] || ''))
      case 'openDevTools':
        return this.openDevTools(String(list[0] || ''))
      case 'setPickerActive':
        return this.setPickerActive(String(list[0] || ''), !!list[1])
      default:
        return { ok: false, error: `unknown method: ${method}` }
    }
  }

  destroyAll() {
    for (const tabId of [...this.#views.keys()]) this.destroy(tabId)
  }
}

/** @param {() => import('electron').BrowserWindow | null} getWindow */
export function registerEmbeddedBrowserIpc(getWindow) {
  const mgr = new EmbeddedBrowserManager(getWindow)

  ipcMain.handle('embedded-browser:create', (_e, tabId) =>
    mgr.create(String(tabId), { host: 'in-window' }),
  )
  ipcMain.handle('embedded-browser:destroy', (_e, tabId) => mgr.destroy(String(tabId)))
  ipcMain.handle('embedded-browser:setLayout', (_e, tabId, layout) =>
    mgr.setLayout(String(tabId), layout || {}),
  )
  ipcMain.handle('embedded-browser:focus', (_e, tabId) => mgr.focus(String(tabId)))
  ipcMain.handle('embedded-browser:loadURL', (_e, tabId, url) =>
    mgr.loadURL(String(tabId), String(url || '')),
  )
  ipcMain.handle('embedded-browser:reload', (_e, tabId) => mgr.reload(String(tabId)))
  ipcMain.handle('embedded-browser:goBack', (_e, tabId) => mgr.goBack(String(tabId)))
  ipcMain.handle('embedded-browser:goForward', (_e, tabId) => mgr.goForward(String(tabId)))
  ipcMain.handle('embedded-browser:canNav', (_e, tabId) => mgr.canNav(String(tabId)))
  ipcMain.handle('embedded-browser:openDevTools', (_e, tabId) => mgr.openDevTools(String(tabId)))
  ipcMain.handle('embedded-browser:setPickerActive', (_e, tabId, active) =>
    mgr.setPickerActive(String(tabId), !!active),
  )

  ipcMain.on('embedded-browser:element-picked', (event, payload) => {
    mgr.forwardElementPicked(event.sender.id, payload)
  })

  return mgr
}
