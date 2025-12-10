import { ThemePreference } from '../types'
import { applyAccentColor } from '../utils/themeUtils'

export type ThemeName = 'dark' | 'light'

type ThemeColors = {
  appBackground: string
  surface: string
  surfaceStrong: string
  surfaceMuted: string
  surfaceHover: string
  border: string
  borderStrong: string
  borderSubtle: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  mutedBackground: string
  focusRing: string
  shadowLg: string
  accent: string
  accentHover: string
  success: string
  error: string
}

export type ThemeDefinition = {
  name: ThemeName
  colors: ThemeColors
  radii: {
    md: string
    lg: string
    xl: string
    pill: string
  }
}

const commonRadii = {
  md: '6px',
  lg: '10px',
  xl: '14px',
  pill: '999px'
}

const themes: Record<ThemeName, ThemeDefinition> = {
  dark: {
    name: 'dark',
    colors: {
      appBackground: '#0c0c10',
      surface: '#0c0c10',
      surfaceStrong: '#111118',
      surfaceMuted: '#15151d',
      surfaceHover: '#1b1b23',
      border: '#1f1f26',
      borderStrong: '#292933',
      borderSubtle: 'rgba(255, 255, 255, 0.06)',
      textPrimary: '#f6f7fb',
      textSecondary: '#d6d8e0',
      textMuted: '#9ea3b3',
      mutedBackground: 'rgba(255, 255, 255, 0.02)',
      focusRing: 'rgba(255, 255, 255, 0.14)',
      shadowLg: '0 24px 72px rgba(0, 0, 0, 0.45)',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      success: '#22c55e',
      error: '#ef4444'
    },
    radii: commonRadii
  },
  light: {
    name: 'light',
    colors: {
      appBackground: '#f5f7fb',
      surface: '#ffffff',
      surfaceStrong: '#f8f9fb',
      surfaceMuted: '#f0f2f7',
      surfaceHover: '#eaedf5',
      border: '#dce1eb',
      borderStrong: '#c8d0e0',
      borderSubtle: 'rgba(15, 23, 42, 0.08)',
      textPrimary: '#0f172a',
      textSecondary: '#1f2937',
      textMuted: '#4b5563',
      mutedBackground: '#e5e7eb',
      focusRing: 'rgba(59, 130, 246, 0.35)',
      shadowLg: '0 20px 60px rgba(15, 23, 42, 0.1)',
      accent: '#3b82f6',
      accentHover: '#2563eb',
      success: '#22c55e',
      error: '#ef4444'
    },
    radii: commonRadii
  }
}

const setCssVariable = (key: string, value: string) => {
  if (typeof document === 'undefined') return
  document.documentElement.style.setProperty(key, value)
}

export const applyTheme = (theme: ThemeDefinition) => {
  const { colors, radii } = theme
  setCssVariable('--color-app-bg', colors.appBackground)
  setCssVariable('--color-surface', colors.surface)
  setCssVariable('--color-surface-strong', colors.surfaceStrong)
  setCssVariable('--color-surface-muted', colors.surfaceMuted)
  setCssVariable('--color-surface-hover', colors.surfaceHover)
  setCssVariable('--color-border', colors.border)
  setCssVariable('--color-border-strong', colors.borderStrong)
  setCssVariable('--color-border-subtle', colors.borderSubtle)
  setCssVariable('--color-text-primary', colors.textPrimary)
  setCssVariable('--color-text-secondary', colors.textSecondary)
  setCssVariable('--color-text-muted', colors.textMuted)
  setCssVariable('--color-muted-bg', colors.mutedBackground)
  setCssVariable('--focus-ring', colors.focusRing)
  setCssVariable('--shadow-lg', colors.shadowLg)
  setCssVariable('--color-accent', colors.accent)
  setCssVariable('--color-accent-hover', colors.accentHover)
  setCssVariable('--color-success', colors.success)
  setCssVariable('--color-error', colors.error)

  applyAccentColor(colors.accent)

  setCssVariable('--radius-md', radii.md)
  setCssVariable('--radius-lg', radii.lg)
  setCssVariable('--radius-xl', radii.xl)
  setCssVariable('--radius-pill', radii.pill)

  document.documentElement.dataset.theme = theme.name
}

export const getTheme = (name: ThemeName = 'dark'): ThemeDefinition => themes[name]

export const availableThemes = themes

export type { ThemePreference }
