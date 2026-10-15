import { app, net } from 'electron'
import * as path from 'path'
import * as fs from 'fs'
import { isStoreBuild } from './config'
import { pushState } from './state'
import { getSettings } from '../store/settings'
import { resolveUpdateMode } from '../../shared/types'
import { getMainWindow, setVisible, sendToMainWindow } from './window'

export interface CachedUpdateInfo {
  hasUpdate: boolean
  latestVersion: string
  downloaded: boolean
  downloadProgress?: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }
}

// Module-level reference to the single autoUpdater instance and cached update state.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _autoUpdater: any = null
let _cachedUpdateInfo: CachedUpdateInfo | null = null
let _downloadCancellationToken: any = null

let periodicCheckTimer: ReturnType<typeof setInterval> | null = null
let bgCheckTimer: ReturnType<typeof setTimeout> | null = null
let lastCheckTimestamp = 0
let isCheckingInProgress = false

let lastNotifiedAvailableVersion: string | null = null
let lastNotifiedDownloadedVersion: string | null = null

// Periodic check interval: every 20 minutes
const PERIODIC_CHECK_INTERVAL_MS = 20 * 60 * 1000

export function getCachedUpdateState(): CachedUpdateInfo | null {
  return _cachedUpdateInfo
}

export function clearCachedUpdateState(): void {
  _cachedUpdateInfo = null
}

export function cancelUpdateDownload(): void {
  console.log('[AutoUpdater] Cancelling update download...')
  if (_downloadCancellationToken) {
    try {
      _downloadCancellationToken.cancel()
      _downloadCancellationToken.dispose()
    } catch (err) {
      console.warn('[AutoUpdater] Error disposing download token:', err)
    }
    _downloadCancellationToken = null
  }

  if (_autoUpdater) {
    try {
      const providerToken = (_autoUpdater as any).updateInfoAndProvider?.cancellationToken
      if (providerToken && !providerToken.cancelled) {
        providerToken.cancel()
        providerToken.dispose?.()
      }
    } catch {}
    try {
      const internalToken = (_autoUpdater as any).cancellationToken
      if (internalToken && !internalToken.cancelled) {
        internalToken.cancel()
        internalToken.dispose?.()
      }
    } catch {}
  }

  clearCachedUpdateState()
}

function getNotificationIcon(): string | undefined {
  try {
    const candidates = [
      path.join(app.getAppPath(), 'resources', 'icon.png'),
      path.join(process.resourcesPath || '', 'icon.png'),
      path.join(process.cwd(), 'resources', 'icon.png')
    ]
    for (const c of candidates) {
      if (fs.existsSync(c)) return c
    }
  } catch {
    /* ignore */
  }
  return undefined
}

/**
 * Shows a Windows desktop notification when an update is found on GitHub.
 */
export function showUpdateAvailableNotification(version: string, isAuto: boolean): void {
  if (isStoreBuild()) return
  if (lastNotifiedAvailableVersion === version) return
  lastNotifiedAvailableVersion = version

  try {
    const ElectronNotification = (require('electron') as any).Notification
    if (ElectronNotification && typeof ElectronNotification.isSupported === 'function' && ElectronNotification.isSupported()) {
      const notif = new ElectronNotification({
        title: `T-Drop — Có bản cập nhật mới v${version}!`,
        body: isAuto
          ? `Đang tự động tải ngầm bản cập nhật v${version}. Bạn có thể tiếp tục sử dụng bình thường.`
          : `Phiên bản mới v${version} đã sẵn sàng trên GitHub. Nhấn vào đây để tải về và cập nhật.`,
        icon: getNotificationIcon(),
        silent: false
      })
      notif.on('click', () => {
        try {
          setVisible(true)
          const win = getMainWindow()
          if (win && !win.isDestroyed()) {
            win.show()
            win.focus()
          }
          pushState.togglePanel(true)
        } catch {
          /* ignore */
        }
        if (!isAuto) {
          void startUpdateDownload()
        }
      })
      notif.show()
    }
  } catch (err) {
    console.warn('[AutoUpdater] Failed to show update available notification:', err)
  }
}

/**
 * Shows a Windows desktop notification when the update download completes.
 */
export function showUpdateDownloadedNotification(version: string): void {
  if (isStoreBuild()) return
  if (lastNotifiedDownloadedVersion === version) return
  lastNotifiedDownloadedVersion = version

  try {
    const ElectronNotification = (require('electron') as any).Notification
    if (ElectronNotification && typeof ElectronNotification.isSupported === 'function' && ElectronNotification.isSupported()) {
      const notif = new ElectronNotification({
        title: `T-Drop — Bản cập nhật v${version} đã tải xong!`,
        body: `Bản cập nhật v${version} đã sẵn sàng. Nhấn vào đây để khởi động lại và áp dụng ngay.`,
        icon: getNotificationIcon(),
        silent: false
      })
      notif.on('click', () => {
        quitAndInstallUpdate()
      })
      notif.show()
    }
  } catch (err) {
    console.warn('[AutoUpdater] Failed to show update downloaded notification:', err)
  }
}

// Backward-compatible alias
export function showUpdateSystemNotification(version: string): void {
  showUpdateAvailableNotification(version, false)
}

/**
 * Called from ipc.ts when the renderer clicks "Restart to Update".
 */
export function quitAndInstallUpdate(): void {
  if (isStoreBuild()) return
  if (!app.isPackaged) {
    console.log('[AutoUpdater] Dev mode — quitAndInstall is simulated. In packaged builds, app restarts and updates.')
    sendToMainWindow('ui:toast', {
      id: `dev-restart-${Date.now()}`,
      message: 'Dev Mode: Update verified! In packaged .exe builds, T-Drop will restart and install now.',
      tone: 'info'
    })
    return
  }
  if (!_autoUpdater) {
    console.error('[AutoUpdater] quitAndInstall requested but autoUpdater is not initialized.')
    return
  }
  console.log('[AutoUpdater] quitAndInstall triggered by renderer button.')
  try {
    // isSilent = false: launch the setup installer UI (avoids background silent uninstall wipes)
    // isForceRunAfter = true: launch app after setup completes
    _autoUpdater.quitAndInstall(false, true)

    // Force-terminate all windows and kill app process shortly after launching installer to unlock files
    setTimeout(() => {
      try {
        const { BrowserWindow } = require('electron')
        BrowserWindow.getAllWindows().forEach((w: any) => {
          if (!w.isDestroyed()) w.destroy()
        })
        app.exit(0)
      } catch {}
    }, 500)
  } catch (err) {
    console.error('[AutoUpdater] quitAndInstall failed:', err)
  }
}

export function stopPeriodicUpdateCheck(): void {
  if (periodicCheckTimer !== null) {
    clearInterval(periodicCheckTimer)
    periodicCheckTimer = null
  }
}

export function startPeriodicUpdateCheck(): void {
  if (isStoreBuild()) return
  stopPeriodicUpdateCheck()
  const mode = resolveUpdateMode(getSettings())
  if (mode === 'off') return

  periodicCheckTimer = setInterval(() => {
    void runBackgroundUpdateCheck()
  }, PERIODIC_CHECK_INTERVAL_MS)
}

/**
 * Syncs the download flags on electron-updater whenever user changes settings.
 * Only 'auto' mode downloads; 'notify' checks without downloading.
 */
export function syncAutoUpdaterState(): void {
  if (isStoreBuild() || !_autoUpdater) return
  const mode = resolveUpdateMode(getSettings())
  const autoDownload = mode === 'auto'
  _autoUpdater.autoDownload = autoDownload
  _autoUpdater.autoInstallOnAppQuit = false
  console.log('[AutoUpdater] Synced mode =', mode, 'autoDownload =', autoDownload)

  if (mode === 'off') {
    stopPeriodicUpdateCheck()
  } else {
    startPeriodicUpdateCheck()
    triggerBackgroundCheck(1000)
  }
}

/**
 * Run a background check outside startup — e.g. right after the user switches
 * into 'auto' or 'notify' mode.
 */
export function triggerBackgroundCheck(delayMs = 3000): void {
  if (isStoreBuild()) return
  if (bgCheckTimer !== null) {
    clearTimeout(bgCheckTimer)
    bgCheckTimer = null
  }
  let mode: ReturnType<typeof resolveUpdateMode>
  try {
    mode = resolveUpdateMode(getSettings())
  } catch {
    return
  }
  if (mode === 'off') return
  console.log('[AutoUpdater] Background check scheduled (mode switch).')
  bgCheckTimer = setTimeout(() => {
    bgCheckTimer = null
    void runBackgroundUpdateCheck()
  }, Math.max(0, delayMs))
}

function semverCompare(v1: string, v2: string): number {
  const p1 = v1.replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0)
  const p2 = v2.replace(/^v/i, '').split('.').map((x) => parseInt(x, 10) || 0)
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0
    const n2 = p2[i] || 0
    if (n1 > n2) return 1
    if (n1 < n2) return -1
  }
  return 0
}

/**
 * Fast direct check against GitHub Releases API (< 0.5s) with a 4s max timeout.
 * Employs cache-control headers to prevent stale 304 caching.
 */
function checkGitHubReleaseFast(): Promise<{ tag_name?: string } | null> {
  return new Promise((resolve) => {
    try {
      const request = net.request({
        method: 'GET',
        url: 'https://api.github.com/repos/TXAVL/T-Drop/releases/latest'
      })
      request.setHeader('User-Agent', 'T-Drop-App')
      request.setHeader('Accept', 'application/vnd.github.v3+json')
      request.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate')
      request.setHeader('Pragma', 'no-cache')

      const timer = setTimeout(() => {
        try { request.abort() } catch { /* ignore */ }
        resolve(null)
      }, 4000)

      request.on('response', (response) => {
        let body = ''
        response.on('data', (chunk) => { body += chunk })
        response.on('end', () => {
          clearTimeout(timer)
          try {
            if (response.statusCode === 200) {
              resolve(JSON.parse(body))
            } else {
              resolve(null)
            }
          } catch {
            resolve(null)
          }
        })
      })

      request.on('error', () => {
        clearTimeout(timer)
        resolve(null)
      })

      request.end()
    } catch {
      resolve(null)
    }
  })
}

/**
 * Checks GitHub for updates in the background.
 * Uses fast GitHub API query first (< 0.5s), falling back to electron-updater.
 */
export async function runBackgroundUpdateCheck(): Promise<void> {
  if (isStoreBuild()) return
  const mode = resolveUpdateMode(getSettings())
  if (mode === 'off') return
  if (isCheckingInProgress) return

  isCheckingInProgress = true
  lastCheckTimestamp = Date.now()
  console.log('[AutoUpdater] Executing background update check (mode =', mode, ')...')

  try {
    // 1. Fast direct GitHub check
    const fastResult = await checkGitHubReleaseFast()
    if (fastResult && fastResult.tag_name) {
      const latestVersion = fastResult.tag_name.replace(/^v/i, '')
      const currentVersion = app.getVersion()
      if (semverCompare(latestVersion, currentVersion) > 0) {
        console.log(`[AutoUpdater] Background check found new version: v${latestVersion} (current: v${currentVersion})`)
        const isDownloaded = _cachedUpdateInfo?.downloaded && _cachedUpdateInfo.latestVersion === latestVersion
        if (!isDownloaded) {
          _cachedUpdateInfo = {
            hasUpdate: true,
            latestVersion,
            downloaded: false,
            downloadProgress: mode === 'auto' ? { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 } : undefined
          }
          pushState.updateAvailable({ version: latestVersion })
          showUpdateAvailableNotification(latestVersion, mode === 'auto')

          if (mode === 'auto') {
            void startUpdateDownload()
          }
        }
        return
      } else {
        console.log(`[AutoUpdater] Background check confirms app is up to date: v${currentVersion}`)
        return
      }
    }

    // 2. Fallback to electron-updater
    if (_autoUpdater) {
      const r = _autoUpdater.checkForUpdates() as unknown
      const p = r as Promise<unknown> | undefined
      if (p && typeof p.catch === 'function') {
        p.catch((err: unknown) => {
          const msg = typeof err === 'string' ? err : (err as { message?: string })?.message || ''
          if (!msg.includes('No published versions on GitHub') && !msg.includes('404')) {
            console.warn('[AutoUpdater] Fallback background check failed:', msg)
          }
        })
      }
    }
  } catch (err: any) {
    console.warn('[AutoUpdater] Background update check error:', err?.message || err)
  } finally {
    isCheckingInProgress = false
  }
}

/**
 * Called when the panel opens or user hovers.
 * Throttled to at most once every 10 minutes so it never floods GitHub.
 */
export function checkUpdateOnPanelOpen(): void {
  if (isStoreBuild()) return
  const mode = resolveUpdateMode(getSettings())
  if (mode === 'off') return

  const now = Date.now()
  if (now - lastCheckTimestamp < 10 * 60 * 1000) {
    return
  }

  void runBackgroundUpdateCheck()
}

/**
 * Manually check for updates on user click with instant fast-path resolution.
 */
export async function checkForUpdatesManual(): Promise<{ status: string; version?: string; error?: string }> {
  if (isStoreBuild()) {
    return { status: 'up-to-date', version: app.getVersion() }
  }

  // Ensure autoUpdater reference is initialized for subsequent download calls
  if (!_autoUpdater) {
    try {
      const { autoUpdater } = require('electron-updater')
      _autoUpdater = autoUpdater
      _autoUpdater.autoDownload = false
      _autoUpdater.autoInstallOnAppQuit = false
      if (!app.isPackaged) {
        _autoUpdater.forceDevUpdateConfig = true
      }
    } catch {
      /* ignore */
    }
  } else {
    _autoUpdater.autoDownload = false
    _autoUpdater.autoInstallOnAppQuit = false
  }

  // 1. Fast path: Direct GitHub API query (returns in ~300ms)
  const fastResult = await checkGitHubReleaseFast()
  if (fastResult && fastResult.tag_name) {
    const latestVersion = fastResult.tag_name.replace(/^v/i, '')
    const currentVersion = app.getVersion()
    if (semverCompare(latestVersion, currentVersion) > 0) {
      console.log(`[AutoUpdater] Fast check found new version: v${latestVersion} (current: v${currentVersion})`)
      _cachedUpdateInfo = { hasUpdate: true, latestVersion, downloaded: false }
      pushState.updateAvailable({ version: latestVersion })
      const mode = resolveUpdateMode(getSettings())
      if (mode === 'auto') {
        showUpdateAvailableNotification(latestVersion, true)
        void startUpdateDownload()
      } else {
        showUpdateAvailableNotification(latestVersion, false)
      }
      return { status: 'available', version: latestVersion }
    } else {
      console.log(`[AutoUpdater] Fast check confirms app is up to date: v${currentVersion}`)
      return { status: 'up-to-date', version: currentVersion }
    }
  }

  // 2. Fallback path: electron-updater check with 5-second race timeout
  if (_autoUpdater) {
    try {
      const checkPromise = _autoUpdater.checkForUpdates()
      const timeoutPromise = new Promise<{ updateInfo?: { version: string } }>((_, reject) =>
        setTimeout(() => reject(new Error('Update check timeout')), 5000)
      )
      const result = await Promise.race([checkPromise, timeoutPromise])
      if (result && result.updateInfo && semverCompare(result.updateInfo.version, app.getVersion()) > 0) {
        _cachedUpdateInfo = { hasUpdate: true, latestVersion: result.updateInfo.version, downloaded: false }
        pushState.updateAvailable({ version: result.updateInfo.version })
        const mode = resolveUpdateMode(getSettings())
        if (mode === 'auto') {
          showUpdateAvailableNotification(result.updateInfo.version, true)
          void startUpdateDownload()
        } else {
          showUpdateAvailableNotification(result.updateInfo.version, false)
        }
        return { status: 'available', version: result.updateInfo.version }
      }
      return { status: 'up-to-date', version: app.getVersion() }
    } catch (err: any) {
      const msg = typeof err === 'string' ? err : err?.message || ''
      if (
        msg.includes('No published versions on GitHub') ||
        msg.includes('404') ||
        msg.includes('HttpError: 404')
      ) {
        console.log('[AutoUpdater] No published releases on GitHub yet. Current version is up-to-date.')
        return { status: 'up-to-date', version: app.getVersion() }
      }
      return { status: 'error', error: msg || 'Failed to check for updates' }
    }
  }

  return { status: 'error', error: 'Failed to check for updates' }
}

/**
 * Trigger download of the update when user clicks "Download & Update" in manual mode.
 */
export async function startUpdateDownload(): Promise<void> {
  if (isStoreBuild()) return
  if (!_autoUpdater) {
    try {
      const { autoUpdater } = require('electron-updater')
      _autoUpdater = autoUpdater
      _autoUpdater.autoDownload = false
      _autoUpdater.autoInstallOnAppQuit = false
      if (!app.isPackaged) {
        _autoUpdater.forceDevUpdateConfig = true
      }
    } catch {
      return
    }
  }
  if (_cachedUpdateInfo) {
    _cachedUpdateInfo.downloadProgress = { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 }
  }
  pushState.updateProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 })

  // Initialize fresh CancellationToken
  if (_downloadCancellationToken) {
    try {
      _downloadCancellationToken.cancel()
      _downloadCancellationToken.dispose()
    } catch {}
    _downloadCancellationToken = null
  }

  try {
    const { CancellationToken } = require('electron-updater')
    _downloadCancellationToken = new CancellationToken()
  } catch {
    _downloadCancellationToken = null
  }

  try {
    try {
      await _autoUpdater.checkForUpdates()
    } catch {
      /* ignore pre-check error, attempt download */
    }
    if (_downloadCancellationToken && !_downloadCancellationToken.cancelled) {
      await _autoUpdater.downloadUpdate(_downloadCancellationToken)
    }
  } catch (err: any) {
    const msg = typeof err === 'string' ? err : err?.message || ''
    if (msg.includes('cancelled') || msg.includes('CancellationError')) {
      console.log('[AutoUpdater] Download was cancelled.')
      return
    }
    console.warn('[AutoUpdater] downloadUpdate failed, retrying with checkForUpdates first:', err)
    try {
      await _autoUpdater.checkForUpdates()
      if (_downloadCancellationToken && !_downloadCancellationToken.cancelled) {
        await _autoUpdater.downloadUpdate(_downloadCancellationToken)
      }
    } catch (retryErr: any) {
      const retryMsg = typeof retryErr === 'string' ? retryErr : retryErr?.message || ''
      if (retryMsg.includes('cancelled') || retryMsg.includes('CancellationError')) {
        console.log('[AutoUpdater] Download was cancelled on retry.')
        return
      }
      console.error('[AutoUpdater] downloadUpdate retry failed:', retryErr)
    }
  }
}

/**
 * Initializes electron-updater for GitHub release auto-updates.
 * Completely disabled on Microsoft Store (MSIX) builds to comply with Store policies.
 */
export function initAutoUpdater(): void {
  if (isStoreBuild()) {
    console.log('[AutoUpdater] Store build detected — auto-updater disabled.')
    return
  }

  try {
    const { autoUpdater } = require('electron-updater')
    _autoUpdater = autoUpdater

    const settings = getSettings()
    const mode = resolveUpdateMode(settings)
    const autoDownload = mode === 'auto'
    const shouldCheck = mode !== 'off'

    autoUpdater.logger = console
    autoUpdater.autoDownload = autoDownload
    autoUpdater.autoInstallOnAppQuit = false

    if (!app.isPackaged) {
      console.log('[AutoUpdater] Unpackaged dev build detected — enabling forceDevUpdateConfig')
      autoUpdater.forceDevUpdateConfig = true
    }

    autoUpdater.on('checking-for-update', () => {
      console.log('[AutoUpdater] Checking for update... Current version:', app.getVersion())
    })

    autoUpdater.on('update-available', (info: { version: string }) => {
      console.log('[AutoUpdater] New update available on GitHub:', info.version)
      const currentMode = resolveUpdateMode(getSettings())
      const isAuto = currentMode === 'auto'

      _cachedUpdateInfo = {
        hasUpdate: true,
        latestVersion: info.version,
        downloaded: false,
        downloadProgress: isAuto
          ? { percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 }
          : undefined
      }

      pushState.updateAvailable({ version: info.version })

      if (isAuto) {
        pushState.updateProgress({ percent: 0, transferred: 0, total: 0, bytesPerSecond: 0 })
        showUpdateAvailableNotification(info.version, true)
      } else {
        showUpdateAvailableNotification(info.version, false)
      }
    })

    autoUpdater.on('update-not-available', (info: { version: string }) => {
      console.log('[AutoUpdater] App is up to date. Latest release:', info.version, 'Current:', app.getVersion())
    })

    autoUpdater.on('download-progress', (progressObj: { percent: number; bytesPerSecond?: number; transferred?: number; total?: number }) => {
      if (!_cachedUpdateInfo || _downloadCancellationToken?.cancelled) {
        return
      }
      const percent = Math.min(100, Math.max(0, Math.round(progressObj.percent || 0)))
      console.log(`[AutoUpdater] Download progress: ${percent}%`)
      _cachedUpdateInfo.downloadProgress = {
        percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      }
      pushState.updateProgress({
        percent,
        bytesPerSecond: progressObj.bytesPerSecond,
        transferred: progressObj.transferred,
        total: progressObj.total
      })
    })

    autoUpdater.on('update-downloaded', (info: { version: string }) => {
      if (!_cachedUpdateInfo || _downloadCancellationToken?.cancelled) {
        console.log('[AutoUpdater] Download was cancelled; ignoring update-downloaded event.')
        return
      }
      console.log('[AutoUpdater] Update downloaded and ready to install:', info.version)
      _cachedUpdateInfo = { hasUpdate: true, latestVersion: info.version, downloaded: true }
      pushState.updateDownloaded({ version: info.version })
      showUpdateDownloadedNotification(info.version)
    })

    autoUpdater.on('error', (err: Error | string) => {
      const msg = typeof err === 'string' ? err : err?.message || ''
      if (msg.includes('cancelled') || msg.includes('CancellationError')) {
        console.log('[AutoUpdater] Update/download cancelled.')
        return
      }
      if (msg.includes('No published versions on GitHub') || msg.includes('404')) {
        console.log('[AutoUpdater] No published releases on GitHub yet.')
      } else {
        console.warn('[AutoUpdater] Update check error:', msg)
      }
    })

    // Start background checks and periodic timer if updates are not off
    if (shouldCheck) {
      if (!autoDownload) {
        console.log('[AutoUpdater] Notify mode: background check without auto-download.')
      }
      setTimeout(() => {
        void runBackgroundUpdateCheck()
      }, 3000)
      startPeriodicUpdateCheck()
    } else {
      console.log('[AutoUpdater] Updates disabled by user setting. Staying network-silent on startup.')
    }
  } catch (err) {
    console.error('[AutoUpdater] Initialization failed:', err)
  }
}
