import { BrowserWindow } from 'electron'
import { join } from 'node:path'

let purchaseWindow: BrowserWindow | null = null

export function getPurchaseWindow(): BrowserWindow | null {
  return purchaseWindow
}

export function createPurchaseWindow(): void {
  if (purchaseWindow && !purchaseWindow.isDestroyed()) {
    purchaseWindow.show()
    purchaseWindow.focus()
    return
  }

  purchaseWindow = new BrowserWindow({
    width: 480,
    height: 700,
    minWidth: 440,
    minHeight: 620,
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
    purchaseWindow.loadURL(`${base}#/purchase`)
  } else {
    purchaseWindow.loadFile(join(__dirname, '../renderer/index.html'), { hash: 'purchase' })
  }

  purchaseWindow.once('ready-to-show', () => {
    if (!purchaseWindow || purchaseWindow.isDestroyed()) return
    purchaseWindow.setAlwaysOnTop(true, 'screen-saver')
    purchaseWindow.show()
    purchaseWindow.focus()
  })

  purchaseWindow.on('closed', () => {
    purchaseWindow = null
  })
}

export function closePurchaseWindow(): void {
  if (purchaseWindow && !purchaseWindow.isDestroyed()) {
    purchaseWindow.close()
  }
}
