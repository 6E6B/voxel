import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, useMemo, useCallback } from 'react'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import {
  ResellerItem,
  AssetDetails,
  resellersResponseSchema,
  PurchaseCatalogResult,
  purchaseCatalogResultSchema
} from '@shared/contracts/avatar'
import { useBatchUserAvatars } from './useBatchQueries'
import { robloxGet } from '@renderer/shared/lib/robloxApi'

// ============================================================================
// Asset Resellers Infinite Query
// ============================================================================

interface UseAssetResellersQueryOptions {
  collectibleItemId: string | null | undefined
  isLimited: boolean
  enabled?: boolean
}

export function useAssetResellersQuery({
  collectibleItemId,
  isLimited,
  enabled = true
}: UseAssetResellersQueryOptions) {
  const queryClient = useQueryClient()

  const query = useInfiniteQuery({
    queryKey: queryKeys.assets.resellers(collectibleItemId || ''),
    queryFn: async ({ pageParam }) => {
      if (!collectibleItemId) throw new Error('Missing collectibleItemId')

      let url = `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/resellers?limit=100`
      if (pageParam) url += `&cursor=${pageParam}`

      const response = await robloxGet(resellersResponseSchema, url)

      return {
        data: (response.data || []) as ResellerItem[],
        nextPageCursor: response.nextPageCursor || null
      }
    },
    initialPageParam: '' as string,
    getNextPageParam: (lastPage) => lastPage.nextPageCursor || undefined,
    enabled: enabled && isLimited && !!collectibleItemId,
    staleTime: 15 * 1000, // 15 seconds - resellers can change quickly
    gcTime: 5 * 60 * 1000
  })

  // Flatten pages into single array
  const resellers = useMemo(() => {
    return query.data?.pages.flatMap((page) => page.data) || []
  }, [query.data])

  // Extract unique seller IDs for batch fetching
  const sellerIds = useMemo(() => {
    return [...new Set(resellers.map((r) => r.seller.sellerId))]
  }, [resellers])

  // Use TanStack Query for batch avatar fetching - handles caching & deduplication
  const { avatars: avatarData } = useBatchUserAvatars({
    userIds: sellerIds,
    enabled: sellerIds.length > 0
  })

  // Convert to Map for backwards compatibility
  const resellerAvatars = useMemo(() => {
    const map = new Map<number, string>()
    Object.entries(avatarData).forEach(([id, url]) => {
      if (url) map.set(Number(id), url)
    })
    return map
  }, [avatarData])

  const refetchResellers = useCallback(() => {
    if (collectibleItemId) {
      queryClient.invalidateQueries({
        queryKey: queryKeys.assets.resellers(collectibleItemId)
      })
    }
  }, [collectibleItemId, queryClient])

  return {
    resellers,
    resellersLoading: query.isLoading,
    resellerAvatars,
    resellersCursor: query.hasNextPage ? 'has-more' : null,
    loadingMoreResellers: query.isFetchingNextPage,
    loadMoreResellers: query.fetchNextPage,
    hasNextPage: query.hasNextPage,
    refetchResellers
  }
}

// ============================================================================
// Purchase Limited Item Mutation
// ============================================================================

interface PurchaseResellerParams {
  cookie: string
  price: number
  sellerId: number
  collectibleProductId: string
  userId?: string
}

export function usePurchaseLimitedItem(
  collectibleItemId: string | null | undefined,
  assetId: number | null | undefined
) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      cookie,
      price,
      sellerId,
      collectibleProductId,
      userId
    }: PurchaseResellerParams) => {
      if (!collectibleItemId) {
        throw new Error('Missing collectible item id')
      }

      const response = await window.api.purchaseCatalogItem(
        cookie,
        collectibleItemId,
        price,
        sellerId,
        collectibleProductId,
        userId,
        crypto.randomUUID()
      )

      return purchaseCatalogResultSchema.parse(response)
    },
    onSuccess: (result) => {
      if (!result.purchased) {
        return
      }

      if (collectibleItemId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assets.resellers(collectibleItemId)
        })
      }

      if (assetId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.assets.details(assetId)
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.assets.owners(assetId)
        })
        queryClient.invalidateQueries({
          queryKey: queryKeys.assets.resaleData(assetId)
        })
      }
    }
  })
}

// ============================================================================
// Convenience Hook (matches original interface)
// ============================================================================

interface UseAssetResellersResult {
  resellers: ResellerItem[]
  resellersLoading: boolean
  resellerAvatars: Map<number, string>
  purchasingReseller: string | null
  resellersCursor: string | null
  loadingMoreResellers: boolean
  handleBuyReseller: (reseller: ResellerItem) => Promise<PurchaseCatalogResult>
  loadMoreResellers: () => Promise<void>
  setPurchasingReseller: (id: string | null) => void
}

export function useAssetResellersWithPurchase(
  details: AssetDetails | null,
  account: { cookie: string; userId?: string | null } | null
): UseAssetResellersResult {
  const [purchasingReseller, setPurchasingReseller] = useState<string | null>(null)

  const isLimited = !!(details?.isLimited || details?.isLimitedUnique)
  const collectibleItemId = details?.collectibleItemId

  const resellersQuery = useAssetResellersQuery({
    collectibleItemId,
    isLimited,
    enabled: !!collectibleItemId
  })

  const purchaseMutation = usePurchaseLimitedItem(collectibleItemId, details?.id)

  const handleBuyReseller = useCallback(
    async (reseller: ResellerItem) => {
      if (!account?.cookie || !details?.collectibleItemId) {
        throw new Error('Missing purchase session or collectible item id')
      }

      setPurchasingReseller(reseller.collectibleProductId)

      try {
        return await purchaseMutation.mutateAsync({
          cookie: account.cookie,
          price: reseller.price,
          sellerId: reseller.seller.sellerId,
          collectibleProductId: reseller.collectibleProductId,
          userId: account.userId || undefined
        })
      } finally {
        setPurchasingReseller(null)
      }
    },
    [account?.cookie, account?.userId, details?.collectibleItemId, purchaseMutation]
  )

  return {
    resellers: resellersQuery.resellers,
    resellersLoading: resellersQuery.resellersLoading,
    resellerAvatars: resellersQuery.resellerAvatars,
    purchasingReseller,
    resellersCursor: resellersQuery.resellersCursor,
    loadingMoreResellers: resellersQuery.loadingMoreResellers,
    handleBuyReseller,
    loadMoreResellers: async () => {
      await resellersQuery.loadMoreResellers()
    },
    setPurchasingReseller
  }
}
