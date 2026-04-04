import { useMemo } from 'react'
import { AccountStatus } from '@renderer/shared/types'
import { mapPresenceToStatus } from '@renderer/shared/utils/statusUtils'
import { useUserFriends, useUserFriendsStatuses } from '@renderer/features/profile/api/useUserProfile'

const FRIEND_STATUS_ORDER: Record<AccountStatus, number> = {
  [AccountStatus.InGame]: 0,
  [AccountStatus.InStudio]: 1,
  [AccountStatus.Online]: 2,
  [AccountStatus.Offline]: 3,
  [AccountStatus.Banned]: 4
}

export const useFriendStatuses = (userId: number, requestCookie: string) => {
  const { data: friends = [] } = useUserFriends(userId, requestCookie)

  const friendIds = useMemo(() => {
    return friends
      .map((f) => (typeof f.userId === 'string' ? parseInt(f.userId) : f.userId))
      .filter((id): id is number => typeof id === 'number' && !isNaN(id))
  }, [friends])

  const { data: friendStatuses = [] } = useUserFriendsStatuses(
    userId,
    requestCookie,
    friendIds,
    friends.length > 0
  )

  const friendsWithStatuses = useMemo(() => {
    if (friendStatuses.length === 0) return friends
    return friends.map((f) => {
      const fId = typeof f.userId === 'string' ? parseInt(f.userId) : f.userId
      const status = friendStatuses.find((fp) => fp.userId === fId)
      if (status && f.userPresenceType !== status.userPresenceType) {
        return {
          ...f,
          userPresenceType: status.userPresenceType,
          lastLocation: status.lastLocation
        }
      }
      return f
    })
  }, [friends, friendStatuses])

  const sortedFriends = useMemo(() => {
    return [...friendsWithStatuses].sort((a, b) => {
      const aStatus = mapPresenceToStatus(a.userPresenceType ?? 0)
      const bStatus = mapPresenceToStatus(b.userPresenceType ?? 0)
      const aOrder = FRIEND_STATUS_ORDER[aStatus] ?? Number.MAX_SAFE_INTEGER
      const bOrder = FRIEND_STATUS_ORDER[bStatus] ?? Number.MAX_SAFE_INTEGER
      return aOrder - bOrder
    })
  }, [friendsWithStatuses])

  return { sortedFriends, friendCount: friends.length }
}

