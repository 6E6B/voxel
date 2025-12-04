import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { AccountStatus } from '@renderer/types'
import { mapPresenceToStatus } from '@renderer/utils/statusUtils'
import { useUserProfilePlatform, useUserPresence } from '@renderer/hooks/queries'

export interface UseProfileDataProps {
  userId: number
  requestCookie: string
  initialData?: {
    displayName?: string
    username?: string
    avatarUrl?: string
    status?: AccountStatus
    notes?: string
    joinDate?: string
    placeVisits?: number
    friendCount?: number
    followerCount?: number
    followingCount?: number
    isPremium?: boolean
    isAdmin?: boolean
    totalFavorites?: number
    concurrentPlayers?: number
    groupMemberCount?: number
  }
}

export interface ProfileData {
  displayName: string
  username: string
  avatarUrl: string
  status: AccountStatus
  notes: string
  joinDate: string
  placeVisits: number
  friendCount: number
  followerCount: number
  followingCount: number
  isPremium: boolean
  isAdmin: boolean
  isVerified: boolean
  totalFavorites: number
  concurrentPlayers: number
  groupMemberCount: number
  gameActivity?: {
    name: string
    placeId: number
  }
}

export const useProfileData = ({ userId, requestCookie, initialData }: UseProfileDataProps) => {
  const { data: profilePlatform } = useUserProfilePlatform(userId, requestCookie)
  const { data: userPresence } = useUserPresence(userId, requestCookie, true)

  const { data: avatarUrl } = useQuery({
    queryKey: ['userAvatar', userId],
    queryFn: async () => {
      const result = await window.api.getBatchUserAvatars([userId], '420x420')
      return result[userId] ?? null
    },
    enabled: !!userId,
    staleTime: 5 * 60 * 1000
  })

  const profile = useMemo(() => {
    const currentStatus = userPresence
      ? mapPresenceToStatus(userPresence.userPresenceType)
      : initialData?.status || AccountStatus.Offline

    const gameActivity =
      currentStatus === AccountStatus.InGame && userPresence?.lastLocation && userPresence?.placeId
        ? {
            name: userPresence.lastLocation,
            placeId: userPresence.placeId
          }
        : undefined

    const joinDate = profilePlatform?.joinDate
      ? new Date(profilePlatform.joinDate).toLocaleDateString()
      : initialData?.joinDate || '-'

    return {
      displayName: profilePlatform?.displayName || initialData?.displayName || 'Loading...',
      username: profilePlatform?.username || initialData?.username || '...',
      avatarUrl: avatarUrl || initialData?.avatarUrl || '',
      status: currentStatus,
      notes: profilePlatform?.description || initialData?.notes || '',
      joinDate,
      placeVisits: initialData?.placeVisits || 0,
      friendCount: profilePlatform?.friendsCount || initialData?.friendCount || 0,
      followerCount: profilePlatform?.followersCount || initialData?.followerCount || 0,
      followingCount: profilePlatform?.followingsCount || initialData?.followingCount || 0,
      isPremium: profilePlatform?.isPremium ?? initialData?.isPremium ?? false,
      isAdmin: profilePlatform?.isRobloxAdmin ?? initialData?.isAdmin ?? false,
      isVerified: profilePlatform?.isVerified ?? false,
      totalFavorites: initialData?.totalFavorites || 0,
      concurrentPlayers: initialData?.concurrentPlayers || 0,
      groupMemberCount: initialData?.groupMemberCount || 0,
      gameActivity
    }
  }, [profilePlatform, userPresence, initialData, avatarUrl])

  return { profile }
}
