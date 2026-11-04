import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { TRANSLATIONS } from '../src/i18n/translations'
import { SUPPLEMENT } from '../shared/i18n/supplement'

const root = join(__dirname, '..')

const isPlural = (v: unknown): v is Record<string, string> =>
  !!v && typeof v === 'object' && typeof (v as { other?: unknown }).other === 'string'

function flatten(o: unknown, p = '', r: Record<string, string> = {}): Record<string, string> {
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === 'string') r[p + k] = v
      else if (isPlural(v)) r[p + k] = v.other
      else flatten(v, p + k + '.', r)
    }
  }
  return r
}

const enAll = { ...flatten(SUPPLEMENT.en), ...flatten(TRANSLATIONS.en) }
const keys = Object.keys(enAll)
const langs = Object.keys(TRANSLATIONS)
const placeholders = (s: string) => (s.match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join(',')

function walk(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) walk(p, out)
    else if (/\.(ts|tsx)$/.test(n)) out.push(p)
  }
  return out
}

describe('translations are complete for every language', () => {
  it('has all 31 languages with a supplement file', () => {
    expect(langs.length).toBe(31)
    for (const l of langs) expect(SUPPLEMENT[l], `supplement/${l}.json`).toBeDefined()
  })

  it.each(langs)('%s: no key falls back to English', (lang) => {
    const dict = flatten(TRANSLATIONS[lang])
    const supp = flatten(SUPPLEMENT[lang])
    const missing = keys.filter((k) => !dict[k] && !supp[k])
    expect(missing, `run "node scripts/i18n-sync.cjs": ${missing.slice(0, 5).join(', ')}`).toEqual([])
  })

  it.each(langs)('%s: placeholders match the English text', (lang) => {
    const dict = flatten(TRANSLATIONS[lang])
    const supp = flatten(SUPPLEMENT[lang])
    const bad = keys.filter((k) => {
      const v = dict[k] || supp[k]
      return v && placeholders(v) !== placeholders(enAll[k])
    })
    expect(bad, bad.slice(0, 5).join(', ')).toEqual([])
  })
})

describe('code only uses keys that exist', () => {
  it("every t('key') in src/ and mt('key') in electron/ is defined in English", () => {
    const used = new Map<string, string>()
    const add = (re: RegExp, files: string[]) => {
      for (const f of files) {
        for (const m of readFileSync(f, 'utf8').matchAll(re)) used.set(m[1], relative(root, f))
      }
    }
    add(/\bt\(\s*'([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)'/g, walk(join(root, 'src')).filter((f) => !f.endsWith('translations.ts')))
    add(/\bmt\(\s*'([a-zA-Z0-9_]+\.[a-zA-Z0-9_.]+)'/g, walk(join(root, 'electron')))
    // dynamic keys built from a known prefix
    const dynamic = ['main.license.code.']
    const missing = [...used].filter(([k]) => !enAll[k] && !dynamic.some((d) => k.startsWith(d)))
    expect(missing.map(([k, f]) => `${k} (${f})`)).toEqual([])
    for (const code of ['NOT_FOUND', 'INACTIVE', 'EXPIRED', 'HARDWARE_MISMATCH', 'ACTIVATED', 'VERIFIED']) {
      expect(enAll[`main.license.code.${code}`], code).toBeTruthy()
    }
  })
})

describe('no hardcoded Vietnamese in the UI code', () => {
  const VI = /[ăâđêôơưĂÂĐÊÔƠƯáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/
  // Vietnamese on purpose: translation data, diagnostic logs for the developer, the
  // Vietnam-only payment receipt, and the server's default user name.
  const allowed = new Set([
    'src/i18n/translations.ts',
    'src/lib/licenseText.ts',
    'electron/main/logger.ts',
    'shared/receipt.ts',
    'shared/license.ts',
    'electron/store/backup.ts'
  ])
  it('src/ and electron/ have no Vietnamese string literals outside the allowlist', () => {
    const offenders: string[] = []
    for (const dir of ['src', 'electron']) {
      for (const f of walk(join(root, dir))) {
        const rel = relative(root, f).split('\\').join('/')
        if (allowed.has(rel)) continue
        readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
          const t = line.trim()
          if (!VI.test(t) || t.startsWith('//') || t.startsWith('*') || t.startsWith('/*')) return
          if (/AppLogger\.write|console\.(log|warn|error|info)/.test(t)) return // developer logs
          if (t.startsWith('{/*')) return // JSX comment, not UI text
          if (t.includes("toLocaleString('vi-VN')")) return // VND amounts use the Vietnamese number format + đ
          if (t.includes('THÔNG TIN CHẨN ĐOÁN')) return // matches the (Vietnamese) diagnostics header in the log file
          offenders.push(`${rel}:${i + 1}  ${t.slice(0, 90)}`)
        })
      }
    }
    expect(offenders).toEqual([])
  })
})
