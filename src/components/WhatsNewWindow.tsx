/**
 * WhatsNewWindowView — Standalone "What's New" feature guide (#/whats-new).
 *
 * Shown once on first launch of a new version for returning users (completely
 * separate from the full Welcome Tour), with interactive HTML/CSS animated
 * video demos for each headline feature.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'
import '../styles/whatsNewWindow.css'

type FeatureId = 'markdown' | 'multipaste' | 'themes'

interface FeatureSlide {
  id: FeatureId
  badge: string
  title: string
  desc: string
  tip: string
}

export function WhatsNewWindowView() {
  const { t } = useTranslation()
  const [active, setActive] = useState<FeatureId>('markdown')
  const [version, setVersion] = useState('0.3.6')

  useEffect(() => {
    document.title = t('whatsNew.windowTitle')
    void window.edge?.loadState?.().then((s) => {
      if (s?.version) setVersion(s.version)
    }).catch(() => {})
  }, [t])

  const slides: FeatureSlide[] = [
    {
      id: 'markdown',
      badge: t('whatsNew.badgeNew'),
      title: t('whatsNew.mdTitle'),
      desc: t('whatsNew.mdDesc'),
      tip: t('whatsNew.mdTip')
    },
    {
      id: 'multipaste',
      badge: t('whatsNew.badgeNew'),
      title: t('whatsNew.mpTitle'),
      desc: t('whatsNew.mpDesc'),
      tip: t('whatsNew.mpTip')
    },
    {
      id: 'themes',
      badge: t('whatsNew.badgeNew'),
      title: t('whatsNew.thTitle'),
      desc: t('whatsNew.thDesc'),
      tip: t('whatsNew.thTip')
    }
  ]

  const currentIdx = slides.findIndex((s) => s.id === active)
  const slide = slides[currentIdx] ?? slides[0]
  const isLast = currentIdx === slides.length - 1

  const close = () => {
    playButtonClickSound()
    window.close()
  }

  return (
    <div className="wn-root">
      <header className="wn-titlebar">
        <div className="wn-brand">
          <span className="wn-version-pill">v{version}</span>
          <strong>{t('whatsNew.windowTitle')}</strong>
        </div>
        <button type="button" className="wn-close" onClick={close} aria-label={t('whatsNew.close')}>✕</button>
      </header>

      <main className="wn-body">
        <div className="wn-tabs" role="tablist">
          {slides.map((s, idx) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active === s.id}
              className={`wn-tab${active === s.id ? ' active' : ''}`}
              onClick={() => {
                playButtonClickSound()
                setActive(s.id)
              }}
            >
              <span className="wn-tab-num">{idx + 1}</span>
              <span className="wn-tab-label">{s.title}</span>
            </button>
          ))}
        </div>

        {/* Interactive HTML/CSS Animated Video Stage */}
        <div className={`wn-stage stage-${slide.id}`} aria-hidden="true">
          {slide.id === 'markdown' && (
            <div className="wn-demo-md">
              <div className="wn-demo-md-head">
                <span className="wn-md-pill">Markdown · Preview</span>
                <span className="wn-md-edit-btn">✎</span>
              </div>
              <div className="wn-demo-md-body">
                <div className="wn-md-h">{t('whatsNew.mdHeading')}</div>
                <div className="wn-md-table">
                  <div className="wn-md-row head"><span>{t('whatsNew.mdColItem')}</span><span>{t('whatsNew.mdColStatus')}</span></div>
                  <div className="wn-md-row"><span>Markdown Preview</span><span className="ok">{t('whatsNew.mdReady')}</span></div>
                  <div className="wn-md-row"><span>{t('whatsNew.mdRowEdit')}</span><span className="ok">{t('whatsNew.mdOn')}</span></div>
                </div>
              </div>
              <div className="wn-demo-md-editor">
                <div className="wn-ed-line">### {t('whatsNew.mdHeading')}</div>
                <div className="wn-ed-line">| {t('whatsNew.mdColItem')} | {t('whatsNew.mdColStatus')} |<span className="wn-caret" /></div>
                <div className="wn-ed-bar"><span>{t('whatsNew.mdSaveHint')}</span></div>
              </div>
            </div>
          )}

          {slide.id === 'multipaste' && (
            <div className="wn-demo-mp">
              <div className="wn-mp-header">
                <span className="wn-mp-title">T-Drop Shelf</span>
                <span className="wn-mp-pin">📌 {t('multiPaste.pinShelf')}</span>
              </div>
              <div className="wn-mp-cards">
                <div className="wn-mp-card c1"><span className="wn-mp-num">1</span>{t('whatsNew.mpCard1')}</div>
                <div className="wn-mp-card c2"><span className="wn-mp-num">2</span>{t('whatsNew.mpCard2')}</div>
              </div>
              <div className="wn-mp-bar">
                <span>{t('multiPaste.selected', { count: 2 })} · ↵</span>
                <span className="wn-mp-paste">{t('multiPaste.pasteAll')}</span>
              </div>
            </div>
          )}

          {slide.id === 'themes' && (
            <div className="wn-demo-th">
              <div className="wn-th-neo" />
              <div className="wn-th-blade">
                <div className="wn-th-bar"><span className="wn-th-dot" /><span className="wn-th-pill" /></div>
                <div className="wn-th-card"><span className="wn-th-l w80" /><span className="wn-th-l w55" /></div>
                <div className="wn-th-card"><span className="wn-th-l w70" /><span className="wn-th-l w45" /></div>
              </div>
              <div className="wn-th-swatches">
                <span className="sw s1" />
                <span className="sw s2" />
                <span className="sw s3" />
                <span className="sw s4" />
                <span className="sw s5" />
                <span className="sw s6" />
              </div>
            </div>
          )}
        </div>

        <div className="wn-copy">
          <div className="wn-copy-head">
            <span className="wn-badge">{slide.badge}</span>
            <h2>{slide.title}</h2>
          </div>
          <p className="wn-desc">{slide.desc}</p>
          <p className="wn-tip">{slide.tip}</p>
        </div>
      </main>

      <footer className="wn-footer">
        <div className="wn-dots">
          {slides.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`wn-dot${active === s.id ? ' active' : ''}`}
              aria-label={s.title}
              onClick={() => {
                playButtonClickSound()
                setActive(s.id)
              }}
            />
          ))}
        </div>
        <div className="wn-actions">
          {!isLast ? (
            <>
              <button type="button" className="wn-btn" onClick={close}>
                {t('whatsNew.skip')}
              </button>
              <button
                type="button"
                className="wn-btn primary"
                onClick={() => {
                  playButtonClickSound()
                  setActive(slides[currentIdx + 1].id)
                }}
              >
                {t('whatsNew.next')}
              </button>
            </>
          ) : (
            <button type="button" className="wn-btn primary" onClick={close}>
              {t('whatsNew.done')}
            </button>
          )}
        </div>
      </footer>
    </div>
  )
}

export default WhatsNewWindowView
