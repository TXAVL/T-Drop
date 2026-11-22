/**
 * T-Drop License Management (TxaLicense Class).
 * Handles machine hardware fingerprinting, format generation, and Supabase RPC activation.
 *
 * Format: TDR_(hardware+pc hash)_(random string 5 chars)
 * Example: TDR_B7X9Q2_K8M2P
 */
import os from 'node:os'
import { createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { SUPABASE_CONFIG, type DeviceFingerprint, type LicenseActivationResult, type LicenseState } from '../../shared/license'
import { loadSettings, saveSettings } from '../store/settings'
import { pushState } from './state'
import { AppLogger } from './logger'
import { mt } from './i18n'

let cachedFingerprint: DeviceFingerprint | null = null

function readMachineGuid(): string | null {
  if (process.platform !== 'win32') return null
  const regExe = `${process.env.SystemRoot || 'C:/Windows'}/System32/reg.exe`
  // Retry with a generous timeout: a 1s limit used to fail on slow boots / busy antivirus,
  // which silently produced a different (fallback) ID and got the license rejected.
  for (const timeout of [4000, 8000]) {
    try {
      const stdout = execFileSync(regExe, ['query', String.raw`HKLM\SOFTWARE\Microsoft\Cryptography`, '/v', 'MachineGuid'], {
        windowsHide: true,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        timeout
      })
      const match = stdout.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9-]+)/)
      if (match && match[1]) return match[1].trim()
    } catch {}
  }
  return null
}

export function getDeviceFingerprint(): DeviceFingerprint {
  if (cachedFingerprint) return cachedFingerprint

  const pcName = os.hostname() || 'Windows-PC'
  const guid = readMachineGuid()
  const saved = loadSettings().deviceIdentity

  if (guid) {
    // Same algorithm as before, so already-activated devices keep matching.
    const hardwareId = createHash('sha256').update(`TDROP_HW:${guid}`).digest('hex').substring(0, 16).toUpperCase()
    const guidHash = createHash('sha256').update(guid).digest('hex').substring(0, 12)
    let hwHash: string
    if (saved && saved.machineGuidHash === guidHash && saved.hardwareId === hardwareId) {
      hwHash = saved.hwHash // renaming the PC must not change the ID
    } else {
      hwHash = createHash('sha256').update(`${hardwareId}:${pcName}`).digest('hex').substring(0, 6).toUpperCase()
      try { saveSettings({ deviceIdentity: { hardwareId, hwHash, machineGuidHash: guidHash } }) } catch {}
    }
    cachedFingerprint = { hardwareId, pcName, hwHash, reliable: true }
    return cachedFingerprint
  }

  // Registry unreadable: reuse the last known-good identity instead of inventing a new one.
  if (saved) {
    cachedFingerprint = { hardwareId: saved.hardwareId, pcName, hwHash: saved.hwHash, reliable: true }
    return cachedFingerprint
  }

  // Last resort (non-Windows / first run with no registry): derived ID. NOT cached and flagged unreliable.
  const cpuInfo = os.cpus()[0]?.model || 'cpu'
  const rawId = `${os.hostname()}-${os.platform()}-${cpuInfo}-${os.arch()}`
  const hardwareId = createHash('sha256').update(`TDROP_HW:${rawId}`).digest('hex').substring(0, 16).toUpperCase()
  const hwHash = createHash('sha256').update(`${hardwareId}:${pcName}`).digest('hex').substring(0, 6).toUpperCase()
  return { hardwareId, pcName, hwHash, reliable: false }
}

// Pre-warm fingerprint in background so user interactions never hitch
setTimeout(() => {
  try {
    getDeviceFingerprint()
  } catch {}
}, 50)

export class TxaLicense {
  /**
   * Generates a license key matching: TDR_(hardware+pc hash)_(random 5 chars)
   * Example: TDR_B7X9Q2_K8M2P
   */
  static generateKey(hwHash?: string): string {
    const hashPart = hwHash ? hwHash.toUpperCase().substring(0, 6) : randomBytes(3).toString('hex').toUpperCase()
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let randPart = ''
    const buf = randomBytes(5)
    for (let i = 0; i < 5; i++) {
      randPart += chars[buf[i] % chars.length]
    }
    return `TDR_${hashPart}_${randPart}`
  }

  static getDeviceFingerprint(): DeviceFingerprint {
    return getDeviceFingerprint()
  }

  static activate(key: string): Promise<LicenseActivationResult> {
    return activateLicense(key)
  }

  static deactivate(): boolean {
    return deactivateLicense()
  }

  static getState(): LicenseState {
    return getLicenseState()
  }
}

/**
 * The license server answers in Vietnamese. Show the user's language instead, keyed
 * by the stable result code; unknown codes keep the server's own message.
 */
function localizedLicenseMessage(data: { ok: boolean; code?: string; message?: string; role?: string }): string {
  const known = ['NOT_FOUND', 'INACTIVE', 'EXPIRED', 'HARDWARE_MISMATCH', 'ACTIVATED', 'VERIFIED']
  if (data.code && known.includes(data.code)) {
    return mt(`main.license.code.${data.code}`, { role: data.role === 'PREMIUM' ? 'PREMIUM' : 'VIP' })
  }
  return data.message || (data.ok ? mt('main.license.activated') : mt('main.license.activateFailed'))
}

/**
 * Activate a license key with Supabase.
 * VIP = 30 days validity, PREMIUM = 60 days validity.
 */
export async function activateLicense(key: string): Promise<LicenseActivationResult> {
  const trimmed = key.trim().toUpperCase()
  if (!trimmed) {
    AppLogger.write('WARN', 'License', 'Kích hoạt thất bại: mã bản quyền rỗng')
    return { ok: false, code: 'NOT_FOUND', message: mt('main.license.enterKey') }
  }

  const { hardwareId, pcName, hwHash } = getDeviceFingerprint()
  AppLogger.write('INFO', 'License', `Gửi yêu cầu kích hoạt: key=${trimmed}, hwHash=${hwHash}, device=${pcName}`)

  try {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/rpc/activate_tdrop_license`
    const res = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(8000),
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_CONFIG.publishableKey,
        'Authorization': `Bearer ${SUPABASE_CONFIG.publishableKey}`
      },
      body: JSON.stringify({
        p_key: trimmed,
        p_hardware_id: hardwareId,
        p_hw_hash: hwHash,
        p_device_name: pcName
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      AppLogger.write('ERROR', 'License', `Supabase trả về lỗi HTTP ${res.status}: ${errText}`)
      return { ok: false, code: 'NETWORK_ERROR', message: mt('main.license.serverError', { status: res.status, error: errText }) }
    }

    const data = await res.json() as {
      ok: boolean
      code?: string
      message: string
      role?: 'VIP' | 'PREMIUM'
      user_name?: string
      expires_at?: string
    }

    if (data.ok) {
      const role = data.role === 'PREMIUM' ? 'PREMIUM' : 'VIP'
      AppLogger.write('INFO', 'License', `Kích hoạt THÀNH CÔNG: role=${role}, user=${data.user_name || 'Khách hàng'}, expires=${data.expires_at || 'vô thời hạn'}`)
      saveSettings({
        isPro: true,
        licenseKey: trimmed,
        licenseRole: role,
        licenseUserName: data.user_name || '', // empty = show the localized default name in the UI
        licenseExpiresAt: data.expires_at || null
      })
      pushState.settings(loadSettings())
    } else {
      AppLogger.write('WARN', 'License', `Máy chủ từ chối kích hoạt: code=${data.code}, message=${data.message}`)
    }

    return {
      ok: Boolean(data.ok),
      code: data.code as any,
      message: localizedLicenseMessage(data),
      role: data.role,
      userName: data.user_name,
      expiresAt: data.expires_at
    }
  } catch (err: any) {
    const isTimeout = err?.name === 'TimeoutError' || err?.message?.includes('aborted')
    const msg = isTimeout
      ? mt('main.license.timeout')
      : mt('main.license.cannotConnect', { error: err?.message || String(err) })
    AppLogger.write('ERROR', 'License', `Ngoại lệ khi gọi Supabase: ${err?.message || String(err)}`)
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: msg
    }
  }
}

/**
 * Remove active license key and revert to Free.
 */
export function deactivateLicense(): boolean {
  AppLogger.write('INFO', 'License', 'Người dùng đã hủy kích hoạt bản quyền, chuyển về gói FREE')
  saveSettings({
    isPro: false,
    licenseKey: undefined,
    licenseRole: 'FREE',
    licenseUserName: undefined,
    licenseExpiresAt: null
  })
  pushState.settings(loadSettings())
  return true
}

/**
 * Retrieve current license state from persistent settings.
 * Checks for expiration automatically.
 */
export function getLicenseState(): LicenseState {
  const settings = loadSettings()
  
  // Expiry check
  if (settings.isPro && settings.licenseExpiresAt) {
    const expiryTime = new Date(settings.licenseExpiresAt).getTime()
    if (!isNaN(expiryTime) && expiryTime < Date.now()) {
      deactivateLicense()
      return {
        isPro: false,
        role: 'FREE',
        key: undefined,
        userName: undefined,
        expiresAt: null
      }
    }
  }

  return {
    isPro: Boolean(settings.isPro),
    role: settings.licenseRole || 'FREE',
    key: settings.licenseKey,
    userName: settings.licenseUserName,
    expiresAt: settings.licenseExpiresAt || null
  }
}
