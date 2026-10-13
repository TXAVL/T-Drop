/**
 * T-Drop TxaLicense Shared Types & Constants.
 * Format: TDR_(mã hóa hardwareid+namepc)_(random string 5 ký tự)
 * Example: TDR_A8B9C1_X8K2M (~16 characters, sleek, readable).
 */

export const SUPABASE_CONFIG = {
  url: 'https://camnragrlqzmcxtgvukj.supabase.co',
  publishableKey: 'sb_publishable_nWBCfr-d5ZSuk5e5ULrpZQ_zVFp_nUh'
} as const

export interface DeviceFingerprint {
  hardwareId: string
  pcName: string
  hwHash: string
}

export interface LicenseState {
  isPro: boolean
  role: 'FREE' | 'VIP' | 'PREMIUM'
  key?: string
  userName?: string
  expiresAt?: string | null
}

export interface LicenseActivationResult {
  ok: boolean
  code?: 'ACTIVATED' | 'VERIFIED' | 'NOT_FOUND' | 'INACTIVE' | 'EXPIRED' | 'HARDWARE_MISMATCH' | 'NETWORK_ERROR'
  message: string
  role?: 'FREE' | 'VIP' | 'PREMIUM'
  userName?: string
  expiresAt?: string | null
}

/**
 * Calculate remaining days until expiration. Returns null if permanent/free.
 */
export function getDaysRemaining(expiresAt?: string | null): number | null {
  if (!expiresAt) return null
  const expiry = new Date(expiresAt).getTime()
  const diff = expiry - Date.now()
  if (diff <= 0) return 0
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

/**
 * Validate allowed email domains: Gmail, iCloud, Outlook, Hotmail.
 */
export function isValidEmailDomain(email: string): boolean {
  if (!email || typeof email !== 'string') return false
  const lower = email.trim().toLowerCase()
  return (
    lower.endsWith('@gmail.com') ||
    lower.endsWith('@icloud.com') ||
    lower.endsWith('@outlook.com') ||
    lower.endsWith('@hotmail.com')
  )
}

export const VIETQR_CONFIG = {
  bankId: 'MB',
  bankName: 'MBBank (Ngân hàng Quân Đội)',
  accountNo: '2211231106',
  accountName: 'NGUYEN VAN A',
  prices: {
    VIP: 29000,
    PREMIUM: 49000
  }
} as const

export interface TdropOrder {
  id?: string
  order_code: string
  machine_id: string
  role: 'VIP' | 'PREMIUM'
  amount: number
  email: string
  transfer_content: string
  bill_image?: string
  status: 'pending' | 'approved' | 'rejected'
  license_key?: string
  created_at?: string
  approved_at?: string
}

/**
 * Format expiry date to readable Vietnamese string (DD/MM/YYYY HH:mm).
 */
export function formatExpiryDate(isoStr?: string | null): string {
  if (!isoStr) return 'Vĩnh viễn'
  try {
    const d = new Date(isoStr)
    const pad = (n: number) => n.toString().padStart(2, '0')
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } catch {
    return isoStr
  }
}

/**
 * Generate VietQR image URL for instant payment.
 */
export function getVietQrImageUrl(amount: number, memo: string): string {
  const account = VIETQR_CONFIG.accountNo
  const bank = VIETQR_CONFIG.bankId
  const name = encodeURIComponent(VIETQR_CONFIG.accountName)
  const encodedMemo = encodeURIComponent(memo)
  return `https://img.vietqr.io/image/${bank}-${account}-compact2.png?amount=${amount}&addInfo=${encodedMemo}&accountName=${name}`
}

/**
 * Validate syntax of a T-Drop License Key.
 * Format: TDR_[A-Z0-9]{4,10}_[A-Z0-9]{4,8} or Master keys (e.g. TDR_MASTER_...)
 */
export function isValidKeyFormat(key: string): boolean {
  if (!key || typeof key !== 'string') return false
  const trimmed = key.trim().toUpperCase()
  return /^TDR_[A-Z0-9]{4,12}_[A-Z0-9]{4,10}$/.test(trimmed) || /^TDR_MASTER_[A-Z0-9_]+$/.test(trimmed)
}

