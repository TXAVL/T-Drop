/**
 * Store launch-at-login: the same three calls as electron-winstore-auto-launch
 * (getStatus / enable / disable).
 *
 * That npm package cannot run on Electron 34 — its NodeRT native addon will not
 * compile (`/std:c++20` vs `/ZW`). These methods call the identical WinRT API
 * (StartupTask.GetAsync / RequestEnableAsync / Disable) from a tiny in-package
 * helper that has AppX identity. No registry writes. No PowerShell.
 */
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { promisify } from 'node:util'
import { app } from 'electron'
import { STORE_STARTUP_TASK_ID } from './config'

const execFileAsync = promisify(execFile)

export const StartupTaskState = {
  Disabled: 0,
  DisabledByUser: 1,
  Enabled: 2,
  DisabledByPolicy: 3,
  EnabledByPolicy: 4
} as const

export function resolveStartupHelperPath(): string | null {
  // Allow tests / enterprise layouts to override the helper location.
  const override = process.env.T_DROP_STARTUP_HELPER || process.env.EDGE_DROP_STARTUP_HELPER
  if (override && existsSync(override)) return override
  const candidates: string[] = []
  if (typeof process.resourcesPath === 'string' && process.resourcesPath) {
    candidates.push(join(process.resourcesPath, 'startup', 'TDropStartup.exe'))
    candidates.push(join(process.resourcesPath, 'startup', 'EdgeDropStartup.exe'))
  }
  try {
    const appPath = app.getAppPath()
    candidates.push(join(appPath, '..', 'startup', 'TDropStartup.exe'))
    candidates.push(join(appPath, 'resources', 'startup', 'TDropStartup.exe'))
    candidates.push(join(appPath, '..', 'startup', 'EdgeDropStartup.exe'))
    candidates.push(join(appPath, 'resources', 'startup', 'EdgeDropStartup.exe'))
  } catch {
    /* tests / app not ready */
  }
  // Packaged exe lives next to resources/: <install>/T-Drop.exe +
  // <install>/resources/startup/TDropStartup.exe (extraResources).
  try {
    const exePath = app.getPath('exe')
    if (exePath) {
      const { dirname } = require('node:path') as typeof import('node:path')
      const exeDir = dirname(exePath)
      candidates.push(join(exeDir, 'resources', 'startup', 'TDropStartup.exe'))
      candidates.push(join(exeDir, 'startup', 'TDropStartup.exe'))
      candidates.push(join(exeDir, 'resources', 'startup', 'EdgeDropStartup.exe'))
      candidates.push(join(exeDir, 'startup', 'EdgeDropStartup.exe'))
    }
  } catch {
    /* ignore */
  }
  candidates.push(join(process.cwd(), 'resources', 'startup', 'TDropStartup.exe'))
  candidates.push(join(process.cwd(), 'resources', 'startup', 'EdgeDropStartup.exe'))
  return candidates.find((path) => path && existsSync(path)) ?? null
}

function parseState(stdout: string): number | null {
  const match = String(stdout).trim().match(/^(\d+)\s*$/m)
  if (!match) return null
  const state = Number(match[1])
  return Number.isInteger(state) ? state : null
}

async function run(action: 'get' | 'enable' | 'disable'): Promise<number | null> {
  const exe = resolveStartupHelperPath()
  if (!exe) {
    console.error('[StoreStartup] helper missing')
    return null
  }
  try {
    const result = await execFileAsync(exe, [action, STORE_STARTUP_TASK_ID], {
      encoding: 'utf8',
      timeout: 20000,
      windowsHide: true,
      // Never run inside System32 or the package dir: the helper needs a
      // writable cwd and must keep its AppX identity. TEMP is per-user and
      // always writable, even under Store virtualization.
      cwd: process.env.TEMP || process.env.TMP || process.cwd()
    })
    const stdout = typeof result === 'string' ? result : String((result as { stdout?: string }).stdout ?? '')
    const parsed = parseState(stdout)
    if (parsed === null) {
      console.error(`[StoreStartup] helper returned unparsable output for ${action}:`, JSON.stringify(stdout))
    }
    return parsed
  } catch (err) {
    // execFile rejects on non-zero exit (helper returns 21 on WinRT error).
    // Try to salvage a numeric state from stdout/stderr before giving up so
    // callers never fake ON from an error.
    try {
      const maybe = err as { stdout?: string; stderr?: string; code?: number }
      const salvage = parseState(String(maybe?.stdout ?? ''))
      if (salvage !== null) return salvage
    } catch {
      /* ignore */
    }
    console.error('[StoreStartup] helper failed:', err)
    return null
  }
}

export async function getStatus(): Promise<number | null> {
  return run('get')
}

export async function enable(): Promise<number | null> {
  return run('enable')
}

export async function disable(): Promise<number | null> {
  return run('disable')
}

export { parseState as parseStartupHelperState }
