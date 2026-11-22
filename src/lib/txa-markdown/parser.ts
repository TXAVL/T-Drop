/**
 * txa-markdown — Zero-dependency GFM-compatible Markdown parser.
 *
 * Produces a clean, XSS-safe AST of BlockNode / InlineNode trees that can be
 * rendered directly to React elements without dangerouslySetInnerHTML.
 */
import type { BlockNode, InlineNode, ListItemNode, TableAlign } from './types'

const SAFE_URL_PROTOCOLS = /^(https?:|mailto:|#)/i

/** Allow only safe link/image URLs (blocks javascript:, data:, vbscript:, etc.). */
export function isSafeUrl(url: string): boolean {
  const trimmed = url.trim()
  if (!trimmed) return false
  return SAFE_URL_PROTOCOLS.test(trimmed)
}

/* -------------------------------------------------------------------------- */
/* Inline parser                                                              */
/* -------------------------------------------------------------------------- */

const ESCAPABLE = new Set(['\\', '`', '*', '_', '{', '}', '[', ']', '(', ')', '#', '+', '-', '.', '!', '|', '~', '>'])

function pushText(out: InlineNode[], value: string): void {
  if (!value) return
  const prev = out[out.length - 1]
  if (prev && prev.type === 'text') {
    prev.value += value
  } else {
    out.push({ type: 'text', value })
  }
}

/** Find matching closing delimiter (skipping backslash escapes). */
function findClosing(src: string, start: number, delim: string): number {
  let i = start
  while (i < src.length) {
    if (src[i] === '\\' && i + 1 < src.length) {
      i += 2
      continue
    }
    if (src.startsWith(delim, i)) {
      return i
    }
    i++
  }
  return -1
}

/** Find matching closing ')' respecting nested parentheses (e.g. Wikipedia URLs). */
function findMatchingParen(src: string, start: number): number {
  let depth = 1
  let i = start
  while (i < src.length) {
    if (src[i] === '\\' && i + 1 < src.length) {
      i += 2
      continue
    }
    if (src[i] === '(') depth++
    else if (src[i] === ')') {
      depth--
      if (depth === 0) return i
    }
    i++
  }
  return -1
}

/** Parse inline Markdown (bold, italic, code, strike, links, images, autolinks, breaks). */
export function parseInline(raw: string): InlineNode[] {
  const out: InlineNode[] = []
  let i = 0
  const len = raw.length

  while (i < len) {
    const ch = raw[i]

    // 1. Hard line break
    if (ch === '\n') {
      out.push({ type: 'break' })
      i++
      continue
    }

    // 2. Backslash escape
    if (ch === '\\' && i + 1 < len && ESCAPABLE.has(raw[i + 1])) {
      pushText(out, raw[i + 1])
      i += 2
      continue
    }

    // 3. Inline code span (`...` or ``...``)
    if (ch === '`') {
      let ticks = 0
      while (i + ticks < len && raw[i + ticks] === '`') ticks++
      const fence = '`'.repeat(ticks)
      const close = raw.indexOf(fence, i + ticks)
      if (close !== -1) {
        let content = raw.slice(i + ticks, close)
        // CommonMark rule: strip one leading/trailing space if both exist and content isn't all spaces
        if (content.length >= 2 && content.startsWith(' ') && content.endsWith(' ') && content.trim().length > 0) {
          content = content.slice(1, -1)
        }
        out.push({ type: 'code', value: content })
        i = close + ticks
        continue
      }
      pushText(out, fence)
      i += ticks
      continue
    }

    // 4. Image: ![alt](url)
    if (ch === '!' && raw[i + 1] === '[') {
      const closeBracket = findClosing(raw, i + 2, ']')
      if (closeBracket !== -1 && raw[closeBracket + 1] === '(') {
        const closeParen = findMatchingParen(raw, closeBracket + 2)
        if (closeParen !== -1) {
          const alt = raw.slice(i + 2, closeBracket)
          const hrefRaw = raw.slice(closeBracket + 2, closeParen).trim()
          const src = hrefRaw.replace(/^<|>$/g, '').split(/\s+/)[0] || ''
          if (isSafeUrl(src)) {
            out.push({ type: 'image', src, alt })
          } else {
            pushText(out, alt || src)
          }
          i = closeParen + 1
          continue
        }
      }
    }

    // 5. Link: [label](url)
    if (ch === '[') {
      const closeBracket = findClosing(raw, i + 1, ']')
      if (closeBracket !== -1 && raw[closeBracket + 1] === '(') {
        const closeParen = findMatchingParen(raw, closeBracket + 2)
        if (closeParen !== -1) {
          const label = raw.slice(i + 1, closeBracket)
          const hrefRaw = raw.slice(closeBracket + 2, closeParen).trim()
          const href = hrefRaw.replace(/^<|>$/g, '').split(/\s+/)[0] || ''
          if (isSafeUrl(href)) {
            out.push({ type: 'link', href, children: parseInline(label) })
          } else {
            out.push(...parseInline(label))
          }
          i = closeParen + 1
          continue
        }
      }
    }

    // 6. Bold + italic: ***text*** or ___text___
    if ((raw.startsWith('***', i) || raw.startsWith('___', i)) && raw[i + 3] && !/\s/.test(raw[i + 3])) {
      const delim = raw.slice(i, i + 3)
      const close = findClosing(raw, i + 3, delim)
      if (close !== -1 && close > i + 3) {
        out.push({ type: 'bold_italic', children: parseInline(raw.slice(i + 3, close)) })
        i = close + 3
        continue
      }
    }

    // 7. Bold: **text** or __text__
    if ((raw.startsWith('**', i) || raw.startsWith('__', i)) && raw[i + 2] && !/\s/.test(raw[i + 2])) {
      const delim = raw.slice(i, i + 2)
      // Avoid intraword __ like foo__bar__baz unless preceded by boundary
      const prevCh = i > 0 ? raw[i - 1] : ''
      if (delim === '**' || !/[A-Za-z0-9]/.test(prevCh)) {
        const close = findClosing(raw, i + 2, delim)
        if (close !== -1 && close > i + 2 && !/\s/.test(raw[close - 1])) {
          out.push({ type: 'bold', children: parseInline(raw.slice(i + 2, close)) })
          i = close + 2
          continue
        }
      }
    }

    // 8. Strikethrough: ~~text~~
    if (raw.startsWith('~~', i) && raw[i + 2] && !/\s/.test(raw[i + 2])) {
      const close = findClosing(raw, i + 2, '~~')
      if (close !== -1 && close > i + 2 && !/\s/.test(raw[close - 1])) {
        out.push({ type: 'strike', children: parseInline(raw.slice(i + 2, close)) })
        i = close + 2
        continue
      }
    }

    // 9. Italic: *text* or _text_
    if ((ch === '*' || ch === '_') && raw[i + 1] && !/\s/.test(raw[i + 1]) && raw[i + 1] !== ch) {
      const prevCh = i > 0 ? raw[i - 1] : ''
      // Prevent intraword snake_case_identifiers from turning italic
      if (ch === '*' || !/[A-Za-z0-9]/.test(prevCh)) {
        const close = findClosing(raw, i + 1, ch)
        if (close !== -1 && close > i + 1 && !/\s/.test(raw[close - 1])) {
          const nextAfter = raw[close + 1] ?? ''
          if (ch === '*' || !/[A-Za-z0-9]/.test(nextAfter)) {
            out.push({ type: 'italic', children: parseInline(raw.slice(i + 1, close)) })
            i = close + 1
            continue
          }
        }
      }
    }

    // 10. Bare autolink: https://... or http://...
    if ((ch === 'h' || ch === 'H') && /^https?:\/\//i.test(raw.slice(i))) {
      const match = raw.slice(i).match(/^https?:\/\/[^\s<>()]+/i)
      if (match) {
        let url = match[0]
        // Trim trailing sentence punctuation
        while (/[.,;:!?]$/.test(url)) {
          url = url.slice(0, -1)
        }
        if (url.length > 8) {
          out.push({ type: 'link', href: url, children: [{ type: 'text', value: url }] })
          i += url.length
          continue
        }
      }
    }

    pushText(out, ch)
    i++
  }

  return out
}

/* -------------------------------------------------------------------------- */
/* Block helpers                                                              */
/* -------------------------------------------------------------------------- */

const HR_RE = /^\s{0,3}([-*_])(?:\s*\1){2,}\s*$/
const HEADING_RE = /^\s{0,3}(#{1,6})(?:\s+(.*?))?\s*#*\s*$/
const FENCE_RE = /^\s{0,3}(`{3,}|~{3,})\s*([^\s`~]*)\s*$/
const BLOCKQUOTE_RE = /^\s{0,3}>\s?(.*)$/
const UL_RE = /^(\s*)([-*+])\s+(.*)$/
const OL_RE = /^(\s*)(\d{1,9})[.)]\s+(.*)$/
const TASK_RE = /^\[([ xX])\]\s+(.*)$/

/** Split a GFM table row into cell strings, respecting escaped pipes `\|` and inline code. */
function splitTableRow(line: string): string[] {
  let trimmed = line.trim()
  if (trimmed.startsWith('|')) trimmed = trimmed.slice(1)
  if (trimmed.endsWith('|') && !trimmed.endsWith('\\|')) trimmed = trimmed.slice(0, -1)

  const cells: string[] = []
  let current = ''
  let inCode = false
  for (let i = 0; i < trimmed.length; i++) {
    const ch = trimmed[i]
    if (ch === '\\' && trimmed[i + 1] === '|') {
      current += '|'
      i++
      continue
    }
    if (ch === '`') {
      inCode = !inCode
      current += ch
      continue
    }
    if (ch === '|' && !inCode) {
      cells.push(current.trim())
      current = ''
      continue
    }
    current += ch
  }
  cells.push(current.trim())
  return cells
}

/** Check if a line is a valid GFM table delimiter row (e.g. `|---|:---:|---:|`). */
function parseTableDelimiter(line: string): TableAlign[] | null {
  const trimmed = line.trim()
  if (!trimmed.includes('-')) return null
  if (!/^\|?[\s:|-]+\|?$/.test(trimmed)) return null
  const cells = splitTableRow(trimmed)
  if (cells.length === 0) return null
  const aligns: TableAlign[] = []
  for (const cell of cells) {
    if (!/^:?-{1,}:?$/.test(cell)) return null
    const left = cell.startsWith(':')
    const right = cell.endsWith(':')
    if (left && right) aligns.push('center')
    else if (right) aligns.push('right')
    else if (left) aligns.push('left')
    else aligns.push(null)
  }
  return aligns
}

function isTableStart(lines: string[], idx: number): boolean {
  if (idx + 1 >= lines.length) return false
  const headerLine = lines[idx]
  const delimLine = lines[idx + 1]
  if (!headerLine.includes('|')) return false
  const aligns = parseTableDelimiter(delimLine)
  if (!aligns) return false
  const headers = splitTableRow(headerLine)
  return headers.length === aligns.length && headers.length >= 1
}

function isBlockStarter(lines: string[], idx: number): boolean {
  const line = lines[idx]
  if (!line.trim()) return true
  if (FENCE_RE.test(line)) return true
  if (HEADING_RE.test(line)) return true
  if (BLOCKQUOTE_RE.test(line)) return true
  if (UL_RE.test(line) || OL_RE.test(line)) return true
  if (isTableStart(lines, idx)) return true
  if (HR_RE.test(line)) return true
  return false
}

/* -------------------------------------------------------------------------- */
/* Block parser                                                               */
/* -------------------------------------------------------------------------- */

/** Parse full Markdown text into a list of BlockNode AST elements. */
export function parseMarkdown(source: string): BlockNode[] {
  if (!source || typeof source !== 'string') return []
  const normalized = source.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  const blocks: BlockNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    // Skip blank lines
    if (!line.trim()) {
      i++
      continue
    }

    // 1. Fenced code block (``` or ~~~)
    const fenceMatch = line.match(FENCE_RE)
    if (fenceMatch) {
      const fenceChar = fenceMatch[1][0]
      const fenceLen = fenceMatch[1].length
      const lang = (fenceMatch[2] || '').toLowerCase()
      const codeLines: string[] = []
      i++
      const closeRe = new RegExp(`^\\s{0,3}${fenceChar}{${fenceLen},}\\s*$`)
      while (i < lines.length && !closeRe.test(lines[i])) {
        codeLines.push(lines[i])
        i++
      }
      if (i < lines.length) i++ // consume closing fence
      blocks.push({ type: 'code', lang, code: codeLines.join('\n') })
      continue
    }

    // 2. ATX Heading (# ... ######)
    const headingMatch = line.match(HEADING_RE)
    if (headingMatch && headingMatch[2] !== undefined) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6
      blocks.push({ type: 'heading', level, children: parseInline(headingMatch[2].trim()) })
      i++
      continue
    }

    // 3. GFM Table (must check BEFORE hr because `|---|---|` contains `---`)
    if (isTableStart(lines, i)) {
      const headerCells = splitTableRow(lines[i])
      const alignments = parseTableDelimiter(lines[i + 1])!
      const colCount = alignments.length
      i += 2
      const rows: InlineNode[][][] = []
      while (i < lines.length) {
        const rowLine = lines[i]
        if (!rowLine.trim() || !rowLine.includes('|')) break
        if (FENCE_RE.test(rowLine) || HEADING_RE.test(rowLine)) break
        const rawCells = splitTableRow(rowLine)
        // Pad or trim to match header column count
        const row: InlineNode[][] = []
        for (let c = 0; c < colCount; c++) {
          row.push(parseInline(rawCells[c] ?? ''))
        }
        rows.push(row)
        i++
      }
      blocks.push({
        type: 'table',
        headers: headerCells.map((cell) => parseInline(cell)),
        alignments,
        rows
      })
      continue
    }

    // 4. Horizontal Rule
    if (HR_RE.test(line)) {
      blocks.push({ type: 'hr' })
      i++
      continue
    }

    // 5. Blockquote
    if (BLOCKQUOTE_RE.test(line)) {
      const quoteLines: string[] = []
      while (i < lines.length) {
        const m = lines[i].match(BLOCKQUOTE_RE)
        if (!m) break
        quoteLines.push(m[1])
        i++
      }
      blocks.push({ type: 'blockquote', blocks: parseMarkdown(quoteLines.join('\n')) })
      continue
    }

    // 6. Lists (unordered / ordered / task lists, with nested list support)
    const ulStart = line.match(UL_RE)
    const olStart = !ulStart ? line.match(OL_RE) : null
    if (ulStart || olStart) {
      const ordered = Boolean(olStart)
      const baseIndent = (ulStart ? ulStart[1] : olStart![1]).length
      const start = olStart ? Number.parseInt(olStart[2], 10) || 1 : 1
      const items: ListItemNode[] = []

      while (i < lines.length) {
        const cur = lines[i]
        if (!cur.trim()) break

        const m = ordered ? cur.match(OL_RE) : cur.match(UL_RE)
        if (!m || m[1].length !== baseIndent) break

        let itemText = m[3]
        let checked: boolean | undefined
        if (!ordered) {
          const taskMatch = itemText.match(TASK_RE)
          if (taskMatch) {
            checked = taskMatch[1].toLowerCase() === 'x'
            itemText = taskMatch[2]
          }
        }
        i++

        // Collect nested indented lines (sublists or continuation lines)
        const nestedLines: string[] = []
        while (i < lines.length) {
          const next = lines[i]
          if (!next.trim()) break
          const nextIndent = (next.match(/^(\s*)/) as RegExpMatchArray)[1].length
          if (nextIndent > baseIndent) {
            nestedLines.push(next.slice(Math.min(nextIndent, baseIndent + 2)))
            i++
          } else {
            break
          }
        }

        const nested = nestedLines.length > 0 ? parseMarkdown(nestedLines.join('\n')) : undefined
        items.push({
          children: parseInline(itemText.trim()),
          ...(checked !== undefined ? { checked } : {}),
          ...(nested && nested.length > 0 ? { nested } : {})
        })
      }

      blocks.push({ type: 'list', ordered, start, items })
      continue
    }

    // 7. Paragraph: collect consecutive non-block-starter lines
    const paraLines: string[] = [line.trimEnd()]
    i++
    while (i < lines.length && !isBlockStarter(lines, i)) {
      paraLines.push(lines[i].trimEnd())
      i++
    }
    blocks.push({ type: 'paragraph', children: parseInline(paraLines.join('\n')) })
  }

  return blocks
}
