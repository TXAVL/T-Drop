/**
 * WhatsNewWindowView — Standalone "What's New" feature & fixes guide (#/whats-new).
 *
 * Shown once on first launch of a new version for returning users (completely
 * separate from the full Welcome Tour), with interactive HTML/CSS animated
 * demos for each highlight in v0.3.7.
 */
import { useEffect, useState } from 'react'
import { useTranslation } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'
import { THEME_CATALOG, themeKey } from '../lib/theme'
import '../styles/whatsNewWindow.css'

type SlideId = 'focus' | 'lightmode' | 'stability' | 'cleanup'

interface FeatureSlide {
  id: SlideId
  kind: 'fixed' | 'improved'
  badge: string
  title: string
  desc: string
  tip: string
}

export function WhatsNewWindowView() {
  const { t } = useTranslation()
  const [active, setActive] = useState<SlideId>('focus')
  const [version, setVersion] = useState('0.3.7')
  const [themeIdx, setThemeIdx] = useState(0)

  useEffect(() => {
    if (active !== 'lightmode') return
    const id = window.setInterval(() => setThemeIdx((i) => (i + 1) % THEME_CATALOG.length), 1400)
    return () => window.clearInterval(id)
  }, [active])

  useEffect(() => {
    document.title = t('whatsNew.windowTitle')
    void window.edge?.loadState?.().then((s) => {
      if (s?.version) setVersion(s.version)
    }).catch(() => {})
  }, [t])

  const slides: FeatureSlide[] = [
    {
      id: 'focus',
      kind: 'fixed',
      badge: t('whatsNew.badgeFixed'),
      title: t('whatsNew.v37FocusTitle'),
      desc: t('whatsNew.v37FocusDesc'),
      tip: t('whatsNew.v37FocusTip')
    },
    {
      id: 'lightmode',
      kind: 'fixed',
      badge: t('whatsNew.badgeFixed'),
      title: t('whatsNew.v37LightTitle'),
      desc: t('whatsNew.v37LightDesc'),
      tip: t('whatsNew.v37LightTip')
    },
    {
      id: 'stability',
      kind: 'fixed',
      badge: t('whatsNew.badgeFixed'),
      title: t('whatsNew.v37StabTitle'),
      desc: t('whatsNew.v37StabDesc'),
      tip: t('whatsNew.v37StabTip')
    },
    {
      id: 'cleanup',
      kind: 'improved',
      badge: t('whatsNew.badgeImproved'),
      title: t('whatsNew.v37CleanTitle'),
      desc: t('whatsNew.v37CleanDesc'),
      tip: t('whatsNew.v37CleanTip')
    }
  ]

  const demoTheme = THEME_CATALOG[themeIdx % THEME_CATALOG.length]
  const demoMode = themeIdx % 2 === 0 ? 'light' : 'dark'
  const demoPal = demoTheme[demoMode]

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

        {/* Interactive HTML/CSS Animated Stage */}
        <div className={`wn-stage stage-${slide.id}`} aria-hidden="true">
          {slide.id === 'focus' && (
            <div className="wn-demo-focus">
              <div className="wn-fx-head">
                <span className="wn-fx-label">{t('appFilter.title')}</span>
                <span className="wn-fx-ok">✓ {t('whatsNew.v37FocusStatus')}</span>
              </div>
              <div className="wn-fx-input">
                <span className="wn-fx-typed">KeePass.exe</span>
                <span className="wn-caret" />
                <span className="wn-fx-add">+ {t('appFilter.add')}</span>
              </div>
              <div className="wn-fx-chips">
                <span className="wn-fx-chip">Bitwarden.exe ×</span>
                <span className="wn-fx-chip">1Password.exe ×</span>
                <span className="wn-fx-chip active">KeePass.exe ×</span>
              </div>
            </div>
          )}

          {slide.id === 'lightmode' && (
            <div
              className="wn-demo-th"
              style={{ background: demoPal.stageWallpaper, color: demoPal.accent }}
            >
              <div className="wn-th-neo" />
              <div className="wn-th-blade" style={{ background: demoPal.bladeBg, borderColor: demoPal.borderStrong }}>
                <div className="wn-th-bar">
                  <span className="wn-th-dot" />
                  <span className="wn-th-pill" style={{ background: demoPal.cardBg }} />
                </div>
                {[0, 1].map((n) => (
                  <div className="wn-th-card" key={n} style={{ background: demoPal.cardBg, borderColor: demoPal.border }}>
                    <span className="wn-th-l w80" style={{ background: demoPal.textPrimary }} />
                    <span className="wn-th-l w55" style={{ background: demoPal.textPrimary }} />
                  </div>
                ))}
                <span className="wn-th-name" style={{ color: demoPal.textSecondary }}>
                  {t(`themes.${themeKey(demoTheme.id)}.name`)} · {demoMode === 'dark' ? t('themeStudio.modeDark') : t('themeStudio.modeLight')}
                </span>
              </div>
              <div className="wn-th-swatches">
                {THEME_CATALOG.map((th, i) => (
                  <span
                    key={th.id}
                    className={`sw${i === themeIdx % THEME_CATALOG.length ? ' on' : ''}`}
                    style={{ background: `linear-gradient(135deg, ${th.dark.bladeBg} 45%, ${th.dark.accent})` }}
                  />
                ))}
              </div>
            </div>
          )}

          {slide.id === 'stability' && (
            <div className="wn-demo-stab">
              <div className="wn-st-row r1">
                <span className="wn-st-badge">Ctrl+C ×2</span>
                <span className="wn-st-text">{t('whatsNew.v37StabCopy')}</span>
                <span className="wn-st-ok">✓</span>
              </div>
              <div className="wn-st-row r2">
                <span className="wn-st-badge audio">Audio</span>
                <span className="wn-st-text">{t('whatsNew.v37StabAudio')}</span>
                <span className="wn-st-ok">✓</span>
              </div>
            </div>
          )}

          {slide.id === 'cleanup' && (
            <div className="wn-demo-clean">
              <div className="wn-cl-title">{t('whatsNew.v37CleanMenu')}</div>
              <div className="wn-cl-pills">
                <span className="wn-cl-pill">48h</span>
                <span className="wn-cl-pill">72h</span>
                <span className="wn-cl-pill active">7d</span>
                <span className="wn-cl-pill">14d</span>
                <span className="wn-cl-pill">30d</span>
              </div>
              <div className="wn-cl-foot">{t('whatsNew.v37CleanFoot')}</div>
            </div>
          )}
        </div>

        <div className="wn-copy">
          <div className="wn-copy-head">
            <span className={`wn-badge ${slide.kind}`}>{slide.badge}</span>
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
