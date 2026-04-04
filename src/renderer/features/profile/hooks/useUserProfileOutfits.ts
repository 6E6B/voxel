import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import type { ThumbnailBatch } from '@shared/contracts/avatar'

export interface UserProfileOutfit {
  id: number
  name: string
  type: 'Creation' | 'Purchased'
  imageUrl: string
}

// Fetch user outfits for profile view
export function useUserProfileOutfits(userId: number, cookie: string, enabled: boolean = false) {
  return useQuery<UserProfileOutfit[]>({
    queryKey: queryKeys.userProfile.outfits(userId, cookie, false),
    queryFn: async (): Promise<UserProfileOutfit[]> => {
      const [editableResponse, purchasedResponse] = await Promise.all([
        window.api.getUserOutfits(cookie, userId, true, 1),
        window.api.getUserOutfits(cookie, userId, false, 1)
      ])

      const allOutfits = [
        ...(editableResponse.data || []).map((o: any) => ({ ...o, type: 'Creation' })),
        ...(purchasedResponse.data || []).map((o: any) => ({ ...o, type: 'Purchased' }))
      ]

      if (allOutfits.length > 0) {
        const outfitIds = allOutfits.map((o: any) => o.id)
        const thumbnails: ThumbnailBatch = await window.api.getBatchThumbnails(outfitIds, 'Outfit')
        const thumbEntries = thumbnails.data.reduce<Array<[number, string]>>((entries, thumbnail) => {
          if (typeof thumbnail.imageUrl === 'string') {
            entries.push([thumbnail.targetId, thumbnail.imageUrl])
          }
          return entries
        }, [])
        const thumbMap = new Map<number, string>(thumbEntries)

        return allOutfits.map((outfit: any): UserProfileOutfit => ({
          id: outfit.id,
          name: outfit.name,
          type: outfit.type,
          imageUrl: thumbMap.get(outfit.id) || ''
        }))
      }
      return []
    },
    enabled: enabled && !!cookie && !!userId,
    staleTime: 30 * 1000 // 30 seconds
  })
}
