/**
 * MultiSelectTextBar — Floating batch action bar for multi-selected text cards (PR #93).
 *
 * Lets users combine multiple text cards in selection order with a chosen
 * separator (newline, paragraph break, or space), then Copy All or Paste All
 * in one click.
 */
import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useStore } from '../store/appStore'
import { useTranslation } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'
import { CopyIcon, CloseIcon, PasteIcon } from './icons'
import type { ClipboardItemDto } from '../../shared/types'

type SepKind = 'newline' | 'blank' | 'space'

const SEP_VALUE: Record<SepKind, string> = {
  newline: '\n',
  blank: '\n\n',
  space: ' '
}

async function resolveCombinedText(
  ids: string[],
  items: ClipboardItemDto[],
  sep: string
): Promise<string> {
  const byId = new Map(items.map((it) => [it.id, it]))
  const parts: string[] = []
  for (const id of ids) {
    const it = byId.get(id)
    if (!it || it.data.kind !== 'text') continue
    if (it.data.hasFullPayload && window.edge?.getFullText) {
      try {
        const full = await window.edge.getFullText(id)
        parts.push(full || it.data.text)
        continue
      } catch {
        /* fall back to preview text */
      }
    }
    parts.push(it.data.text)
  }
  return parts.join(sep)
}

export function MultiSelectTextBar() {
  const { t } = useTranslation()
  const selectedTextIds = useStore((s) => s.selectedTextIds)
  const clearSelectedTextIds = useStore((s) => s.clearSelectedTextIds)
  const settingsOpen = useStore((s) => s.settingsOpen)
  const emojiOpen = useStore((s) => s.emojiOpen)
  const [sep, setSep] = useState<SepKind>('newline')
  const [busy, setBusy] = useState(false)

  const visible = selectedTextIds.length > 0 && !settingsOpen && !emojiOpen

  const handleCopyAll = async () => {
    if (busy || selectedTextIds.length === 0) return
    playButtonClickSound()
    setBusy(true)
    try {
      const s = useStore.getState()
      const joined = await resolveCombinedText(selectedTextIds, s.items, SEP_VALUE[sep])
      if (joined) {
        const ok = await s.copyText(joined, { quiet: true })
        if (ok) {
          s.pushToast({
            id: Date.now().toString(),
            message: t('multiPaste.copiedToast', { count: selectedTextIds.length }),
            tone: 'info'
          })
          clearSelectedTextIds()
        }
      }
    } finally {
      setBusy(false)
    }
  }

  const handlePasteAll = async () => {
    if (busy || selectedTextIds.length === 0) return
    playButtonClickSound()
    setBusy(true)
    try {
      const s = useStore.getState()
      const joined = await resolveCombinedText(selectedTextIds, s.items, SEP_VALUE[sep])
      if (joined) {
        clearSelectedTextIds()
        await s.pasteText(joined)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="multi-select-bar"
          initial={{ opacity: 0, y: 14, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.96 }}
          transition={{ type: 'spring', stiffness: 460, damping: 32 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="multi-select-left">
            <span className="multi-select-count">
              {t('multiPaste.selected', { count: selectedTextIds.length })}
            </span>
            <div className="multi-select-seps" role="radiogroup" aria-label={t('multiSelect.separator')}>
              {(
                [
                  { id: 'newline', label: '↵', title: t('multiSelect.sepNewline') },
                  { id: 'blank', label: '¶', title: t('multiSelect.sepBlank') },
                  { id: 'space', label: '␣', title: t('multiSelect.sepSpace') }
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  title={opt.title}
                  className={`multi-select-sep-btn${sep === opt.id ? ' active' : ''}`}
                  onClick={() => {
                    playButtonClickSound()
                    setSep(opt.id)
                  }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="multi-select-actions">
            <button
              type="button"
              className="multi-select-btn"
              disabled={busy}
              title={t('multiPaste.copyAll')}
              onClick={handleCopyAll}
            >
              <CopyIcon width={12} height={12} />
            </button>
            <button
              type="button"
              className="multi-select-btn primary"
              disabled={busy}
              title={t('multiPaste.pasteAll')}
              onClick={handlePasteAll}
            >
              <PasteIcon width={12} height={12} />
              <span>{t('multiPaste.pasteAll')}</span>
            </button>
            <button
              type="button"
              className="multi-select-btn"
              title={t('multiPaste.clear')}
              onClick={() => {
                playButtonClickSound()
                clearSelectedTextIds()
              }}
            >
              <CloseIcon width={12} height={12} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default MultiSelectTextBar
