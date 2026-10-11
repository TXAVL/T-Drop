/**
 * System tray icon + context menu.
 *
 * The panel has no taskbar button and no window chrome, so the tray is the
 * user's handle on the app: show/hide, toggle incognito, and quit. Menu item
 * state (checkmarks) is rebuilt every time the menu opens so it always reflects
 * current settings.
 */
import { Menu, Tray, app, nativeImage, Notification, screen, nativeTheme } from 'electron'
import { existsSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { PATHS } from '../store/paths'
import { loadSettings, saveSettings } from '../store/settings'
import { getMainWindow, setVisible, repositionWindow, getDisplayListOptions, registerWindowRepositionListener, popUpAndRetract, sendToMainWindow } from './window'
import { findAvailableTxaBackups, previewTxaBackup } from '../store/backup'
import type { StickPosition } from '../../shared/types'
import { pushState } from './state'
import { TRANSLATIONS, en } from '../../src/i18n/translations'

let tray: Tray | null = null
let themeListenerRegistered = false

/** Build a tiny monochrome tray icon if no on-disk icon exists (first run). */
function fallbackIcon(): Electron.NativeImage {
  // 16x16 transparent PNG with a centered accent dot.
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAW0lEQVR4AcXOMQ4AIQhF4eD9' +
      '/yWhVSChGAyMKlmJUqCYjCDxgi+gnqEVREe0g1FXuATdQI/CBXQMvABjgn0wAbJBHzPmJ2gB' +
      '1mYAAAAASUVORK5CYII=',
    'base64'
  )
  return nativeImage.createFromBuffer(png).resize({ width: 16, height: 16 })
}

/**
 * Detects whether the Windows taskbar/system tray is using light mode.
 *
 * Windows 10/11 allows a "Custom" theme where the taskbar (Windows mode)
 * can be Light while apps are Dark (or vice versa).
 * The authoritative source is the registry key `SystemUsesLightTheme`:
 *   1 = Light taskbar (requires dark tray icon)
 *   0 = Dark taskbar (requires white tray icon)
 *
 * Falls back to `!nativeTheme.shouldUseDarkColors` on non-Windows or when unreadable.
 */
export function isTaskbarLightTheme(): boolean {
  if (process.platform === 'win32') {
    try {
      const out = execFileSync(
        'reg',
        ['query', 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Themes\\Personalize', '/v', 'SystemUsesLightTheme'],
        { windowsHide: true, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
      )
      const text = String(out ?? '')
      const m = text.match(/SystemUsesLightTheme\s+REG_DWORD\s+(0x[0-9a-fA-F]+|\d+)/i)
      if (m && m[1]) {
        const val = parseInt(m[1], 16)
        return val === 1
      }
    } catch {
      // Best-effort registry check; fall back to nativeTheme below.
    }
  }
  return !nativeTheme.shouldUseDarkColors
}

/** Resolves the appropriate 32x32 tray icon based on the current taskbar theme. */
export function getTrayImage(): Electron.NativeImage {
  const isLight = isTaskbarLightTheme()
  const preferredPath = isLight ? PATHS.trayDarkIcon() : PATHS.trayIcon()
  const fallbackPath = PATHS.trayIcon()

  const resolvedPath = existsSync(preferredPath)
    ? preferredPath
    : (existsSync(fallbackPath) ? fallbackPath : null)

  if (resolvedPath) {
    // Load and resize to exactly 32x32. Windows system tray renders icons at 16x16
    // logical pixels but uses 32x32 physical pixels on 2x DPI displays.
    // Using a single 32x32 image with no scaleFactor trickery is the most reliable
    // approach — the OS scales it automatically.
    return nativeImage.createFromPath(resolvedPath).resize({ width: 32, height: 32, quality: 'best' })
  }

  return fallbackIcon()
}

/** Dynamically switches tray icon image when system/taskbar theme updates. */
export function updateTrayIcon(): void {
  if (!tray || tray.isDestroyed()) return
  try {
    const image = getTrayImage()
    tray.setImage(image)
  } catch (err) {
    console.error('[Tray] Failed to update tray icon image:', err)
  }
}
export function detectSystemLanguage(): string {
  try {
    const sysLangs = app.getPreferredSystemLanguages ? app.getPreferredSystemLanguages() : []
    for (const raw of sysLangs) {
      const first = (raw || '').toLowerCase()
      if (first.startsWith('vi')) return 'vi'
      if (first.startsWith('zh-tw') || first.startsWith('zh-hk')) return 'zh-TW'
      if (first.startsWith('zh')) return 'zh-CN'
      if (first.startsWith('es')) return 'es'
      if (first.startsWith('fr')) return 'fr'
      if (first.startsWith('de')) return 'de'
      if (first.startsWith('hi')) return 'hi'
      if (first.startsWith('ja')) return 'ja'
      if (first.startsWith('ru')) return 'ru'
      if (first.startsWith('it')) return 'it'
      if (first.startsWith('pt')) return 'pt'
      if (first.startsWith('ko')) return 'ko'
      if (first.startsWith('ar')) return 'ar'
      if (first.startsWith('fa')) return 'fa'
      if (first.startsWith('bn')) return 'bn'
      if (first.startsWith('tr')) return 'tr'
      if (first.startsWith('pl')) return 'pl'
      if (first.startsWith('nl')) return 'nl'
      if (first.startsWith('sv')) return 'sv'
      if (first.startsWith('id')) return 'id'
      if (first.startsWith('uk')) return 'uk'
      if (first.startsWith('el')) return 'el'
      if (first.startsWith('cs')) return 'cs'
      if (first.startsWith('ro')) return 'ro'
      if (first.startsWith('hu')) return 'hu'
      if (first.startsWith('da')) return 'da'
      if (first.startsWith('fi')) return 'fi'
      if (first.startsWith('th')) return 'th'
      if (first.startsWith('he')) return 'he'
      if (first.startsWith('no') || first.startsWith('nb') || first.startsWith('nn')) return 'no'
    }
  } catch {}

  try {
    const locale = (app.getLocale ? app.getLocale() : '').toLowerCase()
    if (locale.startsWith('vi')) return 'vi'
  } catch {}

  // Check timezone for Vietnam / Indochina
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || ''
    if (tz.includes('Ho_Chi_Minh') || tz.includes('Saigon') || tz.includes('Hanoi')) {
      return 'vi'
    }
    if (new Date().getTimezoneOffset() === -420) {
      return 'vi'
    }
  } catch {}

  return 'en'
}

export function getTrayText(settingsLang: string | undefined, key: keyof typeof en['tray']): string {
  let langCode = settingsLang || 'system'
  if (langCode === 'system') {
    langCode = detectSystemLanguage()
  }
  const dict = TRANSLATIONS[langCode]
  const dictVal = (dict?.tray as any)?.[key]
  const enVal = (en.tray as any)?.[key]
  return String(dictVal || enVal || key)
}

export function createTray(): Tray {
  const image = getTrayImage()
  tray = new Tray(image)
  tray.setToolTip('T-Drop')

  // Register system theme change listener once
  if (!themeListenerRegistered) {
    themeListenerRegistered = true
    nativeTheme.on('updated', () => {
      updateTrayIcon()
    })
  }

  // Show welcome notification or auto-detect backup on first run
  if (!existsSync(PATHS.indexFile())) {
    try {
      if (Notification.isSupported()) {
        const initialSettings = loadSettings()
        const resolvedLang = initialSettings.language === 'system' ? detectSystemLanguage() : initialSettings.language
        const isVi = resolvedLang === 'vi'

        // Check if any existing .txa backup files are present
        const backups = findAvailableTxaBackups()
        if (backups.length > 0) {
          const newest = backups[0]
          const notif = new Notification({
            title: isVi ? 'T-Drop - Phát hiện bản sao lưu' : 'T-Drop - Backup Detected',
            body: isVi
              ? `Tìm thấy bản sao lưu "${newest.fileName}". Bấm để khôi phục dữ liệu!`
              : `Found backup "${newest.fileName}". Click to restore your data!`,
            icon: PATHS.icon()
          })
          notif.on('click', () => {
            const win = getMainWindow()
            if (win) {
              setVisible(true)
              win.focus()
              const preview = previewTxaBackup(newest.filePath)
              sendToMainWindow('backup:file-opened', {
                filePath: newest.filePath,
                manifest: preview.manifest,
                autoDetected: true
              })
            }
          })
          notif.show()
        } else {
          new Notification({
            title: getTrayText(resolvedLang, 'welcomeTitle'),
            body: getTrayText(resolvedLang, 'welcomeBody'),
            icon: PATHS.icon()
          }).show()
        }
      }
    } catch { /* ignore */ }
  }

  function buildDisplaySubmenu(): Electron.MenuItemConstructorOptions[] {
    const options = getDisplayListOptions()
    return options.map((d) => ({
      label: d.label,
      type: 'radio' as const,
      checked: d.isCurrent,
      click: () => {
        // Persist workArea (not bounds) — geometry.ts Tier-2 fuzzy match compares
        // d.workArea against savedWorkArea. Storing bounds (which includes the taskbar)
        // causes a ~40px mismatch that exceeds BOUNDS_TOLERANCE, breaking cross-reboot recovery.
        const next = saveSettings({
          stickDisplayId: d.id,
          stickDisplayWorkArea: d.workArea,
          stickDisplayScaleFactor: d.scaleFactor
        })
        pushState.settings(next)
        repositionWindow()
        popUpAndRetract(1500)
        rebuild()
      }
    }))
  }

  function buildStickSubmenu(current: StickPosition): Electron.MenuItemConstructorOptions[] {
    const settings = loadSettings()
    return ([
      { pos: 'left' as const, labelKey: 'left' as const },
      { pos: 'right' as const, labelKey: 'right' as const },
      { pos: 'top' as const, labelKey: 'top' as const }
    ]).map(({ pos, labelKey }) => ({
      label: getTrayText(settings.language, labelKey as any) || (pos === 'top' ? 'Top' : pos),
      type: 'radio' as const,
      checked: current === pos,
      click: () => {
        const next = saveSettings({ stickPosition: pos })
        pushState.settings(next)
        repositionWindow()
        popUpAndRetract(1500)
        rebuild()
      }
    }))
  }


  const rebuild = () => {
    const settings = loadSettings()
    const t = (k: keyof typeof en['tray']) => getTrayText(settings.language, k)

    const menu = Menu.buildFromTemplate([
      {
        label: t('showClipboard'),
        click: () => {
          console.log('[Main] Context menu "Show Clipboard" clicked')
          setVisible(true)
          getMainWindow()?.focus()
          pushState.togglePanel()
        }
      },
      {
        label: t('settings'),
        click: () => {
          console.log('[Main] Context menu "Settings" clicked')
          setVisible(true)
          getMainWindow()?.focus()
          pushState.openSettings()
        }
      },
      { type: 'separator' },
      {
        label: t('incognito'),
        type: 'checkbox',
        checked: settings.incognito,
        click: (item) => {
          const next = saveSettings({ incognito: item.checked })
          pushState.settings(next)
          applyIncognito(next.incognito)
          rebuild()
        }
      },
      {
        label: t('hoverTrigger'),
        type: 'checkbox',
        checked: settings.hoverActivation ?? true,
        click: (item) => {
          const next = saveSettings({
            hoverActivation: item.checked,
            suppressInFullscreen: item.checked ? true : false
          })
          pushState.settings(next)
          rebuild()
        }
      },
      { type: 'separator' },
      {
        label: t('stickTo'),
        submenu: buildStickSubmenu(settings.stickPosition)
      },
      {
        label: t('display'),
        submenu: buildDisplaySubmenu()
      },
      ...(!app.isPackaged
        ? [
            { type: 'separator' as const },
            {
              label: 'Toggle DevTools',
              click: () => {
                const wc = getMainWindow()?.webContents
                if (wc) {
                  if (wc.isDevToolsOpened()) {
                    wc.closeDevTools()
                  } else {
                    wc.openDevTools({ mode: 'detach' })
                  }
                }
              }
            }
          ]
        : []),
      { type: 'separator' },
      {
        label: t('quit'),
        click: () => {
          app.quit()
        }
      }
    ])
    tray?.setContextMenu(menu)
  }

  tray.on('click', () => {
    updateTrayIcon()
    console.log('[Main] Tray icon left-clicked')
    const win = getMainWindow()
    if (!win) return
    setVisible(true)
    pushState.togglePanel()
  })

  // Rebuild menu dynamically right before showing to ensure displays & checkmarks are 100% current.
  tray.on('right-click', () => {
    updateTrayIcon()
    rebuild()
    tray?.popUpContextMenu()
  })

  // Listen for display changes to keep tray context menu updated in real-time (register once).
  if (!screenListenersRegistered) {
    screenListenersRegistered = true
    screen.on('display-added', () => trayMenuRebuilder?.())
    screen.on('display-removed', () => trayMenuRebuilder?.())
    screen.on('display-metrics-changed', () => trayMenuRebuilder?.())
    registerWindowRepositionListener(() => trayMenuRebuilder?.())
  }

  trayMenuRebuilder = rebuild
  rebuild()
  return tray
}

let screenListenersRegistered = false
let trayMenuRebuilder: (() => void) | null = null

export function rebuildTrayMenu(): void {
  trayMenuRebuilder?.()
}

/**
 * Destroys and safely recreates the tray icon.
 * Used when Windows Explorer restarts/crashes (TaskbarCreated event).
 */
export function refreshTray(): void {
  try {
    if (tray && !tray.isDestroyed()) {
      tray.destroy()
      tray = null
    }
  } catch (err) {
    console.error('[Tray] Error destroying old tray on refresh:', err)
  }
  createTray()
}

/** Reflect incognito toggle into the watcher without the renderer round-trip. */
let incognitoApply: ((v: boolean) => void) | null = null
export function registerIncognitoApplier(fn: (v: boolean) => void): void {
  incognitoApply = fn
}
function applyIncognito(v: boolean): void {
  incognitoApply?.(v)
}
