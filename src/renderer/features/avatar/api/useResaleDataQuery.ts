import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import { resaleDataSchema } from '@shared/contracts/avatar'
import { robloxGet } from '@renderer/shared/lib/robloxApi'

// ============================================================================
// Resale Data Query Hook
// ============================================================================

interface UseResaleDataQueryOptions {
  assetId: number | null
  enabled?: boolean
}

/**
 * Fetches resale data for a limited item using TanStack Query.
 * Only fetches when enabled (typically when economy tab is active).
 */
export function useResaleDataQuery({ assetId, enabled = true }: UseResaleDataQueryOptions) {
  return useQuery({
    queryKey: queryKeys.assets.resaleData(assetId || 0),
    queryFn: async () => {
      if (!assetId) throw new Error('Missing assetId')
      return robloxGet(resaleDataSchema, `https://economy.roblox.com/v1/assets/${assetId}/resale-data`)
    },
    enabled: enabled && !!assetId,
    staleTime: 60 * 1000, // 1 minute - resale data changes infrequently
    gcTime: 10 * 60 * 1000 // 10 minutes garbage collection
  })
}
