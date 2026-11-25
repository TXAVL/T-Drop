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
