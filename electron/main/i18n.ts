/**
 * Translation helper for the Electron main process (native notifications, dialog
 * titles, license messages). The renderer's `t()` lives in the UI; this one reads
 * the same supplement files from shared/i18n, so both stay in sync.
 */
import { app } from 'electron'
import { SUPPLEMENT, readPath, fillParams } from '../../shared/i18n/supplement'
import { loadSettings } from '../store/settings'

/** Maps an OS/browser language tag ("pt-BR", "nb", "zh-HK") to a supported code. */
export function normalizeLanguageTag(tag: string): string {
  const lower = (tag || '').toLowerCase()
  if (lower.startsWith('zh-tw') || lower.startsWith('zh-hk') || lower.startsWith('zh-hant')) return 'zh-TW'
  if (lower.startsWith('zh')) return 'zh-CN'
  if (lower.startsWith('nb') || lower.startsWith('nn')) return 'no'
  const base = lower.split('-')[0]
  return base in SUPPLEMENT ? base : 'en'
}

function systemLanguage(): string {
  try {
    const langs = app.getPreferredSystemLanguages?.() ?? []
    if (langs.length) return normalizeLanguageTag(langs[0])
    return normalizeLanguageTag(app.getLocale())
  } catch {
    return 'en'
  }
}

/** The language the app UI is using right now ('system' resolves to the OS language). */
export function currentLanguage(): string {
  let code = 'system'
  try {
    code = loadSettings().language || 'system'
  } catch {
    /* settings not ready: fall back to the OS language */
  }
  if (code === 'system') return systemLanguage()
  return code in SUPPLEMENT ? code : 'en'
}

/** Translates a `main.*` key; falls back to English, then to the key itself. */
export function mt(path: string, params?: Record<string, string | number>): string {
  const text = readPath(SUPPLEMENT[currentLanguage()], path) ?? readPath(SUPPLEMENT.en, path) ?? path
  return fillParams(text, params)
}
