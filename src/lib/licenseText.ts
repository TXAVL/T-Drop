/**
 * Localised license text helpers (countdown, expiry date, default customer name).
 * The raw formatters in shared/license.ts return Vietnamese; the UI uses these instead.
 */
import { t } from '../i18n'
import { formatExpiryDate } from '../../shared/license'

const DEFAULT_SERVER_NAME = 'Khách hàng' // default `user_name` stored by the license server

/** "12 days 3h left" in the active language, or null when there is no expiry. */
export function countdownText(expiresAt?: string | null): string | null {
  if (!expiresAt) return null
  const expiry = new Date(expiresAt).getTime()
  if (Number.isNaN(expiry)) return null
  const diff = expiry - Date.now()
  if (diff <= 0) return t('license.countdown.expired')
  const days = Math.floor(diff / 86_400_000)
  const hours = Math.floor((diff % 86_400_000) / 3_600_000)
  if (days > 0) {
    return hours > 0 ? t('license.countdown.daysHours', { days, hours }) : t('license.countdown.days', { days })
  }
  const mins = Math.floor((diff % 3_600_000) / 60_000)
  return hours > 0 ? t('license.countdown.hoursMins', { hours, mins }) : t('license.countdown.minutes', { mins: Math.max(1, mins) })
}

/** dd/mm/yyyy hh:mm, or "Permanent" when there is no expiry. */
export function expiryText(iso?: string | null): string {
  return iso ? formatExpiryDate(iso) : t('license.permanent')
}

/** The server stores a Vietnamese default name; show it in the user's language. */
export function userNameText(name?: string | null): string {
  const n = (name || '').trim()
  return !n || n === DEFAULT_SERVER_NAME ? t('license.defaultUser') : n
}
