/**
 * txa-markdown — Typed AST nodes for T-Drop's custom Markdown processor.
 */

export type TableAlign = 'left' | 'center' | 'right' | null

export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'bold_italic'; children: InlineNode[] }
  | { type: 'strike'; children: InlineNode[] }
  | { type: 'code'; value: string }
  | { type: 'link'; href: string; children: InlineNode[] }
  | { type: 'image'; src: string; alt: string }
  | { type: 'break' }

export interface ListItemNode {
  children: InlineNode[]
  checked?: boolean
  nested?: BlockNode[]
}

export type BlockNode =
  | { type: 'heading'; level: 1 | 2 | 3 | 4 | 5 | 6; children: InlineNode[] }
  | { type: 'paragraph'; children: InlineNode[] }
  | { type: 'code'; lang: string; code: string }
  | { type: 'table'; headers: InlineNode[][]; alignments: TableAlign[]; rows: InlineNode[][][] }
  | { type: 'blockquote'; blocks: BlockNode[] }
  | { type: 'list'; ordered: boolean; start: number; items: ListItemNode[] }
  | { type: 'hr' }
