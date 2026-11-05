/**
 * TXA Package Index (txa-repo) updater integration.
 *
 * Detects whether T-Drop was installed via the TXA package manager (txapm)
 * from https://txavl.github.io/txa-repo/ (package: TXAVL.TDrop / tdrop).
 *
 * If installed via txa-repo:
 * 1. Checks that the TXA repository has already synced the target version
 *    (preventing premature updates when GitHub has released but repo manifest is pending).
 * 2. When upgrading, cleanly terminates T-Drop, invokes `txapm upgrade TXAVL.TDrop`,
 *    waits for the silent installer to finish, and relaunches T-Drop.
 *
 * If installed normally (standard NSIS / GitHub setup):
 * Preserves the default electron-updater workflow completely unchanged.
 */
import { app } from 'electron'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'
import { sendToMainWindow } from './window'

export const TXA_REPO_PACKAGE_ID = 'TXAVL.TDrop'
export const TXA_REPO_PACKAGE_ALIAS = 'tdrop'
export const TXA_REPO_MANIFEST_URL = 'https://txavl.github.io/txa-repo/api/txa/v1/packages/TXAVL.TDrop.json'

export function semverCompare(v1: string, v2: string): number {
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
 * Checks whether this installation was performed via the TXA package manager (txapm).
 */
export function isTxaRepoInstalled(opts?: { localAppData?: string; programData?: string }): boolean {
  if (process.env.T_DROP_INSTALL_SOURCE === 'txa' || process.env.TXAPM_INSTALL === '1') {
    return true
  }
  if (process.env.T_DROP_INSTALL_SOURCE === 'github' || process.env.T_DROP_INSTALL_SOURCE === 'standard') {
    return false
  }

  try {
    const localAppData = opts?.localAppData || process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
    const userStatePath = path.join(localAppData, 'TXA', 'state', 'installed.json')
    if (fs.existsSync(userStatePath)) {
      const content = fs.readFileSync(userStatePath, 'utf8')
      const data = JSON.parse(content)
      if (data && (data[TXA_REPO_PACKAGE_ID] || data[TXA_REPO_PACKAGE_ALIAS])) {
        return true
      }
    }
  } catch {
    /* ignore read errors */
  }

  try {
    const programData = opts?.programData || process.env.ALLUSERSPROFILE || process.env.ProgramData || 'C:\\ProgramData'
    const machineStatePath = path.join(programData, 'TXA', 'state', 'installed.json')
    if (fs.existsSync(machineStatePath)) {
      const content = fs.readFileSync(machineStatePath, 'utf8')
      const data = JSON.parse(content)
      if (data && (data[TXA_REPO_PACKAGE_ID] || data[TXA_REPO_PACKAGE_ALIAS])) {
        return true
      }
    }
  } catch {
    /* ignore read errors */
  }

  return false
}

/**
 * Finds the `txapm.exe` binary on the user's system.
 */
export function findTxapmPath(opts?: { localAppData?: string; programData?: string }): string | null {
  const localAppData = opts?.localAppData || process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local')
  const userExe = path.join(localAppData, 'TXA', 'bin', 'txapm.exe')
  if (fs.existsSync(userExe)) return userExe

  const programData = opts?.programData || process.env.ALLUSERSPROFILE || process.env.ProgramData || 'C:\\ProgramData'
  const machineExe = path.join(programData, 'TXA', 'bin', 'txapm.exe')
  if (fs.existsSync(machineExe)) return machineExe

  // Check PATH if available
  return 'txapm.exe'
}

export interface TxaRepoCheckResult {
  ok: boolean
  repoVersion: string | null
  matched: boolean
  error?: string
}

/**
 * Verifies that https://txavl.github.io/txa-repo/ has already published the target version.
 * Ensures we never trigger txapm upgrade before the repo's manifest actually contains the version.
 */
export async function checkTxaRepoVersion(
  targetVersion?: string,
  manifestUrl = TXA_REPO_MANIFEST_URL
): Promise<TxaRepoCheckResult> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 6000)

  try {
    const res = await fetch(manifestUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'T-Drop-AutoUpdater' }
    })
    if (!res.ok) {
      return { ok: false, repoVersion: null, matched: false, error: `HTTP ${res.status}` }
    }
    const data = (await res.json()) as any
    const repoLatest: string | null = (data && (data.latest || data.package?.version)) || null
    const versions: string[] = data && data.versions
      ? Array.isArray(data.versions)
        ? data.versions
        : Object.keys(data.versions)
      : []

    if (!targetVersion) {
      return { ok: true, repoVersion: repoLatest, matched: true }
    }

    const targetClean = targetVersion.replace(/^v/i, '').trim()
    const repoClean = repoLatest ? repoLatest.replace(/^v/i, '').trim() : null

    const matched =
      repoClean === targetClean ||
      versions.some((v) => v.replace(/^v/i, '').trim() === targetClean) ||
      (repoClean !== null && semverCompare(repoClean, targetClean) >= 0)

    return { ok: true, repoVersion: repoLatest, matched }
  } catch (err: any) {
    return { ok: false, repoVersion: null, matched: false, error: err?.message || String(err) }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Executes the TXA package upgrade by:
 * 1. Spawning a detached PowerShell watcher.
 * 2. Terminating this T-Drop process to release locks on executable files.
 * 3. Calling `txapm upgrade TXAVL.TDrop --force`.
 * 4. Waiting for completion and relaunching T-Drop.
 */
export async function executeTxaUpgrade(
  targetVersion: string,
  opts?: {
    txapmPath?: string
    scriptPath?: string
    logPath?: string
    appExe?: string
    pid?: number
    dryRun?: boolean
  }
): Promise<boolean> {
  if (!app.isPackaged && !opts?.dryRun) {
    console.log(`[TXA-Updater] Dev mode — simulated TXA upgrade to v${targetVersion}`)
    sendToMainWindow('ui:toast', {
      id: `dev-txa-upgrade-${Date.now()}`,
      message: `Dev Mode: TXA update verified! In packaged build, txapm will upgrade to v${targetVersion} and restart.`,
      tone: 'info'
    })
    return true
  }

  const txapmPath = opts?.txapmPath || findTxapmPath()
  if (!txapmPath) {
    console.error('[TXA-Updater] txapm executable not found.')
    return false
  }

  const tempDir = app.getPath('temp')
  const scriptPath = opts?.scriptPath || path.join(tempDir, 'tdrop-txa-upgrade.ps1')
  const logPath = opts?.logPath || path.join(tempDir, 'tdrop-txa-upgrade.log')
  const appExe = opts?.appExe || process.execPath || app.getPath('exe')
  const targetPid = opts?.pid ?? process.pid

  const psScript = `# T-Drop TXA Upgrade Script
$TargetPid = ${targetPid}
$AppExe = '${appExe.replace(/'/g, "''")}'
$Txapm = '${txapmPath.replace(/'/g, "''")}'
$LogFile = '${logPath.replace(/'/g, "''")}'

function Write-UpgradeLog($msg) {
  $time = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
  $entry = "$time - $msg"
  try { Add-Content -Path $LogFile -Value $entry -ErrorAction SilentlyContinue } catch {}
}

Write-UpgradeLog "Starting TXA upgrade for T-Drop target version ${targetVersion}..."
Write-UpgradeLog "Target PID: $TargetPid | App: $AppExe | txapm: $Txapm"

# 1. Wait for T-Drop to exit cleanly, then terminate if still running
try {
  $proc = Get-Process -Id $TargetPid -ErrorAction SilentlyContinue
  if ($proc) {
    Write-UpgradeLog "Waiting up to 6s for PID $TargetPid to exit..."
    $proc.WaitForExit(6000)
    if (-not $proc.HasExited) {
      Write-UpgradeLog "Process did not exit in 6s. Terminating forcefully..."
      Stop-Process -Id $TargetPid -Force -ErrorAction SilentlyContinue
    }
  }
} catch {
  Write-UpgradeLog "Process wait exception: $_"
}

Start-Sleep -Milliseconds 1200

# 2. Invoke txapm upgrade
Write-UpgradeLog "Calling: & '$Txapm' upgrade ${TXA_REPO_PACKAGE_ID} --force"
try {
  $out = & $Txapm upgrade ${TXA_REPO_PACKAGE_ID} --force 2>&1
  Write-UpgradeLog "txapm output: $out"
} catch {
  Write-UpgradeLog "txapm execution failed: $_"
}

Start-Sleep -Seconds 2

# 3. Relaunch T-Drop
Write-UpgradeLog "Restarting T-Drop from $AppExe..."
if (Test-Path $AppExe) {
  Start-Process -FilePath $AppExe
  Write-UpgradeLog "T-Drop restarted successfully."
} else {
  Write-UpgradeLog "Error: Executable not found at $AppExe"
}
`

  try {
    fs.writeFileSync(scriptPath, psScript, 'utf8')
  } catch (err) {
    console.error('[TXA-Updater] Failed to write upgrade script:', err)
    return false
  }

  if (opts?.dryRun) {
    return true
  }

  try {
    console.log(`[TXA-Updater] Spawning detached PowerShell worker from ${scriptPath}`)
    const child = spawn(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', scriptPath],
      {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      }
    )
    child.unref()

    // Gracefully destroy all windows and exit process
    setTimeout(() => {
      try {
        const { BrowserWindow } = require('electron')
        BrowserWindow.getAllWindows().forEach((w: any) => {
          if (!w.isDestroyed()) w.destroy()
        })
        app.exit(0)
      } catch {
        app.exit(0)
      }
    }, 400)

    return true
  } catch (spawnErr) {
    console.error('[TXA-Updater] Failed to spawn upgrade process:', spawnErr)
    return false
  }
}

