/**
 * SnippetsWindowView — the standalone Smart Snippets editor (#snippets).
 * A real window because typing needs keyboard focus, which the shelf never takes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { t } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'
import { DEFAULT_SNIPPET_FORMATS, expandSnippet, MAX_SNIPPET_TEXT, MAX_SNIPPET_TITLE, SNIPPET_VARIABLES, type Snippet, type SnippetFormats } from '../../shared/snippets'
import '../styles/snippetsWindow.css'

interface Draft {
  id?: string
  title: string
  text: string
}

const EMPTY: Draft = { title: '', text: '' }

export function SnippetsWindowView() {
  const [list, setList] = useState<Snippet[]>([])
  const [draft, setDraft] = useState<Draft>(EMPTY)
  const [saving, setSaving] = useState(false)
  const [armedDelete, setArmedDelete] = useState(false)
  const [status, setStatus] = useState('')
  const [formats, setFormats] = useState<SnippetFormats>(DEFAULT_SNIPPET_FORMATS)
  const area = useRef<HTMLTextAreaElement>(null)

  const reload = useCallback(async () => {
    const items = (await window.edge?.listSnippets?.()) ?? []
    setList(items)
    return items
  }, [])

  useEffect(() => {
    document.title = t('snippets.title')
    void reload()
    void window.edge?.getSnippetFormats?.().then((f) => f && setFormats(f)).catch(() => {})
  }, [reload])

  const flash = (msg: string) => {
    setStatus(msg)
    window.setTimeout(() => setStatus(''), 1800)
  }

  const open = (s: Snippet | null) => {
    setArmedDelete(false)
    setDraft(s ? { id: s.id, title: s.title, text: s.text } : EMPTY)
  }

  const dirty = useMemo(() => {
    const cur = list.find((s) => s.id === draft.id)
    return cur ? cur.title !== draft.title || cur.text !== draft.text : draft.text.trim().length > 0
  }, [list, draft])

  const save = async () => {
    if (!draft.text.trim() || saving) return
    playButtonClickSound()
    setSaving(true)
    try {
      const saved = await window.edge?.saveSnippet?.(draft)
      if (saved) {
        await reload()
        setDraft({ id: saved.id, title: saved.title, text: saved.text })
        flash(t('snippets.saved'))
      } else {
        flash(t('snippets.saveFailed'))
      }
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!draft.id) return
    if (!armedDelete) {
      setArmedDelete(true)
      window.setTimeout(() => setArmedDelete(false), 2500)
      return
    }
    playButtonClickSound()
    await window.edge?.deleteSnippet?.(draft.id)
    await reload()
    setDraft(EMPTY)
    setArmedDelete(false)
    flash(t('snippets.deleted'))
  }

  const insertVariable = (name: string) => {
    const el = area.current
    const token = `{${name}}`
    if (!el) {
      setDraft((d) => ({ ...d, text: d.text + token }))
      return
    }
    const start = el.selectionStart ?? draft.text.length
    const end = el.selectionEnd ?? start
    const next = draft.text.slice(0, start) + token + draft.text.slice(end)
    setDraft((d) => ({ ...d, text: next.slice(0, MAX_SNIPPET_TEXT) }))
    window.setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + token.length, start + token.length)
    }, 0)
  }

  const preview = useMemo(
    () =>
      expandSnippet(draft.text, {
        now: new Date(),
        formats,
        clipboard: t('snippets.clipboardSample'),
        uuid: () => crypto.randomUUID()
      }),
    [draft.text, formats]
  )

  const close = () => {
    if (window.edge?.closeSnippetsWindow) void window.edge.closeSnippetsWindow()
    else window.close()
  }

  return (
    <div className="sw-root">
      <header className="sw-titlebar">
        <div className="sw-title">
          <strong>{t('snippets.title')}</strong>
          <small>{t('snippets.subtitle')}</small>
        </div>
        <button type="button" className="sw-close" onClick={close} aria-label={t('common.close')}>✕</button>
      </header>

      <div className="sw-body">
        <aside className="sw-list">
          <button type="button" className="sw-new" onClick={() => { playButtonClickSound(); open(null) }}>
            + {t('snippets.new')}
          </button>
          <div className="sw-items">
            {list.length === 0 && <div className="sw-empty">{t('snippets.empty')}</div>}
            {list.map((s) => (
              <button
                key={s.id}
                type="button"
                className={`sw-item${s.id === draft.id ? ' active' : ''}`}
                onClick={() => { playButtonClickSound(); open(s) }}
              >
                <span className="sw-item-title">{s.title}</span>
                <span className="sw-item-text">{s.text.replace(/\s+/g, ' ').slice(0, 70)}</span>
                {s.uses > 0 && <span className="sw-item-uses">×{s.uses}</span>}
              </button>
            ))}
          </div>
        </aside>

        <section className="sw-editor">
          <label className="sw-label" htmlFor="sw-title-input">{t('snippets.fieldTitle')}</label>
          <input
            id="sw-title-input"
            className="sw-input"
            value={draft.title}
            maxLength={MAX_SNIPPET_TITLE}
            placeholder={t('snippets.titlePlaceholder')}
            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          />

          <label className="sw-label" htmlFor="sw-text-input">{t('snippets.fieldText')}</label>
          <textarea
            id="sw-text-input"
            ref={area}
            className="sw-textarea"
            value={draft.text}
            maxLength={MAX_SNIPPET_TEXT}
            placeholder={t('snippets.textPlaceholder')}
            onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
          />

          <div className="sw-vars">
            <span className="sw-vars-label">{t('snippets.variables')}</span>
            {SNIPPET_VARIABLES.map((v) => (
              <button key={v} type="button" className="sw-var" onClick={() => insertVariable(v)} title={t(`snippets.var.${v}`)}>
                {`{${v}}`}
              </button>
            ))}
          </div>

          <div className="sw-label">{t('snippets.preview')}</div>
          <pre className="sw-preview">{draft.text.trim() ? preview : t('snippets.previewEmpty')}</pre>

          <div className="sw-actions">
            <button type="button" className="sw-btn primary" disabled={!draft.text.trim() || !dirty || saving} onClick={save}>
              {t('snippets.save')}
            </button>
            {draft.id && (
              <button type="button" className={`sw-btn danger${armedDelete ? ' armed' : ''}`} onClick={remove}>
                {armedDelete ? t('snippets.deleteConfirm') : t('snippets.delete')}
              </button>
            )}
            <span className="sw-status">{status}</span>
          </div>
        </section>
      </div>
    </div>
  )
}
