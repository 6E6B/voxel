import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { queryKeys } from '../../../../../shared/queryKeys'
import type {
  CatalogCategory,
  CatalogItemsSearchParams,
  CatalogItemsSearchResponse
} from '@renderer/ipc/windowApi'

export function useCatalogNavigation() {
  return useQuery({
    queryKey: queryKeys.catalog.navigation(),
    queryFn: () => window.api.getCatalogNavigation() as Promise<CatalogCategory[]>,
    staleTime: 60 * 60 * 1000, // Categories don't change often - 1 hour
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })
}

export function useCatalogSearch(params: CatalogItemsSearchParams, enabled = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.catalog.search(params as Record<string, unknown>),
    queryFn: async ({ pageParam }) => {
      const searchParams = {
        ...params,
        cursor: pageParam || undefined,
        limit: params.limit || 120
      }
      return window.api.searchCatalogItems(searchParams) as Promise<CatalogItemsSearchResponse>
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor || undefined,
    enabled,
    retry: (failureCount, error: any) => {
      // Retry up to 3 times for rate limit errors (429)
      if (error?.statusCode === 429 || error?.message?.includes('429')) {
        return failureCount < 3
      }
      return false
    },
    retryDelay: (attemptIndex, error: any) => {
      // Use retry-after header if available, otherwise exponential backoff
      const retryAfter = error?.headers?.['retry-after']
      if (retryAfter) {
        return parseInt(retryAfter, 10) * 1000
      }
      // Exponential backoff: 2s, 4s, 8s
      return Math.min(1000 * Math.pow(2, attemptIndex + 1), 8000)
    },
    staleTime: 2 * 60 * 1000, // Keep data warm for tab switches
    gcTime: 10 * 60 * 1000, // Drop from cache after 10 minutes unused
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })
}

import { useCatalogStore, useSetCatalogThumbnails } from '../stores/useCatalogStore'

export function useCatalogThumbnails(
  items: Array<{ id: number; itemType: string }>,
  enabled = true
) {
  const thumbnails = useCatalogStore((state) => state.thumbnails)
  const setThumbnails = useSetCatalogThumbnails()

  const itemsNeedingThumbnails = items.filter((item) => thumbnails[item.id] === undefined)
  const idsToFetch = itemsNeedingThumbnails.map((i) => i.id).sort((a, b) => a - b)

  const shouldFetch = enabled && itemsNeedingThumbnails.length > 0

  const query = useQuery({
    // Include the IDs in the query key so it refetches when the list of missing items changes
    queryKey: queryKeys.catalog.thumbnails(idsToFetch),
    queryFn: async () => {
      if (itemsNeedingThumbnails.length === 0) return {}

      try {
        const result = await window.api.getCatalogThumbnails(
          itemsNeedingThumbnails.map((item) => ({ id: item.id, itemType: item.itemType }))
        )
        return result
      } catch (error) {
        console.error('Failed to fetch thumbnails', error)
        throw error
      }
    },
    enabled: shouldFetch,
    staleTime: Infinity, // Once fetched, we consider it valid forever (or until app restart)
    gcTime: 10 * 60 * 1000 // Garbage collect after 10 mins if unused
  })

  if (query.data && !query.isFetching) {
    const hasNewData = Object.entries(query.data).some(
      ([id, url]) => thumbnails[parseInt(id)] !== url
    )

    const returnedIds = Object.keys(query.data).map(Number)
    const missingIds = idsToFetch.filter((id) => !returnedIds.includes(id))
    const hasMissingIds = missingIds.some((id) => thumbnails[id] !== '')

    if (hasNewData || hasMissingIds) {
      // Queue the update in a microtask/useEffect to avoid "cannot update during render"
      // But here we are in a hook, so a useEffect is appropriate
    }
  }

  useEffect(() => {
    if (query.data) {
      const newThumbnails: Record<number, string> = {}
      const returnedIds = Object.keys(query.data).map(Number)

      Object.entries(query.data).forEach(([id, url]) => {
        // Only update if different (avoid unnecessary state updates)
        if (thumbnails[parseInt(id)] !== url) {
          newThumbnails[parseInt(id)] = url
        }
      })

      idsToFetch.forEach((id) => {
        if (!returnedIds.includes(id) && thumbnails[id] !== '') {
          newThumbnails[id] = ''
        }
      })

      if (Object.keys(newThumbnails).length > 0) {
        setThumbnails({ ...thumbnails, ...newThumbnails })
      }
    } else if (query.isError) {
      const failedThumbnails: Record<number, string> = {}
      let hasUpdates = false
      idsToFetch.forEach((id) => {
        if (thumbnails[id] !== '') {
          failedThumbnails[id] = ''
          hasUpdates = true
        }
      })
      if (hasUpdates) {
        setThumbnails({ ...thumbnails, ...failedThumbnails })
      }
    }
  }, [query.data, query.isError, idsToFetch.join(','), setThumbnails]) // Depend on the IDs string to ensure stable effect

  return query
}

export function useCatalogSearchSuggestions(prefix: string) {
  return useQuery({
    queryKey: queryKeys.catalog.suggestions(prefix),
    queryFn: () => window.api.getCatalogSearchSuggestions(prefix),
    enabled: prefix.length >= 2,
    staleTime: 5 * 60 * 1000 // 5 minutes
  })
}
