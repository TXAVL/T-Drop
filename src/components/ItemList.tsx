/**
 * ItemList — the scrollable body of the blade.
 *
 * Renders Pinned (if any) and Recent sections, handles OS drag-in of files &
 * images onto the shelf, and shows the empty state when there's nothing.
 * AnimatePresence popLayout keeps pin/delete from height-collapsing the list.
 *
 * Drag-in awareness: sets `dragActive` on the store while OS files are being
 * dragged over the panel so the edge-hover hook knows not to close mid-drag.
 */
import { AnimatePresence, motion } from 'framer-motion'
import { useRef, useEffect, useLayoutEffect, useState, useCallback } from 'react'
import { useStore } from '../store/appStore'
import { useFilteredItems } from '../hooks/useFilteredItems'
import { ClipboardItemCard } from './ClipboardItem'
import { EmptyState } from './EmptyState'
import { ChevronDownIcon, PinFillIcon } from './icons'
import { playExpandSound, playButtonClickSound } from '../lib/soundEffects'
import { tryPaste } from '../lib/tryPaste'
import { edge } from '../lib/edge'
import { useTranslation } from '../i18n'


/**
 * Reopening the shelf after this long (or after something new was copied)
 * starts it at the top, newest first; the back button offers the way back.
 */
const REOPEN_AT_TOP_AFTER_MS = 60_000
/** How long the back button offers the way back (paused while the pointer is on it). */
const BACK_BUTTON_MS = 6000

/** Where the list was when the shelf closed: the card at its leading edge. */
interface BackSpot {
  filter: string
  pos: number
  id?: string
  offset: number
}

const RENDER_PAGE = 30
const GROW_THRESHOLD_PX = 900

const getVerticalPinnedLabelStyle = (text: string): React.CSSProperties => {
  const len = text.length
  if (len <= 6) return { fontSize: 'calc(9.5px * var(--font-scale, 1))', letterSpacing: '0.14em' }
  if (len <= 8) return { fontSize: 'calc(8.5px * var(--font-scale, 1))', letterSpacing: '0.07em' }
  if (len <= 10) return { fontSize: 'calc(7.5px * var(--font-scale, 1))', letterSpacing: '0.02em' }
  return { fontSize: 'calc(7.0px * var(--font-scale, 1))', letterSpacing: '0em' }
}

export function ItemList() {
  const { t } = useTranslation()
  const { pinned, recent } = useFilteredItems()
  const query = useStore((s) => s.query)
  const listRef = useRef<HTMLDivElement>(null)
  const total = pinned.length + recent.length
  const stackRef = useRef<HTMLDivElement>(null)
  const hasStack = total > 0
  
  const isDraggingAny = useStore((s) => !!s.dragActive || !!s.internalDragReq)
  const stickPosition = useStore((s) => s.settings.stickPosition)
  const reduceMotion = useStore((s) => !!s.settings.reduceMotion)
  const isHorizontal = stickPosition === 'top'
  
  const typeFilter = useStore((s) => s.typeFilter) || 'all'
  const filterScrollMap = useRef<Record<string, { top: number; left: number }>>({})
  const prevFilterRef = useRef(typeFilter)
  const prevStickPos = useRef(stickPosition)

  const [showScrollTop, setShowScrollTop] = useState(false)
  // The way back to where the list was, offered for a moment after a reopen
  // started it at the top (null when there is nothing to go back to).
  const [backSpot, setBackSpot] = useState<BackSpot | null>(null)
  const closedSpot = useRef<BackSpot | null>(null)

  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('t_drop_pinned_collapsed_map') || localStorage.getItem('edge_drop_pinned_collapsed_map')
      if (saved) return JSON.parse(saved)
    } catch {}
    return { all: true, text: true, image: true, file: true, link: true }
  })

  const pinnedCollapsed = collapsedMap[typeFilter] ?? true

  const setPinnedCollapsed = (val: boolean) => {
    setCollapsedMap((prev) => {
      const next = { ...prev, [typeFilter]: val }
      localStorage.setItem('t_drop_pinned_collapsed_map', JSON.stringify(next))
      return next
    })
  }
  
  const topRecentId = recent[0]?.id
  const topRecentTime = recent[0]?.capturedAt
  const topPinnedTime = pinned[0]?.capturedAt

  const prevTopRecentId = useRef(topRecentId)
  const prevTopRecentTime = useRef(topRecentTime)
  const prevTopPinnedTime = useRef(topPinnedTime)

  const scrollRaf = useRef<number | null>(null)
  const scrollVelocity = useRef<number>(0)

  useEffect(() => {
    return () => {
      if (scrollRaf.current) cancelAnimationFrame(scrollRaf.current)
    }
  }, [])

  
  // The card at the list's leading edge and how far into the list it sits, so
  // the way back lands on the same card even after new copies pushed it down.
  // Nothing to go back to when the list is within half a view of the top.
  const captureSpot = (): BackSpot | null => {
    const el = listRef.current
    if (!el) return null
    const pos = isHorizontal ? el.scrollLeft : el.scrollTop
    if (pos < (isHorizontal ? el.clientWidth : el.clientHeight) / 2) return null
    const box = el.getBoundingClientRect()
    const hit = isHorizontal
      ? document.elementFromPoint(box.left + 24, box.top + box.height / 2)
      : document.elementFromPoint(box.left + box.width / 2, box.top + 24)
    const card = hit?.closest('.list .item-main') as HTMLElement | null
    const at = card?.getBoundingClientRect()
    return {
      filter: useStore.getState().typeFilter || 'all',
      pos,
      id: card?.dataset.id,
      offset: at ? (isHorizontal ? at.left - box.left : at.top - box.top) : 0
    }
  }

  const goBack = () => {
    const spot = backSpot
    const el = listRef.current
    setBackSpot(null)
    if (!spot || !el) return
    playButtonClickSound()
    let target = spot.pos
    const card = spot.id ? (el.querySelector(`.item-main[data-id="${CSS.escape(spot.id)}"]`) as HTMLElement | null) : null
    if (card && !card.closest('.pinned-accordion:not(.is-expanded)')) {
      const box = el.getBoundingClientRect()
      const at = card.getBoundingClientRect()
      target = (isHorizontal ? el.scrollLeft + at.left - box.left : el.scrollTop + at.top - box.top) - spot.offset
    }
    el.scrollTo({ [isHorizontal ? 'left' : 'top']: Math.max(0, target), behavior: reduceMotion ? 'auto' : 'smooth' })
  }

  const lastClosedAt = useRef<number>(Date.now())
  const lastClosedTopId = useRef<string | undefined>(topRecentId)
  const lastClosedTopTime = useRef<number | undefined>(topRecentTime)
  const lastClosedTopPinnedTime = useRef<number | undefined>(topPinnedTime)

  // Decoupled open state tracking: subscribe to store changes without triggering full list re-renders
  useEffect(() => {
    let lastOpen = useStore.getState().open
    const unsub = useStore.subscribe((state) => {
      const isNowOpen = !!state.open
      if (isNowOpen !== lastOpen) {
        if (!isNowOpen && lastOpen) {
          // Panel just closed: record timestamps and top item ids
          lastClosedAt.current = Date.now()
          lastClosedTopId.current = prevTopRecentId.current
          lastClosedTopTime.current = prevTopRecentTime.current
          lastClosedTopPinnedTime.current = prevTopPinnedTime.current
          // and where the list is (the shape is still open here, so the card
          // at the list's leading edge can be found by hit testing)
          closedSpot.current = captureSpot()
          setBackSpot(null)
        } else if (isNowOpen && !lastOpen) {
          // Panel just opened: check if closed long enough OR if a new copy happened while closed
          const timeSinceClosed = Date.now() - lastClosedAt.current
          const hasNewCopyWhileClosed =
            prevTopRecentId.current !== lastClosedTopId.current ||
            prevTopRecentTime.current !== lastClosedTopTime.current ||
            prevTopPinnedTime.current !== lastClosedTopPinnedTime.current

          if (timeSinceClosed >= REOPEN_AT_TOP_AFTER_MS || hasNewCopyWhileClosed) {
            filterScrollMap.current = {}
            if (listRef.current) {
              if (isHorizontal) listRef.current.scrollLeft = 0
              else listRef.current.scrollTop = 0
            }
            // Never silently: offer the way back for a moment.
            const spot = closedSpot.current
            if (spot && spot.filter === (state.typeFilter || 'all')) setBackSpot(spot)
          }
          closedSpot.current = null
        }
        lastOpen = isNowOpen
      }
    })
    return unsub
  }, [isHorizontal])

  useLayoutEffect(() => {
    // If a brand new or freshly updated item was added while panel is open, jump to top
    if (useStore.getState().open) {
      const isNewRecent = !!topRecentTime && (!prevTopRecentTime.current || topRecentTime > prevTopRecentTime.current)
      const isNewPinned = !!topPinnedTime && (!prevTopPinnedTime.current || topPinnedTime > prevTopPinnedTime.current)

      if (isNewRecent || isNewPinned) {
        filterScrollMap.current[typeFilter] = { top: 0, left: 0 }
        if (listRef.current) {
          if (isHorizontal) listRef.current.scrollLeft = 0
          else listRef.current.scrollTop = 0
        }
      }
    }

    prevTopRecentId.current = topRecentId
    prevTopRecentTime.current = topRecentTime
    prevTopPinnedTime.current = topPinnedTime
  }, [topRecentId, topRecentTime, topPinnedTime, isHorizontal, typeFilter])

  // Independent scroll position per filter page (unsynchronized across tabs)
  useLayoutEffect(() => {
    const el = listRef.current
    if (!el) return

    if (prevFilterRef.current !== typeFilter) {
      setBackSpot(null)
      setBackSpot(null)
      // Save outgoing filter's scroll position before applying new filter's position
      filterScrollMap.current[prevFilterRef.current] = {
        top: el.scrollTop,
        left: el.scrollLeft
      }
      prevFilterRef.current = typeFilter

      // Restore incoming filter's saved scroll position (defaulting to 0)
      const saved = filterScrollMap.current[typeFilter]
      if (isHorizontal) {
        el.scrollLeft = saved?.left ?? 0
      } else {
        el.scrollTop = saved?.top ?? 0
      }
    }
  }, [typeFilter, isHorizontal])

  // Reset scroll on search query change
  const prevQueryRef = useRef(query)
  useLayoutEffect(() => {
    if (prevQueryRef.current !== query) {
      prevQueryRef.current = query
      setBackSpot(null)
      if (listRef.current) {
        if (isHorizontal) listRef.current.scrollLeft = 0
        else listRef.current.scrollTop = 0
      }
    }
  }, [query, isHorizontal])

  // Reset scroll map when switching dock position
  useLayoutEffect(() => {
    if (prevStickPos.current !== stickPosition) {
      prevStickPos.current = stickPosition
      setBackSpot(null)
      filterScrollMap.current = {}
      if (listRef.current) {
        listRef.current.scrollTop = 0
        listRef.current.scrollLeft = 0
      }
    }
  }, [stickPosition])

  useEffect(() => {
    if (!isDraggingAny) {
      stopScrolling()
    }
  }, [isDraggingAny])

  // ── Progressive rendering ───────────────────────────────────────────────
  // Mounting all (up to 250) heavy cards at once is what made opening the
  // panel / switching filters hitch. Render one page, grow as the user nears
  // the end of the scroll range.
  const visiblePinned = pinnedCollapsed ? [] : pinned
  const visibleTotal = visiblePinned.length + recent.length
  const [renderLimit, setRenderLimit] = useState(RENDER_PAGE)
  // Reset only on a new search: filter tabs restore their own scroll offset,
  // which a shrunken page would clamp.
  const prevRenderQuery = useRef(query)
  if (prevRenderQuery.current !== query) {
    prevRenderQuery.current = query
    if (renderLimit !== RENDER_PAGE) setRenderLimit(RENDER_PAGE)
  }
  const growIfNearEnd = useCallback(() => {
    const el = listRef.current
    if (!el) return
    const remaining = isHorizontal
      ? el.scrollWidth - el.scrollLeft - el.clientWidth
      : el.scrollHeight - el.scrollTop - el.clientHeight
    if (remaining < GROW_THRESHOLD_PX) {
      setRenderLimit((l) => (l < visibleTotal ? l + RENDER_PAGE : l))
    }
  }, [isHorizontal, visibleTotal])
  // Content shorter than the viewport never scrolls — keep filling until it does.
  useEffect(() => {
    if (renderLimit >= visibleTotal) return
    const id = requestAnimationFrame(growIfNearEnd)
    return () => cancelAnimationFrame(id)
  }, [renderLimit, visibleTotal, growIfNearEnd])
  const shownPinned = visiblePinned.slice(0, renderLimit)
  const shownRecent = recent.slice(0, Math.max(0, renderLimit - shownPinned.length))

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget
    growIfNearEnd()
    filterScrollMap.current[typeFilter] = {
      top: el.scrollTop,
      left: el.scrollLeft
    }
    const scrollPos = isHorizontal ? el.scrollLeft : el.scrollTop
    const next = scrollPos > 50
    setShowScrollTop((prev) => (prev === next ? prev : next))
    if (next) setBackSpot((prev) => (prev ? null : prev))
  }

  const scrollToTop = () => {
    playButtonClickSound()
    if (listRef.current) {
      filterScrollMap.current[typeFilter] = { top: 0, left: 0 }
      if (isHorizontal) {
        listRef.current.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        listRef.current.scrollTo({ top: 0, behavior: 'smooth' })
      }
    }
  }

  useEffect(() => {
    const el = listRef.current
    if (!el || !isHorizontal) return
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault()
        el.scrollLeft += e.deltaY
      }
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [isHorizontal])

  const startScrolling = () => {
    if (scrollRaf.current !== null) return

    let lastTime = performance.now()
    const loop = (time: number) => {
      const dt = time - lastTime
      lastTime = time

      if (listRef.current && scrollVelocity.current !== 0) {
        if (isHorizontal) {
          listRef.current.scrollLeft += scrollVelocity.current * (dt / 16)
        } else {
          listRef.current.scrollTop += scrollVelocity.current * (dt / 16)
        }
        scrollRaf.current = requestAnimationFrame(loop)
      } else {
        scrollRaf.current = null
      }
    }
    scrollRaf.current = requestAnimationFrame(loop)
  }

  const stopScrolling = () => {
    scrollVelocity.current = 0
    if (scrollRaf.current !== null) {
      cancelAnimationFrame(scrollRaf.current)
      scrollRaf.current = null
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (!listRef.current) return
    const rect = listRef.current.getBoundingClientRect()

    if (isHorizontal) {
      const x = e.clientX - rect.left
      const edgeSize = 80
      if (x < edgeSize) {
        const intensity = Math.max(0, 1 - (x / edgeSize))
        scrollVelocity.current = -(intensity * 20 + 2)
        startScrolling()
      } else if (x > rect.width - edgeSize) {
        const intensity = Math.max(0, 1 - ((rect.width - x) / edgeSize))
        scrollVelocity.current = (intensity * 20 + 2)
        startScrolling()
      } else {
        stopScrolling()
      }
      return
    }

    const y = e.clientY - rect.top
    const edgeSize = 80 // slightly larger comfortable trigger zone

    if (y < edgeSize) {
      // Speed scales up as you get closer to the absolute edge
      const intensity = Math.max(0, 1 - (y / edgeSize))
      scrollVelocity.current = -(intensity * 20 + 2)
      startScrolling()
    } else if (y > rect.height - edgeSize) {
      const intensity = Math.max(0, 1 - ((rect.height - y) / edgeSize))
      scrollVelocity.current = (intensity * 20 + 2)
      startScrolling()
    } else {
      stopScrolling()
    }
  }

  const handleDragLeaveOrDrop = () => {
    stopScrolling()
  }

  const filterKey = `${typeFilter}:${query}`

  useEffect(() => {
    const handleQuickPaste = (ev: Event) => {
      const customEv = ev as CustomEvent<{ number: number }>
      const targetIdx = (customEv.detail?.number ?? 0) - 1
      if (targetIdx < 0) return
      const visibleItems = [...(pinnedCollapsed ? [] : pinned), ...recent]
      const targetItem = visibleItems[targetIdx]
      if (targetItem) {
        playButtonClickSound()
        tryPaste(() => edge.pasteItem(targetItem.id))
      }
    }
    window.addEventListener('quick-paste-number', handleQuickPaste)
    return () => window.removeEventListener('quick-paste-number', handleQuickPaste)
  }, [pinned, recent, pinnedCollapsed])

  let quickCounter = 0

  
  // Cards in or near the list's view are marked data-near and always drawn
  // (item.css); the rest stay culled by content-visibility: auto. Left to
  // content-visibility alone, the top dock painted its cards as empty boxes
  // on every open until the open motion (the blade's clip-path growing from
  // the edge bar) ended, about 5 frames; drawing them fully removes that. This
  // observer measures against the list itself, which the clip does not touch,
  // so the cards in view stay drawn while the shelf is closed.
  useEffect(() => {
    const list = listRef.current
    const stack = stackRef.current
    if (!list || !stack || typeof IntersectionObserver !== 'function') return
    const near = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) e.target.setAttribute('data-near', '')
          else e.target.removeAttribute('data-near')
        }
      },
      // one view either side, along the list's own direction
      { root: list, rootMargin: isHorizontal ? '0px 100% 0px 100%' : '100% 0px 100% 0px' }
    )
    const watched = new Set<Element>()
    const sync = () => {
      const cards = new Set(stack.querySelectorAll('.item'))
      for (const card of cards as Set<Element>) if (!watched.has(card)) { near.observe(card); watched.add(card) }
      for (const card of watched) if (!cards.has(card)) { near.unobserve(card); watched.delete(card) }
    }
    sync()
    const added = new MutationObserver(sync)
    added.observe(stack, { childList: true, subtree: true })
    return () => {
      added.disconnect()
      near.disconnect()
    }
  }, [hasStack, isHorizontal])

  return (
    <div
      className={`list${isHorizontal ? ' horizontal' : ''}`}
      ref={listRef}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeaveOrDrop}
      onDrop={handleDragLeaveOrDrop}
      onScroll={handleScroll}
    >
      {total === 0 ? (
        <EmptyState filtered={query.trim().length > 0} />
      ) : (
        <motion.div
          key={filterKey}
          className="list-stack"
          initial={{ opacity: 0.45 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.12, ease: [0.22, 1, 0.36, 1] }}
        >
          {pinned.length > 0 && (
            <section className="pinned-section">
              <div
                className={`section-label pinned-header-interactive ${pinnedCollapsed ? 'is-collapsed' : ''}`}
                onClick={() => {
                  const next = !pinnedCollapsed
                  playExpandSound(!next)
                  setPinnedCollapsed(next)
                }}
                title={pinnedCollapsed ? t('item.expandPinned') : t('item.collapsePinned')}
              >
                <div className="pinned-header-left">
                  <PinFillIcon width={13} height={13} style={{ opacity: 0.9, color: '#ffffff' }} />
                  <div className="pinned-label-group">
                    <span style={isHorizontal ? getVerticalPinnedLabelStyle(t('item.pinned')) : undefined}>
                      {t('item.pinned')}
                    </span>
                    <span className="pinned-count-badge">{pinned.length}</span>
                  </div>
                </div>
                <div className="pinned-header-right">
                  <button
                    className="act bundle-collapse-btn"
                    type="button"
                    aria-label={pinnedCollapsed ? t('item.expandPinned') : t('item.collapsePinned')}
                  >
                    <ChevronDownIcon
                      style={{
                        transform: isHorizontal
                          ? (pinnedCollapsed ? 'rotate(-90deg)' : 'rotate(90deg)')
                          : (pinnedCollapsed ? 'rotate(0deg)' : 'rotate(180deg)'),
                        transition: 'transform 0.14s ease'
                      }}
                    />
                  </button>
                </div>
              </div>
              {shownPinned.map((it) => {
                quickCounter++
                const qIndex = quickCounter <= 9 ? quickCounter : undefined
                return <ClipboardItemCard key={it.id} item={it} quickIndex={qIndex} />
              })}
            </section>
          )}

          {recent.length > 0 && (
            <section className="recent-section">
              {pinned.length > 0 && (
                <div className="section-label recent-header">
                  <span className="recent-label-text">{t('item.recent')}</span>
                </div>
              )}
              {shownRecent.map((it) => {
                quickCounter++
                const qIndex = quickCounter <= 9 ? quickCounter : undefined
                return <ClipboardItemCard key={it.id} item={it} quickIndex={qIndex} />
              })}
            </section>
          )}
        </motion.div>
      )}

      <AnimatePresence>
        {showScrollTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85 }}
            transition={{ duration: reduceMotion ? 0.01 : 0.14, ease: 'easeOut' }}
            className={`scroll-top-btn${isHorizontal ? ' horizontal' : ''}`}
            onClick={scrollToTop}
            title={t('item.scrollToTop')}
            aria-label={t('item.scrollToTop')}
          >
            {isHorizontal ? (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"></polyline>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="18 15 12 9 6 15"></polyline>
              </svg>
            )}
          </motion.button>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {backSpot && (
          <BackButton
            key="back-button"
            horizontal={isHorizontal}
            reduceMotion={reduceMotion}
            label={t('item.backToSpot')}
            onBack={goBack}
            onDone={() => setBackSpot(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/**
 * "Back to where you were": the scroll-to-top button's twin, in its corner
 * (free while the list is at the top), pointing the other way. A white ring
 * around its edge shrinks for as long as it is offered; the pointer on it
 * holds the time.
 */
function BackButton({ horizontal, reduceMotion, label, onBack, onDone }: {
  horizontal: boolean
  reduceMotion: boolean
  label: string
  onBack: () => void
  onDone: () => void
}) {
  const [held, setHeld] = useState(false)
  const timeLeft = useRef(BACK_BUTTON_MS)
  const done = useRef(onDone)
  done.current = onDone
  useEffect(() => {
    if (held) return
    const startedAt = performance.now()
    const timer = window.setTimeout(() => done.current(), timeLeft.current)
    return () => {
      window.clearTimeout(timer)
      timeLeft.current -= performance.now() - startedAt
    }
  }, [held])

  return (
    <motion.button
      type="button"
      className={`scroll-top-btn back-btn${horizontal ? ' horizontal' : ''}${held ? ' is-held' : ''}`}
      style={{ '--back-btn-ms': `${BACK_BUTTON_MS}ms` } as React.CSSProperties}
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.85 }}
      transition={{ duration: reduceMotion ? 0.01 : 0.14, ease: 'easeOut' }}
      onClick={onBack}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      title={label}
      aria-label={label}
    >
      {horizontal ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="9 18 15 12 9 6"></polyline>
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      )}
      <svg className="back-btn-ring" viewBox="0 0 44 44" aria-hidden="true">
        <circle cx="22" cy="22" r="20.5" pathLength="100" />
      </svg>
    </motion.button>
  )
}

