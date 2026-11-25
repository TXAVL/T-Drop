import { app, BrowserWindow } from 'electron'
import { join } from 'node:path'
import { loadSettings, pushState, saveSettings } from './state'

/**
 * Standalone "What's New" feature showcase window (#/whats-new).
 *
 * Opens once per new app version for returning users (completely separate from
 * the full Welcome Tour), and records `lastSeenChangelogVersion` on close so it
 * never reappears for the same version.
 */
let whatsNewWindow: BrowserWindow | null = null

export function createWhatsNewWindow(): void {
  if (whatsNewWindow && !whatsNewWindow.isDestroyed()) {
    if (whatsNewWindow.isMinimized()) whatsNewWindow.restore()
    whatsNewWindow.show()
    whatsNewWindow.focus()
    return
  }

  whatsNewWindow = new BrowserWindow({
    width: 720,
    height: 570,
    minWidth: 580,
    minHeight: 480,
    center: true,
    show: false,
    frame: false,
    resizable: true,
    backgroundColor: '#0c0c10',
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
    void whatsNewWindow.loadURL(`${base}#/whats-new`)
  } else {
    void whatsNewWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'whats-new' })
  }

  whatsNewWindow.once('ready-to-show', () => {
    if (!whatsNewWindow || whatsNewWindow.isDestroyed()) return
    whatsNewWindow.show()
    whatsNewWindow.focus()
  })

  whatsNewWindow.on('closed', () => {
    whatsNewWindow = null
    const ver = app.getVersion()
    const settings = loadSettings()
    if (settings.lastSeenChangelogVersion !== ver) {
      const next = saveSettings({ lastSeenChangelogVersion: ver })
      pushState.settings(next)
    }
  })
}

export function closeWhatsNewWindow(): void {
  if (whatsNewWindow && !whatsNewWindow.isDestroyed()) whatsNewWindow.close()
}
