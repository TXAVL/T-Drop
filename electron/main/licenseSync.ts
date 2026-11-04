/**
 * Background license sync.
 *
 * The license is stored locally after activation, so changes an admin makes on
 * the server (upgrade, extension, revoke) never reached the app by themselves.
 * This module asks the server every 15 minutes (plus once shortly after launch
 * and after the PC wakes from sleep) and applies what it finds.
 *
 * Safety rules:
 *  - a network or server error NEVER changes the local license;
 *  - the license is only dropped after two consecutive "no longer valid"
 *    answers, so one odd response cannot lock a paying customer out.
 */
import { app, powerMonitor } from 'electron'
import { SUPABASE_CONFIG } from '../../shared/license'
import { loadSettings, saveSettings } from '../store/settings'
import { pushState } from './state'
import { AppLogger } from './logger'
import { getDeviceFingerprint, deactivateLicense } from './license'
import { currentLanguage, mt } from './i18n'
import { showTrayNotification } from './trayNotify'

export const LICENSE_SYNC_INTERVAL_MS = 15 * 60 * 1000
const FIRST_SYNC_DELAY_MS = 20 * 1000
const MIN_GAP_MS = 60 * 1000
const STRIKES_BEFORE_DROP = 2
const REMIND_WITHIN_DAYS = 3

export type SyncAnswer =
  | { kind: 'ok'; role: 'VIP' | 'PREMIUM'; expiresAt: string | null; userName: string }
  | { kind: 'invalid'; code: string }
  | { kind: 'unknown' }

/** Pure: turn the RPC JSON into an answer. Anything unexpected is "unknown" (= change nothing). */
export function parseSyncResponse(data: any): SyncAnswer {
  if (!data || typeof data !== 'object') return { kind: 'unknown' }
  if (data.ok === true) {
    const role = data.role === 'PREMIUM' ? 'PREMIUM' : 'VIP'
    const expiresAt = typeof data.expires_at === 'string' && data.expires_at ? data.expires_at : null
    return { kind: 'ok', role, expiresAt, userName: typeof data.user_name === 'string' ? data.user_name : '' }
  }
  const code = typeof data.code === 'string' ? data.code : ''
  if (['NOT_FOUND', 'INACTIVE', 'EXPIRED', 'HARDWARE_MISMATCH'].includes(code)) return { kind: 'invalid', code }
  return { kind: 'unknown' }
}

/** Pure: did the server change the plan or expiry the app is showing? */
export function licenseChanged(
  local: { role?: string; expiresAt?: string | null },
  remote: { role: string; expiresAt: string | null }
): boolean {
  if ((local.role || '') !== remote.role) return true
  const a = local.expiresAt ? new Date(local.expiresAt).getTime() : null
  const b = remote.expiresAt ? new Date(remote.expiresAt).getTime() : null
  if (a === null || b === null) return a !== b
  return Math.abs(a - b) > 1000
}

/** Pure: whole days left (rounded up), or null for a license without expiry. */
export function daysLeft(expiresAt: string | null | undefined, now = Date.now()): number | null {
  if (!expiresAt) return null
  const t = new Date(expiresAt).getTime()
  if (isNaN(t)) return null
  return Math.ceil((t - now) / 86_400_000)
}

let timer: NodeJS.Timeout | null = null
let running = false
let lastRun = 0
let strikes = 0
const reminded = new Set<string>()

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(currentLanguage() === 'system' ? undefined : currentLanguage())
  } catch {
    return new Date(iso).toLocaleDateString()
  }
}

async function fetchRemote(key: string): Promise<SyncAnswer> {
  const { hardwareId, hwHash } = getDeviceFingerprint()
  const res = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/rpc/sync_tdrop_license`, {
    method: 'POST',
    signal: AbortSignal.timeout(8000),
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_CONFIG.publishableKey,
      Authorization: `Bearer ${SUPABASE_CONFIG.publishableKey}`
    },
    body: JSON.stringify({ p_key: key, p_hardware_id: hardwareId, p_hw_hash: hwHash })
  })
  if (!res.ok) return { kind: 'unknown' }
  return parseSyncResponse(await res.json())
}

function maybeRemind(role: string, expiresAt: string | null): void {
  const left = daysLeft(expiresAt)
  if (left === null || left < 0 || left > REMIND_WITHIN_DAYS) return
  const bucket = `${new Date().toDateString()}:${left}`
  if (reminded.has(bucket)) return
  reminded.add(bucket)
  showTrayNotification(mt('main.license.expiringTitle'), mt('main.license.expiringBody', { role, days: left }))
}

export async function syncLicenseNow(force = false): Promise<void> {
  if (running) return
  if (!force && Date.now() - lastRun < MIN_GAP_MS) return
  const s = loadSettings()
  if (!s.isPro || !s.licenseKey) {
    strikes = 0
    return
  }
  running = true
  lastRun = Date.now()
  try {
    const answer = await fetchRemote(s.licenseKey)
    if (answer.kind === 'unknown') return // offline / server hiccup: keep what we have

    if (answer.kind === 'invalid') {
      strikes += 1
      AppLogger.write('WARN', 'LicenseSync', `Server says license invalid (${answer.code}), strike ${strikes}/${STRIKES_BEFORE_DROP}`)
      if (strikes >= STRIKES_BEFORE_DROP) {
        strikes = 0
        deactivateLicense()
        showTrayNotification(mt('main.license.syncRevokedTitle'), mt('main.license.syncRevokedBody'))
      }
      return
    }

    strikes = 0
    const local = { role: s.licenseRole, expiresAt: s.licenseExpiresAt ?? null }
    if (licenseChanged(local, answer)) {
      AppLogger.write('INFO', 'LicenseSync', `License changed on server: ${local.role} ${local.expiresAt} -> ${answer.role} ${answer.expiresAt}`)
      pushState.settings(
        saveSettings({
          isPro: true,
          licenseRole: answer.role,
          licenseExpiresAt: answer.expiresAt,
          ...(answer.userName ? { licenseUserName: answer.userName } : {})
        })
      )
      showTrayNotification(
        mt('main.license.syncUpdatedTitle'),
        answer.expiresAt
          ? mt('main.license.syncUpdatedBody', { role: answer.role, date: formatDate(answer.expiresAt) })
          : mt('main.license.syncUpdatedForever', { role: answer.role })
      )
    }
    maybeRemind(answer.role, answer.expiresAt)
  } catch (err: any) {
    AppLogger.write('INFO', 'LicenseSync', `Sync skipped: ${err?.message || err}`)
  } finally {
    running = false
  }
}

export function startLicenseSync(): void {
  if (timer) return
  setTimeout(() => void syncLicenseNow(true), FIRST_SYNC_DELAY_MS).unref?.()
  timer = setInterval(() => void syncLicenseNow(), LICENSE_SYNC_INTERVAL_MS)
  timer.unref?.()
  try {
    powerMonitor.on('resume', () => setTimeout(() => void syncLicenseNow(), 5000))
  } catch {
    /* powerMonitor unavailable: the interval still covers it */
  }
  app.on('before-quit', () => {
    if (timer) clearInterval(timer)
    timer = null
  })
}
