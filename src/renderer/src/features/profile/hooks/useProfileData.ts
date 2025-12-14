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
    jobId?: string
  }
}

export const useProfileData = ({ userId, requestCookie, initialData }: UseProfileDataProps) => {
  const {
    data: profilePlatform,
    isError: isPlatformError,
    isLoading: isPlatformLoading
  } = useUserProfilePlatform(userId, requestCookie)
  const { data: userPresence } = useUserPresence(userId, requestCookie, true)

  const { data: avatarUrl } = useQuery({
    queryKey: ['userAvatar', userId],
    queryFn: async () => {
      const result = await window.api.getBatchUserAvatars([userId], '420x420')
      return result[userId] ?? null
    },
    enabled: !!userId,
    staleTime: 60 * 1000
  })

  const profile = useMemo(() => {
    const currentStatus = userPresence
      ? mapPresenceToStatus(userPresence.userPresenceType)
      : initialData?.status || AccountStatus.Offline

    const resolvedPlaceId = userPresence?.rootPlaceId ?? userPresence?.placeId
    const gameActivity =
      currentStatus === AccountStatus.InGame && userPresence?.lastLocation && resolvedPlaceId
        ? {
            name: userPresence.lastLocation,
            placeId: resolvedPlaceId,
            jobId: userPresence.gameId ?? undefined
          }
        : undefined

    const joinDate = profilePlatform?.joinDate
      ? new Date(profilePlatform.joinDate).toLocaleDateString()
      : initialData?.joinDate || '-'

    const displayName =
      profilePlatform?.displayName ||
      initialData?.displayName ||
      (isPlatformError ? 'Error loading profile' : 'Loading...')

    const username =
      profilePlatform?.username || initialData?.username || (isPlatformError ? 'Error' : '...')

    return {
      displayName,
      username,
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
  }, [profilePlatform, userPresence, initialData, avatarUrl, isPlatformError])

  return { profile, isLoading: isPlatformLoading, isError: isPlatformError }
}
