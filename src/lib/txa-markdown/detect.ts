/**
 * txa-markdown — Heuristic detector for Markdown content.
 *
 * Designed to reliably identify Markdown documents and snippets (tables,
 * headings, bold/italic prose, task lists, fenced code blocks, links, quotes)
 * without stealing genuine programming-language code or plain prose.
 */

const GFM_TABLE_RE = /(?:^|\n)[^\n]*\|[^\n]*\n\s*\|?\s*:?-{2,}:?\s*(?:\|\s*:?-{2,}:?\s*)+\|?\s*(?:\n|$)/
const FENCED_CODE_RE = /(?:^|\n)\s*(`{3,}|~{3,})[a-zA-Z0-9_+-]*\s*\n[\s\S]*?\n\s*\1\s*(?:\n|$)/
const ATX_HEADING_RE = /(?:^|\n)\s{0,3}#{1,6}\s+\S/
const TASK_LIST_RE = /(?:^|\n)\s*[-*+]\s+\[[ xX]\]\s+\S/
const MD_LINK_RE = /!?\[[^\]\n]{1,120}\]\((https?:\/\/[^\s)]+|#[^\s)]+)\)/
const BOLD_RE = /\*\*[^*\n]{1,120}\*\*/g
const STRIKE_RE = /~~[^~\n]{1,120}~~/
const INLINE_CODE_RE = /`[^`\n]{1,80}`/
const BLOCKQUOTE_RE = /(?:^|\n)\s{0,3}>\s+\S/
const BULLET_LINE_RE = /^\s*[-*+]\s+\S/
const ORDERED_LINE_RE = /^\s*\d+[.)]\s+\S/
const HR_LINE_RE = /(?:^|\n)\s*([-*_])\1{2,}\s*(?:\n|$)/

/**
 * Strong structural Markdown signals that clearly indicate a Markdown document
 * even if it embeds code examples (e.g. a fenced code block inside a doc, or a
 * GFM pipe table). Safe to check before generic JS/TS heuristics.
 */
export function isStrongMarkdown(raw: string): boolean {
  if (!raw || typeof raw !== 'string') return false
  const text = raw.trim()
  if (text.length < 6) return false

  // GFM pipe table (e.g. `| Col A | Col B |\n|---|---|`) is uniquely Markdown
  if (GFM_TABLE_RE.test(text)) return true

  // Fenced code blocks (` ```lang ... ``` `) are uniquely Markdown
  if (FENCED_CODE_RE.test(text)) return true

  // Task list (`- [x] ...` or `- [ ] ...`) is uniquely Markdown
  if (TASK_LIST_RE.test(text)) return true

  return false
}

/**
 * General Markdown detector (headings, bold, links, lists, blockquotes, etc.).
 * Intended to run after specific programming languages have been checked, and
 * before the generic JS/code fallback heuristic.
 */
export function isMarkdown(raw: string): boolean {
  if (!raw || typeof raw !== 'string') return false
  const text = raw.trim()
  if (text.length < 6) return false

  if (isStrongMarkdown(text)) return true

  let score = 0

  // ATX Headings (`# Title`, `## Section`), excluding shebangs & C preprocessor
  if (ATX_HEADING_RE.test(text) && !/^#!\//.test(text) && !/^\s*#(include|define|ifdef|ifndef|pragma|endif)\b/m.test(text)) {
    score += 3
  }

  // Markdown links or images: [label](https://...)
  if (MD_LINK_RE.test(text)) {
    score += 3
  }

  // Bold spans: **text** (each match +2, capped at +4)
  const boldMatches = text.match(BOLD_RE)
  if (boldMatches) {
    score += Math.min(4, boldMatches.length * 2)
  }

  // Strikethrough: ~~text~~
  if (STRIKE_RE.test(text)) {
    score += 2
  }

  // Blockquotes: > quote
  if (BLOCKQUOTE_RE.test(text)) {
    score += 2
  }

  // Inline code: `snippet`
  if (INLINE_CODE_RE.test(text)) {
    score += 1
  }

  // Horizontal rule: --- / *** / ___
  if (HR_LINE_RE.test(text)) {
    score += 1
  }

  // Multi-item bullet or ordered lists
  const lines = text.split(/\r?\n/)
  const bulletCount = lines.filter((l) => BULLET_LINE_RE.test(l)).length
  const orderedCount = lines.filter((l) => ORDERED_LINE_RE.test(l)).length
  if (bulletCount >= 2 || orderedCount >= 2) {
    score += 2
  }

  return score >= 3
}
