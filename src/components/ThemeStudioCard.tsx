/**
 * ThemeStudioCard — Appearance Theme & Color Mode studio for T-Drop Settings.
 *
 * Features:
 *  - System / Light / Dark mode selector
 *  - Welcome-Tour-style looping HTML/CSS animated "video" preview showing the
 *    screen edge neo (trigger), cursor hover, sliding shelf, and clipboard cards
 *    rendered live in the selected theme + color mode
 *  - Curated theme preset swatches (Default Obsidian + 5 custom themes)
 */
import React, { useMemo } from 'react'
import type { ColorMode, ThemePreset } from '../../shared/types'
import { THEME_CATALOG, getThemePalette, themeKey } from '../lib/theme'
import { playButtonClickSound } from '../lib/soundEffects'
import { useTranslation } from '../i18n'
import '../styles/themeStudio.css'

export interface ThemeStudioCardProps {
  themePreset: ThemePreset
  colorMode: ColorMode
  onChangePreset: (preset: ThemePreset) => void
  onChangeColorMode: (mode: ColorMode) => void
  compact?: boolean
}

function ModeIcon({ mode }: { mode: ColorMode }) {
  if (mode === 'system') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    )
  }
  if (mode === 'light') {
    return (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    )
  }
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

export function ThemeStudioCard({
  themePreset,
  colorMode,
  onChangePreset,
  onChangeColorMode,
  compact = false
}: ThemeStudioCardProps) {
  const { t } = useTranslation()
  const themeName = (id: string) => t(`themes.${themeKey(id)}.name`)
  const themeTagline = (id: string) => t(`themes.${themeKey(id)}.tagline`)

  const { resolvedMode, palette, def } = useMemo(
    () => getThemePalette(themePreset, colorMode),
    [themePreset, colorMode]
  )

  const stageStyle = {
    '--ts-wallpaper': palette.stageWallpaper,
    '--ts-win-bg': palette.stageWindowBg,
    '--ts-win-bar': palette.stageWindowBar,
    '--ts-blade': palette.bladeBg,
    '--ts-card': palette.cardBg,
    '--ts-card-hover': palette.cardHover,
    '--ts-border': palette.borderStrong,
    '--ts-text': palette.textPrimary,
    '--ts-muted': palette.textTertiary,
    '--ts-accent': palette.accent,
    '--ts-accent-glow': palette.accentGlow
  } as React.CSSProperties

  const modeOptions: { id: ColorMode; label: string }[] = [
    { id: 'system', label: t('themeStudio.modeSystem') },
    { id: 'light', label: t('themeStudio.modeLight') },
    { id: 'dark', label: t('themeStudio.modeDark') }
  ]

  const modeLabel =
    colorMode === 'system'
      ? `${t('themeStudio.modeSystem')} (${resolvedMode === 'dark' ? t('themeStudio.modeDark') : t('themeStudio.modeLight')})`
      : resolvedMode === 'dark'
        ? t('themeStudio.modeDark')
        : t('themeStudio.modeLight')

  return (
    <div className={`ts-studio${compact ? ' is-compact' : ''}`}>
      {/* Color Mode Selector */}
      <div className="ts-mode-row" role="radiogroup" aria-label={t('themeStudio.colorModeLabel')}>
        {modeOptions.map((opt) => {
          const active = colorMode === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`ts-mode-btn${active ? ' active' : ''}`}
              onClick={() => {
                playButtonClickSound()
                onChangeColorMode(opt.id)
              }}
            >
              <ModeIcon mode={opt.id} />
              <span>{opt.label}</span>
            </button>
          )
        })}
      </div>

      {/* Live HTML/CSS Animated Video Preview (Welcome Tour style) */}
      <div className="ts-stage" style={stageStyle} aria-hidden="true">
        {/* Background mock desktop window */}
        <div className="ts-desktop-win">
          <div className="ts-desktop-win-bar">
            <span className="ts-dot" />
            <span className="ts-dot" />
            <span className="ts-dot" />
          </div>
          <div className="ts-desktop-lines">
            <span className="ts-dline w-70" />
            <span className="ts-dline w-45" />
            <span className="ts-dline w-85" />
            <span className="ts-dline w-60" />
          </div>
        </div>

        {/* Edge Trigger Pill ("Neo") */}
        <div className="ts-edge-neo" />

        {/* Sliding Mini T-Drop Shelf */}
        <div className="ts-mini-blade">
          <div className="ts-mini-header">
            <span className="ts-mini-logo" />
            <span className="ts-mini-search" />
          </div>
          <div className="ts-mini-cards">
            <div className="ts-mini-card is-accent">
              <div className="ts-mini-card-top">
                <span className="ts-mini-badge">MD</span>
                <span className="ts-mini-line w-60" />
              </div>
              <span className="ts-mini-line w-90 muted" />
            </div>
            <div className="ts-mini-card is-target">
              <div className="ts-mini-thumb" />
              <div className="ts-mini-card-meta">
                <span className="ts-mini-line w-75" />
                <span className="ts-mini-line w-45 muted" />
              </div>
              <span className="ts-mini-ripple" />
            </div>
            <div className="ts-mini-card">
              <span className="ts-mini-line w-80" />
              <span className="ts-mini-line w-55 muted" />
            </div>
          </div>
        </div>

        {/* Animated Cursor */}
        <div className="ts-cursor">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M5.5 3.2L19.5 12.2L12.6 13.7L9.4 20.4L5.5 3.2Z" stroke="#000" strokeWidth="1.6" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Live Theme Badge */}
        <div className="ts-stage-pill">
          <span className="ts-stage-dot" />
          <span>{themeName(def.id)}</span>
          <span className="ts-stage-sep">·</span>
          <span>{modeLabel}</span>
        </div>
      </div>

      {/* Theme Preset Grid */}
      <div className="ts-grid" role="radiogroup" aria-label={t('themeStudio.presetLabel')}>
        {THEME_CATALOG.map((theme) => {
          const active = themePreset === theme.id
          const sw = theme[resolvedMode]
          return (
            <button
              key={theme.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={`ts-preset-btn${active ? ' active' : ''}`}
              onClick={() => {
                playButtonClickSound()
                onChangePreset(theme.id)
              }}
            >
              <span
                className="ts-swatch"
                style={{
                  background: sw.bladeBg,
                  borderColor: sw.borderStrong
                }}
              >
                <span className="ts-swatch-card" style={{ background: sw.cardBg }} />
                <span className="ts-swatch-accent" style={{ background: sw.accent, boxShadow: `0 0 8px ${sw.accentGlow}` }} />
              </span>
              <span className="ts-preset-meta">
                <span className="ts-preset-name">{themeName(theme.id)}</span>
                <span className="ts-preset-sub">{themeTagline(theme.id)}</span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default ThemeStudioCard
