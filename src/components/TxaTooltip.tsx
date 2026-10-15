import React, { useEffect, useState, useRef, useLayoutEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useStore } from '../store/appStore'
import '../styles/txaTooltip.css'

export type TooltipPlacement = 'top' | 'bottom' | 'left' | 'right' | 'auto'

interface TooltipState {
  text: string
  targetRect: DOMRect
  placement: 'top' | 'bottom' | 'left' | 'right'
  targetEl: HTMLElement
}

/**
 * Global TxaTooltip Provider.
 * Automatically catches:
 * 1. Native `title` attributes across all elements (intercepts & removes them so ugly OS browser tooltips NEVER appear).
 * 2. Elements with `data-txa-tooltip` or `data-tooltip`.
 * 3. Adapts dynamically to panel stick positions (top, bottom, left, right, and 4 corners) with boundary detection.
 */
export function TxaTooltipProvider() {
  const [state, setState] = useState<TooltipState | null>(null)
  const [visible, setVisible] = useState(false)
  const [coords, setCoords] = useState<{ x: number; y: number; arrowX?: number; arrowY?: number }>({ x: -9999, y: -9999 })
  const tooltipRef = useRef<HTMLDivElement>(null)
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const recentHideTimerRef = useRef<number>(0)
  const activeElRef = useRef<HTMLElement | null>(null)

  const stickPosition = useStore((s) => s.settings.stickPosition || 'right')

  const hideTooltip = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current)
      showTimerRef.current = null
    }
    recentHideTimerRef.current = Date.now()
    setVisible(false)
    setState(null)
    activeElRef.current = null
  }, [])

  // Position calculation with automatic edge & corner awareness
  const updatePosition = useCallback((targetRect: DOMRect, preferred: TooltipPlacement) => {
    const tooltipEl = tooltipRef.current
    const tooltipW = tooltipEl ? tooltipEl.offsetWidth : 120
    const tooltipH = tooltipEl ? tooltipEl.offsetHeight : 28

    const vw = window.innerWidth
    const vh = window.innerHeight
    const margin = 8

    let chosenPlacement: 'top' | 'bottom' | 'left' | 'right' = 'bottom'

    if (preferred !== 'auto') {
      chosenPlacement = preferred
    } else {
      // Smart default placement based on viewport clearance and docking edge
      if (stickPosition === 'top') {
        chosenPlacement = targetRect.bottom + tooltipH + margin > vh ? 'top' : 'bottom'
      } else if (stickPosition === 'left') {
        chosenPlacement = targetRect.right + tooltipW + margin > vw ? 'left' : 'right'
      } else if (stickPosition === 'right') {
        chosenPlacement = targetRect.left - tooltipW - margin < 0 ? 'right' : 'left'
      } else {
        // Fallback or bottom/corner: check where the element has more clearance
        const spaceAbove = targetRect.top
        const spaceBelow = vh - targetRect.bottom
        chosenPlacement = spaceBelow >= spaceAbove ? 'bottom' : 'top'
      }

      // Check boundary collisions and flip if necessary
      if (chosenPlacement === 'top' && targetRect.top - tooltipH - margin < 0) {
        chosenPlacement = 'bottom'
      } else if (chosenPlacement === 'bottom' && targetRect.bottom + tooltipH + margin > vh) {
        chosenPlacement = 'top'
      } else if (chosenPlacement === 'left' && targetRect.left - tooltipW - margin < 0) {
        chosenPlacement = 'right'
      } else if (chosenPlacement === 'right' && targetRect.right + tooltipW + margin > vw) {
        chosenPlacement = 'left'
      }
    }

    let x = 0
    let y = 0
    let arrowX: number | undefined
    let arrowY: number | undefined

    if (chosenPlacement === 'top') {
      x = targetRect.left + targetRect.width / 2 - tooltipW / 2
      y = targetRect.top - tooltipH - 6
    } else if (chosenPlacement === 'bottom') {
      x = targetRect.left + targetRect.width / 2 - tooltipW / 2
      y = targetRect.bottom + 6
    } else if (chosenPlacement === 'left') {
      x = targetRect.left - tooltipW - 6
      y = targetRect.top + targetRect.height / 2 - tooltipH / 2
    } else {
      // right
      x = targetRect.right + 6
      y = targetRect.top + targetRect.height / 2 - tooltipH / 2
    }

    // Clamp inside viewport bounds so tooltip is never clipped at corners or edges
    const clampedX = Math.max(margin, Math.min(vw - tooltipW - margin, x))
    const clampedY = Math.max(margin, Math.min(vh - tooltipH - margin, y))

    // Position arrow directly pointing to target center
    if (chosenPlacement === 'top' || chosenPlacement === 'bottom') {
      const targetCenterX = targetRect.left + targetRect.width / 2
      arrowX = Math.max(10, Math.min(tooltipW - 10, targetCenterX - clampedX))
    } else {
      const targetCenterY = targetRect.top + targetRect.height / 2
      arrowY = Math.max(8, Math.min(tooltipH - 8, targetCenterY - clampedY))
    }

    setCoords({ x: clampedX, y: clampedY, arrowX, arrowY })
    return chosenPlacement
  }, [stickPosition])

  useLayoutEffect(() => {
    if (state && visible) {
      updatePosition(state.targetRect, state.placement)
    }
  }, [state, visible, updatePosition])

  useEffect(() => {
    const handlePointerOver = (e: PointerEvent | MouseEvent) => {
      const target = (e.target as HTMLElement | null)?.closest<HTMLElement>(
        '[title], [data-txa-tooltip], [data-tooltip]'
      )

      if (!target) return

      // Strip browser native title immediately so default OS tooltip never renders
      if (target.hasAttribute('title')) {
        const val = target.getAttribute('title')
        if (val && val.trim()) {
          target.setAttribute('data-txa-tooltip', val.trim())
          target.removeAttribute('title')
        }
      }

      const tooltipText = target.getAttribute('data-txa-tooltip') || target.getAttribute('data-tooltip')
      if (!tooltipText || !tooltipText.trim()) return

      const preferredPlacement = (target.getAttribute('data-txa-placement') || 'auto') as TooltipPlacement

      if (activeElRef.current === target && visible) return
      activeElRef.current = target

      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current)
        showTimerRef.current = null
      }

      const rect = target.getBoundingClientRect()
      const now = Date.now()
      // If a tooltip was active within last 250ms, open immediately (desktop feel)
      const delay = now - recentHideTimerRef.current < 250 ? 0 : 120

      showTimerRef.current = setTimeout(() => {
        const activePlacement = updatePosition(rect, preferredPlacement)
        setState({
          text: tooltipText,
          targetRect: rect,
          placement: activePlacement,
          targetEl: target
        })
        setVisible(true)
      }, delay)
    }

    const handlePointerOut = (e: PointerEvent | MouseEvent) => {
      const related = (e as any).relatedTarget as HTMLElement | null
      if (activeElRef.current && (!related || !activeElRef.current.contains(related))) {
        hideTooltip()
      }
    }

    const handleDismiss = () => {
      hideTooltip()
    }

    // Attach passive global capture listeners
    document.addEventListener('pointerover', handlePointerOver, { capture: true, passive: true })
    document.addEventListener('pointerout', handlePointerOut, { capture: true, passive: true })
    document.addEventListener('pointerdown', handleDismiss, { capture: true, passive: true })
    document.addEventListener('wheel', handleDismiss, { capture: true, passive: true })
    document.addEventListener('scroll', handleDismiss, { capture: true, passive: true })
    window.addEventListener('blur', handleDismiss, { passive: true })

    return () => {
      document.removeEventListener('pointerover', handlePointerOver, { capture: true } as any)
      document.removeEventListener('pointerout', handlePointerOut, { capture: true } as any)
      document.removeEventListener('pointerdown', handleDismiss, { capture: true } as any)
      document.removeEventListener('wheel', handleDismiss, { capture: true } as any)
      document.removeEventListener('scroll', handleDismiss, { capture: true } as any)
      window.removeEventListener('blur', handleDismiss)
      if (showTimerRef.current) clearTimeout(showTimerRef.current)
    }
  }, [hideTooltip, updatePosition, visible])

  if (!state || !state.text) return null

  const portalContent = (
    <div
      ref={tooltipRef}
      className="txa-tooltip-portal"
      data-placement={state.placement}
      style={{
        left: coords.x,
        top: coords.y,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translate3d(0, 0, 0) scale(1)' : 'translate3d(0, 2px, 0) scale(0.96)'
      }}
    >
      <div className="txa-tooltip-box">
        {state.text}
        <div
          className="txa-tooltip-arrow"
          style={{
            left: coords.arrowX !== undefined ? `${coords.arrowX}px` : undefined,
            top: coords.arrowY !== undefined ? `${coords.arrowY}px` : undefined
          }}
        />
      </div>
    </div>
  )

  if (typeof document === 'undefined') return null
  return createPortal(portalContent, document.body)
}

/**
 * JSX Wrapper component for explicit tooltip attachment.
 * Usage:
 *   <TxaTooltip content="Sao chép nội dung" placement="top">
 *     <button>Copy</button>
 *   </TxaTooltip>
 */
export function TxaTooltip({
  content,
  placement = 'auto',
  children
}: {
  content?: string | null
  placement?: TooltipPlacement
  children: React.ReactElement
}) {
  if (!content) return children

  return React.cloneElement(children, {
    'data-txa-tooltip': content,
    'data-txa-placement': placement
  } as any)
}
