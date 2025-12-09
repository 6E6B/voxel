import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect } from 'react'
import { queryKeys } from '../../../../../shared/queryKeys'
import { Account } from '@renderer/types'
import { mapPresenceToStatus, isActiveStatus } from '@renderer/utils/statusUtils'
import { useActiveTab } from '@renderer/stores/useUIStore'

// ============================================================================
// Basic Queries
// ============================================================================

// Fetch accounts list
export function useAccounts() {
  return useQuery({
    queryKey: queryKeys.accounts.list(),
    queryFn: () => window.api.getAccounts(),
    staleTime: Infinity // Accounts are managed locally, don't refetch
  })
}

// Fetch account stats
export function useAccountStats(cookie: string | undefined) {
  return useQuery({
    queryKey: queryKeys.accounts.stats(cookie || ''),
    queryFn: () => window.api.fetchAccountStats(cookie!),
    enabled: !!cookie,
    staleTime: 60 * 1000, // 1 minute
    refetchInterval: 60 * 1000, // keep robux balance fresh for selected profile
    refetchOnWindowFocus: false
  })
}

// ============================================================================
// Mutations with Optimistic Updates
// ============================================================================

// Save accounts mutation (optimistic)
export function useSaveAccounts() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (accounts: Account[]) => window.api.saveAccounts(accounts),
    onMutate: async (newAccounts) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.accounts.list() })

      // Snapshot previous value
      const previousAccounts = queryClient.getQueryData<Account[]>(queryKeys.accounts.list())

      // Optimistically update
      queryClient.setQueryData(queryKeys.accounts.list(), newAccounts)

      return { previousAccounts }
    },
    onError: (_err, _newAccounts, context) => {
      // Rollback on error
      if (context?.previousAccounts) {
        queryClient.setQueryData(queryKeys.accounts.list(), context.previousAccounts)
      }
    }
    // Don't invalidate - we manage the cache ourselves
  })
}

// ============================================================================
// Account Management Hook (Single Source of Truth)
// ============================================================================

/**
 * Hook that provides accounts data and management functions.
 * Uses React Query as the single source of truth with optimistic updates.
 */
export function useAccountsManager() {
  const queryClient = useQueryClient()
  const { data: accounts = [], isLoading } = useAccounts()
  const saveAccountsMutation = useSaveAccounts()

  // Update accounts (optimistic)
  const setAccounts = useCallback(
    (newAccountsOrUpdater: Account[] | ((prev: Account[]) => Account[])) => {
      const currentAccounts = queryClient.getQueryData<Account[]>(queryKeys.accounts.list()) || []
      const newAccounts =
        typeof newAccountsOrUpdater === 'function'
          ? newAccountsOrUpdater(currentAccounts)
          : newAccountsOrUpdater

      // Optimistically update cache immediately
      queryClient.setQueryData(queryKeys.accounts.list(), newAccounts)

      // Persist to storage
      saveAccountsMutation.mutate(newAccounts)
    },
    [queryClient, saveAccountsMutation]
  )

  // Add account
  const addAccount = useCallback(
    (account: Account) => {
      setAccounts((prev) => [...prev, account])
    },
    [setAccounts]
  )

  // Remove account
  const removeAccount = useCallback(
    (id: string) => {
      setAccounts((prev) => prev.filter((acc) => acc.id !== id))
    },
    [setAccounts]
  )

  // Update account
  const updateAccount = useCallback(
    (id: string, updates: Partial<Account>) => {
      setAccounts((prev) => prev.map((acc) => (acc.id === id ? { ...acc, ...updates } : acc)))
    },
    [setAccounts]
  )

  // Reorder accounts
  const moveAccount = useCallback(
    (fromId: string, toId: string) => {
      setAccounts((prev) => {
        const fromIndex = prev.findIndex((a) => a.id === fromId)
        const toIndex = prev.findIndex((a) => a.id === toId)

        if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return prev

        const newAccounts = [...prev]
        const [movedAccount] = newAccounts.splice(fromIndex, 1)
        newAccounts.splice(toIndex, 0, movedAccount)

        return newAccounts
      })
    },
    [setAccounts]
  )

  return {
    accounts,
    isLoading,
    setAccounts,
    addAccount,
    removeAccount,
    updateAccount,
    moveAccount
  }
}

// ============================================================================
// Status Polling
// ============================================================================

// Batch fetch account statuses (for polling)
export function useAccountStatuses(
  accounts: Account[],
  options?: {
    enabled?: boolean
    refetchInterval?: number
  }
) {
  const cookies = accounts.filter((acc) => acc.cookie).map((acc) => acc.cookie!)

  // Sort cookies to ensure stable query key regardless of account order
  const sortedCookies = [...cookies].sort()

  return useQuery({
    queryKey: queryKeys.accounts.statuses(sortedCookies),
    queryFn: () => window.api.getBatchAccountStatuses(cookies),
    enabled: cookies.length > 0 && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval ?? 5000,
    staleTime: 4000,
    // Prevent refetching when window regains focus (we have our own polling)
    refetchOnWindowFocus: false
  })
}

// Helper to update accounts with new statuses
export function updateAccountsWithStatuses(
  accounts: Account[],
  batchResults: Record<string, { userId: number; presence?: any } | null>
): { accounts: Account[]; hasChanges: boolean } {
  let hasChanges = false

  const updatedAccounts = accounts.map((acc) => {
    if (!acc.cookie) return acc

    const result = batchResults[acc.cookie]
    if (!result || !result.presence) return acc

    const statusData = result.presence
    const newStatus = mapPresenceToStatus(statusData.userPresenceType)
    const statusChanged = acc.status !== newStatus
    const isCurrentlyActive = isActiveStatus(newStatus)

    // Update lastActive whenever account is detected as active
    if (isCurrentlyActive) {
      hasChanges = true
      return { ...acc, status: newStatus, lastActive: new Date().toISOString() }
    }

    // Only update status if it changed
    if (statusChanged) {
      hasChanges = true
      return { ...acc, status: newStatus }
    }

    return acc
  })

  return { accounts: updatedAccounts, hasChanges }
}

/**
 * Hook that automatically polls and updates account statuses.
 * Uses TanStack Query's refetchInterval for built-in polling.
 */
export function useAccountStatusPolling() {
  const queryClient = useQueryClient()
  const activeTab = useActiveTab()

  // Get accounts directly from query cache to avoid dependency loop
  const accounts = queryClient.getQueryData<Account[]>(queryKeys.accounts.list()) || []

  // Determine polling interval based on active tab
  const pollInterval = activeTab === 'Accounts' ? 5000 : 3 * 60 * 1000

  // Use the existing useAccountStatuses hook with dynamic interval
  const { data: batchResults } = useAccountStatuses(accounts, {
    enabled: accounts.length > 0,
    refetchInterval: pollInterval
  })

  // Update accounts when status data changes
  // Only depend on batchResults to avoid infinite loops
  useEffect(() => {
    if (!batchResults) return

    // Get fresh accounts from cache inside the effect
    const currentAccounts = queryClient.getQueryData<Account[]>(queryKeys.accounts.list()) || []
    if (currentAccounts.length === 0) return

    const { accounts: updatedAccounts, hasChanges } = updateAccountsWithStatuses(
      currentAccounts,
      batchResults
    )

    if (hasChanges) {
      // Update cache directly without triggering save (status is transient)
      queryClient.setQueryData(queryKeys.accounts.list(), updatedAccounts)
    }
  }, [batchResults, queryClient])
}
