import { app, BrowserWindow, dialog, ipcMain, nativeImage, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const WEB_URL = process.env.CLAUDE_ORCHESTRATOR_URL || 'http://127.0.0.1:5188/'
const isDev = !app.isPackaged
const APP_DISPLAY_NAME = 'Claude Orchestrator'
const iconPath = path.join(__dirname, 'assets', 'icon.png')
const appIcon = nativeImage.createFromPath(iconPath)

if (process.platform === 'darwin') {
  app.setName(APP_DISPLAY_NAME)
}

/** @type {BrowserWindow | null} */
let mainWindow = null

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
  })

  mainWindow.loadURL(WEB_URL)

  if (isDev && process.env.CLAUDE_ORCHESTRATOR_DEVTOOLS === '1') {
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
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

app.whenReady().then(() => {
  if (process.platform === 'darwin' && app.dock && !appIcon.isEmpty()) {
    app.dock.setIcon(appIcon)
  }
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
