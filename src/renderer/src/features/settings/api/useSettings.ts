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
import { initializeFonts, CustomFont } from '@renderer/utils/fontUtils'

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: Settings = {
  primaryAccountId: null,
  allowMultipleInstances: false,
  defaultInstallationPath: null,
  accentColor: DEFAULT_ACCENT_COLOR,
  showSidebarProfileCard: true,
  sidebarTabOrder: DEFAULT_SIDEBAR_TAB_ORDER,
  sidebarHiddenTabs: [],
  pinCode: null
}

// ============================================================================
// Basic Queries
// ============================================================================

// Fetch all settings
export function useSettings() {
  return useQuery({
    queryKey: queryKeys.settings.snapshot(),
    queryFn: async () => {
      const data = await window.api.getSettings()
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_SETTINGS,
        ...data,
        accentColor: data?.accentColor || DEFAULT_ACCENT_COLOR,
        showSidebarProfileCard: data?.showSidebarProfileCard ?? true,
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
    if (settings.accentColor) {
      applyAccentColor(settings.accentColor)
    }
  }, [settings.accentColor])

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
