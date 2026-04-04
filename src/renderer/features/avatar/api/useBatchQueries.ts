import { useQuery } from '@tanstack/react-query'
import { useEffect, useState, useMemo } from 'react'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import { thumbnailBatchSchema } from '@shared/contracts/avatar'

// ============================================================================
// Batch Thumbnails Query Hook
// ============================================================================

interface UseBatchThumbnailsOptions {
  assetIds: number[]
  enabled?: boolean
}

/**
 * Fetches thumbnails for a batch of asset IDs using TanStack Query.
 * Handles caching, deduplication, and automatic retries.
 */
export function useBatchThumbnails({ assetIds, enabled = true }: UseBatchThumbnailsOptions) {
  // Sort IDs to ensure stable query key
  const sortedIds = useMemo(() => [...assetIds].sort((a, b) => a - b), [assetIds])

  const query = useQuery({
    queryKey: queryKeys.batch.thumbnails(sortedIds),
    queryFn: async () => {
      if (sortedIds.length === 0) return {}

      const response = await (window as any).api.getBatchThumbnails(sortedIds)

      // Validate with Zod schema
      const parsed = thumbnailBatchSchema.safeParse(response)
      if (!parsed.success) {
        console.warn('[useBatchThumbnails] Validation warning:', parsed.error.issues)
      }

      // Transform response into a map
      const thumbnailMap: Record<number, string> = {}
      if (response.data) {
        response.data.forEach((t: any) => {
          if (t.imageUrl) {
            thumbnailMap[t.targetId] = t.imageUrl
          }
        })
      }

      return thumbnailMap
    },
    enabled: enabled && sortedIds.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000 // 30 minutes garbage collection
  })

  return {
    thumbnails: query.data || {},
    isLoading: query.isLoading,
    error: query.error
  }
}

// ============================================================================
// Batch User Avatars Query Hook
// ============================================================================

interface UseBatchUserAvatarsOptions {
  userIds: number[]
  enabled?: boolean
}

/**
 * Fetches avatar headshots for a batch of user IDs using TanStack Query.
 */
export function useBatchUserAvatars({ userIds, enabled = true }: UseBatchUserAvatarsOptions) {
  // Sort IDs to ensure stable query key
  const sortedIds = useMemo(() => [...userIds].sort((a, b) => a - b), [userIds])

  const query = useQuery({
    queryKey: queryKeys.batch.userAvatars(sortedIds),
    queryFn: async () => {
      if (sortedIds.length === 0) return {}

      const response = await (window as any).api.getBatchUserAvatars(sortedIds)

      // Response is already a map of userId -> url
      return response as Record<number, string | null>
    },
    enabled: enabled && sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  })

  return {
    avatars: query.data || {},
    isLoading: query.isLoading,
    error: query.error
  }
}

// ============================================================================
// Batch User Details Query Hook
// ============================================================================

interface UseBatchUserDetailsOptions {
  userIds: number[]
  enabled?: boolean
}

interface BatchUserDetail {
  id: number
  name: string
  displayName: string
}

/**
 * Fetches user details for a batch of user IDs using TanStack Query.
 */
export function useBatchUserDetails({ userIds, enabled = true }: UseBatchUserDetailsOptions) {
  // Sort IDs to ensure stable query key
  const sortedIds = useMemo(() => [...userIds].sort((a, b) => a - b), [userIds])

  const query = useQuery({
    queryKey: queryKeys.batch.userDetails(sortedIds),
    queryFn: async () => {
      if (sortedIds.length === 0) return {}

      const response = await (window as any).api.getBatchUserDetails(sortedIds)

      // Response is already a map of userId -> user details
      return response as Record<number, BatchUserDetail | null>
    },
    enabled: enabled && sortedIds.length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 30 * 60 * 1000
  })

  return {
    users: query.data || {},
    isLoading: query.isLoading,
    error: query.error
  }
}

// ============================================================================
// Combined Hook for Owner/Reseller Lists (progressive loading)
// ============================================================================

interface UseProgressiveThumbnailsOptions {
  ids: number[]
  batchSize?: number
  enabled?: boolean
}

/**
 * Progressively loads thumbnails for a list of IDs in batches.
 * Useful for large lists where you want to show thumbnails as they load.
 */
export function useProgressiveThumbnails({
  ids,
  batchSize = 20,
  enabled = true
}: UseProgressiveThumbnailsOptions) {
  const [thumbnails, setThumbnails] = useState<Map<number, string>>(new Map())
  const [loadedBatches, setLoadedBatches] = useState<Set<string>>(new Set())

  // Get unique IDs that haven't been loaded
  const uniqueIds = useMemo(() => {
    return [...new Set(ids)].filter((id) => !thumbnails.has(id))
  }, [ids, thumbnails])

  // Create batch key for tracking
  const batchKey = uniqueIds
    .slice(0, batchSize)
    .sort((a, b) => a - b)
    .join(',')

  useEffect(() => {
    if (!enabled || uniqueIds.length === 0 || loadedBatches.has(batchKey)) {
      return
    }

    const idsToFetch = uniqueIds.slice(0, batchSize)

    setLoadedBatches((prev) => new Set(prev).add(batchKey))
      ; (window as any).api
        .getBatchThumbnails(idsToFetch)
        .then((res: any) => {
          if (res.data) {
            setThumbnails((prev) => {
              const newMap = new Map(prev)
              res.data.forEach((t: any) => {
                if (t.imageUrl) newMap.set(t.targetId, t.imageUrl)
              })
              return newMap
            })
          }
        })
        .catch((err: any) => {
          console.error('Failed to fetch batch thumbnails:', err)
          // Remove from loaded batches so it can retry
          setLoadedBatches((prev) => {
            const newSet = new Set(prev)
            newSet.delete(batchKey)
            return newSet
          })
        })
  }, [enabled, uniqueIds, batchSize, batchKey, loadedBatches])

  return {
    thumbnails,
    pendingCount: uniqueIds.length
  }
}
