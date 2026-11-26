import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { TrashIcon } from './icons'
import { playButtonClickSound } from '../lib/soundEffects'
import { useTranslation } from '../i18n'
import type { ClipboardItemDto } from '../../shared/types'

interface ClearMenuProps {
  /** Full item list (pinned + recent) to compute time-window ids from. */
  items: ClipboardItemDto[]
  disabled: boolean
  /** Panel's own open/closed state — closes this menu whenever the panel closes. */
  panelOpen: boolean
  /** Clear a specific set of ids (used for the time-window options via deleteBatch). */
  onClear: (ids: string[]) => void
  /** Clear all unpinned history. */
  onClearAll: () => void
  /** Direction menu flies out. Defaults to 'up' for bottom footer, 'down' for header. */
  menuDirection?: 'up' | 'down'
}

const WINDOWS: { key: string; hours: number; fallback: string }[] = [
  { key: '1h', hours: 1, fallback: 'Clear last hour' },
  { key: '6h', hours: 6, fallback: 'Clear last 6 hours' },
  { key: '24h', hours: 24, fallback: 'Clear last 24 hours' },
  { key: '48h', hours: 48, fallback: 'Clear last 48 hours' },
  { key: '72h', hours: 72, fallback: 'Clear last 72 hours' },
  { key: '7d', hours: 24 * 7, fallback: 'Clear last 7 days' },
  { key: '14d', hours: 24 * 14, fallback: 'Clear last 14 days' },
  { key: '30d', hours: 24 * 30, fallback: 'Clear last 30 days' }
]

const menuItemStyle: CSSProperties = {
  width: '100%',
  display: 'flex',
  alignItems: 'center',
  padding: '7px 10px',
  borderRadius: 7,
  background: 'transparent',
  color: 'rgba(255, 255, 255, 0.85)',
  fontSize: 12,
  fontWeight: 400,
  border: 'none',
  cursor: 'pointer',
  textAlign: 'left',
  transition: 'background 0.12s ease'
}

export function ClearMenu({
  items,
  disabled,
  panelOpen,
  onClear,
  onClearAll,
  menuDirection = 'up'
}: ClearMenuProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [confirmAll, setConfirmAll] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Force-close menu when panel slides closed
  useEffect(() => {
    if (!panelOpen) {
      setOpen(false)
      setConfirmAll(false)
    }
  }, [panelOpen])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) window.addEventListener('mousedown', handleClickOutside)
    return () => window.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Re-arm "Clear all" confirmation whenever menu closes
  useEffect(() => {
    if (!open) setConfirmAll(false)
  }, [open])

  const clearWindow = (hours: number) => {
    const cutoff = Date.now() - hours * 3600 * 1000
    // Pinned items are never included in a bulk clear
    const ids = items.filter((it) => !it.pinned && it.capturedAt >= cutoff).map((it) => it.id)
    playButtonClickSound()
    setOpen(false)
    if (ids.length > 0) onClear(ids)
  }

  const handleAllClick = () => {
    if (!confirmAll) {
      playButtonClickSound()
      setConfirmAll(true)
      return
    }
    playButtonClickSound()
    setOpen(false)
    onClearAll()
  }

  const isMenuDown = menuDirection === 'down'

  return (
    <div ref={ref} style={{ position: 'relative', zIndex: open ? 350 : 'auto' }}>
      <button
        className={`text-btn${open ? ' active' : ''}`}
        onClick={() => {
          if (disabled) return
          playButtonClickSound()
          setOpen((v) => !v)
        }}
        disabled={disabled}
        title={t('item.clear')}
        style={{ display: 'flex', alignItems: 'center', gap: 5 }}
      >
        <TrashIcon width={13} height={13} className="clear-btn-icon" />
        <span>{t('item.clear')}</span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: isMenuDown ? -6 : 6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: isMenuDown ? -6 : 6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: isMenuDown ? 'calc(100% + 6px)' : undefined,
              bottom: isMenuDown ? undefined : 'calc(100% + 6px)',
              right: 0,
              minWidth: 190,
              background: '#141414',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: 16,
              padding: 4,
              boxShadow: '0 12px 32px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(0, 0, 0, 0.5)',
              zIndex: 350
            }}
          >
            {WINDOWS.map((w, i) => {
              const defaultLabel = w.fallback
              return (
                <div key={w.key}>
                {i === 3 && <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.1)', margin: '4px 2px' }} />}
                <button
                  type="button"
                  onClick={() => clearWindow(w.hours)}
                  style={menuItemStyle}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  {t(`item.clearLast${w.key}` as any) || defaultLabel}
                </button>
                </div>
              )
            })}

            <div style={{ height: 1, background: 'rgba(255, 255, 255, 0.1)', margin: '4px 2px' }} />

            <button
              type="button"
              onClick={handleAllClick}
              style={{
                ...menuItemStyle,
                color: confirmAll ? '#ff5252' : 'rgba(255, 255, 255, 0.85)',
                fontWeight: confirmAll ? 600 : 400
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255, 255, 255, 0.07)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
            >
              {confirmAll
                ? (t('item.clearAllConfirm') || 'Tap again to confirm')
                : (t('item.clearAll') || 'Clear all history')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
