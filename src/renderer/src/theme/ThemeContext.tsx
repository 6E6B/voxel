import { createContext, useContext } from 'react'
import { getTheme, ThemeDefinition, ThemeName } from './theme'
import { ThemePreference } from '../types'

export type ThemeContextValue = {
  theme: ThemeDefinition
  themeName: ThemeName
  themePreference: ThemePreference
  setTheme: (name: ThemePreference) => void
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: getTheme('dark'),
  themeName: 'dark',
  themePreference: 'system',
  setTheme: () => {}
})

export const useTheme = () => useContext(ThemeContext)
