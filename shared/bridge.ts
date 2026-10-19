/**
 * Type definition for the preload bridge API surface.
 *
 * Both the preload (implements) and renderer (consumes) import this so the
 * contract lives in one place. The actual implementation lives in the preload;
 * the renderer only ever sees `window.edge` typed as this interface.
 */
import type { Settings } from './types'
import type { DragRequest } from './types'

export interface EdgeApi {
  /* Renderer -> Main */
  loadState: () => Promise<{
    items: import('./types').ClipboardItemDto[]
    settings: Settings
    version: string
    isStoreBuild?: boolean
    updateInfo?: {
      hasUpdate: boolean
      latestVersion: string
      downloaded: boolean
      notesUrl?: string
      downloadProgress?: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }
    } | null
  }>
  setPinned: (id: string, pinned: boolean) => Promise<import('./types').ClipboardItemDto[]>
  deleteItem: (id: string) => Promise<import('./types').ClipboardItemDto[]>
  deleteBatchItems: (ids: string[]) => Promise<import('./types').ClipboardItemDto[]>
  clearItems: () => Promise<import('./types').ClipboardItemDto[]>
  getFullText: (id: string) => Promise<string>
  removeSubitem: (req: DragRequest) => Promise<boolean>
  copyItem: (id: string) => Promise<boolean>
  copySubitem: (req: DragRequest) => Promise<boolean>
  pasteItem: (id: string) => Promise<boolean>
  pasteSubitem: (req: DragRequest) => Promise<boolean>
  pasteEmoji: (text: string) => Promise<boolean>
  installUpdate: () => Promise<void>
  checkForUpdatesManual: () => Promise<{ status: string; version?: string; error?: string }>
  startUpdateDownload: () => Promise<void>
  dismissUpdate: () => Promise<void>
  getUpdateState: () => Promise<{
    hasUpdate: boolean
    latestVersion: string
    downloaded: boolean
    downloadProgress?: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }
  } | null>
  quitApp: () => Promise<void>
  /**
   * Begin a native OS drag-out. Fire-and-forget: must be called synchronously
   * from the DOM `dragstart` event, and main calls `event.sender.startDrag`.
   */
  startDrag: (req: DragRequest) => void
  /**
   * Pre-stage a drag request in the background (e.g. on hover or pointerdown)
   * so drag initiation is 0ms.
   */
  prestageDrag: (req: DragRequest) => void
  addFiles: (paths: string[]) => Promise<import('./types').ClipboardItemDto[]>
  addItemData: (data: import('./types').ItemData) => Promise<import('./types').ClipboardItemDto[]>
  mergeItems: (sourceId: string, targetId: string) => Promise<import('./types').MergeResult>
  splitItem: (req: import('./types').DragRequest) => Promise<boolean>
  updateSettings: (patch: Partial<Settings>) => Promise<Settings>
  refreshLaunchAtLogin: () => Promise<Settings>
  setInteractive: (value: boolean) => Promise<void>
  setPreviewMode: (active: boolean) => Promise<void>
  pauseHotkey: (paused: boolean) => Promise<void>
  revealFile: (path: string) => Promise<boolean>
  minimizeWindow: () => Promise<void>
  focusWindow: (focusable?: boolean) => Promise<void>
  getDisplays: () => Promise<import('./types').DisplayInfo[]>
  setInternalDrag: (active: boolean) => void
  broadcastTutorialStep: (step: number) => void
  createBackup: (suggestedPath?: string) => Promise<{ ok: boolean; filePath?: string; fileSizeBytes?: number; itemsCount?: number; imagesCount?: number; error?: string }>
  previewBackup: (filePath?: string) => Promise<{ ok: boolean; filePath?: string; manifest?: { app: string; version: string; createdAt: string; itemsCount: number; imagesCount: number }; error?: string }>
  restoreBackup: (filePath: string, mode?: 'merge' | 'overwrite') => Promise<{ ok: boolean; restoredItemsCount?: number; mode?: 'merge' | 'overwrite'; error?: string }>
  copyImageDataUrl: (dataUrl: string) => Promise<boolean>
  saveImageFile: (req: { dataUrl: string; defaultName?: string }) => Promise<{ ok: boolean; filePath?: string; error?: string }>
  saveTextFile: (req: { content: string; defaultName?: string }) => Promise<{ ok: boolean; filePath?: string; error?: string }>
  getImageDataUrl?: (imageSrc: string) => Promise<string | null>
  extractOcrText?: (req: { imageSrc: string; lang?: string }) => Promise<{ ok: boolean; text?: string; confidence?: number; linesCount?: number; wordsCount?: number; error?: string }>
  onOcrProgress?: (cb: (info: { progress: number; status: string }) => void) => () => void
  trimMemory: () => Promise<{ ok: boolean; mainRssMb: number }>
  getLicenseDeviceInfo: () => Promise<{ hardwareId: string; pcName: string; hwHash: string; isPro: boolean; role: string; key?: string; userName?: string }>
  activateLicense: (key: string) => Promise<{ ok: boolean; code?: string; message: string; role?: string; userName?: string; expiresAt?: string | null }>
  deactivateLicense: () => Promise<boolean>
  readClipboardText?: () => Promise<string>
  generateLicenseKey: (hwHash?: string) => Promise<string>
  openPurchaseWindow?: () => Promise<void>
  closePurchaseWindow?: () => Promise<void>
  getSystemLogs?: (maxLines?: number) => Promise<{ logs: string; path: string }>
  openLogFolder?: () => Promise<boolean>
  clearSystemLogs?: () => Promise<boolean>
  writeSystemLog?: (level: 'INFO' | 'WARN' | 'ERROR', tag: string, message: string) => Promise<boolean>
  generateDiagnostics?: () => Promise<{ ok: boolean; logs: string; path: string }>
  onBackupFileOpened?: (cb: (info: { filePath: string; manifest?: { app: string; version: string; createdAt: string; itemsCount: number; imagesCount: number } }) => void) => () => void

  /* Main -> Renderer */
  onItems: (cb: (items: import('./types').ClipboardItemDto[], meta?: { reason?: 'usage' | 'capture' }) => void) => () => void
  onSettings: (cb: (settings: Settings) => void) => () => void
  onToggle: (cb: (open?: boolean) => void) => () => void
  onOpenSettings: (cb: () => void) => () => void
  onDragEnd: (cb: () => void) => () => void
  onInternalDrop: (cb: (pos: { x: number; y: number }) => void) => () => void
  onCursorEdge: (cb: (data: {
    x: number
    y: number
    inEdge: boolean
    inZone: boolean
    stickPosition: import('./types').StickPosition
    displayWidth: number
    displayHeight: number
  }) => void) => () => void
  onToast: (cb: (toast: { id: string; message: string; tone: 'info' | 'error'; params?: Record<string, string | number> }) => void) => () => void
  onCopyFlare: (cb: () => void) => () => void
  onTutorialStep: (cb: (step: number) => void) => () => void
  onUpdateAvailable: (cb: (info: { version: string; notesUrl?: string }) => void) => () => void
  onUpdateProgress: (cb: (progress: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }) => void) => () => void
  onUpdateDownloaded: (cb: (info: { version: string }) => void) => () => void
  onUpdateError: (cb: (info: { message: string; version?: string; phase: 'check' | 'download' | 'install' }) => void) => () => void
}
