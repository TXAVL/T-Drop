/** App-wide constants and environment flags for the main process. */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { app } from 'electron'

/** Mutable runtime flags (kept separate from the frozen config object). */
export const runtime = {
  /** Set true only while the app is genuinely quitting (tray -> Quit). */
  quitting: false
}

/**
 * StartupTask Id declared in resources/appx/startup-extensions.xml.
 * Must stay in sync with that file.
 */
export const STORE_STARTUP_TASK_ID = 'TDropStartup'

/**
 * True when running as the Microsoft Store / MSIX package.
 * The GitHub NSIS .exe never sets these signals.
 *
 * Detection is intentionally redundant so a single missing signal
 * (sideload, LTSC, Store update wiping extraMetadata) cannot silently
 * route a Store install down the GitHub Run-key path where it would
 * never auto-start:
 *  1. process.windowsStore (Electron sets this for packaged identity)
 *  2. APP_BUILD_TARGET === 'store' (exact stamp from electron-builder extraMetadata)
 *  3. package.json buildTarget === 'store' (on-disk stamp inside asar)
 *  4. Executable / resources path inside WindowsApps / Packages (Store install location)
 */
export function isStoreBuild(): boolean {
  if (process.windowsStore || process.env.APP_BUILD_TARGET === 'store') {
    return true
  }
  try {
    if (app.isPackaged) {
      const pkgPath = join(app.getAppPath(), 'package.json')
      if (existsSync(pkgPath)) {
        const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as { buildTarget?: string }
        if (pkg.buildTarget === 'store') {
          return true
        }
      }
    }
  } catch {
    /* unpackaged tests / app-not-ready */
  }
  // Path-based fallback: Store/MSIX installs always live under
  // WindowsApps or Packages. GitHub NSIS installs to
  // AppData/Local/Programs or Program Files and never matches.
  try {
    const exePath = (() => {
      try {
        return app.getPath('exe')
      } catch {
        return ''
      }
    })()
    const resPath = typeof process.resourcesPath === 'string' ? process.resourcesPath : ''
    const hay = `${exePath}\n${resPath}`.toLowerCase()
    if (hay.includes('\\windowsapps\\') || hay.includes('\\packages\\')) {
      return true
    }
  } catch {
    /* ignore */
  }
  return false
}

/**
 * True when this process was launched by Windows at login/startup
 * rather than by the user clicking the icon.
 *
 * GitHub NSIS passes --hidden via the Run key. Store StartupTask
 * launches with no args, so we also honor Electron's wasOpenedAtLogin
 * / wasOpenedAsHidden flags when available.
 */
export function wasLaunchedAtLogin(): boolean {
  try {
    const argv = process.argv || []
    if (argv.some((a) => a === '--hidden' || a === '--was-opened-at-login' || a === '/prefetch:1')) {
      return true
    }
    try {
      const s = app.getLoginItemSettings() as unknown as {
        wasOpenedAtLogin?: boolean
        wasOpenedAsHidden?: boolean
      }
      if (s && (s.wasOpenedAtLogin || s.wasOpenedAsHidden)) return true
    } catch {
      /* app not ready / mocked */
    }
  } catch {
    /* ignore */
  }
  return false
}

/** Should the app start silently in the tray (no focus steal, no onboarding pop)? */
export function shouldStartHidden(): boolean {
  try {
    const argv = process.argv || []
    if (argv.includes('--hidden')) return true
  } catch {
    /* ignore */
  }
  return wasLaunchedAtLogin()
}

export const APP_CONFIG = {
  appName: 'T-Drop',
  /** Custom protocol used to serve local image files to the renderer securely. */
  imageProtocol: 'edgelocal',
  is: {
    get dev(): boolean {
      return !!process.env.ELECTRON_RENDERER_URL || process.env.NODE_ENV === 'development'
    }
  }
} as const
