/**
 * LogsWindowView — the standalone "Logs & diagnostics" window (#logs).
 * Replaces the old in-shelf modal, which the shelf closed on hover-out.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'
import '../styles/logsWindow.css'

type Filter = 'ALL' | 'ERROR' | 'WARN' | 'INFO'

// Diagnostic / Windows / hardware / license details are only meant for the copied
// text and the file on disk, never for the list shown on screen.
const HIDDEN_TAGS = [
  '[WinOS]', '[WinLic]', '[WinInsider]', '[Hardware]', '[CPU]', '[Memory]', '[GPU]',
  '[Motherboard]', '[BIOS]', '[Storage]', '[Display]', '[Install]', '[Diag]', '[Runtime]', '[TD-License]'
]

export function isHiddenDiagLine(line: string): boolean {
  return HIDDEN_TAGS.some((tag) => line.includes(tag)) || line.includes('THÔNG TIN CHẨN ĐOÁN')
}

function levelOf(line: string): 'ERROR' | 'WARN' | 'INFO' | '' {
  if (line.includes('[ERROR]') || line.includes('UncaughtException') || line.includes('UnhandledRejection')) return 'ERROR'
  if (line.includes('[WARN')) return 'WARN'
  if (line.includes('[INFO')) return 'INFO'
  return ''
}

export function LogsWindowView() {
  const [rawLogs, setRawLogs] = useState('')
  const [path, setPath] = useState('')
  const [filter, setFilter] = useState<Filter>('ALL')
  const [loading, setLoading] = useState(false)
  const [diagnosing, setDiagnosing] = useState(false)
  const [copied, setCopied] = useState(false)
  const viewport = useRef<HTMLDivElement>(null)
  const copyTimer = useRef<number | null>(null)

  useEffect(() => () => {
    if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
  }, [])

  const load = useCallback(async (diagIfMissing = false) => {
    if (!window.edge?.getSystemLogs) return
    setLoading(true)
    try {
      const res = await window.edge.getSystemLogs(450)
      setRawLogs(res.logs || '')
      setPath(res.path || '')
      if (diagIfMissing && !res.logs?.includes('[WinOS]') && window.edge?.generateDiagnostics) {
        setDiagnosing(true)
        const diag = await window.edge.generateDiagnostics()
        if (diag.ok) {
          setRawLogs(diag.logs)
          setPath(diag.path)
        }
        setDiagnosing(false)
      }
    } catch (err: any) {
      setRawLogs(t('logs.readError', { error: err?.message || String(err) }))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    document.title = t('logs.title')
    void load(true)
  }, [load])

  const { visible, shown } = useMemo(() => {
    const all = rawLogs.split(/\r?\n/).filter(Boolean)
    const vis = all.filter((l) => !isHiddenDiagLine(l))
    return { visible: vis, shown: vis.filter((l) => filter === 'ALL' || levelOf(l) === filter) }
  }, [rawLogs, filter])

  // Stay at the newest line after every load / filter change.
  useEffect(() => {
    const el = viewport.current
    if (el) el.scrollTop = el.scrollHeight
  }, [shown])

  const close = () => {
    if (window.edge?.closeLogsWindow) void window.edge.closeLogsWindow()
    else window.close()
  }

  const copy = async () => {
    playButtonClickSound()
    if (!rawLogs) return
    const payload = rawLogs.length > 500_000 ? rawLogs.slice(-500_000) : rawLogs
    let ok = false

    // Prefer Electron's native clipboard IPC (works in file:// production builds
    // and pauses the clipboard watcher so logs don't pollute clipboard history).
    if (window.edge?.copyText) {
      try {
        ok = Boolean(await window.edge.copyText(payload))
      } catch {
        ok = false
      }
    }

    if (!ok && navigator.clipboard?.writeText) {
      try {
        await navigator.clipboard.writeText(payload)
        ok = true
      } catch {
        ok = false
      }
    }

    if (!ok) {
      try {
        const area = document.createElement('textarea')
        area.value = payload
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        area.style.pointerEvents = 'none'
        document.body.appendChild(area)
        area.select()
        ok = document.execCommand('copy')
        area.remove()
      } catch {
        ok = false
      }
    }

    if (ok) {
      setCopied(true)
      if (copyTimer.current !== null) window.clearTimeout(copyTimer.current)
      copyTimer.current = window.setTimeout(() => {
        setCopied(false)
        copyTimer.current = null
      }, 2000)
    }
  }

  const runDiag = async () => {
    if (!window.edge?.generateDiagnostics) return
    playButtonClickSound()
    setDiagnosing(true)
    try {
      const res = await window.edge.generateDiagnostics()
      if (res.ok) {
        setRawLogs(res.logs)
        setPath(res.path)
      }
    } finally {
      setDiagnosing(false)
    }
  }

  const clear = async () => {
    playButtonClickSound()
    if (!window.edge?.clearSystemLogs) return
    await window.edge.clearSystemLogs()
    await load()
  }

  const filters: { key: Filter; label: string; cls?: string }[] = [
    { key: 'ALL', label: t('logs.filterAll') },
    { key: 'ERROR', label: t('logs.filterError'), cls: 'error' },
    { key: 'WARN', label: t('logs.filterWarn'), cls: 'warn' },
    { key: 'INFO', label: t('logs.filterInfo') }
  ]

  return (
    <div className="lw-root">
      <header className="lw-titlebar">
        <div className="lw-title">
          <span className="lw-badge" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="4 17 10 11 4 5" />
              <line x1="12" y1="19" x2="20" y2="19" />
            </svg>
          </span>
          <span className="lw-title-text">
            <strong>{t('logs.title')}</strong>
            <small>{t('logs.subtitle')}</small>
          </span>
        </div>
        <button type="button" className="lw-close" onClick={close} aria-label={t('common.close')}>✕</button>
      </header>

      <div className="lw-body">
        <div className="lw-path">
          <span className="lw-path-text" title={path}>{path || t('logs.loadingPath')}</span>
          <button
            type="button"
            className="lw-chip"
            onClick={() => {
              playButtonClickSound()
              void window.edge?.openLogFolder?.()
            }}
            title={t('logs.openFolderTip')}
          >
            {t('logs.openFolder')}
          </button>
        </div>

        <div className="lw-filters">
          <div className="lw-filter-group">
            {filters.map(({ key, label, cls }) => (
              <button
                key={key}
                type="button"
                className={`lw-chip ${cls ?? ''}${filter === key ? ' active' : ''}`}
                onClick={() => {
                  playButtonClickSound()
                  setFilter(key)
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="lw-filter-group">
            <button type="button" className="lw-chip" title={t('logs.scrollTopTip')} onClick={() => viewport.current && (viewport.current.scrollTop = 0)}>
              {t('logs.top')}
            </button>
            <button
              type="button"
              className="lw-chip"
              title={t('logs.scrollBottomTip')}
              onClick={() => viewport.current && (viewport.current.scrollTop = viewport.current.scrollHeight)}
            >
              {t('logs.bottom')}
            </button>
            <span className="lw-count">{t('logs.lineCount', { shown: shown.length, total: visible.length })}</span>
          </div>
        </div>

        <div className="lw-terminal" ref={viewport}>
          {loading ? (
            <div className="lw-empty">{t('logs.reading')}</div>
          ) : shown.length === 0 ? (
            <div className="lw-empty">{t('logs.noMatch')}</div>
          ) : (
            shown.map((line, i) => (
              <div key={i} className={`logs-line level-${levelOf(line)}`}>{line}</div>
            ))
          )}
        </div>

        <button type="button" className="lw-diag" disabled={diagnosing} onClick={runDiag}>
          {diagnosing ? t('logs.diagBusy') : t('logs.diagRun')}
        </button>

        <div className="lw-actions">
          <button type="button" className={`lw-btn primary${copied ? ' done' : ''}`} onClick={copy} disabled={!rawLogs}>
            {copied ? t('logs.copiedClip') : t('logs.copyAi')}
          </button>
          <button type="button" className="lw-btn" onClick={() => void load()} disabled={loading || diagnosing}>
            {t('logs.refresh')}
          </button>
          <button type="button" className="lw-btn danger" onClick={clear}>
            {t('logs.clear')}
          </button>
        </div>
      </div>
    </div>
  )
}
