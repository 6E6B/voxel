import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'

interface ExtendedUserDetails {
  isPremium: boolean
  isAdmin: boolean
  avatarImageUrl?: string
}

interface FriendStats {
  displayName: string
  username: string
  friendCount: number
  followerCount: number
  followingCount: number
  created?: string
  description?: string
}

interface DetailedStats {
  description?: string
  groupCount?: number
  placeVisits?: number
  joinDate?: string
}

// Fetch extended user details
export function useExtendedUserDetails(userId: number, cookie: string) {
  return useQuery({
    queryKey: queryKeys.userProfile.extended(userId, cookie),
    queryFn: async (): Promise<ExtendedUserDetails> => {
      const details = await window.api.getExtendedUserDetails(cookie, userId)
      return {
        ...details,
        avatarImageUrl: details.avatarImageUrl ?? undefined
      }
    },
    enabled: !!cookie && !!userId,
    staleTime: 60 * 1000 // 1 minute
  })
}

// Fetch friend stats (includes basic profile info)
export function useFriendStats(userId: number, cookie: string) {
  return useQuery({
    queryKey: queryKeys.userProfile.stats(userId, cookie),
    queryFn: async (): Promise<FriendStats> => {
      return window.api.fetchFriendStats(cookie, userId.toString())
    },
    enabled: !!cookie && !!userId,
    staleTime: 60 * 1000 // 1 minute
  })
}

// Fetch detailed stats
export function useDetailedStats(userId: number, cookie: string) {
  return useQuery({
    queryKey: queryKeys.userProfile.details(userId, cookie),
    queryFn: async (): Promise<DetailedStats> => {
      return window.api.getDetailedStats(cookie, userId)
    },
    enabled: !!cookie && !!userId,
    staleTime: 60 * 1000 // 1 minute
  })
}

// Fetch user friends (paginated, limited to 15 for preview)
export function useUserFriends(userId: number, cookie: string) {
  return useQuery({
    queryKey: queryKeys.userProfile.friends(userId, cookie),
    queryFn: async () => {
      const result = await window.api.getFriendsPaged(cookie, userId)
      return result.data.slice(0, 15)
    },
    enabled: !!cookie && !!userId,
    staleTime: 30 * 1000 // 30 seconds
  })
}

// Fetch user groups
export function useUserGroups(userId: number) {
  return useQuery({
    queryKey: queryKeys.userProfile.groups(userId),
    queryFn: async () => {
      const groupsData = await window.api.getUserGroups(userId)
      if (groupsData && groupsData.length > 0) {
        const groupIds = groupsData.map((g: any) => g.group.id)
        const thumbnails = await window.api.getBatchThumbnails(groupIds, 'GroupIcon' as any)
        const thumbMap = new Map(thumbnails.data.map((t: any) => [t.targetId, t.imageUrl]))

        return groupsData.map((g: any) => ({
          ...g,
          thumbnail: thumbMap.get(g.group.id)
        }))
      }
      return []
    },
    enabled: !!userId,
    staleTime: 60 * 1000 // 1 minute
  })
}

// Fetch user collections (collectibles)
export function useUserCollections(userId: number, cookie: string) {
  return useQuery({
    queryKey: queryKeys.userProfile.collections(userId, cookie),
    queryFn: async () => {
      const collectiblesData = await window.api.getCollectibles(cookie, userId)
      if (Array.isArray(collectiblesData) && collectiblesData.length > 0) {
        const validCollectibles = collectiblesData
          .filter((a: any) => a && a.id && a.name && a.thumbnail?.url)
          .slice(0, 6)
          .map((a: any) => ({
            id: a.id,
            name: a.name,
            cssTag: a.assetRestrictionIcon?.cssTag,
            imageUrl: a.thumbnail.url
          }))
        return validCollectibles.length > 0 ? validCollectibles : []
      }
      return []
    },
    enabled: !!cookie && !!userId,
    staleTime: 60 * 1000 // 1 minute
  })
}

// Fetch Roblox badges
export function useRobloxBadges(userId: number, cookie: string) {
  return useQuery({
    queryKey: queryKeys.userProfile.badges.roblox(userId, cookie),
    queryFn: async () => {
      const badges = await window.api.getRobloxBadges(cookie, userId)
      return Array.isArray(badges) ? badges.slice(0, 12) : []
    },
    enabled: !!cookie && !!userId,
    staleTime: 60 * 1000 // 1 minute
  })
}

// Fetch experience badges
export function useExperienceBadges(userId: number, cookie: string) {
  return useQuery({
    queryKey: queryKeys.userProfile.badges.experience(userId, cookie),
    queryFn: async () => {
      const pBadgesData = await window.api.getPlayerBadges(cookie, userId)
      if (pBadgesData && pBadgesData.data) {
        const badges = pBadgesData.data.slice(0, 12)
        const badgeIds = Array.from(new Set(badges.map((b: any) => b.id).filter((id: any) => !!id)))
        const thumbMap: Record<number, string | null | undefined> = {}

        if (badgeIds.length > 0) {
          try {
            const thumbnails = await window.api.getBatchThumbnails(
              badgeIds as number[],
              'BadgeIcon'
            )
            if (thumbnails && thumbnails.data) {
              thumbnails.data.forEach((t: any) => {
                thumbMap[t.targetId] = t.imageUrl
              })
            }
          } catch (e) {
            console.error('Failed to fetch badge thumbnails', e)
          }
        }

        return badges.map((b: any) => ({
          ...b,
          imageUrl: thumbMap[b.id] || b.imageUrl || ''
        }))
      }
      return []
    },
    enabled: !!cookie && !!userId,
    staleTime: 60 * 1000 // 1 minute
  })
}

// Fetch currently wearing items
export function useUserWearingItems(userId: number, cookie: string, enabled: boolean = false) {
  return useQuery({
    queryKey: queryKeys.userProfile.wearing(userId, cookie),
    queryFn: async () => {
      const avatarData = await window.api.getCurrentAvatar(cookie, userId)
      const assetIds = avatarData.assets.map((a: any) => a.id)
      const thumbnails = await window.api.getBatchThumbnails(assetIds, 'Asset')
      const thumbMap = new Map(thumbnails.data.map((t: any) => [t.targetId, t.imageUrl]))

      return avatarData.assets.map((asset: any) => ({
        id: asset.id,
        name: asset.name,
        type: asset.assetType?.name || 'Asset',
        imageUrl: thumbMap.get(asset.id)
      }))
    },
    enabled: enabled && !!cookie && !!userId,
    staleTime: 30 * 1000 // 30 seconds
  })
}

// Fetch user outfits
export function useUserOutfits(userId: number, cookie: string, enabled: boolean = false) {
  return useQuery({
    queryKey: queryKeys.userProfile.outfits(userId, cookie, false),
    queryFn: async () => {
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
        const thumbnails = await window.api.getBatchThumbnails(outfitIds, 'Outfit')
        const thumbMap = new Map(thumbnails.data.map((t: any) => [t.targetId, t.imageUrl]))

        return allOutfits.map((outfit: any) => ({
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

// Fetch past usernames
export function usePastUsernames(userId: number, cookie: string, enabled: boolean = false) {
  return useQuery({
    queryKey: queryKeys.userProfile.pastUsernames(userId, cookie),
    queryFn: async () => {
      const pastNamesData = await window.api.getPastUsernames(cookie, userId)
      if (pastNamesData && pastNamesData.data) {
        return pastNamesData.data.map((u: any) => u.name)
      }
      return []
    },
    enabled: enabled && !!cookie && !!userId,
    staleTime: 5 * 60 * 1000 // 5 minutes (rarely changes)
  })
}

// Fetch user presence (for status polling)
export function useUserPresence(userId: number, cookie: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.userProfile.presence(userId, cookie),
    queryFn: async () => {
      return window.api.getUserPresence(cookie, userId)
    },
    enabled: enabled && !!cookie && !!userId,
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 55000 // Slightly less than refetch interval
  })
}

// Fetch friends statuses (for polling friend list statuses)
export function useUserFriendsStatuses(
  userId: number,
  cookie: string,
  friendIds: number[],
  enabled: boolean = true
) {
  return useQuery({
    queryKey: [...queryKeys.userProfile.friends(userId, cookie), 'statuses', friendIds] as const,
    queryFn: async () => {
      if (friendIds.length === 0) return []
      return window.api.getFriendsStatuses(cookie, friendIds)
    },
    enabled: enabled && !!cookie && !!userId && friendIds.length > 0,
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 55000
  })
}
