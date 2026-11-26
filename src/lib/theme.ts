/**
 * Theme engine: manages color modes (system / light / dark), curated shelf
 * theme presets, and live CSS custom property injection on :root.
 *
 * When themePreset === 'default' and resolved mode === 'dark', the app keeps
 * its exact original Obsidian dark palette with zero visual drift.
 */
import type { ColorMode, CornerStyle, ThemePreset } from '../../shared/types'

export interface ThemePalette {
  bladeBg: string
  flareBg: string
  cardBg: string
  cardHover: string
  chipBg: string
  inputBg: string
  border: string
  borderStrong: string
  divider: string
  textPrimary: string
  textSecondary: string
  textTertiary: string
  accent: string
  accentGlow: string
  pillBg: string
  pillActiveBg: string
  pillActiveFg: string
  bladeShadow: string
  stageWallpaper: string
  stageWindowBg: string
  stageWindowBar: string
}

export interface ThemeDefinition {
  id: ThemePreset
  name: string
  tagline: string
  dark: ThemePalette
  light: ThemePalette
}


/** Hex (#rrggbb) to "r, g, b". */
function rgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16)
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`
}

interface Seed {
  blade: string
  card: string
  hover: string
  text: string
  accent: string
  /** Text on an active (accent-filled) pill. */
  onAccent: string
  wallpaper: string
}

/** A full dark palette from a handful of colors (used by the presets added in 0.3.7). */
function darkFrom(s: Seed): ThemePalette {
  const a = rgb(s.accent)
  const t = rgb(s.text)
  return {
    bladeBg: s.blade,
    flareBg: s.blade,
    cardBg: s.card,
    cardHover: s.hover,
    chipBg: s.card,
    inputBg: s.card,
    border: `rgba(${a}, 0.16)`,
    borderStrong: `rgba(${a}, 0.28)`,
    divider: `rgba(${a}, 0.11)`,
    textPrimary: s.text,
    textSecondary: `rgba(${t}, 0.8)`,
    textTertiary: `rgba(${t}, 0.58)`,
    accent: s.accent,
    accentGlow: `rgba(${a}, 0.52)`,
    pillBg: s.card,
    pillActiveBg: s.accent,
    pillActiveFg: s.onAccent,
    bladeShadow: `14px 0 42px rgba(0, 0, 0, 0.8), 0 0 1px 1px rgba(${a}, 0.16)`,
    stageWallpaper: s.wallpaper,
    stageWindowBg: `rgba(${a}, 0.07)`,
    stageWindowBar: `rgba(${a}, 0.14)`
  }
}

/** A full light palette from a handful of colors. */
function lightFrom(s: Seed): ThemePalette {
  const a = rgb(s.accent)
  const t = rgb(s.text)
  return {
    bladeBg: s.blade,
    flareBg: s.blade,
    cardBg: s.card,
    cardHover: s.hover,
    chipBg: s.hover,
    inputBg: s.card,
    border: `rgba(${a}, 0.14)`,
    borderStrong: `rgba(${a}, 0.26)`,
    divider: `rgba(${a}, 0.1)`,
    textPrimary: s.text,
    textSecondary: `rgba(${t}, 0.74)`,
    textTertiary: `rgba(${t}, 0.54)`,
    accent: s.accent,
    accentGlow: `rgba(${a}, 0.34)`,
    pillBg: s.hover,
    pillActiveBg: s.accent,
    pillActiveFg: s.onAccent,
    bladeShadow: `12px 0 36px rgba(${t}, 0.16), 0 0 1px 1px rgba(${a}, 0.14)`,
    stageWallpaper: s.wallpaper,
    stageWindowBg: 'rgba(255, 255, 255, 0.76)',
    stageWindowBar: `rgba(${a}, 0.1)`
  }
}

export const THEME_CATALOG: readonly ThemeDefinition[] = [
  {
    id: 'default',
    name: 'Obsidian',
    tagline: 'Original pure dark glass',
    dark: {
      bladeBg: '#0a0a0d',
      flareBg: '#000000',
      cardBg: '#141414',
      cardHover: '#1c1c1c',
      chipBg: '#141414',
      inputBg: '#141414',
      border: 'rgba(255, 255, 255, 0.08)',
      borderStrong: 'rgba(255, 255, 255, 0.14)',
      divider: 'rgba(255, 255, 255, 0.08)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.78)',
      textTertiary: 'rgba(255, 255, 255, 0.58)',
      accent: '#8b5cf6',
      accentGlow: 'rgba(139, 92, 246, 0.55)',
      pillBg: '#141414',
      pillActiveBg: '#ffffff',
      pillActiveFg: '#000000',
      bladeShadow: '14px 0 40px rgba(0, 0, 0, 0.75), 0 0 1px 1px rgba(255, 255, 255, 0.08)',
      stageWallpaper: 'linear-gradient(135deg, #161822 0%, #0d0f17 55%, #1c162b 100%)',
      stageWindowBg: 'rgba(255, 255, 255, 0.05)',
      stageWindowBar: 'rgba(255, 255, 255, 0.09)'
    },
    light: {
      bladeBg: '#f4f5f7',
      flareBg: '#f4f5f7',
      cardBg: '#ffffff',
      cardHover: '#ebedf2',
      chipBg: '#e8ebf0',
      inputBg: '#ffffff',
      border: 'rgba(15, 23, 42, 0.09)',
      borderStrong: 'rgba(15, 23, 42, 0.16)',
      divider: 'rgba(15, 23, 42, 0.08)',
      textPrimary: '#111318',
      textSecondary: 'rgba(17, 19, 24, 0.72)',
      textTertiary: 'rgba(17, 19, 24, 0.52)',
      accent: '#6d28d9',
      accentGlow: 'rgba(109, 40, 217, 0.35)',
      pillBg: '#e8ebf0',
      pillActiveBg: '#111318',
      pillActiveFg: '#ffffff',
      bladeShadow: '12px 0 36px rgba(15, 23, 42, 0.18), 0 0 1px 1px rgba(15, 23, 42, 0.09)',
      stageWallpaper: 'linear-gradient(135deg, #dbe4f3 0%, #edf1f8 55%, #e4def7 100%)',
      stageWindowBg: 'rgba(255, 255, 255, 0.72)',
      stageWindowBar: 'rgba(15, 23, 42, 0.07)'
    }
  },
  {
    id: 'midnight-ocean',
    name: 'Midnight Ocean',
    tagline: 'Deep navy & electric cyan',
    dark: {
      bladeBg: '#07111f',
      flareBg: '#07111f',
      cardBg: '#0e1d33',
      cardHover: '#152a47',
      chipBg: '#0e1d33',
      inputBg: '#0c192c',
      border: 'rgba(56, 189, 248, 0.16)',
      borderStrong: 'rgba(56, 189, 248, 0.28)',
      divider: 'rgba(56, 189, 248, 0.12)',
      textPrimary: '#f0f9ff',
      textSecondary: 'rgba(224, 242, 254, 0.8)',
      textTertiary: 'rgba(186, 230, 253, 0.6)',
      accent: '#38bdf8',
      accentGlow: 'rgba(56, 189, 248, 0.55)',
      pillBg: '#0e1d33',
      pillActiveBg: '#38bdf8',
      pillActiveFg: '#04121f',
      bladeShadow: '14px 0 42px rgba(2, 12, 27, 0.8), 0 0 1px 1px rgba(56, 189, 248, 0.18)',
      stageWallpaper: 'linear-gradient(135deg, #07192f 0%, #0b2948 55%, #071324 100%)',
      stageWindowBg: 'rgba(56, 189, 248, 0.08)',
      stageWindowBar: 'rgba(56, 189, 248, 0.14)'
    },
    light: {
      bladeBg: '#eef6fc',
      flareBg: '#eef6fc',
      cardBg: '#ffffff',
      cardHover: '#dff0fb',
      chipBg: '#dcecf8',
      inputBg: '#ffffff',
      border: 'rgba(2, 132, 199, 0.14)',
      borderStrong: 'rgba(2, 132, 199, 0.26)',
      divider: 'rgba(2, 132, 199, 0.1)',
      textPrimary: '#0c2238',
      textSecondary: 'rgba(12, 34, 56, 0.74)',
      textTertiary: 'rgba(12, 34, 56, 0.54)',
      accent: '#0284c7',
      accentGlow: 'rgba(2, 132, 199, 0.35)',
      pillBg: '#dcecf8',
      pillActiveBg: '#0284c7',
      pillActiveFg: '#ffffff',
      bladeShadow: '12px 0 36px rgba(12, 74, 110, 0.16), 0 0 1px 1px rgba(2, 132, 199, 0.14)',
      stageWallpaper: 'linear-gradient(135deg, #c7e6fb 0%, #e6f4fe 55%, #bae6fd 100%)',
      stageWindowBg: 'rgba(255, 255, 255, 0.78)',
      stageWindowBar: 'rgba(2, 132, 199, 0.1)'
    }
  },
  {
    id: 'emerald-glass',
    name: 'Emerald Glass',
    tagline: 'Forest obsidian & mint glow',
    dark: {
      bladeBg: '#061511',
      flareBg: '#061511',
      cardBg: '#0d231d',
      cardHover: '#14332a',
      chipBg: '#0d231d',
      inputBg: '#0b1e19',
      border: 'rgba(52, 211, 153, 0.16)',
      borderStrong: 'rgba(52, 211, 153, 0.28)',
      divider: 'rgba(52, 211, 153, 0.12)',
      textPrimary: '#ecfdf5',
      textSecondary: 'rgba(209, 250, 229, 0.8)',
      textTertiary: 'rgba(167, 243, 208, 0.58)',
      accent: '#34d399',
      accentGlow: 'rgba(52, 211, 153, 0.5)',
      pillBg: '#0d231d',
      pillActiveBg: '#34d399',
      pillActiveFg: '#032016',
      bladeShadow: '14px 0 42px rgba(2, 20, 14, 0.8), 0 0 1px 1px rgba(52, 211, 153, 0.18)',
      stageWallpaper: 'linear-gradient(135deg, #062119 0%, #0a3326 55%, #051612 100%)',
      stageWindowBg: 'rgba(52, 211, 153, 0.08)',
      stageWindowBar: 'rgba(52, 211, 153, 0.14)'
    },
    light: {
      bladeBg: '#edf8f3',
      flareBg: '#edf8f3',
      cardBg: '#ffffff',
      cardHover: '#dcf2e8',
      chipBg: '#d7efe4',
      inputBg: '#ffffff',
      border: 'rgba(5, 150, 105, 0.14)',
      borderStrong: 'rgba(5, 150, 105, 0.25)',
      divider: 'rgba(5, 150, 105, 0.1)',
      textPrimary: '#08261c',
      textSecondary: 'rgba(8, 38, 28, 0.74)',
      textTertiary: 'rgba(8, 38, 28, 0.54)',
      accent: '#059669',
      accentGlow: 'rgba(5, 150, 105, 0.35)',
      pillBg: '#d7efe4',
      pillActiveBg: '#059669',
      pillActiveFg: '#ffffff',
      bladeShadow: '12px 0 36px rgba(6, 78, 59, 0.15), 0 0 1px 1px rgba(5, 150, 105, 0.14)',
      stageWallpaper: 'linear-gradient(135deg, #c6f0dd 0%, #e7f8f0 55%, #a7f3d0 100%)',
      stageWindowBg: 'rgba(255, 255, 255, 0.78)',
      stageWindowBar: 'rgba(5, 150, 105, 0.1)'
    }
  },
  {
    id: 'sunset-amber',
    name: 'Amber Dusk',
    tagline: 'Warm charcoal & golden amber',
    dark: {
      bladeBg: '#140f0a',
      flareBg: '#140f0a',
      cardBg: '#221a12',
      cardHover: '#302419',
      chipBg: '#221a12',
      inputBg: '#1d160f',
      border: 'rgba(245, 158, 11, 0.18)',
      borderStrong: 'rgba(245, 158, 11, 0.3)',
      divider: 'rgba(245, 158, 11, 0.12)',
      textPrimary: '#fffbeb',
      textSecondary: 'rgba(254, 243, 199, 0.8)',
      textTertiary: 'rgba(253, 230, 138, 0.58)',
      accent: '#f59e0b',
      accentGlow: 'rgba(245, 158, 11, 0.5)',
      pillBg: '#221a12',
      pillActiveBg: '#f59e0b',
      pillActiveFg: '#1f1203',
      bladeShadow: '14px 0 42px rgba(20, 12, 4, 0.82), 0 0 1px 1px rgba(245, 158, 11, 0.18)',
      stageWallpaper: 'linear-gradient(135deg, #24180b 0%, #3a240e 55%, #181009 100%)',
      stageWindowBg: 'rgba(245, 158, 11, 0.08)',
      stageWindowBar: 'rgba(245, 158, 11, 0.15)'
    },
    light: {
      bladeBg: '#faf5ee',
      flareBg: '#faf5ee',
      cardBg: '#ffffff',
      cardHover: '#f4eadc',
      chipBg: '#f1e5d3',
      inputBg: '#ffffff',
      border: 'rgba(217, 119, 6, 0.16)',
      borderStrong: 'rgba(217, 119, 6, 0.28)',
      divider: 'rgba(217, 119, 6, 0.1)',
      textPrimary: '#261808',
      textSecondary: 'rgba(38, 24, 8, 0.74)',
      textTertiary: 'rgba(38, 24, 8, 0.54)',
      accent: '#d97706',
      accentGlow: 'rgba(217, 119, 6, 0.35)',
      pillBg: '#f1e5d3',
      pillActiveBg: '#d97706',
      pillActiveFg: '#ffffff',
      bladeShadow: '12px 0 36px rgba(120, 53, 15, 0.15), 0 0 1px 1px rgba(217, 119, 6, 0.14)',
      stageWallpaper: 'linear-gradient(135deg, #fde6c4 0%, #fcf4e8 55%, #fed7aa 100%)',
      stageWindowBg: 'rgba(255, 255, 255, 0.78)',
      stageWindowBar: 'rgba(217, 119, 6, 0.1)'
    }
  },
  {
    id: 'rose-velvet',
    name: 'Rose Velvet',
    tagline: 'Deep plum & soft rose accent',
    dark: {
      bladeBg: '#140b12',
      flareBg: '#140b12',
      cardBg: '#22131f',
      cardHover: '#311b2c',
      chipBg: '#22131f',
      inputBg: '#1d101a',
      border: 'rgba(244, 114, 182, 0.18)',
      borderStrong: 'rgba(244, 114, 182, 0.3)',
      divider: 'rgba(244, 114, 182, 0.12)',
      textPrimary: '#fdf2f8',
      textSecondary: 'rgba(252, 231, 243, 0.8)',
      textTertiary: 'rgba(251, 207, 232, 0.58)',
      accent: '#f472b6',
      accentGlow: 'rgba(244, 114, 182, 0.52)',
      pillBg: '#22131f',
      pillActiveBg: '#f472b6',
      pillActiveFg: '#220614',
      bladeShadow: '14px 0 42px rgba(22, 6, 18, 0.82), 0 0 1px 1px rgba(244, 114, 182, 0.18)',
      stageWallpaper: 'linear-gradient(135deg, #261022 0%, #3b1734 55%, #160a14 100%)',
      stageWindowBg: 'rgba(244, 114, 182, 0.08)',
      stageWindowBar: 'rgba(244, 114, 182, 0.15)'
    },
    light: {
      bladeBg: '#fbf1f6',
      flareBg: '#fbf1f6',
      cardBg: '#ffffff',
      cardHover: '#f5e1ec',
      chipBg: '#f2dce8',
      inputBg: '#ffffff',
      border: 'rgba(219, 39, 119, 0.14)',
      borderStrong: 'rgba(219, 39, 119, 0.26)',
      divider: 'rgba(219, 39, 119, 0.1)',
      textPrimary: '#290c1c',
      textSecondary: 'rgba(41, 12, 28, 0.74)',
      textTertiary: 'rgba(41, 12, 28, 0.54)',
      accent: '#db2777',
      accentGlow: 'rgba(219, 39, 119, 0.35)',
      pillBg: '#f2dce8',
      pillActiveBg: '#db2777',
      pillActiveFg: '#ffffff',
      bladeShadow: '12px 0 36px rgba(131, 24, 67, 0.14), 0 0 1px 1px rgba(219, 39, 119, 0.14)',
      stageWallpaper: 'linear-gradient(135deg, #fbcfe8 0%, #fdf2f8 55%, #f5d0fe 100%)',
      stageWindowBg: 'rgba(255, 255, 255, 0.78)',
      stageWindowBar: 'rgba(219, 39, 119, 0.1)'
    }
  },
  {
    id: 'nordic-frost',
    name: 'Nordic Frost',
    tagline: 'Arctic slate & crisp indigo',
    dark: {
      bladeBg: '#0d1118',
      flareBg: '#0d1118',
      cardBg: '#161d28',
      cardHover: '#1f2938',
      chipBg: '#161d28',
      inputBg: '#131923',
      border: 'rgba(129, 140, 248, 0.18)',
      borderStrong: 'rgba(129, 140, 248, 0.3)',
      divider: 'rgba(129, 140, 248, 0.12)',
      textPrimary: '#eef2ff',
      textSecondary: 'rgba(224, 231, 255, 0.8)',
      textTertiary: 'rgba(199, 210, 254, 0.58)',
      accent: '#818cf8',
      accentGlow: 'rgba(129, 140, 248, 0.52)',
      pillBg: '#161d28',
      pillActiveBg: '#818cf8',
      pillActiveFg: '#0c0f24',
      bladeShadow: '14px 0 42px rgba(7, 10, 20, 0.82), 0 0 1px 1px rgba(129, 140, 248, 0.18)',
      stageWallpaper: 'linear-gradient(135deg, #131b2b 0%, #1d2740 55%, #0e131e 100%)',
      stageWindowBg: 'rgba(129, 140, 248, 0.08)',
      stageWindowBar: 'rgba(129, 140, 248, 0.15)'
    },
    light: {
      bladeBg: '#f1f4fa',
      flareBg: '#f1f4fa',
      cardBg: '#ffffff',
      cardHover: '#e3e9f5',
      chipBg: '#dfe6f4',
      inputBg: '#ffffff',
      border: 'rgba(79, 70, 229, 0.14)',
      borderStrong: 'rgba(79, 70, 229, 0.26)',
      divider: 'rgba(79, 70, 229, 0.1)',
      textPrimary: '#11162a',
      textSecondary: 'rgba(17, 22, 42, 0.74)',
      textTertiary: 'rgba(17, 22, 42, 0.54)',
      accent: '#4f46e5',
      accentGlow: 'rgba(79, 70, 229, 0.35)',
      pillBg: '#dfe6f4',
      pillActiveBg: '#4f46e5',
      pillActiveFg: '#ffffff',
      bladeShadow: '12px 0 36px rgba(30, 27, 75, 0.14), 0 0 1px 1px rgba(79, 70, 229, 0.14)',
      stageWallpaper: 'linear-gradient(135deg, #c7d2fe 0%, #eef2ff 55%, #ddd6fe 100%)',
      stageWindowBg: 'rgba(255, 255, 255, 0.78)',
      stageWindowBar: 'rgba(79, 70, 229, 0.1)'
    }
  },
{
      id: 'crimson-noir',
      name: 'Crimson Noir',
      tagline: 'Ink black & ruby red',
      dark: darkFrom({ blade: '#0d0809', card: '#1a1012', hover: '#24161a', text: '#fff1f2', accent: '#f43f5e', onAccent: '#ffffff', wallpaper: 'linear-gradient(135deg, #1f0a10 0%, #120709 55%, #2a0d16 100%)' }),
      light: lightFrom({ blade: '#fbf3f4', card: '#ffffff', hover: '#f6e3e6', text: '#2a0d14', accent: '#e11d48', onAccent: '#ffffff', wallpaper: 'linear-gradient(135deg, #fecdd3 0%, #fff1f2 55%, #fbcfe8 100%)' })
    },
    {
      id: 'cyber-lime',
      name: 'Cyber Lime',
      tagline: 'Terminal black & neon lime',
      dark: darkFrom({ blade: '#080b07', card: '#11160f', hover: '#192115', text: '#f0fdf4', accent: '#a3e635', onAccent: '#0b1406', wallpaper: 'linear-gradient(135deg, #0f1a0a 0%, #070b06 55%, #132412 100%)' }),
      light: lightFrom({ blade: '#f5f9ef', card: '#ffffff', hover: '#e8f2da', text: '#14200b', accent: '#4d7c0f', onAccent: '#ffffff', wallpaper: 'linear-gradient(135deg, #d9f99d 0%, #f7fee7 55%, #bbf7d0 100%)' })
    },
    {
      id: 'lavender-haze',
      name: 'Lavender Haze',
      tagline: 'Soft lilac & dusky violet',
      dark: darkFrom({ blade: '#100d18', card: '#1a1626', hover: '#241e34', text: '#f5f3ff', accent: '#c4b5fd', onAccent: '#1e1538', wallpaper: 'linear-gradient(135deg, #1e1636 0%, #110d1c 55%, #2a1c3f 100%)' }),
      light: lightFrom({ blade: '#f6f3fd', card: '#ffffff', hover: '#ebe5fa', text: '#1e1538', accent: '#7c3aed', onAccent: '#ffffff', wallpaper: 'linear-gradient(135deg, #ddd6fe 0%, #f5f3ff 55%, #fae8ff 100%)' })
    },
    {
      id: 'mocha-latte',
      name: 'Mocha Latte',
      tagline: 'Roasted coffee & warm cream',
      dark: darkFrom({ blade: '#120d0a', card: '#1e1612', hover: '#2a1f19', text: '#fdf4ec', accent: '#d4a373', onAccent: '#24170d', wallpaper: 'linear-gradient(135deg, #2a1c13 0%, #150f0b 55%, #33241a 100%)' }),
      light: lightFrom({ blade: '#faf4ec', card: '#fffdf9', hover: '#f1e6d8', text: '#2b1d12', accent: '#9c6644', onAccent: '#ffffff', wallpaper: 'linear-gradient(135deg, #ede0d4 0%, #faf4ec 55%, #e6ccb2 100%)' })
    },
    {
      id: 'graphite',
      name: 'Graphite',
      tagline: 'Neutral gray & clean blue',
      dark: darkFrom({ blade: '#111214', card: '#1b1d21', hover: '#25282d', text: '#f4f5f7', accent: '#60a5fa', onAccent: '#08162b', wallpaper: 'linear-gradient(135deg, #1d2026 0%, #111214 55%, #24272e 100%)' }),
      light: lightFrom({ blade: '#f3f4f6', card: '#ffffff', hover: '#e5e7eb', text: '#111827', accent: '#2563eb', onAccent: '#ffffff', wallpaper: 'linear-gradient(135deg, #e5e7eb 0%, #f9fafb 55%, #dbeafe 100%)' })
    }
] as const

export function getThemeDefinition(preset: ThemePreset = 'default'): ThemeDefinition {
  return THEME_CATALOG.find((t) => t.id === preset) ?? THEME_CATALOG[0]
}

export function resolveColorMode(mode: ColorMode = 'dark'): 'dark' | 'light' {
  if (mode === 'light' || mode === 'dark') return mode
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return 'dark'
}

export function getThemePalette(preset: ThemePreset = 'default', mode: ColorMode = 'dark'): {
  resolvedMode: 'dark' | 'light'
  palette: ThemePalette
  def: ThemeDefinition
} {
  const def = getThemeDefinition(preset)
  const resolvedMode = resolveColorMode(mode)
  return { resolvedMode, palette: def[resolvedMode], def }
}

/** Apply theme preset + color mode (and an optional #rrggbb accent override) to documentElement. */
export function applyTheme(preset: ThemePreset = 'default', mode: ColorMode = 'dark', accentOverride = ''): 'dark' | 'light' {
  if (typeof document === 'undefined') return 'dark'
  const { resolvedMode, palette } = getThemePalette(preset, mode)
  const root = document.documentElement

  root.dataset.theme = resolvedMode
  root.dataset.themePreset = preset
  root.classList.toggle('dark', resolvedMode === 'dark')
  root.classList.toggle('light', resolvedMode === 'light')

  root.style.setProperty('--blade-bg', palette.bladeBg)
  root.style.setProperty('--flare-bg', palette.flareBg)
  root.style.setProperty('--bg-0', palette.flareBg)
  root.style.setProperty('--bg-1', palette.bladeBg)
  root.style.setProperty('--bg-2', palette.cardBg)
  root.style.setProperty('--bg-3', palette.cardHover)
  root.style.setProperty('--bg-card', palette.cardBg)
  root.style.setProperty('--bg-card-hover', palette.cardHover)
  root.style.setProperty('--bg-chip', palette.chipBg)
  root.style.setProperty('--input-bg', palette.inputBg)
  root.style.setProperty('--edge-light', palette.border)
  root.style.setProperty('--edge-strong', palette.borderStrong)
  root.style.setProperty('--divider', palette.divider)
  root.style.setProperty('--text-primary', palette.textPrimary)
  root.style.setProperty('--text-secondary', palette.textSecondary)
  root.style.setProperty('--text-tertiary', palette.textTertiary)
  const accent = /^#[0-9a-f]{6}$/i.test(accentOverride) ? accentOverride : ''
  root.style.setProperty('--accent', accent || palette.accent)
  root.style.setProperty('--accent-glow', accent ? `rgba(${rgb(accent)}, ${resolvedMode === 'dark' ? 0.52 : 0.34})` : palette.accentGlow)
  root.style.setProperty('--pill-bg', palette.pillBg)
  root.style.setProperty('--pill-active-bg', palette.pillActiveBg)
  root.style.setProperty('--pill-active-fg', palette.pillActiveFg)
  root.style.setProperty('--blade-shadow', palette.bladeShadow)

  return resolvedMode
}

/** Corner radii per style; 'rounded' clears the overrides so tokens.css (the original look) applies. */
const CORNERS: Record<CornerStyle, { blade: string; card: string } | null> = {
  rounded: null,
  soft: { blade: '16px', card: '12px' },
  sharp: { blade: '8px', card: '6px' }
}

export function applyCornerStyle(style: CornerStyle = 'rounded'): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const c = CORNERS[style] ?? null
  root.dataset.corners = style
  if (!c) {
    root.style.removeProperty('--radius-blade')
    root.style.removeProperty('--radius-card')
    return
  }
  root.style.setProperty('--radius-blade', c.blade)
  root.style.setProperty('--radius-card', c.card)
}

/** Listen for OS prefers-color-scheme changes (used when colorMode === 'system'). */
export function subscribeSystemColorMode(onChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return () => {}
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  media.addEventListener?.('change', onChange)
  return () => media.removeEventListener?.('change', onChange)
}

/** Apply reduce-motion preference as a data attribute the CSS can key off. */
export function applyReduceMotion(reduce: boolean): void {
  document.documentElement.dataset.motion = reduce ? 'reduce' : 'full'
}

/** i18n key segment for a theme id (themes.<segment>.name / .tagline). */
export const themeKey = (id: string): string => id.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())
