/**
 * AppFilterAndViewerCards — Settings cards for:
 *  - Issue #73: Include / Exclude app filter for clipboard capture
 *  - Issue #109: Choose external application for opening screenshots / images
 */
import { useState } from 'react'
import type { AppFilterMode } from '../../shared/types'
import { useTranslation } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'
import { acquireKeyboard, releaseKeyboard } from '../lib/keyboardFocus'

const QUICK_APP_PRESETS = ['KeePass.exe', 'Bitwarden.exe', '1Password.exe', 'KeePassXC.exe']

export function AppFilterSettingCard({
  mode,
  list,
  cardClass,
  onChangeMode,
  onChangeList
}: {
  mode: AppFilterMode
  list: string[]
  cardClass: string
  onChangeMode: (m: AppFilterMode) => void
  onChangeList: (next: string[]) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  const addApp = (raw: string) => {
    const clean = raw.trim()
    if (!clean) return
    if (list.some((x) => x.toLowerCase() === clean.toLowerCase())) {
      setDraft('')
      return
    }
    onChangeList([...list, clean])
    setDraft('')
  }

  const removeApp = (name: string) => {
    playButtonClickSound()
    onChangeList(list.filter((x) => x !== name))
  }

  return (
    <div className={cardClass} style={cardClass.includes('shelf-card') ? { minWidth: 310 } : undefined}>
      <div className="shelf-card-top">
        <div className="setting-group-label">{t('appFilter.group')}</div>
        <div className="setting-title">{t('appFilter.title')}</div>
        <div className="setting-desc">
          {mode === 'exclude' ? t('appFilter.descExclude') : t('appFilter.descInclude')}
        </div>
      </div>

      <div className="shelf-card-bottom" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="setting-pills">
          {(
            [
              { id: 'exclude', label: t('appFilter.exclude') },
              { id: 'include', label: t('appFilter.include') }
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              className={`pill${mode === opt.id ? ' active' : ''}`}
              onClick={() => {
                playButtonClickSound()
                onChangeMode(opt.id)
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={draft}
            placeholder={t('appFilter.placeholder')}
            onFocus={() => acquireKeyboard('settings-app-filter')}
            onBlur={() => releaseKeyboard('settings-app-filter')}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                playButtonClickSound()
                addApp(draft)
              }
            }}
            style={{
              flex: 1,
              minWidth: 0,
              height: 28,
              padding: '0 9px',
              borderRadius: 7,
              background: 'rgba(255, 255, 255, 0.06)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'var(--text-primary, #fff)',
              fontSize: 11.5,
              outline: 'none'
            }}
          />
          <button
            type="button"
            className="pill"
            onClick={() => {
              playButtonClickSound()
              addApp(draft)
            }}
            style={{ height: 28, padding: '0 10px', flexShrink: 0 }}
          >
            + {t('appFilter.add')}
          </button>
        </div>

        {list.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
            {list.map((name) => (
              <span
                key={name}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  padding: '2px 8px',
                  borderRadius: 999,
                  fontSize: 11,
                  background: 'rgba(139, 92, 246, 0.16)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  color: 'var(--text-primary, #fff)'
                }}
              >
                <span>{name}</span>
                <button
                  type="button"
                  onClick={() => removeApp(name)}
                  aria-label={`Remove ${name}`}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    color: 'inherit',
                    cursor: 'pointer',
                    padding: 0,
                    fontSize: 11,
                    opacity: 0.75
                  }}
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {QUICK_APP_PRESETS.filter((p) => !list.some((x) => x.toLowerCase() === p.toLowerCase())).map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                playButtonClickSound()
                addApp(preset)
              }}
              style={{
                border: '1px dashed rgba(255, 255, 255, 0.18)',
                background: 'transparent',
                color: 'var(--text-tertiary, rgba(255,255,255,0.6))',
                borderRadius: 999,
                padding: '2px 7px',
                fontSize: 10.5,
                cursor: 'pointer'
              }}
            >
              + {preset.replace(/\.exe$/i, '')}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export function ImageViewerSettingCard({
  viewerApp,
  cardClass,
  onChangeViewer
}: {
  viewerApp: string
  cardClass: string
  onChangeViewer: (path: string) => void
}) {
  const { t } = useTranslation()
  const displayName = viewerApp
    ? viewerApp.split(/[\\/]/).pop() || viewerApp
    : t('imageViewer.systemDefault')

  const handlePick = async () => {
    playButtonClickSound()
    const picked = await window.edge?.pickAppExecutable?.()
    if (picked) onChangeViewer(picked)
  }

  return (
    <div className={cardClass} style={cardClass.includes('shelf-card') ? { minWidth: 270 } : undefined}>
      <div className="shelf-card-top">
        <div className="setting-group-label">{t('imageViewer.group')}</div>
        <div className="setting-title">{t('imageViewer.title')}</div>
        <div className="setting-desc">{t('imageViewer.desc')}</div>
      </div>

      <div className="shelf-card-bottom" style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
        <div
          title={viewerApp || displayName}
          style={{
            fontSize: 11.5,
            fontWeight: 600,
            color: 'var(--text-primary, #fff)',
            padding: '5px 9px',
            borderRadius: 7,
            background: 'rgba(128, 128, 148, 0.12)',
            border: '1px solid var(--edge-light, rgba(255,255,255,0.08))',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {displayName}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button type="button" className="pill active" onClick={handlePick} style={{ flex: 1 }}>
            {t('imageViewer.choose')}
          </button>
          {viewerApp && (
            <button
              type="button"
              className="pill"
              onClick={() => {
                playButtonClickSound()
                onChangeViewer('')
              }}
            >
              {t('imageViewer.reset')}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
