/**
 * Text transformation & metrics utilities for T-Drop Text Studio.
 */

export function toUpper(text: string): string {
  return text.toUpperCase()
}

export function toLower(text: string): string {
  return text.toLowerCase()
}

export function toTitleCase(text: string): string {
  return text.replace(
    /\b[\p{L}\p{N}]+/gu,
    (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase()
  )
}

export function toCamelCase(text: string): string {
  const words = text
    .trim()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

  if (words.length === 0) return ''

  return words
    .map((word, index) => {
      const lower = word.toLowerCase()
      if (index === 0) return lower
      return lower.charAt(0).toUpperCase() + lower.slice(1)
    })
    .join('')
}

export function toCleanSpace(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((line) => line.replace(/[ \t]+/g, ' ').trim())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export interface TextStats {
  characters: number
  charactersNoSpaces: number
  words: number
  lines: number
}

export function getTextStats(text: string): TextStats {
  const clean = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  const characters = clean.length
  const charactersNoSpaces = clean.replace(/\s/g, '').length
  const words = clean.trim().length === 0 ? 0 : clean.trim().split(/\s+/).length
  const lines = clean.length === 0 ? 0 : clean.split('\n').length

  return {
    characters,
    charactersNoSpaces,
    words,
    lines
  }
}
