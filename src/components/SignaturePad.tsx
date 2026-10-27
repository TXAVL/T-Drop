/**
 * SignaturePad — hand-drawn signature with mouse, touchscreen or pen.
 *
 * Pointer Events cover all three input types; `touch-action: none` stops the
 * page from scrolling while drawing on a touchscreen. The canvas is rendered at
 * 3x so the signature stays crisp when printed in the PDF receipt.
 */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'

export interface SignaturePadHandle {
  clear: () => void
  isEmpty: () => boolean
  /** PNG data URL, or null when nothing was drawn. */
  toDataUrl: () => string | null
}

const WIDTH = 420
const HEIGHT = 168
const SCALE = 3

export const SignaturePad = forwardRef<SignaturePadHandle, { onChange?: (empty: boolean) => void; label?: string }>(
  function SignaturePad({ onChange, label }, ref) {
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const drawing = useRef(false)
    const last = useRef<{ x: number; y: number } | null>(null)
    const [empty, setEmpty] = useState(true)

    const ctx = () => canvasRef.current?.getContext('2d') ?? null

    useEffect(() => {
      const c = ctx()
      if (!c) return
      c.setTransform(SCALE, 0, 0, SCALE, 0, 0)
      c.lineCap = 'round'
      c.lineJoin = 'round'
      c.strokeStyle = '#0b1a63'
    }, [])

    const markDrawn = useCallback(() => {
      if (empty) {
        setEmpty(false)
        onChange?.(false)
      }
    }, [empty, onChange])

    const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
      const r = e.currentTarget.getBoundingClientRect()
      return { x: ((e.clientX - r.left) / r.width) * WIDTH, y: ((e.clientY - r.top) / r.height) * HEIGHT }
    }

    const width = (e: React.PointerEvent) => (e.pointerType === 'pen' && e.pressure > 0 ? 1.2 + e.pressure * 2.6 : 2.4)

    const onDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      e.currentTarget.setPointerCapture(e.pointerId)
      drawing.current = true
      const p = point(e)
      last.current = p
      const c = ctx()
      if (!c) return
      c.beginPath()
      c.fillStyle = c.strokeStyle as string
      c.arc(p.x, p.y, width(e) / 2, 0, Math.PI * 2)
      c.fill()
      markDrawn()
    }

    const onMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!drawing.current || !last.current) return
      const c = ctx()
      if (!c) return
      const p = point(e)
      const mid = { x: (last.current.x + p.x) / 2, y: (last.current.y + p.y) / 2 }
      c.lineWidth = width(e)
      c.beginPath()
      c.moveTo(last.current.x, last.current.y)
      c.quadraticCurveTo(last.current.x, last.current.y, mid.x, mid.y)
      c.lineTo(p.x, p.y)
      c.stroke()
      last.current = p
    }

    const onUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
      drawing.current = false
      last.current = null
      try {
        e.currentTarget.releasePointerCapture(e.pointerId)
      } catch {
        /* already released */
      }
    }

    useImperativeHandle(ref, () => ({
      clear: () => {
        const c = ctx()
        if (c) {
          c.save()
          c.setTransform(1, 0, 0, 1, 0, 0)
          c.clearRect(0, 0, WIDTH * SCALE, HEIGHT * SCALE)
          c.restore()
        }
        setEmpty(true)
        onChange?.(true)
      },
      isEmpty: () => empty,
      toDataUrl: () => (empty || !canvasRef.current ? null : canvasRef.current.toDataURL('image/png'))
    }))

    return (
      <div style={{ position: 'relative', width: '100%' }}>
        <canvas
          ref={canvasRef}
          width={WIDTH * SCALE}
          height={HEIGHT * SCALE}
          aria-label={label}
          role="img"
          onPointerDown={onDown}
          onPointerMove={onMove}
          onPointerUp={onUp}
          onPointerCancel={onUp}
          style={{
            display: 'block',
            width: '100%',
            aspectRatio: `${WIDTH} / ${HEIGHT}`,
            background: '#ffffff',
            borderRadius: 10,
            border: '1px dashed rgba(0, 0, 0, 0.25)',
            touchAction: 'none',
            cursor: 'crosshair'
          }}
        />
        {empty && (
          <span
            aria-hidden
            style={{
              position: 'absolute',
              inset: 0,
              display: 'grid',
              placeItems: 'center',
              pointerEvents: 'none',
              color: 'rgba(0, 0, 0, 0.35)',
              fontSize: 13,
              fontStyle: 'italic'
            }}
          >
            {label}
          </span>
        )}
        {/* baseline guide, like the line on paper you sign above */}
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: '8%',
            right: '8%',
            bottom: '22%',
            borderBottom: '1px solid rgba(0, 0, 0, 0.18)',
            pointerEvents: 'none'
          }}
        />
      </div>
    )
  }
)
