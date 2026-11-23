/**
 * Smart Snippets persistence: one small JSON file next to settings.json.
 *
 * Writes go to a temp file first and are renamed over the real one, so a crash
 * or power cut mid-save can never leave a half-written snippets file.
 */
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import {
  MAX_SNIPPETS,
  MAX_SNIPPET_TEXT,
  MAX_SNIPPET_TITLE,
  normalizeSnippets,
  sortSnippets,
  type Snippet,
  type SnippetDraft
} from '../../shared/snippets'
import { PATHS } from './paths'

let cache: Snippet[] | null = null

const file = () => join(PATHS.root(), 'snippets.json')

function load(): Snippet[] {
  if (cache) return cache
  try {
    const f = file()
    if (existsSync(f)) {
      const parsed = JSON.parse(readFileSync(f, 'utf8')) as { snippets?: unknown }
      cache = normalizeSnippets(parsed?.snippets)
      return cache
    }
  } catch (err) {
    console.error('[Snippets] could not read snippets.json:', err)
  }
  cache = []
  return cache
}

function persist(list: Snippet[]): boolean {
  try {
    const f = file()
    const tmp = `${f}.tmp`
    writeFileSync(tmp, JSON.stringify({ v: 1, snippets: list }, null, 2), 'utf8')
    renameSync(tmp, f)
    cache = list
    return true
  } catch (err) {
    console.error('[Snippets] could not save snippets.json:', err)
    return false
  }
}

export function listSnippets(): Snippet[] {
  return sortSnippets(load())
}

export function getSnippet(id: string): Snippet | null {
  return load().find((s) => s.id === id) ?? null
}

/** Create (no id) or update (known id). Returns the saved snippet, or null if invalid / not saved. */
export function saveSnippet(draft: SnippetDraft): Snippet | null {
  if (!draft || typeof draft.text !== 'string' || !draft.text.trim()) return null
  const text = draft.text.slice(0, MAX_SNIPPET_TEXT)
  const title = (typeof draft.title === 'string' ? draft.title.trim() : '').slice(0, MAX_SNIPPET_TITLE)
  const list = [...load()]
  const now = Date.now()
  const at = draft.id ? list.findIndex((s) => s.id === draft.id) : -1

  let saved: Snippet
  if (at >= 0) {
    saved = { ...list[at], title: title || text.trim().split('\n')[0].slice(0, MAX_SNIPPET_TITLE), text, updatedAt: now }
    list[at] = saved
  } else {
    if (list.length >= MAX_SNIPPETS) return null
    saved = {
      id: randomUUID(),
      title: title || text.trim().split('\n')[0].slice(0, MAX_SNIPPET_TITLE),
      text,
      createdAt: now,
      updatedAt: now,
      uses: 0
    }
    list.push(saved)
  }
  return persist(list) ? saved : null
}

export function deleteSnippet(id: string): boolean {
  const list = load()
  if (!list.some((s) => s.id === id)) return false
  return persist(list.filter((s) => s.id !== id))
}

export function countSnippetUse(id: string): void {
  const list = load()
  const at = list.findIndex((s) => s.id === id)
  if (at < 0) return
  const next = [...list]
  next[at] = { ...next[at], uses: next[at].uses + 1 }
  persist(next)
}
