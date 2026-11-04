/**
 * i18n sync — keeps every language complete and regenerates t-drop-translations/.
 *
 *   node scripts/i18n-sync.cjs                  translate what is missing, rewrite files
 *   node scripts/i18n-sync.cjs --check          only report what is missing (exit 1 if any)
 *   node scripts/i18n-sync.cjs --lang=de,ja     only those languages
 *   node scripts/i18n-sync.cjs --retranslate=imageStudio.,logs.   redo keys by prefix
 *   node scripts/i18n-sync.cjs --retranslate=all                  redo everything in the supplement
 *
 * Source of truth is English (src/i18n/translations.ts `en` + shared/i18n/supplement/en.json),
 * with the original Vietnamese wording passed along as a second reference. For every other
 * language, any key its dictionary lacks lives in shared/i18n/supplement/<lang>.json.
 *
 * Translation is done by LLMs, not word-by-word machine translation: each request carries
 * the app description, where the string appears in the UI, the English + Vietnamese text,
 * approved vocabulary already used in that language, and style rules. Placeholders and brand
 * names are verified after every answer; invalid answers are retried, never stored.
 *
 * Providers (tried in rotation, falling through on errors). Keyless by default; set any of
 * these environment variables (all have free tiers) to add more models:
 *   GEMINI_API_KEY      [+ GEMINI_MODELS=comma,separated]   https://aistudio.google.com/apikey
 *   GROQ_API_KEY        [+ GROQ_MODELS]                      https://console.groq.com/keys
 *   OPENROUTER_API_KEY  [+ OPENROUTER_MODELS]                https://openrouter.ai/keys
 *   (always on, last) Pollinations GPT-OSS, no key: heavily rate limited
 * Put them in a file named .env.i18n in the project root (one KEY=value per line; gitignored).
 *
 * Finally t-drop-translations/<lang>.json is regenerated as the full merged view.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { TRANSLATIONS, LANGUAGES } from '../src/i18n/translations'

const ROOT = join(__dirname, '..')

// Optional API keys live in .env.i18n (KEY=value per line; gitignored), never in the repo.
const ENV_FILE = join(ROOT, '.env.i18n')
if (existsSync(ENV_FILE)) {
  for (const line of readFileSync(ENV_FILE, 'utf8').split(String.fromCharCode(10))) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && !line.trim().startsWith('#')) process.env[m[1]] ??= m[2].replace(/^["']|["']$/g, '')
  }
}
const SUPP_DIR = join(ROOT, 'shared', 'i18n', 'supplement')
const OUT_DIR = join(ROOT, 't-drop-translations')

type Flat = Record<string, string>
type Tree = { [k: string]: string | Tree }

const args = process.argv.slice(2)
const CHECK = args.includes('--check')
const onlyLangs = (args.find((a) => a.startsWith('--lang=')) || '').slice(7).split(',').filter(Boolean)
const retrans = (args.find((a) => a.startsWith('--retranslate=')) || '').slice(14).split(',').filter(Boolean)
const BATCH = 40

function flatten(o: unknown, p = '', r: Flat = {}): Flat {
  if (o && typeof o === 'object') {
    for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
      if (typeof v === 'string') r[p + k] = v
      else flatten(v, p + k + '.', r)
    }
  }
  return r
}

function unflatten(f: Flat): Tree {
  const root: Tree = {}
  for (const [path, value] of Object.entries(f)) {
    const parts = path.split('.')
    let cur = root
    for (const part of parts.slice(0, -1)) {
      if (typeof cur[part] !== 'object') cur[part] = {}
      cur = cur[part] as Tree
    }
    cur[parts[parts.length - 1]] = value
  }
  return root
}

const readJson = (p: string): Tree => (existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : {})
const writeJson = (p: string, d: unknown) => writeFileSync(p, JSON.stringify(d, null, 2) + '\n', 'utf8')
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

// ── sources ─────────────────────────────────────────────────────────────────
const enAll: Flat = { ...flatten(TRANSLATIONS.en) }
for (const [k, v] of Object.entries(flatten(readJson(join(SUPP_DIR, 'en.json'))))) if (!(k in enAll)) enAll[k] = v
const keys = Object.keys(enAll)
const viAll: Flat = { ...flatten(readJson(join(SUPP_DIR, 'vi.json'))), ...flatten(TRANSLATIONS.vi) }
const langName = (code: string) => LANGUAGES.find((l) => l.code === code)?.name || code
const placeholders = (s: string) => (s.match(/\{[A-Za-z0-9_]+\}/g) || []).sort().join(',')

// ── context handed to the model ─────────────────────────────────────────────
const AREAS: Record<string, string> = {
  toast: 'short toast notifications',
  imageStudio: 'the Image Tools panel (convert format, compress, OCR text extraction)',
  license: 'license / VIP & PREMIUM subscription area in Settings',
  purchase: 'checkout window: choose a plan, pay by bank-transfer QR (VietQR)',
  renew: 'checkout window for renewing an existing license',
  receipt: 'printing a payment receipt PDF and signing it with the mouse or finger',
  logs: 'the developer "System logs & diagnostics" window in Settings',
  main: 'native Windows notifications and dialogs shown outside the main window',
  behaviour: 'Settings > behaviour options (launch at login, hover, updates, hotkey)',
  backup: 'backup & restore of the clipboard history to an encrypted .txa file',
  qr: 'sharing text/links to a phone through a QR code',
  text: 'text tools in the preview panel (UPPERCASE, lowercase, Title Case, camelCase, clean spaces, counters)',
  item: 'a clipboard history card (copy, pin, delete, preview, clean URL, color convert)',
  emoji: 'the emoji picker',
  filters: 'type filter tabs above the history list',
  header: 'the panel header and search box',
  footer: 'footer links and the donate dialog (bank transfer details)',
  emptyState: 'empty-list screens',
  position: 'Settings > position of the shelf on the screen edge',
  appearance: 'Settings > appearance, sound and typography',
  stats: 'small count labels next to text length',
  common: 'generic words used in many places'
}

function kindOf(key: string): string {
  const last = key.split('.').pop() || ''
  if (/^toast\./.test(key) || /(Success|Failed|Error|Copied|Saved|Cleared|Done)$/.test(last)) return 'a short status/notification message'
  if (/Tip$/.test(last)) return 'a tooltip'
  if (/(Btn|Button|Cta)$/.test(last) || /^(copy|download|clear|refresh|back|next|skip|create|retry)/i.test(last)) return 'a button label (keep it very short)'
  if (/(Desc|Hint|Note|Subtitle|Notice|Help)/.test(last)) return 'a description / helper sentence'
  if (/(Title|Label)$/.test(last)) return 'a heading or field label'
  return 'a UI string'
}

const GLOSSARY_KEYS = [
  'filters.all', 'filters.text', 'filters.links', 'filters.images', 'filters.files', 'header.settings', 'header.close',
  'header.searchPlaceholder', 'item.copied', 'item.pinned', 'behaviour.languageTitle', 'behaviour.download', 'backup.exportBtn',
  'backup.importBtn', 'tabs.behaviour', 'tabs.position', 'tabs.appearance', 'position.leftEdge', 'toast.itemDeleted', 'common.undo'
]

function systemPrompt(lang: string, dict: Flat): string {
  const ref = GLOSSARY_KEYS.filter((k) => dict[k] && enAll[k])
    .slice(0, 16)
    .map((k) => `  "${enAll[k]}" => "${dict[k]}"`)
    .join('\n')
  return [
    `You are a senior software localization specialist and a native ${langName(lang)} speaker.`,
    `You are localizing T-Drop, a Windows clipboard manager that docks to the edge of the screen; hovering the edge opens a shelf with the history of copied text, links, images and files. It also has image tools with OCR, a Pro license (VIP 30 days / PREMIUM 60 days) paid by bank-transfer QR, and encrypted backups.`,
    ``,
    `How to write:`,
    `- Sound like the interface of a polished native app in ${langName(lang)} (think Windows, Chrome, Telegram). Natural, idiomatic phrasing: never a literal word-for-word rendering, and never sound machine-translated.`,
    `- Be concise: UI space is tight. Buttons and tabs should be one to three words. Use the verb forms, politeness level and punctuation conventions normal for ${langName(lang)} software (for example the usual imperative/infinitive for buttons).`,
    `- Keep terminology consistent with the approved vocabulary below.`,
    `- Keep EXACTLY as written: {placeholders} in braces, T-Drop, VIP, PREMIUM, VietQR, OCR, file extensions (.txa, .PNG, .TXT), key names (Alt+C, Esc), emoji, and leading/trailing symbols.`,
    `- Each item gives the English text, the original Vietnamese wording (extra meaning/tone hint) and where it appears. Translate the English meaning; use the Vietnamese only to resolve ambiguity.`,
    `- Output a single JSON object mapping each key to its ${langName(lang)} translation. No comments, no extra keys.`,
    ref ? `\nApproved vocabulary already used in this app (English => ${langName(lang)}):\n${ref}` : ''
  ].join('\n')
}

function userPayload(batch: string[]): string {
  const items: Record<string, unknown> = {}
  for (const k of batch) {
    items[k] = { en: enAll[k], vi: viAll[k] || undefined, where: AREAS[k.split('.')[0]] || 'the app', kind: kindOf(k) }
  }
  return JSON.stringify(items)
}

// ── providers ───────────────────────────────────────────────────────────────
interface Provider {
  name: string
  url: string
  key?: string
  model: string
  body?: Record<string, unknown>
  serial?: boolean
}

function buildProviders(): Provider[] {
  const list: Provider[] = []
  const env = process.env
  if (env.OPENROUTER_API_KEY) {
    const models = (env.OPENROUTER_MODELS || 'meta-llama/llama-3.3-70b-instruct:free,qwen/qwen3-235b-a22b:free,mistralai/mistral-small-3.2-24b-instruct:free').split(',')
    for (const m of models) list.push({ name: `openrouter:${m}`, url: 'https://openrouter.ai/api/v1/chat/completions', key: env.OPENROUTER_API_KEY, model: m.trim() })
  }
  if (env.GEMINI_API_KEY) {
    // each Gemini model has its own free quota, so several models run faster than one
    for (const m of (env.GEMINI_MODELS || 'gemini-2.5-flash,gemini-2.0-flash,gemini-2.5-flash-lite').split(',')) {
      list.push({ name: `gemini:${m.trim()}`, url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions', key: env.GEMINI_API_KEY, model: m.trim() })
    }
  }
  if (env.GROQ_API_KEY) {
    for (const m of (env.GROQ_MODELS || 'llama-3.3-70b-versatile,qwen/qwen3-32b').split(',')) {
      list.push({ name: `groq:${m.trim()}`, url: 'https://api.groq.com/openai/v1/chat/completions', key: env.GROQ_API_KEY, model: m.trim() })
    }
  }
  list.push({ name: 'pollinations:gpt-oss', url: 'https://text.pollinations.ai/openai', model: 'openai', body: { reasoning_effort: 'low' }, serial: true })
  return list
}

const PROVIDERS = buildProviders()

async function ask(p: Provider, system: string, user: string): Promise<Record<string, string> | null> {
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(p.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(p.key ? { Authorization: `Bearer ${p.key}` } : {}) },
        body: JSON.stringify({
          model: p.model,
          temperature: 0.3,
          messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
          response_format: { type: 'json_object' },
          ...(p.body || {})
        })
      })
      if (res.status === 402 || res.status === 429 || res.status >= 500) {
        await sleep(8000 * (attempt + 1))
        continue
      }
      if (!res.ok) return null
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
      const content = json.choices?.[0]?.message?.content || ''
      const m = content.match(/\{[\s\S]*\}/)
      return m ? (JSON.parse(m[0]) as Record<string, string>) : null
    } catch {
      await sleep(4000 * (attempt + 1))
    }
  }
  return null
}

/** Why a translation is rejected (null = fine). */
function problem(lang: string, key: string, value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return 'empty'
  const src = enAll[key]
  if (placeholders(value) !== placeholders(src)) return 'placeholders'
  for (const brand of ['T-Drop', 'VIP', 'PREMIUM', 'VietQR', 'OCR', '.txa', '.TXT', '.PNG']) {
    if (src.includes(brand) && !value.includes(brand)) return `brand ${brand}`
  }
  const latin = !/[^\u0000-ɏḀ-ỿ -⯿\u{1F000}-\u{1FFFF}]/u.test(value)
  if (latin && !['en'].includes(lang) && value.trim() === src.trim() && src.split(/\s+/).length > 2) return 'left in English'
  if (value.length > Math.max(60, src.length * 4)) return 'too long'
  return null
}

let rotate = 0
async function translateBatch(lang: string, dict: Flat, batch: string[]): Promise<Flat> {
  const system = systemPrompt(lang, dict)
  const done: Flat = {}
  let pending = batch
  for (let round = 0; round < 4 && pending.length; round++) {
    // rotate through the providers; a failed provider hands over to the next one
    const p = PROVIDERS[(rotate + round) % PROVIDERS.length]
    const size = round === 0 ? pending.length : Math.max(8, Math.ceil(pending.length / 2))
    const chunk = pending.slice(0, size)
    const answer = await ask(p, system, userPayload(chunk))
    if (answer) {
      for (const k of chunk) {
        const v = answer[k]
        const why = problem(lang, k, v)
        if (!why) done[k] = (v as string).trim()
        else if (round === 3) console.log(`    ! ${k}: ${why}`)
      }
    }
    pending = batch.filter((k) => !done[k])
  }
  rotate++
  return done
}

// ── main ────────────────────────────────────────────────────────────────────
async function main() {
  const langs = Object.keys(TRANSLATIONS).filter((l) => l !== 'en' && l !== 'vi' && (!onlyLangs.length || onlyLangs.includes(l)))
  const viMissing = keys.filter((k) => !flatten(TRANSLATIONS.vi)[k] && !flatten(readJson(join(SUPP_DIR, 'vi.json')))[k])
  let totalMissing = viMissing.length
  if (CHECK && viMissing.length) console.log(`vi: ${viMissing.length} missing`)

  console.log(`Providers: ${PROVIDERS.map((p) => p.name).join(', ')}`)
  for (const lang of langs) {
    const dict = flatten(TRANSLATIONS[lang])
    const suppPath = join(SUPP_DIR, `${lang}.json`)
    const supp = flatten(readJson(suppPath))

    const needed = keys.filter((k) => !dict[k])
    const kept: Flat = {}
    const redoAll = retrans.includes('all')
    for (const k of needed) if (supp[k] && !redoAll && !retrans.some((p) => k.startsWith(p))) kept[k] = supp[k]
    const todo = needed.filter((k) => !kept[k])
    totalMissing += todo.length

    if (CHECK) {
      if (todo.length) console.log(`${lang}: ${todo.length} missing`)
      continue
    }
    const save = (extra: Flat) => {
      const all = { ...kept, ...extra }
      const ordered: Flat = {}
      for (const k of keys) if (all[k]) ordered[k] = all[k]
      writeJson(suppPath, unflatten(ordered))
    }
    if (!todo.length) continue

    process.stdout.write(`${lang} (${langName(lang)}): ${todo.length} strings `)
    const got: Flat = {}
    for (let i = 0; i < todo.length; i += BATCH) {
      Object.assign(got, await translateBatch(lang, dict, todo.slice(i, i + BATCH)))
      save(got) // progress survives an interruption
      process.stdout.write('.')
    }
    const failed = todo.filter((k) => !got[k])
    console.log(failed.length ? ` ${failed.length} unresolved (rerun to retry)` : ' ok')
  }

  if (CHECK) {
    console.log(totalMissing ? `\n${totalMissing} translations missing.` : 'All languages are complete.')
    process.exit(totalMissing ? 1 : 0)
  }

  // ── regenerate t-drop-translations/<lang>.json (full merged view) ─────────
  for (const lang of Object.keys(TRANSLATIONS)) {
    const dict = flatten(TRANSLATIONS[lang])
    const supp = flatten(readJson(join(SUPP_DIR, `${lang}.json`)))
    const merged: Flat = {}
    for (const k of keys) merged[k] = dict[k] || supp[k] || enAll[k]
    writeJson(join(OUT_DIR, `${lang}.json`), unflatten(merged))
  }
  console.log(`\nWrote ${Object.keys(TRANSLATIONS).length} files to t-drop-translations/ (${keys.length} keys each).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
