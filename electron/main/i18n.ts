/**
 * Translation helper for the Electron main process (native notifications, dialog
 * titles, license messages). The renderer's `t()` lives in the UI; this one reads
 * the same supplement files from shared/i18n, so both stay in sync.
 */
import { app } from 'electron'
import { SUPPLEMENT, readPath, fillParams } from '../../shared/i18n/supplement'
import { loadSettings } from '../store/settings'
import { TRANSLATIONS, en } from '../../src/i18n/translations'

/** A language setting ('system' or a code) → a code TRANSLATIONS has. */
export function resolveLang(setting?: string): string {
  const code = setting || 'system'
  if (code !== 'system') return TRANSLATIONS[code] ? code : 'en'
  const sysLangs = app.getPreferredSystemLanguages ? app.getPreferredSystemLanguages() : []
  const first = (sysLangs[0] || app.getLocale?.() || '').toLowerCase()
  if (first.startsWith('zh-tw') || first.startsWith('zh-hk') || first.startsWith('zh-hant')) return 'zh-TW'
  if (first.startsWith('zh')) return 'zh-CN'
  if (first.startsWith('nb') || first.startsWith('nn')) return 'no'
  const base = first.split('-')[0]
  return TRANSLATIONS[base] ? base : 'en'
}

function lookup(dict: unknown, path: string): string | undefined {
  let cur: unknown = dict
  for (const part of path.split('.')) {
    if (!cur || typeof cur !== 'object') return undefined
    cur = (cur as Record<string, unknown>)[part]
  }
  if (cur && typeof cur === 'object' && typeof (cur as { other?: unknown }).other === 'string') return (cur as { other: string }).other
  return typeof cur === 'string' ? cur : undefined
}

/** `t()` for the main process: the user's language, else English, with `{name}` parameters filled in. */
export function mainT(path: string, params?: Record<string, string | number>, lang = resolveLang(loadSettings().language)): string {
  let val = lookup(TRANSLATIONS[lang], path) || lookup(en, path) || path
  if (params) {
    for (const [k, v] of Object.entries(params)) val = val.replace(new RegExp(`\\{${k}\\}`, 'g'), () => String(v))
  }
  return val
}

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
