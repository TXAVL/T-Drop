/**
 * SnippetsView — the shelf's Snippets tab: a list you click to paste.
 * Editing happens in the standalone Snippets window (typing needs real focus).
 */
import { useCallback, useEffect, useState } from 'react'
import { t } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'
import type { Snippet } from '../../shared/snippets'

export function SnippetsView() {
  const [list, setList] = useState<Snippet[] | null>(null)

  const reload = useCallback(async () => {
    try {
      setList((await window.edge?.listSnippets?.()) ?? [])
    } catch {
      setList([])
    }
  }, [])

  useEffect(() => {
    void reload()
    // The editor is another window: refresh when the shelf is used again.
    window.addEventListener('focus', reload)
    const onVisible = () => document.visibilityState === 'visible' && void reload()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.removeEventListener('focus', reload)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [reload])

  const manage = () => {
    playButtonClickSound()
    void window.edge?.openSnippetsWindow?.()
  }

  return (
    <div className="snippets-view">
      <div className="snippets-head">
        <span className="snippets-head-title">{t('snippets.title')}</span>
        <button type="button" className="snippets-manage" onClick={manage}>
          {list && list.length === 0 ? `+ ${t('snippets.new')}` : t('snippets.manage')}
        </button>
      </div>

      {list && list.length === 0 && (
        <div className="snippets-empty">
          <p>{t('snippets.emptyShelf')}</p>
          <button type="button" className="snippets-manage solid" onClick={manage}>{t('snippets.createFirst')}</button>
        </div>
      )}

      <div className="snippets-list">
        {(list ?? []).map((s) => (
          <button
            key={s.id}
            type="button"
            className="snippet-card"
            title={t('snippets.clickToPaste')}
            onClick={() => {
              playButtonClickSound()
              void window.edge?.pasteSnippet?.(s.id)
            }}
          >
            <span className="snippet-card-title">{s.title}</span>
            <span className="snippet-card-text">{s.text.replace(/\s+/g, ' ').slice(0, 120)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
