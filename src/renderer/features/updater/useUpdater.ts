import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEffect, useCallback } from 'react'
import type { UpdateState } from '@shared/contracts/updater'

export const updaterQueryKeys = {
  state: ['updater', 'state'] as const
}

export function useUpdaterState() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: updaterQueryKeys.state,
    queryFn: () => window.api.getUpdaterState(),
    staleTime: 30000, // 30 seconds
    refetchInterval: false
  })

  // Subscribe to real-time updates from main process
  useEffect(() => {
    const cleanup = window.api.onUpdaterStatus((state: UpdateState) => {
      queryClient.setQueryData(updaterQueryKeys.state, state)
    })

    return cleanup
  }, [queryClient])

  return query
}

export function useCheckForUpdates() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: () => window.api.checkForUpdates(),
    onSuccess: (state) => {
      queryClient.setQueryData(updaterQueryKeys.state, state)
    }
  })
}

export function useDownloadUpdate() {
  return useMutation({
    mutationFn: () => window.api.downloadUpdate()
  })
}

export function useInstallUpdate() {
  return useMutation({
    mutationFn: () => window.api.installUpdate()
  })
}

// Combined hook for common updater operations
export function useUpdater() {
  const state = useUpdaterState()
  const checkMutation = useCheckForUpdates()
  const downloadMutation = useDownloadUpdate()
  const installMutation = useInstallUpdate()

  const checkForUpdates = useCallback(() => {
    checkMutation.mutate()
  }, [checkMutation])

  const downloadUpdate = useCallback(() => {
    downloadMutation.mutate()
  }, [downloadMutation])

  const installUpdate = useCallback(() => {
    installMutation.mutate()
  }, [installMutation])

  return {
    state: state.data,
    isLoading: state.isLoading,
    isChecking: checkMutation.isPending || state.data?.status === 'checking',
    isDownloading: downloadMutation.isPending || state.data?.status === 'downloading',
    checkForUpdates,
    downloadUpdate,
    installUpdate
  }
}

