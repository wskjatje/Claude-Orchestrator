import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { ensureDevBridge, stopDevBridge } from './ensure-dev-bridge.mjs'
import { startPackagedRuntime, stopPackagedRuntime } from './runtime.mjs'
import { EmbeddedBrowserManager, registerEmbeddedBrowserIpc } from './embedded-browser.mjs'
import { connectBrowserBridgeHost } from './browser-bridge-host.mjs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const isDev = !app.isPackaged
const browserHostOnly = process.env.CLAUDE_ORCHESTRATOR_BROWSER_HOST_ONLY === '1'
const APP_DISPLAY_NAME = 'Claude Orchestrator'
const iconPath = path.join(__dirname, 'assets', 'icon.png')
const appIcon = nativeImage.createFromPath(iconPath)

const DEV_WEB_URL = process.env.CLAUDE_ORCHESTRATOR_URL || 'http://127.0.0.1:5188/'
let appShellOrigin = new URL(DEV_WEB_URL).origin
let packagedWebUrl = DEV_WEB_URL

if (process.platform === 'darwin') {
  app.setName(APP_DISPLAY_NAME)
}

const gotSingleInstanceLock = browserHostOnly ? true : app.requestSingleInstanceLock()
if (!browserHostOnly && !gotSingleInstanceLock) {
  app.quit()
} else if (!browserHostOnly) {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
      if (process.platform === 'darwin') {
        app.focus({ steal: true })
      }
    }
  })
}

/** @type {BrowserWindow | null} */
let mainWindow = null
/** @type {EmbeddedBrowserManager | null} */
let embeddedBrowserManager = null

async function resolveWebUrl() {
  if (isDev) {
    const bridgeOk = await ensureDevBridge()
    if (!bridgeOk) {
      throw new Error(
        `本机 Bridge 未能在 127.0.0.1:${process.env.WORKBENCH_HTTP_PORT || 18790} 就绪。请运行 npm run desktop。`,
      )
    }
    return DEV_WEB_URL
  }
  const runtime = await startPackagedRuntime()
  packagedWebUrl = runtime.url
  return runtime.url
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 960,
    minHeight: 640,
    title: APP_DISPLAY_NAME,
    icon: appIcon.isEmpty() ? undefined : appIcon,
    backgroundColor: '#0a0a0b',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
    if (process.platform === 'darwin') {
      app.focus({ steal: true })
    }
  })

  void resolveWebUrl()
    .then((url) => {
      try {
        appShellOrigin = new URL(url).origin
      } catch {
        /* keep default */
      }
      return mainWindow?.loadURL(url)
    })
    .catch((err) => {
      const msg = err instanceof Error ? err.message : String(err)
      dialog.showErrorBox('Claude Orchestrator 无法启动', `${msg}\n\n若刚更新过安装包，请确认已安装最新版 .dmg。`)
      app.quit()
    })

  if (isDev && process.env.CLAUDE_ORCHESTRATOR_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    try {
      const parsed = new URL(url)
      const pathName = parsed.pathname
      if (pathName === '/api/workbench-browser/proxy' || pathName === '/workbench-browser/proxy') {
        event.preventDefault()
        return
      }
      if (parsed.origin !== appShellOrigin) {
        event.preventDefault()
        void shell.openExternal(url)
      }
    } catch {
      /* ignore malformed URL */
    }
  })

  const recoverAppShellFromProxyUrl = (url) => {
    try {
      const parsed = new URL(url)
      const pathName = parsed.pathname
      if (pathName !== '/api/workbench-browser/proxy' && pathName !== '/workbench-browser/proxy') return
      void mainWindow?.loadURL(packagedWebUrl || DEV_WEB_URL)
    } catch {
      /* ignore malformed URL */
    }
  }

  mainWindow.webContents.on('did-navigate', (_event, url) => {
    recoverAppShellFromProxyUrl(url)
  })
  mainWindow.webContents.on('did-navigate-in-page', (_event, url) => {
    recoverAppShellFromProxyUrl(url)
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  embeddedBrowserManager = registerEmbeddedBrowserIpc(() => mainWindow)
  connectBrowserBridgeHost(embeddedBrowserManager)
}

function startBrowserHostMode() {
  embeddedBrowserManager = new EmbeddedBrowserManager(() => null)
  connectBrowserBridgeHost(embeddedBrowserManager)
  if (process.platform === 'darwin' && app.dock) {
    app.dock.hide()
  }
}

ipcMain.handle('dialog:chooseReferenceFiles', async (_event, opts = {}) => {
  const win = BrowserWindow.getFocusedWindow() || mainWindow
  const properties = ['openFile']
  if (opts.multiple) properties.push('multiSelections')
  const filters = opts.onlyImages
    ? [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'] }]
    : undefined
  const result = await dialog.showOpenDialog(win, {
    title: opts.title || '选择引用文件',
    properties,
    filters,
  })
  return { canceled: result.canceled, filePaths: result.filePaths }
})

app.on('before-quit', () => {
  embeddedBrowserManager?.destroyAll()
  if (isDev && !browserHostOnly) stopDevBridge()
  if (!isDev && !browserHostOnly) stopPackagedRuntime()
})

if (gotSingleInstanceLock) {
  app.whenReady().then(() => {
    if (browserHostOnly) {
      startBrowserHostMode()
      return
    }
    if (process.platform === 'darwin' && app.dock && !appIcon.isEmpty()) {
      app.dock.setIcon(appIcon)
    }
    createWindow()

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow()
    })
  })

  app.on('window-all-closed', () => {
    if (browserHostOnly) {
      app.quit()
      return
    }
    if (process.platform !== 'darwin') app.quit()
  })
}
