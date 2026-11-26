import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, isColorMode, isThemePreset } from '../shared/types'
import { THEME_CATALOG, getThemePalette, resolveColorMode } from '../src/lib/theme'

describe('theme system', () => {
  it('keeps default settings unchanged (default Obsidian + dark mode)', () => {
    expect(DEFAULT_SETTINGS.themePreset).toBe('default')
    expect(DEFAULT_SETTINGS.colorMode).toBe('dark')
    const { resolvedMode, palette } = getThemePalette('default', 'dark')
    expect(resolvedMode).toBe('dark')
    expect(palette.bladeBg).toBe('#0a0a0d')
    expect(palette.flareBg).toBe('#000000')
    expect(palette.cardBg).toBe('#141414')
  })

  it('validates color modes and theme presets', () => {
    expect(isColorMode('system')).toBe(true)
    expect(isColorMode('light')).toBe(true)
    expect(isColorMode('dark')).toBe(true)
    expect(isColorMode('neon')).toBe(false)

    for (const t of THEME_CATALOG) {
      expect(isThemePreset(t.id)).toBe(true)
      expect(t.dark.bladeBg).toBeTruthy()
      expect(t.light.bladeBg).toBeTruthy()
    }
    expect(isThemePreset('unknown-theme')).toBe(false)
  })

  it('resolves explicit light/dark color modes cleanly', () => {
    expect(resolveColorMode('light')).toBe('light')
    expect(resolveColorMode('dark')).toBe('dark')
    const oceanLight = getThemePalette('midnight-ocean', 'light')
    expect(oceanLight.resolvedMode).toBe('light')
    expect(oceanLight.palette.accent).toBe('#0284c7')
  })
})

describe('theme extras (0.3.7)', () => {
  it('ships 11 presets, each with complete dark and light palettes', async () => {
    const { THEME_CATALOG } = await import('../src/lib/theme')
    expect(THEME_CATALOG).toHaveLength(11)
    const keys = Object.keys(THEME_CATALOG[0].dark).sort()
    for (const t of THEME_CATALOG) {
      expect(Object.keys(t.dark).sort()).toEqual(keys)
      expect(Object.keys(t.light).sort()).toEqual(keys)
      for (const v of [...Object.values(t.dark), ...Object.values(t.light)]) expect(v).not.toMatch(/NaN|undefined/)
    }
  })

  it('validates accent overrides and corner styles', async () => {
    const { isAccentColor, isCornerStyle, DEFAULT_SETTINGS: d } = await import('../shared/types')
    expect(isAccentColor('')).toBe(true)
    expect(isAccentColor('#a3e635')).toBe(true)
    expect(isAccentColor('red')).toBe(false)
    expect(isAccentColor('#fff')).toBe(false)
    expect(isCornerStyle('sharp')).toBe(true)
    expect(isCornerStyle('square')).toBe(false)
    expect(d.accentColor).toBe('')
    expect(d.cornerStyle).toBe('rounded')
  })
})
