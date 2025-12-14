import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { queryKeys } from '../../../../../shared/queryKeys'
import { Settings, DEFAULT_ACCENT_COLOR } from '@renderer/types'
import {
  DEFAULT_SIDEBAR_TAB_ORDER,
  sanitizeSidebarHidden,
  sanitizeSidebarOrder
} from '@shared/navigation'
import { applyAccentColor } from '@renderer/utils/themeUtils'
import { applyTint, getCurrentThemeNameFromDom } from '@renderer/theme/theme'
import { initializeFonts, CustomFont } from '@renderer/utils/fontUtils'

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: Settings = {
  primaryAccountId: null,
  allowMultipleInstances: false,
  defaultInstallationPath: null,
  accentColor: DEFAULT_ACCENT_COLOR,
  useDynamicAccentColor: false,
  theme: 'system',
  tint: 'neutral',
  showSidebarProfileCard: true,
  privacyMode: false,
  sidebarTabOrder: DEFAULT_SIDEBAR_TAB_ORDER,
  sidebarHiddenTabs: [],
  pinCode: null
}

const LEGACY_DEFAULT_ACCENT_COLORS = ['#1e66f5', '#3b82f6', '#2563eb']

// ============================================================================
// Basic Queries
// ============================================================================

// Fetch all settings
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.snapshot(),
    queryFn: async () => {
      const data = await window.api.getSettings()

      const rawAccent = typeof data?.accentColor === 'string' ? data.accentColor.trim() : ''
      const accentColor = !rawAccent
        ? DEFAULT_ACCENT_COLOR
        : LEGACY_DEFAULT_ACCENT_COLORS.includes(rawAccent.toLowerCase())
          ? DEFAULT_ACCENT_COLOR
          : rawAccent

      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_SETTINGS,
        ...data,
        accentColor,
        useDynamicAccentColor: data?.useDynamicAccentColor ?? false,
        theme: (data?.theme as Settings['theme']) || 'system',
        tint: (data?.tint as Settings['tint']) || 'neutral',
        showSidebarProfileCard: data?.showSidebarProfileCard ?? true,
        privacyMode: data?.privacyMode ?? false,
        sidebarTabOrder: sanitizeSidebarOrder(data?.sidebarTabOrder),
        sidebarHiddenTabs: sanitizeSidebarHidden(data?.sidebarHiddenTabs)
      }
    },
    staleTime: Infinity // Settings are managed locally
  })
}

// Update settings mutation (optimistic)
export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: Partial<Settings>) => window.api.setSettings(settings),
    onMutate: async (newSettings) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.settings.snapshot() })

      // Snapshot previous value
      const previousSettings = queryClient.getQueryData<Settings>(queryKeys.settings.snapshot())

      // Optimistically update
      queryClient.setQueryData(queryKeys.settings.snapshot(), (old: Settings | undefined) => ({
        ...DEFAULT_SETTINGS,
        ...old,
        ...newSettings
      }))

      return { previousSettings }
    },
    onError: (_err, _newSettings, context) => {
      // Rollback on error
      if (context?.previousSettings) {
        queryClient.setQueryData(queryKeys.settings.snapshot(), context.previousSettings)
      }
    }
    // Don't invalidate - we manage the cache ourselves
  })
}

// ============================================================================
// Settings Manager Hook (Single Source of Truth)
// ============================================================================

/**
 * Hook that provides settings data and management functions.
 * Uses React Query as the single source of truth with optimistic updates.
 * Automatically applies accent color when it changes.
 */
export function useSettingsManager() {
  const { data: settings = DEFAULT_SETTINGS, isLoading } = useSettings()
  const updateSettingsMutation = useUpdateSettings()

  // Apply accent color when settings change
  useEffect(() => {
    if (settings.accentColor && !settings.useDynamicAccentColor) {
      applyAccentColor(settings.accentColor)
    }
  }, [settings.accentColor, settings.useDynamicAccentColor])

  useEffect(() => {
    if (typeof document === 'undefined') return
    const tint = settings.tint || 'neutral'
    document.documentElement.dataset.tint = tint
    applyTint(getCurrentThemeNameFromDom(), tint)
  }, [settings.tint])

  // Persist one-time migrations so the UI (and future sessions) match.
  useEffect(() => {
    const raw =
      typeof settings.accentColor === 'string' ? settings.accentColor.trim().toLowerCase() : ''
    if (raw && LEGACY_DEFAULT_ACCENT_COLORS.includes(raw) && raw !== DEFAULT_ACCENT_COLOR) {
      updateSettingsMutation.mutate({ accentColor: DEFAULT_ACCENT_COLOR })
    }
  }, [settings.accentColor, updateSettingsMutation])

  // Initialize custom fonts on first load
  useEffect(() => {
    const loadFonts = async () => {
      try {
        const [customFonts, activeFont] = await Promise.all([
          window.api.getCustomFonts(),
          window.api.getActiveFont()
        ])
        await initializeFonts(customFonts as CustomFont[], activeFont)
      } catch (error) {
        console.error('Failed to initialize fonts:', error)
      }
    }
    loadFonts()
  }, []) // Only run once on mount

  // Update settings (partial, optimistic)
  const updateSettings = useCallback(
    (newSettings: Partial<Settings>) => {
      updateSettingsMutation.mutate(newSettings)
    },
    [updateSettingsMutation]
  )

  return {
    settings,
    isLoading,
    updateSettings
  }
}

// ============================================================================
// Individual Setting Hooks (for granular subscriptions)
// ============================================================================

// Sidebar width
export function useSidebarWidth() {
  return useQuery({
    queryKey: queryKeys.settings.sidebarWidth(),
    queryFn: () => window.api.getSidebarWidth(),
    staleTime: Infinity
  })
}

export function useSetSidebarWidth() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (width: number) => window.api.setSidebarWidth(width),
    onSuccess: (_data, width) => {
      queryClient.setQueryData(queryKeys.settings.sidebarWidth(), width)
    }
  })
}

// Accounts view mode
export function useAccountsViewMode() {
  return useQuery({
    queryKey: queryKeys.settings.accountsViewMode(),
    queryFn: () => window.api.getAccountsViewMode(),
    staleTime: Infinity
  })
}

export function useSetAccountsViewMode() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (mode: 'list' | 'grid') => window.api.setAccountsViewMode(mode),
    onSuccess: (_data, mode) => {
      queryClient.setQueryData(queryKeys.settings.accountsViewMode(), mode)
    }
  })
}

// Avatar render width
export function useAvatarRenderWidth() {
  return useQuery({
    queryKey: queryKeys.settings.avatarRenderWidth(),
    queryFn: () => window.api.getAvatarRenderWidth(),
    staleTime: Infinity
  })
}

export function useSetAvatarRenderWidth() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (width: number) => window.api.setAvatarRenderWidth(width),
    onSuccess: (_data, width) => {
      queryClient.setQueryData(queryKeys.settings.avatarRenderWidth(), width)
    }
  })
}
