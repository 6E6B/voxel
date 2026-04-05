import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useEffect, useMemo } from 'react'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import { InventoryPage } from '@shared/contracts/avatar'
import { useInventoryStore } from './useInventoryStore'

export interface UseInventoryV2Params {
  cookie: string | undefined
  userId: number | undefined
  assetTypes: string[]
  sortOrder?: 'Asc' | 'Desc'
  limit?: number
  enabled?: boolean
}

export function useInventoryV2({
  cookie,
  userId,
  assetTypes,
  sortOrder = 'Desc',
  limit = 100,
  enabled = true
}: UseInventoryV2Params) {
  return useInfiniteQuery({
    queryKey: queryKeys.inventory.v2(cookie || '', userId || 0, assetTypes, sortOrder),
    queryFn: async ({ pageParam }): Promise<InventoryPage> => {
      if (!cookie || !userId) {
        return { previousPageCursor: null, nextPageCursor: null, data: [] }
      }

      const result = await window.api.getInventoryV2(
        cookie,
        userId,
        assetTypes,
        pageParam as string | undefined,
        limit,
        sortOrder
      )

      return result
    },
    enabled: enabled && !!cookie && !!userId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor || undefined,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}

export function useInventoryV2SinglePage({
  cookie,
  userId,
  assetTypes,
  sortOrder = 'Desc',
  limit = 100,
  enabled = true
}: UseInventoryV2Params) {
  return useQuery({
    queryKey: queryKeys.inventory.v2(cookie || '', userId || 0, assetTypes, sortOrder),
    queryFn: async (): Promise<InventoryPage> => {
      if (!cookie || !userId) {
        return { previousPageCursor: null, nextPageCursor: null, data: [] }
      }

      return await window.api.getInventoryV2(
        cookie,
        userId,
        assetTypes,
        undefined,
        limit,
        sortOrder
      )
    },
    enabled: enabled && !!cookie && !!userId,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}

/**
 * Hook to fetch and cache thumbnails for inventory items
 * Uses zustand store for persistent cache and react-query for fetching
 */
export function useInventoryThumbnails(assetIds: number[], enabled = true) {
  const thumbnails = useInventoryStore((state) => state.thumbnails)
  const setThumbnails = useInventoryStore((state) => state.setThumbnails)
  const markAsFetched = useInventoryStore((state) => state.markAsFetched)
  const fetchedIds = useInventoryStore((state) => state.fetchedIds)

  // Filter out IDs we already have or have attempted to fetch
  const missingIds = useMemo(() => {
    return assetIds.filter((id) => thumbnails[id] === undefined && !fetchedIds.has(id))
  }, [assetIds, thumbnails, fetchedIds])

  // Sort for stable query key
  const sortedMissingIds = useMemo(() => [...missingIds].sort((a, b) => a - b), [missingIds])

  const query = useQuery({
    queryKey: queryKeys.inventory.thumbnails(sortedMissingIds),
    queryFn: async () => {
      if (sortedMissingIds.length === 0) return {}

      try {
        const result = await window.api.getBatchThumbnails(sortedMissingIds, 'Asset')
        const newThumbnails: Record<number, string> = {}

        result.data.forEach((thumb: { targetId: number; imageUrl: string | null }) => {
          if (thumb.imageUrl) {
            newThumbnails[thumb.targetId] = thumb.imageUrl
          }
        })

        return newThumbnails
      } catch (error) {
        console.error('Failed to fetch inventory thumbnails:', error)
        throw error
      }
    },
    enabled: enabled && sortedMissingIds.length > 0,
    staleTime: Infinity, // Thumbnails don't change
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * Math.pow(2, attemptIndex), 5000)
  })

  // Sync fetched thumbnails to zustand store
  useEffect(() => {
    if (query.data && Object.keys(query.data).length > 0) {
      setThumbnails(query.data)
    }
    // Mark IDs as fetched regardless of result (to prevent re-fetching failures)
    if (query.isSuccess || query.isError) {
      if (sortedMissingIds.length > 0) {
        markAsFetched(sortedMissingIds)
      }
    }
  }, [query.data, query.isSuccess, query.isError, sortedMissingIds, setThumbnails, markAsFetched])

  return {
    thumbnails,
    isLoading: query.isLoading,
    error: query.error
  }
}

