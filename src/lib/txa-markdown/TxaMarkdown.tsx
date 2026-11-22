/**
 * txa-markdown — React renderer for parsed Markdown AST.
 *
 * Renders pure React elements (zero dangerouslySetInnerHTML) with T-Drop's
 * dark glass styling, GFM tables, task lists, blockquotes, and syntax-highlighted
 * fenced code blocks.
 */
import React, { useMemo } from 'react'
import { parseMarkdown } from './parser'
import type { BlockNode, InlineNode } from './types'
import { CodeBlock } from '../../components/CodeBlock'
import '../../styles/txaMarkdown.css'

export interface TxaMarkdownProps {
  content: string
  className?: string
}

function renderInlines(nodes: InlineNode[], keyPrefix: string): React.ReactNode[] {
  return nodes.map((node, idx) => {
    const key = `${keyPrefix}-${idx}`
    switch (node.type) {
      case 'text':
        return <React.Fragment key={key}>{node.value}</React.Fragment>
      case 'bold':
        return <strong key={key}>{renderInlines(node.children, key)}</strong>
      case 'italic':
        return <em key={key}>{renderInlines(node.children, key)}</em>
      case 'bold_italic':
        return (
          <strong key={key}>
            <em>{renderInlines(node.children, key)}</em>
          </strong>
        )
      case 'strike':
        return <del key={key}>{renderInlines(node.children, key)}</del>
      case 'code':
        return (
          <code key={key} className="txa-md-inline-code">
            {node.value}
          </code>
        )
      case 'link':
        return (
          <a
            key={key}
            href={node.href}
            className="txa-md-link"
            title={node.href}
            onClick={(e) => {
              e.stopPropagation()
              e.preventDefault()
              if (node.href.startsWith('#')) return
              window.open(node.href, '_blank', 'noopener,noreferrer')
            }}
          >
            {renderInlines(node.children, key)}
          </a>
        )
      case 'image':
        return (
          <img
            key={key}
            src={node.src}
            alt={node.alt}
            className="txa-md-img"
            loading="lazy"
            draggable={false}
          />
        )
      case 'break':
        return <br key={key} />
    }
  })
}

function renderBlocks(blocks: BlockNode[], keyPrefix: string): React.ReactNode[] {
  return blocks.map((block, idx) => {
    const key = `${keyPrefix}-b${idx}`
    switch (block.type) {
      case 'heading': {
        const Tag = `h${block.level}` as 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
        return (
          <Tag key={key} className={`txa-md-h txa-md-h${block.level}`}>
            {renderInlines(block.children, key)}
          </Tag>
        )
      }

      case 'paragraph':
        return (
          <p key={key} className="txa-md-p">
            {renderInlines(block.children, key)}
          </p>
        )

      case 'hr':
        return <hr key={key} className="txa-md-hr" />

      case 'blockquote':
        return (
          <blockquote key={key} className="txa-md-quote">
            {renderBlocks(block.blocks, key)}
          </blockquote>
        )

      case 'code':
        return (
          <div
            key={key}
            className="txa-md-code-wrap"
            onClick={(e) => e.stopPropagation()}
          >
            <CodeBlock
              code={block.code}
              language={block.lang || 'text'}
              showFrame={true}
              showHeader={Boolean(block.lang)}
              showLineNumbers={false}
              showCopyButton={true}
              compact={true}
            />
          </div>
        )

      case 'list': {
        const ListTag = block.ordered ? 'ol' : 'ul'
        const hasTasks = block.items.some((it) => it.checked !== undefined)
        return (
          <ListTag
            key={key}
            className={`txa-md-list${block.ordered ? ' is-ordered' : ''}${hasTasks ? ' is-task' : ''}`}
            start={block.ordered && block.start !== 1 ? block.start : undefined}
          >
            {block.items.map((item, i) => {
              const itemKey = `${key}-li${i}`
              return (
                <li key={itemKey} className={`txa-md-li${item.checked !== undefined ? ' is-task-item' : ''}`}>
                  {item.checked !== undefined && (
                    <span
                      className={`txa-md-checkbox${item.checked ? ' is-checked' : ''}`}
                      aria-hidden="true"
                    >
                      {item.checked ? '✓' : ''}
                    </span>
                  )}
                  <span className={`txa-md-li-text${item.checked ? ' is-done' : ''}`}>
                    {renderInlines(item.children, itemKey)}
                  </span>
                  {item.nested && item.nested.length > 0 && (
                    <div className="txa-md-nested">
                      {renderBlocks(item.nested, `${itemKey}-n`)}
                    </div>
                  )}
                </li>
              )
            })}
          </ListTag>
        )
      }

      case 'table':
        return (
          <div key={key} className="txa-md-table-wrap">
            <table className="txa-md-table">
              <thead>
                <tr>
                  {block.headers.map((cell, c) => (
                    <th
                      key={`${key}-th${c}`}
                      style={block.alignments[c] ? { textAlign: block.alignments[c]! } : undefined}
                    >
                      {renderInlines(cell, `${key}-th${c}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row, r) => (
                  <tr key={`${key}-tr${r}`}>
                    {row.map((cell, c) => (
                      <td
                        key={`${key}-td${r}-${c}`}
                        style={block.alignments[c] ? { textAlign: block.alignments[c]! } : undefined}
                      >
                        {renderInlines(cell, `${key}-td${r}-${c}`)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
    }
  })
}

export function TxaMarkdown({ content, className = '' }: TxaMarkdownProps) {
  const blocks = useMemo(() => parseMarkdown(content), [content])

  return (
    <div className={`txa-md-root ${className}`.trim()}>
      {renderBlocks(blocks, 'md')}
    </div>
  )
}

export default TxaMarkdown
