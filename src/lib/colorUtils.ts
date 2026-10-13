/**
 * Color detection, parsing, and WCAG/perceptual contrast calculations.
 * Used to transform copied color codes into physical swatch cards.
 */

export interface ColorInfo {
  cssColor: string
  displayText: string
  secondaryText: string
  isLight: boolean
  r: number
  g: number
  b: number
  a: number
}

const HEX_RE = /^#([0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/
const RGB_COMMA_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*([\d.]+)\s*)?\)$/i
const RGB_SPACE_RE = /^rgba?\(\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})(?:\s*\/\s*([\d.]+%?)\s*)?\)$/i
const HSL_COMMA_RE = /^hsla?\(\s*(\d{1,3}(?:deg)?)\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*([\d.]+)\s*)?\)$/i
const HSL_SPACE_RE = /^hsla?\(\s*(\d{1,3}(?:deg)?)\s+(\d{1,3})%\s+(\d{1,3})%(?:\s*\/\s*([\d.]+%?)\s*)?\)$/i

function clamp(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}

function toHex2(n: number): string {
  const h = Math.round(clamp(n, 0, 255)).toString(16)
  return h.length === 1 ? '0' + h : h
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = (((h % 360) + 360) % 360) / 360
  s = clamp(s, 0, 100) / 100
  l = clamp(l, 0, 100) / 100

  if (s === 0) {
    const val = Math.round(l * 255)
    return [val, val, val]
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q

  const hue2rgb = (t: number) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }

  return [
    Math.round(hue2rgb(h + 1 / 3) * 255),
    Math.round(hue2rgb(h) * 255),
    Math.round(hue2rgb(h - 1 / 3) * 255)
  ]
}

export function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r = clamp(r, 0, 255) / 255
  g = clamp(g, 0, 255) / 255
  b = clamp(b, 0, 255) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0
  let s = 0
  const l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0)
        break
      case g:
        h = (b - r) / d + 2
        break
      case b:
        h = (r - g) / d + 4
        break
    }
    h /= 6
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

export type ColorFormat = 'hex' | 'rgb' | 'hsl'

export function formatColorAsHex(r: number, g: number, b: number, a = 1): string {
  const base = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`
  return a < 1 ? `${base}${toHex2(Math.round(a * 255))}` : base
}

export function formatColorAsRgb(r: number, g: number, b: number, a = 1): string {
  if (a < 1) {
    const alphaStr = Math.round(a * 100) / 100
    return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${alphaStr})`
  }
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
}

export function formatColorAsHsl(r: number, g: number, b: number, a = 1): string {
  const [h, s, l] = rgbToHsl(r, g, b)
  if (a < 1) {
    const alphaStr = Math.round(a * 100) / 100
    return `hsla(${h}, ${s}%, ${l}%, ${alphaStr})`
  }
  return `hsl(${h}, ${s}%, ${l}%)`
}

export function detectColorFormat(raw: string): ColorFormat {
  const str = raw.trim().toLowerCase()
  if (str.startsWith('#')) return 'hex'
  if (str.startsWith('rgb')) return 'rgb'
  if (str.startsWith('hsl')) return 'hsl'
  return 'hex'
}

export interface ColorFormats {
  hex: string
  rgb: string
  hsl: string
  activeFormat: ColorFormat
}

export function getColorFormats(color: ColorInfo): ColorFormats {
  const activeFormat = detectColorFormat(color.displayText)
  return {
    hex: formatColorAsHex(color.r, color.g, color.b, color.a),
    rgb: formatColorAsRgb(color.r, color.g, color.b, color.a),
    hsl: formatColorAsHsl(color.r, color.g, color.b, color.a),
    activeFormat
  }
}

export function cycleColorFormat(currentRaw: string): { nextText: string; format: ColorFormat } {
  const info = parseColor(currentRaw)
  if (!info) return { nextText: currentRaw, format: 'hex' }

  const formats = getColorFormats(info)
  if (formats.activeFormat === 'hex') {
    return { nextText: formats.rgb, format: 'rgb' }
  } else if (formats.activeFormat === 'rgb') {
    return { nextText: formats.hsl, format: 'hsl' }
  } else {
    return { nextText: formats.hex, format: 'hex' }
  }
}

/**
 * Attempts to parse a string as a recognized color code (hex, rgb, rgba, hsl, hsla).
 * Returns null if the string is not a pure color code.
 */
export function parseColor(raw: string): ColorInfo | null {
  if (!raw || typeof raw !== 'string') return null
  const str = raw.trim()

  // 1. Hex: #rgb, #rgba, #rrggbb, #rrggbbaa
  const hexMatch = str.match(HEX_RE)
  if (hexMatch) {
    const body = hexMatch[1]
    let r = 0, g = 0, b = 0, a = 1
    if (body.length === 3) {
      r = parseInt(body[0] + body[0], 16)
      g = parseInt(body[1] + body[1], 16)
      b = parseInt(body[2] + body[2], 16)
    } else if (body.length === 4) {
      r = parseInt(body[0] + body[0], 16)
      g = parseInt(body[1] + body[1], 16)
      b = parseInt(body[2] + body[2], 16)
      a = parseInt(body[3] + body[3], 16) / 255
    } else if (body.length === 6) {
      r = parseInt(body.slice(0, 2), 16)
      g = parseInt(body.slice(2, 4), 16)
      b = parseInt(body.slice(4, 6), 16)
    } else if (body.length === 8) {
      r = parseInt(body.slice(0, 2), 16)
      g = parseInt(body.slice(2, 4), 16)
      b = parseInt(body.slice(4, 6), 16)
      a = parseInt(body.slice(6, 8), 16) / 255
    }

    const perceived = (r * 299 + g * 587 + b * 114) / 1000
    // Account for alpha blend over dark app surface (~20)
    const effectiveBrightness = perceived * a + 20 * (1 - a)
    const isLight = effectiveBrightness >= 140

    const secondaryText = a < 1
      ? `rgba(${r}, ${g}, ${b}, ${Math.round(a * 100) / 100})`
      : `rgb(${r}, ${g}, ${b})`

    return {
      cssColor: str,
      displayText: str,
      secondaryText,
      isLight,
      r, g, b, a
    }
  }

  // 2. RGB / RGBA: comma or modern space syntax
  const rgbMatch = str.match(RGB_COMMA_RE) || str.match(RGB_SPACE_RE)
  if (rgbMatch) {
    const r = clamp(parseInt(rgbMatch[1], 10), 0, 255)
    const g = clamp(parseInt(rgbMatch[2], 10), 0, 255)
    const b = clamp(parseInt(rgbMatch[3], 10), 0, 255)
    let a = 1
    if (rgbMatch[4] != null) {
      if (rgbMatch[4].endsWith('%')) {
        a = clamp(parseFloat(rgbMatch[4]) / 100, 0, 1)
      } else {
        a = clamp(parseFloat(rgbMatch[4]), 0, 1)
      }
    }

    const perceived = (r * 299 + g * 587 + b * 114) / 1000
    const effectiveBrightness = perceived * a + 20 * (1 - a)
    const isLight = effectiveBrightness >= 140

    const hex = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}${a < 1 ? toHex2(Math.round(a * 255)) : ''}`

    return {
      cssColor: str,
      displayText: str,
      secondaryText: hex,
      isLight,
      r, g, b, a
    }
  }

  // 3. HSL / HSLA: comma or modern space syntax
  const hslMatch = str.match(HSL_COMMA_RE) || str.match(HSL_SPACE_RE)
  if (hslMatch) {
    const h = parseInt(hslMatch[1].replace('deg', ''), 10)
    const s = parseInt(hslMatch[2], 10)
    const l = parseInt(hslMatch[3], 10)
    let a = 1
    if (hslMatch[4] != null) {
      if (hslMatch[4].endsWith('%')) {
        a = clamp(parseFloat(hslMatch[4]) / 100, 0, 1)
      } else {
        a = clamp(parseFloat(hslMatch[4]), 0, 1)
      }
    }

    const [r, g, b] = hslToRgb(h, s, l)
    const perceived = (r * 299 + g * 587 + b * 114) / 1000
    const effectiveBrightness = perceived * a + 20 * (1 - a)
    const isLight = effectiveBrightness >= 140

    const hex = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}${a < 1 ? toHex2(Math.round(a * 255)) : ''}`

    return {
      cssColor: str,
      displayText: str,
      secondaryText: hex,
      isLight,
      r, g, b, a
    }
  }

  return null
}
