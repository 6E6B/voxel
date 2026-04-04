import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  User,
  Play,
  Gamepad2,
  UserPlus,
  Wrench,
  Users,
  ChevronDown,
  ChevronRight,
  Star,
  Wifi,
  WifiOff,
  Filter
} from 'lucide-react'
import { Friend, AccountStatus, Account } from '@renderer/shared/types'
import { getStatusRingUtilityClass } from '@renderer/shared/utils/statusUtils'
import UniversalProfileModal from '@renderer/app/dialogs/UniversalProfileModal'
import AddFriendModal from './dialogs/AddFriendModal'
import FriendRequestsModal from './dialogs/FriendRequestsModal'
import FriendContextMenu from './FriendContextMenu'
import { Button } from '@renderer/shared/ui/buttons/Button'
import { PageHeaderPortal } from '@renderer/shared/ui/navigation/PageHeaderPortal'
import { FloatingAction } from '@renderer/shared/ui/navigation/FloatingAction'
import {
  TooltipProvider
} from '@renderer/shared/ui/display/Tooltip'
import { Card } from '@renderer/shared/ui/display/Card'
import { Avatar, AvatarImage, AvatarFallback } from '@renderer/shared/ui/display/Avatar'
import { SkeletonFriendGrid } from '@renderer/shared/ui/display/SkeletonGrid'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { ErrorMessage } from '@renderer/shared/ui/feedback/ErrorMessage'
import { useFriends, useFriendRequests, useUnfriend } from '@renderer/features/friends/useFriends'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import {
  useFriendsStore,
  useFavoriteFriends,
  useToggleFavoriteFriend
} from '@renderer/features/friends/useFriendsStore'
import { useSetSelectedGame } from '@renderer/shared/stores/useUIStore'
import {
  createAnchoredOverlayPosition,
  type AnchoredOverlayPosition
} from '@renderer/shared/ui/menus/anchoredPosition'

interface FriendsTabProps {
  selectedAccount: Account | null
  onFriendJoin: (placeId: string | number, jobId?: string, userId?: string | number) => void
  onFriendsCountChange?: (count: number) => void
}

type FilterType = 'All' | 'Online' | 'InGame'

const FriendsTab = ({ selectedAccount, onFriendJoin, onFriendsCountChange }: FriendsTabProps) => {
  const queryClient = useQueryClient()

  // Store State
  const {
    searchQuery: friendSearchQuery,
    scrollPosition,
    setSearchQuery: setFriendSearchQuery,
    setScrollPosition
  } = useFriendsStore()

  const favorites = useFavoriteFriends()
  const toggleFavorite = useToggleFavoriteFriend()

  const [activeFilter, setActiveFilter] = useState<FilterType>('All')
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())

  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null)
  const [isInfoModalOpen, setIsInfoModalOpen] = useState(false)
  const [isAddFriendModalOpen, setIsAddFriendModalOpen] = useState(false)
  const [isFriendRequestsModalOpen, setIsFriendRequestsModalOpen] = useState(false)
  const [activeContextMenu, setActiveContextMenu] = useState<({
    id: string
    userId: number
  } & AnchoredOverlayPosition) | null>(null)
  const friendsListRef = useRef<HTMLDivElement>(null)

  // TanStack Query hooks
  const {
    data: friends = [],
    isLoading,
    error,
    refetch: refetchFriends
  } = useFriends(selectedAccount)

  const { data: friendRequests = [] } = useFriendRequests(selectedAccount)
  const friendRequestCount = friendRequests.length

  const unfriendMutation = useUnfriend(selectedAccount)

  // Effects
  useEffect(() => {
    onFriendsCountChange?.(friends.length)
  }, [friends.length, onFriendsCountChange])

  // Status polling is handled by TanStack Query's refetchInterval in useFriends hook
  // No need for custom interval here to avoid duplicate polling and memory leaks

  useEffect(() => {
    if (!selectedAccount) onFriendsCountChange?.(0)
  }, [selectedAccount, onFriendsCountChange])

  useEffect(() => {
    if (friendsListRef.current && scrollPosition > 0 && !isLoading) {
      friendsListRef.current.scrollTop = scrollPosition
    }
  }, [isLoading, scrollPosition])

  const canJoinFriend = useCallback((friend: Friend) => {
    return friend.status === AccountStatus.InGame && Boolean(friend.gameActivity?.placeId)
  }, [])

  // Filtering & Sorting
  const filteredFriends = useMemo(() => {
    if (!selectedAccount) return []

    let filtered = friends.filter((f) => {
      const displayName = f.displayName || ''
      const username = f.username || ''
      const matchesSearch =
        displayName.toLowerCase().includes(friendSearchQuery.toLowerCase()) ||
        username.toLowerCase().includes(friendSearchQuery.toLowerCase())
      return matchesSearch
    })

    // Apply Active Filter
    if (activeFilter === 'Online') {
      filtered = filtered.filter(
        (f) =>
          f.status === AccountStatus.Online ||
          f.status === AccountStatus.InGame ||
          f.status === AccountStatus.InStudio
      )
    } else if (activeFilter === 'InGame') {
      filtered = filtered.filter(
        (f) => f.status === AccountStatus.InGame || f.status === AccountStatus.InStudio
      )
    }

    return filtered.sort((a, b) => {
      // Favorites first
      const isAFav = favorites.includes(a.userId)
      const isBFav = favorites.includes(b.userId)
      if (isAFav && !isBFav) return -1
      if (!isAFav && isBFav) return 1

      // Then status
      const statusOrder = {
        [AccountStatus.InGame]: 0,
        [AccountStatus.Online]: 1,
        [AccountStatus.InStudio]: 1,
        [AccountStatus.Offline]: 2,
        [AccountStatus.Banned]: 3
      }
      const orderA = statusOrder[a.status] !== undefined ? statusOrder[a.status] : 3
      const orderB = statusOrder[b.status] !== undefined ? statusOrder[b.status] : 3

      if (orderA !== orderB) return orderA - orderB

      if (a.status === AccountStatus.InGame && b.status === AccountStatus.InGame) {
        const canJoinA = canJoinFriend(a)
        const canJoinB = canJoinFriend(b)

        if (canJoinA !== canJoinB) return canJoinA ? -1 : 1
      }

      // Then name
      return a.displayName.localeCompare(b.displayName)
    })
  }, [selectedAccount, friendSearchQuery, friends, activeFilter, favorites, canJoinFriend])

  type SectionKey = 'Favorites' | AccountStatus

  const getSectionKey = useCallback(
    (friend: Friend): SectionKey => {
      if (favorites.includes(friend.userId)) return 'Favorites'
      return friend.status
    },
    [favorites]
  )

  const groupedFriends = useMemo(() => {
    const groups: Partial<Record<SectionKey, Friend[]>> = {}

    filteredFriends.forEach((friend) => {
      const key = getSectionKey(friend)
      if (!groups[key]) groups[key] = []
      groups[key]!.push(friend)
    })

    return groups
  }, [filteredFriends, getSectionKey])

  const handleUnfriend = async (targetUserId: number) => {
    if (!selectedAccount || !selectedAccount.cookie) return
    try {
      await unfriendMutation.mutateAsync(targetUserId)
      setActiveContextMenu(null)
    } catch (err) {
      console.error('Failed to unfriend:', err)
    }
  }

  const setSelectedGame = useSetSelectedGame()
  const handleGameClick = async (placeId: string) => {
    try {
      const games = await window.api.getGamesByPlaceIds([placeId])
      if (games && games.length > 0) setSelectedGame(games[0])
    } catch (err) {
      console.error('Failed to fetch game details:', err)
    }
  }

  const handleRequestCountChange = useCallback(() => {
    queryClient.invalidateQueries({
      queryKey: queryKeys.friends.requests(selectedAccount?.id || '')
    })
  }, [queryClient, selectedAccount?.id])

  const toggleSection = (key: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(key)) newCollapsed.delete(key)
    else newCollapsed.add(key)
    setCollapsedSections(newCollapsed)
  }

  const sections: { key: SectionKey; label: string; icon?: any; color?: string; badgeColor?: string }[] = [
    { key: 'Favorites', label: 'Favorites', icon: Star, color: 'text-yellow-500', badgeColor: 'bg-yellow-500/15 text-yellow-400' },
    { key: AccountStatus.InGame, label: 'In Game', icon: Gamepad2, color: 'text-emerald-500', badgeColor: 'bg-emerald-500/15 text-emerald-400' },
    { key: AccountStatus.InStudio, label: 'In Studio', icon: Wrench, color: 'text-orange-500', badgeColor: 'bg-orange-500/15 text-orange-400' },
    { key: AccountStatus.Online, label: 'Online', icon: Wifi, color: 'text-blue-500', badgeColor: 'bg-blue-500/15 text-blue-400' },
    { key: AccountStatus.Offline, label: 'Offline', icon: WifiOff, color: 'text-neutral-500', badgeColor: 'bg-neutral-500/15 text-neutral-400' },
    { key: AccountStatus.Banned, label: 'Banned', icon: User, color: 'text-red-500', badgeColor: 'bg-red-500/15 text-red-400' }
  ]

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-[var(--color-surface)]">
        {/* Toolbar */}
        <PageHeaderPortal>
          <FloatingAction.Search
            value={friendSearchQuery}
            onChange={setFriendSearchQuery}
            placeholder="Search friends..."
          />

          <FloatingAction.Separator />

          <FloatingAction.Dropdown
            icon={Filter}
            tooltip="Filter"
            options={[
              { value: 'All', label: 'All Friends', icon: <Users size={14} /> },
              { value: 'Online', label: 'Online', icon: <Wifi size={14} className="text-blue-500" /> },
              { value: 'InGame', label: 'In Game', icon: <Gamepad2 size={14} className="text-emerald-500" /> }
            ]}
            value={activeFilter}
            onChange={(value) => setActiveFilter(value as FilterType)}
          />

          <FloatingAction.Separator />

          <FloatingAction.Button
            icon={Users}
            tooltip="Friend Requests"
            onClick={() => setIsFriendRequestsModalOpen(true)}
            disabled={!selectedAccount}
            badge={friendRequestCount}
          />

          <FloatingAction.Button
            icon={UserPlus}
            tooltip="Add Friend"
            onClick={() => setIsAddFriendModalOpen(true)}
            disabled={!selectedAccount}
            accent
          />
        </PageHeaderPortal>

        {/* Content */}
        <div
          ref={friendsListRef}
          className="flex-1 overflow-y-auto p-5 scrollbar-thin"
          onScroll={(e) => setScrollPosition(e.currentTarget.scrollTop)}
        >
          {!selectedAccount ? (
            <EmptyState
              icon={User}
              title="Select an account to view friends"
              description="Choose an account from the Accounts tab to load its friends list."
              className="h-full"
            />
          ) : isLoading ? (
            <SkeletonFriendGrid count={12} />
          ) : error ? (
            <ErrorMessage
              message="Failed to load friends list."
              onRetry={() => refetchFriends()}
              className="h-full"
            />
          ) : filteredFriends.length === 0 ? (
            <EmptyState
              icon={Users}
              title={
                friendSearchQuery ? 'No friends match your search' : 'Your friends list is empty'
              }
              description={
                friendSearchQuery
                  ? 'Try adjusting the filters or search for a different name.'
                  : 'Add friends to quickly join their games and check their status.'
              }
              action={
                !friendSearchQuery && (
                  <Button
                    variant="default"
                    className="gap-2"
                    onClick={() => setIsAddFriendModalOpen(true)}
                    disabled={!selectedAccount}
                  >
                    <UserPlus size={16} />
                    Add Friend
                  </Button>
                )
              }
              className="h-full"
            />
          ) : (
            <div className="space-y-5">
              {sections.map(({ key, label, icon: Icon, color, badgeColor }) => {
                const friendsInGroup = groupedFriends[key] || []
                if (friendsInGroup.length === 0) return null

                const isCollapsed = collapsedSections.has(key)

                return (
                  <div key={key} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <button
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center gap-2.5 py-1.5 group select-none outline-none"
                    >
                      {isCollapsed ? (
                        <ChevronRight size={14} className="text-neutral-500 transition-transform" />
                      ) : (
                        <ChevronDown size={14} className="text-neutral-500 transition-transform" />
                      )}
                      <div
                        className={`flex items-center gap-2 text-xs font-semibold  ${color}`}
                      >
                        {Icon && <Icon size={14} />}
                        {label}
                      </div>
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${badgeColor}`}>
                        {friendsInGroup.length}
                      </span>
                      <div className="flex-1 h-px bg-neutral-800/60 ml-2 group-hover:bg-neutral-700/60 transition-colors" />
                    </button>

                    {!isCollapsed && (
                      <div
                        className="grid gap-3 mt-2"
                        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}
                      >
                        {friendsInGroup.map((friend) => {
                          const friendIsJoinable = canJoinFriend(friend)
                          const shouldShowJoinButton =
                            friend.status === AccountStatus.InGame && friendIsJoinable
                          const isFavorite = favorites.includes(friend.userId)

                          return (
                            <motion.div
                              key={friend.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.2 }}
                            >
                              <Card
                                disableLift
                                onClick={() => {
                                  setSelectedFriend(friend)
                                  setIsInfoModalOpen(true)
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  setActiveContextMenu({
                                    id: friend.id,
                                    userId: parseInt(friend.userId),
                                    ...createAnchoredOverlayPosition(e)
                                  })
                                }}
                                className="flex flex-col items-center p-4 pb-5 bg-[var(--color-surface-strong)] border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-border-strong)] transition-all group relative cursor-pointer"
                              >
                                {/* Avatar area */}
                                <div className="relative mb-3">
                                  <Avatar
                                    className={`w-20 h-20 ${friend.status !== AccountStatus.Offline && friend.status !== AccountStatus.Banned
                                      ? `ring-2 ${getStatusRingUtilityClass(friend.status)}`
                                      : ''
                                      }`}
                                  >
                                    <AvatarImage src={friend.avatarUrl} alt={friend.displayName} />
                                    <AvatarFallback className="text-sm font-semibold text-neutral-400">
                                      {friend.displayName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>

                                  {isFavorite && (
                                    <div className="absolute -top-0.5 -right-0.5 bg-[var(--color-surface-strong)] rounded-full p-[3px] z-10 ring-1 ring-yellow-500/30">
                                      <Star size={10} className="fill-yellow-500 text-yellow-500" />
                                    </div>
                                  )}
                                </div>

                                {/* Name area */}
                                <div className="w-full text-center min-w-0 space-y-0.5">
                                  <h3 className="font-semibold text-[var(--color-text-primary)] truncate text-sm leading-snug">
                                    {friend.displayName}
                                  </h3>
                                  <p className="text-xs text-neutral-500 truncate leading-none">
                                    @{friend.username}
                                  </p>
                                </div>

                                {/* Game activity footer */}
                                {friend.gameActivity && (
                                  <div className="w-full mt-2 space-y-1.5">
                                    {/* Game name */}
                                    <span
                                      className={`text-[11px] font-medium truncate block w-full text-center hover:underline cursor-pointer px-1 ${friend.status === AccountStatus.InStudio ? 'text-orange-400' : 'text-emerald-400'}`}
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        if (friend.gameActivity?.placeId)
                                          handleGameClick(friend.gameActivity.placeId)
                                      }}
                                    >
                                      {friend.gameActivity.name}
                                    </span>
                                    {/* Join button */}
                                    {shouldShowJoinButton && (
                                      <button
                                        className="w-full h-8 text-[11px] font-semibold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 outline-none focus:outline-none"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          friend.gameActivity &&
                                            onFriendJoin(
                                              friend.gameActivity.placeId,
                                              friend.gameActivity.jobId,
                                              friend.userId
                                            )
                                        }}
                                      >
                                        <Play size={10} fill="currentColor" />
                                        Join Game
                                      </button>
                                    )}
                                  </div>
                                )}
                              </Card>
                            </motion.div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <UniversalProfileModal
          isOpen={isInfoModalOpen}
          onClose={() => setIsInfoModalOpen(false)}
          userId={selectedFriend?.userId || null}
          selectedAccount={selectedAccount}
          onJoinGame={onFriendJoin}
          initialData={{
            name: selectedFriend?.username,
            displayName: selectedFriend?.displayName,
            status: selectedFriend?.status,
            lastLocation: selectedFriend?.gameActivity?.name,
            headshotUrl: selectedFriend?.avatarUrl,
            description: selectedFriend?.description
          }}
        />

        <FriendRequestsModal
          isOpen={isFriendRequestsModalOpen}
          onClose={() => setIsFriendRequestsModalOpen(false)}
          selectedAccount={selectedAccount}
          onFriendAdded={() => refetchFriends()}
          onRequestCountChange={handleRequestCountChange}
        />

        <AddFriendModal
          isOpen={isAddFriendModalOpen}
          onClose={() => setIsAddFriendModalOpen(false)}
          selectedAccount={selectedAccount}
          onFriendRequestSent={() => refetchFriends()}
        />

        <FriendContextMenu
          activeMenu={activeContextMenu}
          isFavorite={
            activeContextMenu ? favorites.includes(activeContextMenu.userId.toString()) : false
          }
          onClose={() => setActiveContextMenu(null)}
          onUnfriend={handleUnfriend}
          onToggleFavorite={(userId) => toggleFavorite(userId.toString())}
        />
      </div>
    </TooltipProvider>
  )
}

export default FriendsTab


