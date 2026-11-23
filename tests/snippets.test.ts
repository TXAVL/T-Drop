import { describe, expect, it } from 'vitest'
import { expandSnippet, formatWithPattern, normalizeSnippet, normalizeSnippets, sortSnippets, MAX_SNIPPETS, type SnippetContext } from '../shared/snippets'

const ctx = (over: Partial<SnippetContext> = {}): SnippetContext => ({
  now: new Date(2026, 10, 23, 9, 5), // Mon 23 Nov 2026, 09:05 local time
  clipboard: 'CLIP',
  uuid: () => 'UUID-1',
  ...over
})

describe('expandSnippet', () => {
  it('fills the known variables', () => {
    const out = expandSnippet('{time} {weekday} {clipboard} {uuid}', ctx())
    expect(out).toBe('09:05 Monday CLIP UUID-1')
  })

  it('writes date and datetime from the same date format', () => {
    const date = expandSnippet('{date}', ctx())
    expect(expandSnippet('{datetime}', ctx())).toBe(`${date} 09:05`)
  })

  it('leaves unknown names exactly as typed so code braces survive', () => {
    expect(expandSnippet('const o = {name}; {unknown}', ctx())).toBe('const o = {name}; {unknown}')
  })

  it('treats {{name}} as an escape for the literal text', () => {
    expect(expandSnippet('{{date}} and {{clipboard}}', ctx())).toBe('{date} and {clipboard}')
  })

  it('uses an empty string when the clipboard has no text', () => {
    expect(expandSnippet('[{clipboard}]', ctx({ clipboard: '' }))).toBe('[]')
  })

  it('calls uuid once per occurrence', () => {
    let n = 0
    const out = expandSnippet('{uuid}-{uuid}', ctx({ uuid: () => `id${++n}` }))
    expect(out).toBe('id1-id2')
  })
})

describe('formatWithPattern (Windows region patterns)', () => {
  const d = new Date(2026, 3, 5, 14, 40, 7) // 5 Apr 2026, 14:40:07

  it('formats the short date patterns', () => {
    expect(formatWithPattern(d, 'dd/MM/yyyy')).toBe('05/04/2026')
    expect(formatWithPattern(d, 'dd/MM/yy')).toBe('05/04/26')
    expect(formatWithPattern(d, 'M/d/yyyy')).toBe('4/5/2026')
  })

  it('formats 24h and 12h times', () => {
    expect(formatWithPattern(d, 'HH:mm:ss')).toBe('14:40:07')
    expect(formatWithPattern(d, 'H:mm')).toBe('14:40')
    expect(formatWithPattern(d, 'h:mm tt', 'en-US')).toBe('2:40 PM')
  })

  it('treats 12 o\'clock correctly in 12h clocks', () => {
    expect(formatWithPattern(new Date(2026, 0, 1, 0, 5), 'h:mm tt', 'en-US')).toBe('12:05 AM')
    expect(formatWithPattern(new Date(2026, 0, 1, 12, 5), 'hh:mm tt', 'en-US')).toBe('12:05 PM')
  })

  it('copies quoted text and keeps other separators', () => {
    expect(formatWithPattern(d, "d 'tháng' M, yyyy")).toBe('5 tháng 4, 2026')
    expect(formatWithPattern(d, "yyyy.MM.dd.")).toBe('2026.04.05.')
  })

  it('uses the locale for month and weekday names', () => {
    expect(formatWithPattern(d, 'dddd, d MMMM yyyy', 'en-US')).toBe('Sunday, 5 April 2026')
  })

  it('expandSnippet follows the supplied formats', () => {
    const formats = { locale: 'en-US', shortDate: 'dd/MM/yyyy', longDate: 'dddd, d MMMM yyyy', shortTime: 'HH:mm' }
    const out = expandSnippet('{date} {time} | {datetime} | {longdate}', ctx({ now: d, formats }))
    expect(out).toBe('05/04/2026 14:40 | 05/04/2026 14:40 | Sunday, 5 April 2026')
  })
})

describe('normalizeSnippet(s)', () => {
  it('rejects entries without an id or text', () => {
    expect(normalizeSnippet(null)).toBeNull()
    expect(normalizeSnippet({ id: 'a', text: '   ' })).toBeNull()
    expect(normalizeSnippet({ text: 'hello' })).toBeNull()
  })

  it('derives a title from the first line when missing', () => {
    const s = normalizeSnippet({ id: 'a', text: 'First line\nsecond' })
    expect(s?.title).toBe('First line')
    expect(s?.uses).toBe(0)
  })

  it('drops duplicates and caps the list', () => {
    const dup = normalizeSnippets([{ id: 'a', text: 'x' }, { id: 'a', text: 'y' }])
    expect(dup).toHaveLength(1)
    const many = Array.from({ length: MAX_SNIPPETS + 20 }, (_, i) => ({ id: `id${i}`, text: 'x' }))
    expect(normalizeSnippets(many)).toHaveLength(MAX_SNIPPETS)
  })

  it('returns an empty list for non-arrays', () => {
    expect(normalizeSnippets({})).toEqual([])
    expect(normalizeSnippets(undefined)).toEqual([])
  })
})

describe('sortSnippets', () => {
  it('puts the most used first, then the most recently edited', () => {
    const base = { title: 't', text: 'x', createdAt: 0 }
    const list = [
      { ...base, id: 'old', uses: 1, updatedAt: 1 },
      { ...base, id: 'hot', uses: 9, updatedAt: 0 },
      { ...base, id: 'new', uses: 1, updatedAt: 5 }
    ]
    expect(sortSnippets(list).map((s) => s.id)).toEqual(['hot', 'new', 'old'])
  })
})
