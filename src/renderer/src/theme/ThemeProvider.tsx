import React, { useEffect, useMemo, useState } from 'react'
import { applyTheme, availableThemes, ThemeName } from './theme'
import { ThemePreference } from '../types'
import { ThemeContext } from './ThemeContext'

interface ThemeProviderProps {
  initialTheme?: ThemePreference
  children: React.ReactNode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  initialTheme = 'system',
  children
}) => {
  const getSystemTheme = () => {
    if (typeof window === 'undefined' || !window.matchMedia) return 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  const [themePreference, setThemePreference] = useState<ThemePreference>(initialTheme)
  const [systemTheme, setSystemTheme] = useState<ThemeName>(() => getSystemTheme())

  const resolvedThemeName: ThemeName = themePreference === 'system' ? systemTheme : themePreference

  const theme = useMemo(
    () => availableThemes[resolvedThemeName] ?? availableThemes.dark,
    [resolvedThemeName]
  )

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (event: MediaQueryListEvent) =>
      setSystemTheme(event.matches ? 'dark' : 'light')
    mql.addEventListener('change', handleChange)
    return () => mql.removeEventListener('change', handleChange)
  }, [])

  const value = useMemo(
    () => ({
      theme,
      themeName: resolvedThemeName,
      themePreference,
      setTheme: setThemePreference
    }),
    [theme, resolvedThemeName, themePreference]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
