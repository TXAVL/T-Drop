import { describe, expect, it } from 'vitest'
import { detectCode } from '../src/lib/codeDetect'
import { isMarkdown, isSafeUrl, parseInline, parseMarkdown } from '../src/lib/txa-markdown'

describe('txa-markdown: detection', () => {
  it('detects Markdown with bold text and GFM table (not javascript)', () => {
    const sample = [
      'Audit đã sang **Phase 2**: sau khi 4 agent trinh sát xong, agent cha phát ra **10 hunter** chạy song song (mỗi hunter 1 vùng).',
      '',
      '| Hunter | Vùng săn lỗi |',
      '|---|---|',
      '| h1 auth core | Đăng nhập, phiên, mật khẩu |',
      '| h2 federated auth | Đăng nhập OAuth |'
    ].join('\n')

    expect(isMarkdown(sample)).toBe(true)
    const detected = detectCode(sample)
    expect(detected.isCode).toBe(true)
    expect(detected.language).toBe('markdown')
    expect(detected.displayName).toBe('Markdown')
  })

  it('detects Markdown documents containing fenced code blocks', () => {
    const sample = '# Getting Started\n\nRun this:\n\n```ts\nconst x = 1\nconsole.log(x)\n```'
    const detected = detectCode(sample)
    expect(detected.isCode).toBe(true)
    expect(detected.language).toBe('markdown')
  })

  it('detects Markdown task lists and links', () => {
    const sample = '- [x] Build txa-markdown\n- [ ] Ship update\n\nSee [docs](https://example.com)'
    expect(detectCode(sample).language).toBe('markdown')
  })

  it('does not misclassify plain prose as markdown', () => {
    expect(isMarkdown('Just a normal sentence with nothing special.')).toBe(false)
    expect(detectCode('Just a normal sentence with nothing special.').isCode).toBe(false)
  })
})

describe('txa-markdown: parser', () => {
  it('parses headings, paragraphs, bold, italic, strike, inline code, links, images', () => {
    const md = [
      '# Hello **World**',
      '',
      'Some *italic*, **bold**, ***both***, ~~old~~, `code`, [site](https://example.com), ![pic](https://example.com/a.png).'
    ].join('\n')

    const blocks = parseMarkdown(md)
    expect(blocks).toHaveLength(2)
    expect(blocks[0].type).toBe('heading')
    if (blocks[0].type === 'heading') {
      expect(blocks[0].level).toBe(1)
      expect(blocks[0].children).toEqual([
        { type: 'text', value: 'Hello ' },
        { type: 'bold', children: [{ type: 'text', value: 'World' }] }
      ])
    }

    expect(blocks[1].type).toBe('paragraph')
    if (blocks[1].type === 'paragraph') {
      const types = blocks[1].children.map((n) => n.type)
      expect(types).toContain('italic')
      expect(types).toContain('bold')
      expect(types).toContain('bold_italic')
      expect(types).toContain('strike')
      expect(types).toContain('code')
      expect(types).toContain('link')
      expect(types).toContain('image')
    }
  })

  it('parses GFM tables with alignments and escaped pipes', () => {
    const md = [
      '| Hunter | Vùng săn lỗi | Count |',
      '|:---|:---:|---:|',
      '| **h1** | Đăng nhập \\| phiên | `3` |',
      '| h2 | OAuth | 5 |'
    ].join('\n')

    const blocks = parseMarkdown(md)
    expect(blocks).toHaveLength(1)
    const table = blocks[0]
    expect(table.type).toBe('table')
    if (table.type === 'table') {
      expect(table.alignments).toEqual(['left', 'center', 'right'])
      expect(table.headers).toHaveLength(3)
      expect(table.rows).toHaveLength(2)
      expect(table.rows[0][0]).toEqual([{ type: 'bold', children: [{ type: 'text', value: 'h1' }] }])
      expect(table.rows[0][1]).toEqual([{ type: 'text', value: 'Đăng nhập | phiên' }])
      expect(table.rows[0][2]).toEqual([{ type: 'code', value: '3' }])
    }
  })

  it('parses fenced code blocks, blockquotes, lists, task lists, and hr', () => {
    const md = [
      '> Quoted **line**',
      '',
      '---',
      '',
      '- [x] Done item',
      '- [ ] Pending item',
      '  - Nested bullet',
      '',
      '```js',
      'const a = 1',
      '```'
    ].join('\n')

    const blocks = parseMarkdown(md)
    expect(blocks.map((b) => b.type)).toEqual(['blockquote', 'hr', 'list', 'code'])

    const list = blocks[2]
    if (list.type === 'list') {
      expect(list.ordered).toBe(false)
      expect(list.items[0].checked).toBe(true)
      expect(list.items[1].checked).toBe(false)
      expect(list.items[1].nested?.[0].type).toBe('list')
    }

    const code = blocks[3]
    if (code.type === 'code') {
      expect(code.lang).toBe('js')
      expect(code.code).toBe('const a = 1')
    }
  })

  it('blocks unsafe URLs (XSS protection)', () => {
    expect(isSafeUrl('https://example.com')).toBe(true)
    expect(isSafeUrl('mailto:hi@example.com')).toBe(true)
    expect(isSafeUrl('javascript:alert(1)')).toBe(false)
    expect(isSafeUrl('data:text/html,<script>alert(1)</script>')).toBe(false)

    const nodes = parseInline('[click](javascript:alert(1))')
    expect(nodes).toEqual([{ type: 'text', value: 'click' }])
  })

  it('does not italicize snake_case identifiers', () => {
    const nodes = parseInline('use foo_bar_baz here')
    expect(nodes).toEqual([{ type: 'text', value: 'use foo_bar_baz here' }])
  })
})
