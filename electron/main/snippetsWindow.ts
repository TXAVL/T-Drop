import { BrowserWindow } from 'electron'
import { join } from 'node:path'

/**
 * Standalone Snippets editor. Typing needs real keyboard focus, which the
 * shelf window never takes, so editing lives in its own focusable window.
 */
let snippetsWindow: BrowserWindow | null = null

export function createSnippetsWindow(): void {
  if (snippetsWindow && !snippetsWindow.isDestroyed()) {
    if (snippetsWindow.isMinimized()) snippetsWindow.restore()
    snippetsWindow.show()
    snippetsWindow.focus()
    return
  }

  snippetsWindow = new BrowserWindow({
    width: 880,
    height: 600,
    minWidth: 640,
    minHeight: 440,
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
    void snippetsWindow.loadURL(`${base}#/snippets`)
  } else {
    void snippetsWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'snippets' })
  }

  snippetsWindow.once('ready-to-show', () => {
    if (!snippetsWindow || snippetsWindow.isDestroyed()) return
    snippetsWindow.show()
    snippetsWindow.focus()
  })

  snippetsWindow.on('closed', () => {
    snippetsWindow = null
  })
}

export function closeSnippetsWindow(): void {
  if (snippetsWindow && !snippetsWindow.isDestroyed()) snippetsWindow.close()
}
