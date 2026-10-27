import { BrowserWindow } from 'electron'
import { join } from 'node:path'

let purchaseWindow: BrowserWindow | null = null
let purchaseMode: 'buy' | 'renew' = 'buy'

export function getPurchaseWindow(): BrowserWindow | null {
  return purchaseWindow
}

export function createPurchaseWindow(mode: 'buy' | 'renew' = 'buy'): void {
  const hash = mode === 'renew' ? 'renew' : 'purchase'
  if (purchaseWindow && !purchaseWindow.isDestroyed()) {
    // Buy and Renew are different screens: switch the open window instead of
    // re-focusing whatever it was last showing.
    if (purchaseMode !== mode) {
      purchaseMode = mode
      loadPurchaseView(purchaseWindow, hash)
    }
    purchaseWindow.show()
    purchaseWindow.focus()
    return
  }
  purchaseMode = mode

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

  loadPurchaseView(purchaseWindow, hash)

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

function loadPurchaseView(win: BrowserWindow, hash: 'purchase' | 'renew'): void {
  if (process.env.ELECTRON_RENDERER_URL) {
    const base = process.env.ELECTRON_RENDERER_URL.endsWith('/')
      ? process.env.ELECTRON_RENDERER_URL
      : `${process.env.ELECTRON_RENDERER_URL}/`
    void win.loadURL(`${base}#/${hash}`)
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'), { hash })
  }
}

export function closePurchaseWindow(): void {
  if (purchaseWindow && !purchaseWindow.isDestroyed()) {
    purchaseWindow.close()
  }
}
