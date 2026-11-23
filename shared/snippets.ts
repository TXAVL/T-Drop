/**
 * Smart Snippets: reusable text templates with live variables.
 *
 * Shared by the main process (store, paste) and the renderer (preview in the
 * editor), so everything here is pure and has no Electron imports.
 */

export interface Snippet {
  id: string
  title: string
  text: string
  createdAt: number
  updatedAt: number
  /** How many times it has been pasted (the shelf lists the most used first). */
  uses: number
}

/** What the renderer sends to create (no id) or update (with id) a snippet. */
export interface SnippetDraft {
  id?: string
  title: string
  text: string
}

export const MAX_SNIPPETS = 200
export const MAX_SNIPPET_TITLE = 80
export const MAX_SNIPPET_TEXT = 20_000

/** Variables a snippet's text can use, written like {date}. */
export const SNIPPET_VARIABLES = ['date', 'time', 'datetime', 'longdate', 'weekday', 'clipboard', 'uuid'] as const
export type SnippetVariable = (typeof SNIPPET_VARIABLES)[number]

const pad = (n: number, width = 2) => String(n).padStart(width, '0')

/**
 * The user's own date/time formats (Windows "Region > Formats": short date, long date,
 * short time, in Windows pattern syntax such as `dd/MM/yyyy` or `h:mm tt`) and locale.
 */
export interface SnippetFormats {
  /** BCP-47 tag used for month, weekday and AM/PM names, e.g. "vi-VN". */
  locale: string
  shortDate: string
  longDate: string
  shortTime: string
}

export const DEFAULT_SNIPPET_FORMATS: SnippetFormats = {
  locale: 'en-US',
  shortDate: 'yyyy-MM-dd',
  longDate: 'dddd, d MMMM yyyy',
  shortTime: 'HH:mm'
}

function safeIntl(locale: string, opts: Intl.DateTimeFormatOptions, date: Date): string {
  try {
    return new Intl.DateTimeFormat(locale, opts).format(date)
  } catch {
    return new Intl.DateTimeFormat('en-US', opts).format(date)
  }
}

function dayPeriod(locale: string, date: Date): string {
  try {
    const parts = new Intl.DateTimeFormat(locale, { hour: 'numeric', hour12: true }).formatToParts(date)
    return parts.find((p) => p.type === 'dayPeriod')?.value ?? (date.getHours() < 12 ? 'AM' : 'PM')
  } catch {
    return date.getHours() < 12 ? 'AM' : 'PM'
  }
}

/**
 * Format a date with a Windows date/time pattern.
 * Tokens: d dd ddd dddd | M MM MMM MMMM | yy yyyy | h hh H HH | m mm | s ss | t tt.
 * Text inside single quotes is copied as is; any other character is a separator.
 */
export function formatWithPattern(date: Date, pattern: string, locale = 'en-US'): string {
  let out = ''
  let i = 0
  while (i < pattern.length) {
    const ch = pattern[i]
    if (ch === "'") {
      const end = pattern.indexOf("'", i + 1)
      const literal = end === -1 ? pattern.slice(i + 1) : pattern.slice(i + 1, end)
      out += literal === '' && end !== -1 ? "'" : literal
      i = end === -1 ? pattern.length : end + 1
      continue
    }
    if (!/[dMyghHmst]/.test(ch)) {
      out += ch
      i += 1
      continue
    }
    let n = 1
    while (pattern[i + n] === ch) n += 1
    i += n
    const h12 = date.getHours() % 12 || 12
    switch (ch) {
      case 'd':
        out += n === 1 ? String(date.getDate()) : n === 2 ? pad(date.getDate()) : safeIntl(locale, { weekday: n === 3 ? 'short' : 'long' }, date)
        break
      case 'M':
        out += n === 1 ? String(date.getMonth() + 1) : n === 2 ? pad(date.getMonth() + 1) : safeIntl(locale, { month: n === 3 ? 'short' : 'long' }, date)
        break
      case 'y':
        out += n <= 2 ? pad(date.getFullYear() % 100) : pad(date.getFullYear(), 4)
        break
      case 'g':
        break // era names are not used by the formats Windows offers for the Gregorian calendar
      case 'h':
        out += n === 1 ? String(h12) : pad(h12)
        break
      case 'H':
        out += n === 1 ? String(date.getHours()) : pad(date.getHours())
        break
      case 'm':
        out += n === 1 ? String(date.getMinutes()) : pad(date.getMinutes())
        break
      case 's':
        out += n === 1 ? String(date.getSeconds()) : pad(date.getSeconds())
        break
      case 't': {
        const period = dayPeriod(locale, date)
        out += n === 1 ? period.slice(0, 1) : period
        break
      }
    }
  }
  return out
}

export interface SnippetContext {
  now: Date
  /** The user's regional formats; ISO-style defaults when omitted. */
  formats?: SnippetFormats
  /** Current clipboard text at the moment of pasting ('' when it is not text). */
  clipboard: string
  uuid: () => string
}

/**
 * Replace {variables} in a snippet. Dates follow the user's regional formats. Rules:
 *  - unknown names are left exactly as typed (so JSON or code braces survive);
 *  - `{{date}}` is an escape and produces the literal text `{date}`.
 */
export function expandSnippet(text: string, ctx: SnippetContext): string {
  const f = ctx.formats ?? DEFAULT_SNIPPET_FORMATS
  return text.replace(/\{\{(\w+)\}\}|\{(\w+)\}/g, (match, escaped: string | undefined, name: string | undefined) => {
    if (escaped !== undefined) return `{${escaped}}`
    switch (name as SnippetVariable) {
      case 'date':
        return formatWithPattern(ctx.now, f.shortDate, f.locale)
      case 'time':
        return formatWithPattern(ctx.now, f.shortTime, f.locale)
      case 'datetime':
        return `${formatWithPattern(ctx.now, f.shortDate, f.locale)} ${formatWithPattern(ctx.now, f.shortTime, f.locale)}`
      case 'longdate':
        return formatWithPattern(ctx.now, f.longDate, f.locale)
      case 'weekday':
        return formatWithPattern(ctx.now, 'dddd', f.locale)
      case 'clipboard':
        return ctx.clipboard
      case 'uuid':
        return ctx.uuid()
      default:
        return match
    }
  })
}

/** A stored snippet, or null if the value is not usable. */
export function normalizeSnippet(raw: unknown): Snippet | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  if (typeof r.id !== 'string' || !r.id) return null
  if (typeof r.text !== 'string' || !r.text.trim()) return null
  const title = typeof r.title === 'string' ? r.title.trim().slice(0, MAX_SNIPPET_TITLE) : ''
  const num = (v: unknown, fallback: number) => (typeof v === 'number' && Number.isFinite(v) ? v : fallback)
  const now = Date.now()
  return {
    id: r.id,
    title: title || r.text.trim().split('\n')[0].slice(0, MAX_SNIPPET_TITLE),
    text: r.text.slice(0, MAX_SNIPPET_TEXT),
    createdAt: num(r.createdAt, now),
    updatedAt: num(r.updatedAt, now),
    uses: Math.max(0, Math.floor(num(r.uses, 0)))
  }
}

export function normalizeSnippets(raw: unknown): Snippet[] {
  const list = Array.isArray(raw) ? raw : []
  const out: Snippet[] = []
  const seen = new Set<string>()
  for (const item of list) {
    const s = normalizeSnippet(item)
    if (s && !seen.has(s.id)) {
      seen.add(s.id)
      out.push(s)
    }
    if (out.length >= MAX_SNIPPETS) break
  }
  return out
}

/** Most used first, then most recently edited. */
export function sortSnippets(list: readonly Snippet[]): Snippet[] {
  return [...list].sort((a, b) => b.uses - a.uses || b.updatedAt - a.updatedAt)
}
