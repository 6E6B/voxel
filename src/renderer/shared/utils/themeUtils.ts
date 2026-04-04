import { DEFAULT_ACCENT_COLOR } from '@renderer/shared/types'

const HEX_COLOR_REGEX = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/

const hexToRgb = (hex: string): [number, number, number] => {
  let normalized = hex.replace('#', '')
  if (normalized.length === 3) {
    normalized = normalized
      .split('')
      .map((char) => char + char)
      .join('')
  }

  const value = parseInt(normalized, 16)
  const r = (value >> 16) & 255
  const g = (value >> 8) & 255
  const b = value & 255
  return [r, g, b]
}

const getContrastColor = (r: number, g: number, b: number): string => {
  const [rs, gs, bs] = [r, g, b].map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  })

  const luminance = 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

export const sanitizeAccentColor = (value?: string | null): string => {
  if (!value) return DEFAULT_ACCENT_COLOR
  const trimmed = value.trim()
  return HEX_COLOR_REGEX.test(trimmed) ? trimmed : DEFAULT_ACCENT_COLOR
}

export const applyAccentColor = (value?: string | null): void => {
  if (typeof document === 'undefined') return
  const color = sanitizeAccentColor(value)
  const [r, g, b] = hexToRgb(color)

  const root = document.documentElement
  root.style.setProperty('--accent-color', color)
  root.style.setProperty('--accent-color-rgb', `${r}, ${g}, ${b}`)
  root.style.setProperty('--accent-color-foreground', getContrastColor(r, g, b))
  root.style.setProperty('--accent-color-muted', `rgba(${r}, ${g}, ${b}, 0.9)`)
  root.style.setProperty('--accent-color-border', `rgba(${r}, ${g}, ${b}, 0.35)`)
  root.style.setProperty('--accent-color-soft', `rgba(${r}, ${g}, ${b}, 0.15)`)
  root.style.setProperty('--accent-color-faint', `rgba(${r}, ${g}, ${b}, 0.08)`)
  root.style.setProperty('--accent-color-ring', `rgba(${r}, ${g}, ${b}, 0.12)`)
  root.style.setProperty('--accent-color-shadow', `rgba(${r}, ${g}, ${b}, 0)`)
}
