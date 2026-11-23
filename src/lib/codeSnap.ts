/**
 * "CodeSnap"-style screenshot of a code snippet: gradient backdrop, a window
 * with traffic lights, syntax colours and line numbers, rendered to a PNG on a
 * plain canvas (no extra dependency, nothing leaves the machine).
 */
import { Prism } from 'prism-react-renderer'
import { prismGrammar } from './codeDetect'

export interface CodeSnapOptions {
  language?: string
  title?: string
  lineNumbers?: boolean
  maxLines?: number
  maxCols?: number
  scale?: number
}

interface Seg {
  text: string
  color: string
  italic?: boolean
}

const PLAIN = '#e6e6ee'
const PALETTE: [string[], string, boolean?][] = [
  [['comment', 'prolog', 'doctype', 'cdata'], '#6b7394', true],
  [['keyword', 'selector', 'atrule', 'important', 'tag'], '#c792ea'],
  [['string', 'char', 'inserted', 'url', 'attr-value'], '#c3e88d'],
  [['number', 'boolean', 'constant', 'symbol', 'deleted', 'regex'], '#f78c6c'],
  [['function', 'class-name', 'maybe-class-name', 'builtin'], '#82aaff'],
  [['attr-name', 'property'], '#ffcb6b'],
  [['operator', 'combinator'], '#89ddff'],
  [['punctuation'], '#9aa3c7'],
  [['variable', 'parameter'], '#eeffff']
]

function colorFor(types: string[]): { color: string; italic?: boolean } {
  for (const [names, color, italic] of PALETTE) {
    if (types.some((t) => names.includes(t))) return { color, italic }
  }
  return { color: PLAIN }
}

type PrismToken = string | { type: string; alias?: string | string[]; content: unknown }

function flatten(tokens: unknown, types: string[], out: Seg[]): void {
  if (typeof tokens === 'string') {
    const { color, italic } = colorFor(types)
    out.push({ text: tokens, color, italic })
    return
  }
  if (Array.isArray(tokens)) {
    for (const t of tokens) flatten(t, types, out)
    return
  }
  const tok = tokens as Exclude<PrismToken, string>
  if (!tok) return
  const alias = tok.alias ? (Array.isArray(tok.alias) ? tok.alias : [tok.alias]) : []
  flatten(tok.content, [...types, tok.type, ...alias], out)
}

/** Split highlighted segments into lines (tokens may contain newlines). */
function toLines(code: string, language: string): Seg[][] {
  const grammar = (Prism.languages as Record<string, unknown>)[prismGrammar(language)]
  let segs: Seg[] = []
  if (grammar) {
    try {
      flatten(Prism.tokenize(code, grammar as never), [], segs)
    } catch {
      segs = [{ text: code, color: PLAIN }]
    }
  } else {
    segs = [{ text: code, color: PLAIN }]
  }
  const lines: Seg[][] = [[]]
  for (const s of segs) {
    const parts = s.text.split('\n')
    parts.forEach((p, i) => {
      if (i > 0) lines.push([])
      if (p) lines[lines.length - 1].push({ ...s, text: p.replace(/\t/g, '  ') })
    })
  }
  return lines
}

/** One gradient per language, taken from each language's own brand colours. */
const BACKDROPS: Record<string, string[]> = {
  typescript: ['#3178c6', '#235a97', '#12315a'], // TypeScript blue
  tsx: ['#3178c6', '#235a97', '#12315a'],
  javascript: ['#f7df1e', '#e8a317', '#7a5c00'], // JavaScript yellow
  jsx: ['#f7df1e', '#e8a317', '#7a5c00'],
  python: ['#3776ab', '#4b8bbe', '#ffd43b'], // Python blue to yellow
  rust: ['#dea584', '#c4562a', '#5b2a12'], // Rust copper / orange
  go: ['#00add8', '#0086ad', '#00495e'], // Go cyan
  cpp: ['#659ad2', '#00599c', '#00315a'], // C++ blue
  csharp: ['#9b4f96', '#68217a', '#2d0b3a'], // C# purple
  bash: ['#4eaa25', '#2f6f1a', '#10260a'], // shell green
  html: ['#e34f26', '#f06529', '#7a2410'], // HTML orange
  css: ['#264de4', '#2965f1', '#14246e'], // CSS blue
  json: ['#292929', '#5a5a5a', '#9a9a9a'], // JSON neutral grey
  sql: ['#00758f', '#f29111', '#3a2a08'], // MySQL teal and orange
  kotlin: ['#7f52ff', '#c711e1', '#e44857'], // Kotlin purple to red
  swift: ['#f05138', '#ff8a50', '#7a1f10'], // Swift orange
  java: ['#f89820', '#5382a1', '#1b3a52'], // Java orange to blue
  php: ['#777bb4', '#4f5b93', '#232738'], // PHP indigo
  ruby: ['#cc342d', '#a91401', '#4a0a06'], // Ruby red
  dart: ['#0175c2', '#02569b', '#13b9fd'], // Dart blue
  lua: ['#000080', '#2c2d72', '#5a5fd6'], // Lua navy
  zig: ['#f7a41d', '#ec7a13', '#4a2a05'], // Zig amber
  mojo: ['#ff4500', '#ff8c00', '#7a1a00'], // Mojo flame
  gleam: ['#ffaffe', '#ff6bcb', '#5b1a4a'], // Gleam pink
  elixir: ['#6e4a7e', '#4b275f', '#1f0f29'], // Elixir purple
  haskell: ['#5e5086', '#453a62', '#8f4e8b'], // Haskell violet
  julia: ['#9558b2', '#389826', '#cb3c33'], // Julia purple, green, red
  nim: ['#ffe953', '#7a6a00', '#2a2400'], // Nim yellow
  odin: ['#3882f6', '#1e3a8a', '#0b1a44'], // Odin blue
  v: ['#5d87bf', '#4f6d9c', '#1f2b3f'], // V steel blue
  scala: ['#dc322f', '#8f1d1b', '#2b0a0a'], // Scala red
  toml: ['#9c4221', '#6b2d16', '#2a120a'], // TOML rust brown
  powershell: ['#012456', '#2671be', '#5391fe'], // PowerShell blue
  dockerfile: ['#2496ed', '#0b6bbf', '#07304f'], // Docker blue
  react: ['#61dafb', '#2a8fb0', '#20232a'], // React cyan
  nextjs: ['#111111', '#3a3a3a', '#8a8a8a'], // Next.js black
  vue: ['#42b883', '#35495e', '#1f2d3a'], // Vue green and slate
  svelte: ['#ff3e00', '#c42f00', '#3a1100'], // Svelte orange
  angular: ['#dd0031', '#c3002f', '#5a0014'], // Angular red
  astro: ['#ff5d01', '#8b5cf6', '#1b0f3a'], // Astro orange to violet
  express: ['#68a063', '#3c873a', '#1a3a1a'], // Node green
  markdown: ['#6366f1', '#4f46e5', '#1e1b4b'], // Markdown indigo
  txa: ['#2563eb', '#ef4444', '#facc15'] // .txa: blue, red, yellow
}
const DEFAULT_BACKDROP = ['#5b7cfa', '#8b5cf6', '#ec4899']

/** The most readable (brightest) colour of a language's gradient, for badges and chips. */
export function languageAccent(language: string): string {
  const lum = (hex: string) => {
    const n = parseInt(hex.slice(1), 16)
    return 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)
  }
  return pickBackdrop(language).reduce((best, c) => (lum(c) > lum(best) ? c : best))
}

/** Gradient stops (CSS colours, left-top to right-bottom) behind the code window. */
export function pickBackdrop(language: string): string[] {
  return BACKDROPS[language.toLowerCase()] ?? DEFAULT_BACKDROP
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/** Render the snippet; resolves a PNG data URL. */
export function renderCodeSnap(rawCode: string, opts: CodeSnapOptions = {}): string {
  const language = (opts.language || 'plain').toLowerCase()
  const showNumbers = opts.lineNumbers !== false
  const maxLines = opts.maxLines ?? 70
  const maxCols = opts.maxCols ?? 110
  const scale = opts.scale ?? 2

  // Trim blank edges and drop the common left indent so the shot looks tidy.
  let code = rawCode.replace(/\r\n?/g, '\n').replace(/^\n+/, '').trimEnd()
  const rows = code.split('\n')
  const indents = rows.filter((l) => l.trim()).map((l) => (l.match(/^[ \t]*/) as RegExpMatchArray)[0].length)
  const cut = indents.length ? Math.min(...indents) : 0
  code = rows.map((l) => l.slice(cut)).join('\n')

  let lines = toLines(code, language)
  let truncated = false
  if (lines.length > maxLines) {
    lines = lines.slice(0, maxLines)
    truncated = true
  }
  const FONT = '15px "Cascadia Code","Cascadia Mono",Consolas,"JetBrains Mono",monospace'

  const probe = document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D
  probe.font = FONT
  const charW = probe.measureText('M').width

  const lineText = (l: Seg[]) => l.map((s) => s.text).join('')
  const longest = Math.min(maxCols, Math.max(24, ...lines.map((l) => lineText(l).length)))
  const gutterCols = showNumbers ? String(lines.length).length + 2 : 0

  const LH = 25
  const PAD = 64
  const WIN_PAD = 26
  const BAR = 46
  const winW = Math.round((longest + gutterCols) * charW + WIN_PAD * 2)
  const winH = BAR + WIN_PAD + lines.length * LH + (truncated ? LH : 0) + WIN_PAD - 8
  const W = winW + PAD * 2
  const H = winH + PAD * 2

  const canvas = document.createElement('canvas')
  canvas.width = W * scale
  canvas.height = H * scale
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  ctx.scale(scale, scale)

  // Backdrop
  const bg = ctx.createLinearGradient(0, 0, W, H)
  const stops = pickBackdrop(language)
  stops.forEach((color, i) => bg.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), color))
  ctx.fillStyle = bg
  ctx.fillRect(0, 0, W, H)

  // Window shadow + body
  ctx.save()
  ctx.shadowColor = 'rgba(0,0,0,0.45)'
  ctx.shadowBlur = 48
  ctx.shadowOffsetY = 22
  roundRect(ctx, PAD, PAD, winW, winH, 14)
  ctx.fillStyle = '#14151f'
  ctx.fill()
  ctx.restore()
  roundRect(ctx, PAD, PAD, winW, winH, 14)
  ctx.strokeStyle = 'rgba(255,255,255,0.10)'
  ctx.lineWidth = 1
  ctx.stroke()

  // Title bar
  ;['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => {
    ctx.beginPath()
    ctx.arc(PAD + 24 + i * 22, PAD + BAR / 2, 6.5, 0, Math.PI * 2)
    ctx.fillStyle = c
    ctx.fill()
  })
  const title = opts.title || (language !== 'plain' ? language : '')
  if (title) {
    ctx.font = '600 13px "Segoe UI",system-ui,sans-serif'
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText(title, PAD + winW / 2, PAD + BAR / 2 + 1)
  }

  // Code
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
  ctx.font = FONT
  const x0 = PAD + WIN_PAD
  let y = PAD + BAR + WIN_PAD - 4 + 15
  lines.forEach((line, i) => {
    if (showNumbers) {
      ctx.fillStyle = 'rgba(255,255,255,0.25)'
      ctx.textAlign = 'right'
      ctx.fillText(String(i + 1), x0 + (gutterCols - 2) * charW, y)
      ctx.textAlign = 'left'
    }
    let x = x0 + gutterCols * charW
    let col = 0
    for (const s of line) {
      if (col >= maxCols) break
      const room = maxCols - col
      const text = s.text.length > room ? s.text.slice(0, room - 1) + '…' : s.text
      ctx.fillStyle = s.color
      ctx.font = s.italic ? `italic ${FONT}` : FONT
      ctx.fillText(text, x, y)
      x += text.length * charW
      col += text.length
    }
    y += LH
  })
  if (truncated) {
    ctx.font = FONT
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillText('…', x0 + gutterCols * charW, y)
  }

  return canvas.toDataURL('image/png')
}

/** Render the snippet, put the PNG on the clipboard and tell the user. */
export async function copyCodeSnap(code: string, language?: string): Promise<boolean> {
  const { useStore } = await import('../store/appStore')
  const { t } = await import('../i18n')
  try {
    const dataUrl = renderCodeSnap(code, { language })
    const ok = await window.edge?.copyImageDataUrl?.(dataUrl)
    useStore.getState().pushToast({
      id: Date.now().toString(),
      message: ok ? t('codeSnap.copied') : t('codeSnap.failed'),
      tone: ok ? 'info' : 'error'
    } as never)
    return Boolean(ok)
  } catch {
    useStore.getState().pushToast({ id: Date.now().toString(), message: t('codeSnap.failed'), tone: 'error' } as never)
    return false
  }
}

/** Render the snippet and ask where to save the PNG. */
export async function saveCodeSnap(code: string, language?: string): Promise<boolean> {
  try {
    const dataUrl = renderCodeSnap(code, { language })
    const res = await window.edge?.saveImageFile?.({ dataUrl, defaultName: `code-${language || 'snippet'}.png` })
    return Boolean(res?.ok)
  } catch {
    return false
  }
}
