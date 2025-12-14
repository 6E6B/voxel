import { useCallback, useEffect, useRef } from 'react'
import { Friend, AccountStatus } from '@renderer/types'
import {
  useNotificationTrayStore,
  useNotifyFriendOnline,
  useNotifyFriendInGame,
  useNotifyFriendRemoved
} from '@renderer/stores/useNotificationTrayStore'

interface FriendPresenceState {
  status: AccountStatus
  displayName: string
  username: string
  avatarUrl?: string
  gameActivity?: {
    name: string
    placeId: string
  }
}

/**
 * Hook to track friend status changes and send notifications
 * when friends come online or start playing games.
 */
export function useFriendPresenceNotifications(
  friends: Friend[],
  enabled: boolean = true,
  accountId?: string | null
) {
  const notifyFriendOnline = useNotifyFriendOnline()
  const notifyFriendInGame = useNotifyFriendInGame()
  const notifyFriendRemoved = useNotifyFriendRemoved()
  const addNotification = useNotificationTrayStore((state) => state.addNotification)

  // Track previous friend states
  const previousStatesRef = useRef<Map<string, FriendPresenceState>>(new Map())
  const isInitializedRef = useRef(false)
  const currentAccountIdRef = useRef<string | null>(null)

  // Get account ID from parameter or from friends (all friends should have the same accountId)
  const resolvedAccountId = accountId ?? (friends.length > 0 ? friends[0]?.accountId : null)
  const storageKey = resolvedAccountId ? `friendList_${resolvedAccountId}` : null

  // Reset initialization when account changes
  useEffect(() => {
    if (currentAccountIdRef.current !== resolvedAccountId) {
      currentAccountIdRef.current = resolvedAccountId
      isInitializedRef.current = false
      previousStatesRef.current.clear()
    }
  }, [resolvedAccountId])

  // Load persisted friend list from localStorage
  // Memoized to prevent unnecessary re-creation
  const loadPersistedFriendList = useCallback((): Map<string, FriendPresenceState> => {
    if (!storageKey) return new Map()

    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, FriendPresenceState>
        return new Map(Object.entries(parsed))
      }
    } catch (error) {
      console.error('Failed to load persisted friend list:', error)
    }
    return new Map()
  }, [storageKey])

  // Save friend list to localStorage
  // Memoized to prevent unnecessary re-creation
  const savePersistedFriendList = useCallback(
    (states: Map<string, FriendPresenceState>) => {
      if (!storageKey) return

      try {
        const serialized = Object.fromEntries(states)
        localStorage.setItem(storageKey, JSON.stringify(serialized))
      } catch (error) {
        console.error('Failed to save persisted friend list:', error)
      }
    },
    [storageKey]
  )

  useEffect(() => {
    if (!enabled) return

    // On first load, check for removed friends from persisted list
    if (!isInitializedRef.current) {
      const persistedStates = loadPersistedFriendList()
      const currentFriendIds = new Set(friends.map((f) => f.userId))

      // Don't initialize until we have actual friend data loaded
      // This prevents false "unfriended" notifications when the app starts
      // and friends list is still loading (empty array)
      if (friends.length === 0 && persistedStates.size > 0) {
        return
      }

      // Check for removed friends (unfriended while app was closed)
      if (notifyFriendRemoved && persistedStates.size > 0) {
        for (const [userId, prevState] of persistedStates.entries()) {
          if (!currentFriendIds.has(userId)) {
            addNotification({
              type: 'friend_removed',
              title: `${prevState.displayName} unfriended you`,
              message: `@${prevState.username} is no longer your friend`,
              avatarUrl: prevState.avatarUrl,
              userId: userId
            })
          }
        }
      }

      // Populate current state (either from persisted or current friends)
      const initialStates = new Map<string, FriendPresenceState>()
      friends.forEach((friend) => {
        initialStates.set(friend.userId, {
          status: friend.status,
          displayName: friend.displayName,
          username: friend.username,
          avatarUrl: friend.avatarUrl,
          gameActivity: friend.gameActivity
            ? { name: friend.gameActivity.name, placeId: friend.gameActivity.placeId }
            : undefined
        })
      })
      previousStatesRef.current = initialStates

      // Save current state to localStorage
      savePersistedFriendList(initialStates)

      isInitializedRef.current = true
      return
    }

    let hasChanges = false

    // Check for removed friends (unfriended)
    const currentFriendIds = new Set(friends.map((f) => f.userId))
    if (notifyFriendRemoved) {
      for (const [userId, prevState] of previousStatesRef.current.entries()) {
        if (!currentFriendIds.has(userId)) {
          addNotification({
            type: 'friend_removed',
            title: `${prevState.displayName} unfriended you`,
            message: `@${prevState.username} is no longer your friend`,
            avatarUrl: prevState.avatarUrl,
            userId: userId
          })
        }
      }
    }

    // Check for status changes
    friends.forEach((friend) => {
      const prevState = previousStatesRef.current.get(friend.userId)
      const currentStatus = friend.status
      const prevStatus = prevState?.status

      // Skip if this is a new friend we haven't seen before
      if (!prevState) {
        previousStatesRef.current.set(friend.userId, {
          status: currentStatus,
          displayName: friend.displayName,
          username: friend.username,
          avatarUrl: friend.avatarUrl,
          gameActivity: friend.gameActivity
            ? { name: friend.gameActivity.name, placeId: friend.gameActivity.placeId }
            : undefined
        })
        hasChanges = true
        return
      }

      // Check if friend came online (was offline, now online/in-game/in-studio)
      const wasOffline = prevStatus === AccountStatus.Offline
      const isNowOnline =
        currentStatus === AccountStatus.Online ||
        currentStatus === AccountStatus.InGame ||
        currentStatus === AccountStatus.InStudio

      if (notifyFriendOnline && wasOffline && isNowOnline) {
        addNotification({
          type: 'friend_online',
          title: `${friend.displayName} is online`,
          message: `@${friend.username} just came online`,
          avatarUrl: friend.avatarUrl,
          userId: friend.userId
        })
      }

      // Check if friend started playing a game
      const wasNotInGame = prevStatus !== AccountStatus.InGame
      const isNowInGame = currentStatus === AccountStatus.InGame

      if (notifyFriendInGame && wasNotInGame && isNowInGame && friend.gameActivity) {
        addNotification({
          type: 'friend_ingame',
          title: `${friend.displayName} is playing`,
          message: `@${friend.username} started playing a game`,
          avatarUrl: friend.avatarUrl,
          userId: friend.userId,
          gameInfo: {
            name: friend.gameActivity.name,
            placeId: friend.gameActivity.placeId
          }
        })
      }

      // Update stored state
      const activityChanged = friend.gameActivity?.placeId !== prevState.gameActivity?.placeId
      const statusChanged = prevStatus !== currentStatus

      if (statusChanged || activityChanged) {
        previousStatesRef.current.set(friend.userId, {
          status: currentStatus,
          displayName: friend.displayName,
          username: friend.username,
          avatarUrl: friend.avatarUrl,
          gameActivity: friend.gameActivity
            ? { name: friend.gameActivity.name, placeId: friend.gameActivity.placeId }
            : undefined
        })
        hasChanges = true
      }
    })

    // Clean up friends that are no longer in the list
    for (const userId of previousStatesRef.current.keys()) {
      if (!currentFriendIds.has(userId)) {
        previousStatesRef.current.delete(userId)
        hasChanges = true
      }
    }

    // Save current state to localStorage only if changes occurred
    if (hasChanges) {
      // Debounce saving to avoid disk thrashing
      const timeoutId = setTimeout(() => {
        savePersistedFriendList(previousStatesRef.current)
      }, 500)
      return () => clearTimeout(timeoutId)
    }
  }, [
    friends,
    enabled,
    notifyFriendOnline,
    notifyFriendInGame,
    notifyFriendRemoved,
    addNotification,
    resolvedAccountId,
    storageKey,
    loadPersistedFriendList,
    savePersistedFriendList
  ])

  // Reset when disabled or account changes
  useEffect(() => {
    if (!enabled) {
      previousStatesRef.current.clear()
      isInitializedRef.current = false
    }
  }, [enabled, resolvedAccountId])
}
