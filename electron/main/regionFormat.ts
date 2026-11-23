import { app } from 'electron'
import { regValues } from './sysinfo'
import { DEFAULT_SNIPPET_FORMATS, type SnippetFormats } from '../../shared/snippets'

/**
 * The user's date/time formats, as set in Windows "Region > Formats"
 * (HKCU\Control Panel\International). Electron's Intl only follows the UI
 * language, not a custom short-date pattern, so the pattern strings are read
 * from the registry and applied by formatWithPattern.
 *
 * Cached for a minute (reg.exe costs a few ms; the user can change the setting
 * at any time). Anything unreadable falls back to the app locale and ISO-style
 * defaults, field by field.
 */
let cached: { at: number; value: SnippetFormats } | null = null
const TTL_MS = 60_000

export async function getSnippetFormats(): Promise<SnippetFormats> {
  if (cached && Date.now() - cached.at < TTL_MS) return cached.value

  const appLocale = (() => {
    try {
      return app.getLocale() || DEFAULT_SNIPPET_FORMATS.locale
    } catch {
      return DEFAULT_SNIPPET_FORMATS.locale
    }
  })()

  let value: SnippetFormats = { ...DEFAULT_SNIPPET_FORMATS, locale: appLocale }
  try {
    const intl = await regValues('HKCU\\Control Panel\\International')
    if (intl) {
      const pick = (v: string | undefined, fallback: string) => (v && v.trim() ? v.trim() : fallback)
      value = {
        locale: pick(intl.LocaleName, appLocale),
        shortDate: pick(intl.sShortDate, value.shortDate),
        longDate: pick(intl.sLongDate, value.longDate),
        shortTime: pick(intl.sShortTime, value.shortTime)
      }
    }
  } catch {
    /* keep the defaults */
  }
  cached = { at: Date.now(), value }
  return value
}
