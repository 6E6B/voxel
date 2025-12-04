import { useQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'
import type { UserProfileResponse } from '../../../../../shared/ipc-schemas/user'

export interface ProfilePlatformData {
  userId: number
  displayName: string
  username: string
  isPremium: boolean
  isVerified: boolean
  isRobloxAdmin: boolean
  friendsCount: number
  followersCount: number
  followingsCount: number
  description: string
  nameHistory: string[]
  joinDate: string
  currentlyWearing: Array<{ assetId: number; itemType: string }>
  favoriteExperiences: Array<{ universeId: number }>
  collections: Array<{ assetId: number; itemType: string }>
  robloxBadges: Array<{
    id: number
    name: string
    description: string
    imageUrl: string
    awardedAt?: Date
  }>
  playerBadgeIds: number[]
}

function transformProfileResponse(response: UserProfileResponse): ProfilePlatformData {
  const header = response.components?.UserProfileHeader
  const about = response.components?.About
  const wearing = response.components?.CurrentlyWearing
  const favorites = response.components?.FavoriteExperiences
  const collections = response.components?.Collections
  const robloxBadges = response.components?.RobloxBadges
  const playerBadges = response.components?.PlayerBadges

  return {
    userId: header?.userId ?? 0,
    displayName: header?.names?.displayName ?? header?.names?.primaryName ?? '',
    username: header?.names?.username ?? '',
    isPremium: header?.isPremium ?? false,
    isVerified: header?.isVerified ?? false,
    isRobloxAdmin: header?.isRobloxAdmin ?? false,
    friendsCount: header?.counts?.friendsCount ?? 0,
    followersCount: header?.counts?.followersCount ?? 0,
    followingsCount: header?.counts?.followingsCount ?? 0,
    description: about?.description ?? '',
    nameHistory: about?.nameHistory ?? [],
    joinDate: about?.joinDateTime ?? '',
    currentlyWearing: (wearing?.assets ?? []).map((a) => ({
      assetId: a.assetId,
      itemType: a.itemType ?? 'Asset'
    })),
    favoriteExperiences: (favorites?.experiences ?? []).map((e) => ({
      universeId: e.universeId
    })),
    collections: (collections?.assets ?? []).map((a) => ({
      assetId: a.assetId,
      itemType: a.itemType ?? 'Asset'
    })),
    robloxBadges: (robloxBadges?.robloxBadgeList ?? []).map((badge) => ({
      id: badge.id,
      name: badge.type?.value ?? '',
      description: badge.type?.description ?? '',
      imageUrl: badge.type?.imageName
        ? `https://images.rbxcdn.com/img/${badge.type.imageName}`
        : '',
      awardedAt: badge.createdTime?.seconds ? new Date(badge.createdTime.seconds * 1000) : undefined
    })),
    playerBadgeIds: playerBadges?.badges ?? []
  }
}

export function useUserProfilePlatform(userId: number, cookie: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.userProfile.platform(userId),
    queryFn: async (): Promise<ProfilePlatformData> => {
      const response = await window.api.getUserProfile(cookie, userId)
      return transformProfileResponse(response)
    },
    enabled: enabled && !!userId && !!cookie,
    staleTime: 60 * 1000
  })
}

export function useUserProfileHeader(userId: number, cookie: string, enabled: boolean = true) {
  const { data, ...rest } = useUserProfilePlatform(userId, cookie, enabled)

  return {
    data: data
      ? {
          displayName: data.displayName,
          username: data.username,
          isPremium: data.isPremium,
          isVerified: data.isVerified,
          isRobloxAdmin: data.isRobloxAdmin,
          friendsCount: data.friendsCount,
          followersCount: data.followersCount,
          followingsCount: data.followingsCount
        }
      : undefined,
    ...rest
  }
}

export function useUserProfileAbout(userId: number, cookie: string, enabled: boolean = true) {
  const { data, ...rest } = useUserProfilePlatform(userId, cookie, enabled)

  return {
    data: data
      ? {
          description: data.description,
          nameHistory: data.nameHistory,
          joinDate: data.joinDate
        }
      : undefined,
    ...rest
  }
}

export function useUserProfileRobloxBadges(
  userId: number,
  cookie: string,
  enabled: boolean = true
) {
  const { data, ...rest } = useUserProfilePlatform(userId, cookie, enabled)

  return {
    data: data?.robloxBadges ?? [],
    ...rest
  }
}

export function useUserProfileCollections(userId: number, cookie: string, enabled: boolean = true) {
  const { data, ...rest } = useUserProfilePlatform(userId, cookie, enabled)

  return {
    data: data?.collections ?? [],
    ...rest
  }
}

export function useUserProfileCurrentlyWearing(
  userId: number,
  cookie: string,
  enabled: boolean = true
) {
  const { data, ...rest } = useUserProfilePlatform(userId, cookie, enabled)

  return {
    data: data?.currentlyWearing ?? [],
    ...rest
  }
}
