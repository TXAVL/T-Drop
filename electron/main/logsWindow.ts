import { BrowserWindow } from 'electron'
import { join } from 'node:path'

/**
 * Standalone "Logs & diagnostics" window.
 *
 * It used to be a modal inside the shelf, which the shelf closed whenever the
 * cursor left its blade (the copy buttons sat outside it). A real window is
 * focusable, draggable and never touched by the shelf's hover logic.
 */
let logsWindow: BrowserWindow | null = null

export function createLogsWindow(): void {
  if (logsWindow && !logsWindow.isDestroyed()) {
    if (logsWindow.isMinimized()) logsWindow.restore()
    logsWindow.show()
    logsWindow.focus()
    return
  }

  logsWindow = new BrowserWindow({
    width: 760,
    height: 620,
    minWidth: 520,
    minHeight: 420,
    center: true,
    show: false,
    frame: false,
    resizable: true,
    backgroundColor: '#0d0d11',
    webPreferences: {
      preload: join(__dirname, '../preload/index.cjs'),
      nodeIntegration: false,
      contextIsolation: true
    }
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    const base = process.env.ELECTRON_RENDERER_URL.endsWith('/')
      ? process.env.ELECTRON_RENDERER_URL
      : `${process.env.ELECTRON_RENDERER_URL}/`
    void logsWindow.loadURL(`${base}#/logs`)
  } else {
    void logsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'logs' })
  }

  logsWindow.once('ready-to-show', () => {
    if (!logsWindow || logsWindow.isDestroyed()) return
    logsWindow.show()
    logsWindow.focus()
  })

  logsWindow.on('closed', () => {
    logsWindow = null
  })
}

export function closeLogsWindow(): void {
  if (logsWindow && !logsWindow.isDestroyed()) logsWindow.close()
}
