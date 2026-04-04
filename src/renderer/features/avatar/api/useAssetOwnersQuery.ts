import { useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import { AssetOwner, AssetDetails, assetOwnersResponseSchema } from '@shared/contracts/avatar'
import { useBatchUserAvatars, useBatchUserDetails } from './useBatchQueries'
import { robloxGet } from '@renderer/shared/lib/robloxApi'

// ============================================================================
// Asset Owners Infinite Query
// ============================================================================

interface UseAssetOwnersQueryOptions {
  assetId: number | null
  cookie: string | undefined
  isLimited: boolean
  enabled?: boolean
}

export function useAssetOwnersQuery({
  assetId,
  cookie,
  isLimited,
  enabled = true
}: UseAssetOwnersQueryOptions) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.assets.owners(assetId || 0),
    queryFn: async ({ pageParam }) => {
      if (!assetId || !cookie) throw new Error('Missing assetId or cookie')

      let url = `https://inventory.roblox.com/v2/assets/${assetId}/owners?limit=100&sortOrder=Asc`
      if (pageParam) url += `&cursor=${pageParam}`

      const response = await robloxGet(assetOwnersResponseSchema, url, { cookie })

      // Filter to only valid owners
      const validOwners = (response.data || []).filter((o: AssetOwner) => o.owner && o.owner.id)

      return {
        data: validOwners as AssetOwner[],
        nextPageCursor: response.nextPageCursor || null
      }
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor || undefined,
    enabled: enabled && isLimited && !!assetId && !!cookie,
    staleTime: 30 * 1000, // 30 seconds - owners can change frequently for traded items
    gcTime: 5 * 60 * 1000
  })

  // Flatten pages into single array
  const owners = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.data) || []
  }, [query.data])

  // Extract unique owner IDs for batch fetching
  const ownerUserIds = useMemo(() => {
    return [...new Set(owners.map((o) => o.owner!.id))]
  }, [owners])

  // IDs of owners that don't have names in the response
  const ownerIdsWithoutNames = useMemo(() => {
    return [...new Set(owners.filter((o) => !o.owner?.name).map((o) => o.owner!.id))]
  }, [owners])

  // Use TanStack Query hooks for batch fetching - handles caching & deduplication
  const { avatars: avatarData } = useBatchUserAvatars({
    userIds: ownerUserIds,
    enabled: ownerUserIds.length > 0
  })

  const { users: userData } = useBatchUserDetails({
    userIds: ownerIdsWithoutNames,
    enabled: ownerIdsWithoutNames.length > 0
  })

  // Convert to Maps for backwards compatibility
  const ownerAvatars = useMemo(() => {
    const map = new Map<number, string>()
    Object.entries(avatarData).forEach(([id, url]) => {
      if (url) map.set(Number(id), url)
    })
    return map
  }, [avatarData])

  const ownerNames = useMemo(() => {
    const map = new Map<number, string>()
    Object.entries(userData).forEach(([id, user]) => {
      if (user && (user.name || user.displayName)) {
        map.set(Number(id), user.name || user.displayName)
      }
    })
    return map
  }, [userData])

  return {
    owners,
    ownersLoading: query.isLoading,
    ownerAvatars,
    ownerNames,
    ownersCursor: query.hasNextPage ? 'has-more' : null,
    loadingMoreOwners: query.isFetchingNextPage,
    loadMoreOwners: query.fetchNextPage,
    hasNextPage: query.hasNextPage
  }
}

// ============================================================================
// Convenience Hook (matches original interface)
// ============================================================================

interface UseAssetOwnersResult {
  owners: AssetOwner[]
  ownersLoading: boolean
  ownerAvatars: Map<number, string>
  ownerNames: Map<number, string>
  ownersCursor: string | null
  loadingMoreOwners: boolean
  loadMoreOwners: () => Promise<void>
}

export function useAssetOwnersWithDetails(
  details: AssetDetails | null,
  currentAssetId: number | null,
  account: { cookie: string } | null
): UseAssetOwnersResult {
  const isLimited = !!(details?.isLimited || details?.isLimitedUnique)

  const result = useAssetOwnersQuery({
    assetId: currentAssetId,
    cookie: account?.cookie,
    isLimited,
    enabled: !!currentAssetId && !!account?.cookie
  })

  return {
    owners: result.owners,
    ownersLoading: result.ownersLoading,
    ownerAvatars: result.ownerAvatars,
    ownerNames: result.ownerNames,
    ownersCursor: result.ownersCursor,
    loadingMoreOwners: result.loadingMoreOwners,
    loadMoreOwners: async () => {
      await result.loadMoreOwners()
    }
  }
}
