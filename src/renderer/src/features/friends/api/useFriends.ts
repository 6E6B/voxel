import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'
import { Account, Friend } from '@renderer/types'
import { mapPresenceToStatus } from '@renderer/utils/statusUtils'

// Fetch friends list
export function useFriends(account: Account | null, options?: { forceRefresh?: boolean }) {
  const accountId = account?.id
  const cookie = account?.cookie
  const userId = account?.userId ? parseInt(account.userId) : undefined

  return useQuery({
    queryKey: queryKeys.friends.list(accountId || ''),
    queryFn: async (): Promise<Friend[]> => {
      if (!cookie) return []
      const fetchedFriends = await window.api.getFriends(cookie, userId, options?.forceRefresh)

      return fetchedFriends.map((f: any) => ({
        id: f.id,
        accountId: accountId!,
        displayName: f.displayName,
        username: f.username,
        userId: f.userId,
        avatarUrl: f.avatarUrl,
        status: mapPresenceToStatus(f.userPresenceType),
        description: f.description,
        gameActivity: f.placeId
          ? {
            name: f.lastLocation || 'Unknown Game',
            placeId: f.placeId.toString(),
            jobId: f.gameId
          }
          : undefined
      }))
    },
    enabled: !!cookie && !!accountId,
    staleTime: 60 * 1000, // 60 seconds
    refetchInterval: 60 * 1000 // Poll every 60 seconds for presence updates
  })
}

// NOTE: This hook has been disabled to prevent duplicate polling.
// Friend statuses are already fetched and updated by the main useFriends hook above.
// If you need real-time status updates, increase the refetchInterval in useFriends instead.
/*
export function useFriendStatuses(
  account: Account | null,
  friends: Friend[],
  enabled: boolean = true
) {
  const cookie = account?.cookie
  const accountId = account?.id || ''
  const userIds = friends.map((f) => parseInt(f.userId))

  return useQuery({
    queryKey: queryKeys.friends.statuses(accountId, userIds),
    queryFn: async () => {
      if (!cookie || userIds.length === 0) return []
      return window.api.getFriendsStatuses(cookie, userIds)
    },
    enabled: !!cookie && userIds.length > 0 && enabled,
    refetchInterval: 60000, // Poll every 60 seconds
    staleTime: 55000 // Slightly less than refetch interval
  })
}
*/

// Fetch friend requests
export function useFriendRequests(account: Account | null) {
  const cookie = account?.cookie
  const accountId = account?.id

  return useQuery({
    queryKey: queryKeys.friends.requests(accountId || ''),
    queryFn: () => window.api.getFriendRequests(cookie!),
    enabled: !!cookie && !!accountId,
    staleTime: 120 * 1000
  })
}

// Send friend request mutation
export function useSendFriendRequest(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie

  return useMutation({
    mutationFn: (targetUserId: number) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.sendFriendRequest(cookie, targetUserId)
    },
    onSuccess: () => {
      if (account?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.list(account.id) })
      }
    }
  })
}

// Accept friend request mutation
export function useAcceptFriendRequest(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie

  return useMutation({
    mutationFn: (requesterUserId: number) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.acceptFriendRequest(cookie, requesterUserId)
    },
    onSuccess: () => {
      if (account?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.list(account.id) })
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests(account.id) })
      }
    }
  })
}

// Decline friend request mutation
export function useDeclineFriendRequest(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie

  return useMutation({
    mutationFn: (requesterUserId: number) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.declineFriendRequest(cookie, requesterUserId)
    },
    onSuccess: () => {
      if (account?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.requests(account.id) })
      }
    }
  })
}

// Unfriend mutation
export function useUnfriend(account: Account | null) {
  const queryClient = useQueryClient()
  const cookie = account?.cookie

  return useMutation({
    mutationFn: (targetUserId: number) => {
      if (!cookie) throw new Error('No cookie available')
      return window.api.unfriend(cookie, targetUserId)
    },
    onSuccess: () => {
      if (account?.id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.friends.list(account.id) })
      }
    }
  })
}
