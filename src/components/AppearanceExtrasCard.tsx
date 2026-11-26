/**
 * AppearanceExtrasCard — Settings > Appearance: accent color override and corner style.
 *
 * The accent swatch "Theme" ('' in settings) follows the active theme preset; any other
 * swatch (or the custom picker) overrides --accent / --accent-glow on top of it. Corner
 * style 'rounded' keeps the original radii from tokens.css.
 */
import type { CornerStyle } from '../../shared/types'
import { useTranslation } from '../i18n'
import { playButtonClickSound } from '../lib/soundEffects'

const ACCENTS = ['#8b5cf6', '#3b82f6', '#06b6d4', '#10b981', '#84cc16', '#f59e0b', '#f97316', '#ef4444', '#ec4899']

export function AppearanceExtrasCard({
  accentColor,
  cornerStyle,
  themeAccent,
  cardClass,
  onChangeAccent,
  onChangeCorner
}: {
  accentColor: string
  cornerStyle: CornerStyle
  /** The active theme's own accent, shown on the "Theme" swatch. */
  themeAccent: string
  cardClass: string
  onChangeAccent: (hex: string) => void
  onChangeCorner: (c: CornerStyle) => void
}) {
  const { t } = useTranslation()
  const custom = accentColor !== '' && !ACCENTS.includes(accentColor.toLowerCase())
  const pick = (hex: string) => {
    playButtonClickSound()
    onChangeAccent(hex)
  }

  return (
    <div className={cardClass} style={cardClass.includes('shelf-card') ? { minWidth: 300 } : undefined}>
      <div className="shelf-card-top">
        <div className="setting-group-label">{t('appearanceExtra.group')}</div>
        <div className="setting-title">{t('appearanceExtra.accentTitle')}</div>
        <div className="setting-desc">{t('appearanceExtra.accentDesc')}</div>
      </div>

      <div className="shelf-card-bottom" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="ax-swatches" role="radiogroup" aria-label={t('appearanceExtra.accentTitle')}>
          <button
            type="button"
            role="radio"
            aria-checked={accentColor === ''}
            className={`ax-swatch ax-swatch-theme${accentColor === '' ? ' active' : ''}`}
            style={{ ['--sw' as string]: themeAccent }}
            title={t('appearanceExtra.accentTheme')}
            onClick={() => pick('')}
          >
            <span>{t('appearanceExtra.accentTheme')}</span>
          </button>
          {ACCENTS.map((hex) => (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={accentColor.toLowerCase() === hex}
              aria-label={hex}
              className={`ax-swatch${accentColor.toLowerCase() === hex ? ' active' : ''}`}
              style={{ ['--sw' as string]: hex }}
              onClick={() => pick(hex)}
            />
          ))}
          <label
            className={`ax-swatch ax-swatch-custom${custom ? ' active' : ''}`}
            style={{ ['--sw' as string]: custom ? accentColor : '#888888' }}
            title={t('appearanceExtra.accentCustom')}
          >
            <input
              type="color"
              value={custom ? accentColor : '#8b5cf6'}
              aria-label={t('appearanceExtra.accentCustom')}
              onChange={(e) => onChangeAccent(e.target.value.toLowerCase())}
            />
          </label>
        </div>

        <div>
          <div className="setting-title" style={{ marginBottom: 2 }}>{t('appearanceExtra.cornerTitle')}</div>
          <div className="setting-desc" style={{ marginBottom: 8 }}>{t('appearanceExtra.cornerDesc')}</div>
          <div className="setting-pills">
            {(['rounded', 'soft', 'sharp'] as const).map((c) => (
              <button
                key={c}
                type="button"
                className={`pill ${cornerStyle === c ? 'active' : ''}`}
                onClick={() => {
                  playButtonClickSound()
                  onChangeCorner(c)
                }}
              >
                <span className={`ax-corner ax-corner-${c}`} aria-hidden="true" />
                {t(`appearanceExtra.corner_${c}`)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
