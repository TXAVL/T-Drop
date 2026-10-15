/**
 * T-Drop License Management (TxaLicense Class).
 * Handles machine hardware fingerprinting, format generation, and Supabase RPC activation.
 *
 * Format: TDR_(hardware+pc hash)_(random string 5 chars)
 * Example: TDR_B7X9Q2_K8M2P
 */
import os from 'node:os'
import { createHash, randomBytes } from 'node:crypto'
import { execSync } from 'node:child_process'
import { SUPABASE_CONFIG, type DeviceFingerprint, type LicenseActivationResult, type LicenseState } from '../../shared/license'
import { loadSettings, saveSettings } from '../store/settings'
import { pushState } from './state'
import { AppLogger } from './logger'

let cachedFingerprint: DeviceFingerprint | null = null

function getRawMachineGuid(): string {
  if (process.platform === 'win32') {
    try {
      const stdout = execSync('reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid', {
        windowsHide: true,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      })
      const match = stdout.match(/MachineGuid\s+REG_SZ\s+([a-fA-F0-9-]+)/)
      if (match && match[1]) return match[1].trim()
    } catch {}
  }
  // Resilient fallback based on hardware properties
  const cpuInfo = os.cpus()[0]?.model || 'cpu'
  return `${os.hostname()}-${os.platform()}-${cpuInfo}-${os.arch()}`
}

export function getDeviceFingerprint(): DeviceFingerprint {
  if (cachedFingerprint) return cachedFingerprint

  const pcName = os.hostname() || 'Windows-PC'
  const rawId = getRawMachineGuid()
  const hardwareId = createHash('sha256').update(`TDROP_HW:${rawId}`).digest('hex').substring(0, 16).toUpperCase()
  // 6-character uppercase hash of hardwareId + pcName
  const hwHash = createHash('sha256').update(`${hardwareId}:${pcName}`).digest('hex').substring(0, 6).toUpperCase()

  cachedFingerprint = { hardwareId, pcName, hwHash }
  return cachedFingerprint
}

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
 * Activate a license key with Supabase.
 * VIP = 30 days validity, PREMIUM = 60 days validity.
 */
export async function activateLicense(key: string): Promise<LicenseActivationResult> {
  const trimmed = key.trim().toUpperCase()
  if (!trimmed) {
    AppLogger.write('WARN', 'License', 'Kích hoạt thất bại: mã bản quyền rỗng')
    return { ok: false, code: 'NOT_FOUND', message: 'Vui lòng nhập mã bản quyền' }
  }

  const { hardwareId, pcName, hwHash } = getDeviceFingerprint()
  AppLogger.write('INFO', 'License', `Gửi yêu cầu kích hoạt: key=${trimmed}, hwHash=${hwHash}, device=${pcName}`)

  try {
    const url = `${SUPABASE_CONFIG.url}/rest/v1/rpc/activate_tdrop_license`
    const res = await fetch(url, {
      method: 'POST',
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
      return { ok: false, code: 'NETWORK_ERROR', message: `Lỗi kết nối máy chủ (${res.status}): ${errText}` }
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
        licenseUserName: data.user_name || 'Khách hàng',
        licenseExpiresAt: data.expires_at || null
      })
      pushState.settings(loadSettings())
    } else {
      AppLogger.write('WARN', 'License', `Máy chủ từ chối kích hoạt: code=${data.code}, message=${data.message}`)
    }

    return {
      ok: Boolean(data.ok),
      code: data.code as any,
      message: data.message || (data.ok ? 'Kích hoạt bản quyền thành công!' : 'Kích hoạt không thành công'),
      role: data.role,
      userName: data.user_name,
      expiresAt: data.expires_at
    }
  } catch (err: any) {
    AppLogger.write('ERROR', 'License', `Ngoại lệ khi gọi Supabase: ${err?.message || String(err)}`)
    return {
      ok: false,
      code: 'NETWORK_ERROR',
      message: `Không thể kết nối đến máy chủ xác minh: ${err?.message || String(err)}`
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
