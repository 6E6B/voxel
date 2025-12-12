import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Search,
  User,
  Play,
  Gamepad2,
  UserPlus,
  Wrench,
  Users,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Star,
  Wifi,
  WifiOff
} from 'lucide-react'
import CustomDropdown from '@renderer/components/UI/menus/CustomDropdown'
import { Friend, AccountStatus, Account } from '@renderer/types'
import { mapPresenceToStatus } from '@renderer/utils/statusUtils'
import UniversalProfileModal from '@renderer/components/Modals/UniversalProfileModal'
import AddFriendModal from './Modals/AddFriendModal'
import FriendRequestsModal from './Modals/FriendRequestsModal'
import FriendContextMenu from './UI/FriendContextMenu'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Input } from '@renderer/components/UI/inputs/Input'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@renderer/components/UI/display/Tooltip'
import { Card } from '@renderer/components/UI/display/Card'
import { Avatar, AvatarImage, AvatarFallback } from '@renderer/components/UI/display/Avatar'
import { SkeletonFriendGrid } from '@renderer/components/UI/display/SkeletonGrid'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import { ErrorMessage } from '@renderer/components/UI/feedback/ErrorMessage'
import { useFriends, useFriendRequests, useUnfriend, queryKeys } from '@renderer/hooks/queries'
import {
  useFriendsStore,
  useFavoriteFriends,
  useToggleFavoriteFriend
} from '@renderer/stores/useFriendsStore'
import { useSetSelectedGame } from '@renderer/stores/useUIStore'

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
  const [activeContextMenu, setActiveContextMenu] = useState<{
    id: string
    userId: number
    x: number
    y: number
  } | null>(null)
  const friendsListRef = useRef<HTMLDivElement>(null)

  // TanStack Query hooks
  const {
    data: friends = [],
    isLoading,
    error,
    refetch: refetchFriends,
    isFetching
  } = useFriends(selectedAccount)

  const { data: friendRequests = [] } = useFriendRequests(selectedAccount)
  const friendRequestCount = friendRequests.length

  const unfriendMutation = useUnfriend(selectedAccount)

  // Effects
  useEffect(() => {
    onFriendsCountChange?.(friends.length)
  }, [friends.length, onFriendsCountChange])

  // Poll for status updates
  useEffect(() => {
    if (!selectedAccount?.cookie || friends.length === 0) return

    const refreshStatuses = async () => {
      try {
        const userIds = friends.map((f) => parseInt(f.userId))
        const presences = await window.api.getFriendsStatuses(selectedAccount.cookie!, userIds)

        queryClient.setQueryData(
          queryKeys.friends.list(selectedAccount.id),
          (oldFriends: Friend[] | undefined) => {
            if (!oldFriends) return oldFriends
            return oldFriends.map((friend) => {
              const presence = presences.find((p) => p.userId === parseInt(friend.userId))
              if (!presence) return friend

              return {
                ...friend,
                status: mapPresenceToStatus(presence.userPresenceType),
                gameActivity: presence.placeId
                  ? {
                      name: presence.lastLocation || 'Unknown Game',
                      placeId: presence.placeId.toString(),
                      jobId: presence.gameId || undefined
                    }
                  : undefined
              }
            })
          }
        )
      } catch (err) {
        console.error('Failed to refresh friend statuses:', err)
      }
    }

    const intervalId = setInterval(refreshStatuses, 5000)
    return () => clearInterval(intervalId)
  }, [selectedAccount?.cookie, selectedAccount?.id, friends, queryClient])

  useEffect(() => {
    if (!selectedAccount) onFriendsCountChange?.(0)
  }, [selectedAccount, onFriendsCountChange])

  useEffect(() => {
    if (friendsListRef.current && scrollPosition > 0 && !isLoading) {
      friendsListRef.current.scrollTop = scrollPosition
    }
  }, [isLoading, scrollPosition])

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

      // Then name
      return a.displayName.localeCompare(b.displayName)
    })
  }, [selectedAccount, friendSearchQuery, friends, activeFilter, favorites])

  type SectionKey = 'Favorites' | AccountStatus | 'InGameNoJoin'

  const getSectionKey = useCallback((friend: Friend): SectionKey => {
    if (favorites.includes(friend.userId)) return 'Favorites'
    if (friend.status === AccountStatus.InGame && !friend.gameActivity?.placeId) {
      return 'InGameNoJoin'
    }
    return friend.status
  }, [favorites])

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

  const toggleSection = (key: string) => {
    const newCollapsed = new Set(collapsedSections)
    if (newCollapsed.has(key)) newCollapsed.delete(key)
    else newCollapsed.add(key)
    setCollapsedSections(newCollapsed)
  }

  const sections: { key: SectionKey; label: string; icon?: any; color?: string }[] = [
    { key: 'Favorites', label: 'Favorites', icon: Star, color: 'text-yellow-500' },
    { key: AccountStatus.InGame, label: 'In Game', icon: Gamepad2, color: 'text-emerald-500' },
    {
      key: 'InGameNoJoin',
      label: 'In Game (Joins Off)',
      icon: Gamepad2,
      color: 'text-emerald-500'
    },
    { key: AccountStatus.InStudio, label: 'In Studio', icon: Wrench, color: 'text-orange-500' },
    { key: AccountStatus.Online, label: 'Online', icon: Wifi, color: 'text-blue-500' },
    { key: AccountStatus.Offline, label: 'Offline', icon: WifiOff, color: 'text-neutral-500' },
    { key: AccountStatus.Banned, label: 'Banned', icon: User, color: 'text-red-500' }
  ]

  const getStatusColor = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.Online:
        return 'bg-blue-500'
      case AccountStatus.InGame:
        return 'bg-emerald-500'
      case AccountStatus.InStudio:
        return 'bg-orange-500'
      case AccountStatus.Offline:
        return 'bg-neutral-600'
      case AccountStatus.Banned:
        return 'bg-red-500'
      default:
        return 'bg-neutral-600'
    }
  }

  const getStatusBorderColor = (status: AccountStatus) => {
    switch (status) {
      case AccountStatus.Online:
        return 'border-blue-500/50'
      case AccountStatus.InGame:
        return 'border-emerald-500/50'
      case AccountStatus.InStudio:
        return 'border-orange-500/50'
      case AccountStatus.Offline:
        return 'border-neutral-600/50'
      case AccountStatus.Banned:
        return 'border-red-500/50'
      default:
        return 'border-neutral-600/50'
    }
  }

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-neutral-950">
        {/* Toolbar */}
        <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4 shrink-0">
            <h1 className="text-xl font-bold text-white">Friends</h1>
            <span className="flex items-center justify-center px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-semibold tracking-tight text-neutral-400">
              {filteredFriends.length}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="default"
              onClick={() => setIsFriendRequestsModalOpen(true)}
              disabled={!selectedAccount}
              className="gap-2 relative"
            >
              <Users size={16} />
              <span className="hidden lg:inline font-semibold tracking-tight">Requests</span>
              {friendRequestCount > 0 && (
                <span className="absolute -top-2 -right-2 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--accent-color)] px-1 text-[11px] font-semibold text-[var(--accent-color-foreground)] shadow-[0_0_10px_rgba(0,0,0,0.4)]">
                  {friendRequestCount}
                </span>
              )}
            </Button>

            <Button
              variant="default"
              size="default"
              onClick={() => setIsAddFriendModalOpen(true)}
              disabled={!selectedAccount}
              className="gap-2"
            >
              <UserPlus size={16} />
              <span className="hidden lg:inline">Add Friend</span>
            </Button>

            <CustomDropdown
              options={[
                { value: 'All', label: 'All Friends', icon: <Users size={16} /> },
                {
                  value: 'Online',
                  label: 'Online',
                  icon: <Wifi size={16} className="text-blue-500" />
                },
                {
                  value: 'InGame',
                  label: 'In Game',
                  icon: <Gamepad2 size={16} className="text-emerald-500" />
                }
              ]}
              value={activeFilter}
              onChange={(value) => setActiveFilter(value as FilterType)}
              className="w-40"
            />

            <div className="relative w-48 lg:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-neutral-500" />
              </div>
              <Input
                type="text"
                placeholder="Search..."
                value={friendSearchQuery}
                onChange={(e) => setFriendSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    queryClient.invalidateQueries({
                      queryKey: queryKeys.friends.list(selectedAccount?.id || '')
                    })
                    refetchFriends()
                  }}
                  disabled={isLoading || isFetching || !selectedAccount}
                >
                  <RefreshCw size={18} className={isLoading || isFetching ? 'animate-spin' : ''} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Friends</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Content */}
        <div
          ref={friendsListRef}
          className="flex-1 overflow-y-auto p-6 scrollbar-thin"
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
            <div className="space-y-4">
              {sections.map(({ key, label, icon: Icon, color }) => {
                const friendsInGroup = groupedFriends[key] || []
                if (friendsInGroup.length === 0) return null

                const isCollapsed = collapsedSections.has(key)

                return (
                  <div key={key} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <button
                      onClick={() => toggleSection(key)}
                      className="w-full flex items-center gap-2 py-2 group select-none outline-none"
                    >
                      {isCollapsed ? (
                        <ChevronRight size={14} className="text-neutral-500" />
                      ) : (
                        <ChevronDown size={14} className="text-neutral-500" />
                      )}
                      <div
                        className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${color}`}
                      >
                        {Icon && <Icon size={16} />}
                        {label}
                      </div>
                      <span className="text-xs font-medium text-neutral-600 group-hover:text-neutral-500 ml-auto">
                        {friendsInGroup.length}
                      </span>
                      <div className="flex-1 h-px bg-neutral-900 ml-4 group-hover:bg-neutral-800 transition-colors" />
                    </button>

                    {!isCollapsed && (
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 mt-2">
                        {friendsInGroup.map((friend) => {
                          const canJoinFriend = Boolean(friend.gameActivity?.placeId)
                          const shouldShowJoinButton =
                            friend.status === AccountStatus.InGame && canJoinFriend
                          const isFavorite = favorites.includes(friend.userId)

                          return (
                            <motion.div
                              key={friend.id}
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              transition={{ duration: 0.3 }}
                            >
                              <Card
                                onClick={() => {
                                  setSelectedFriend(friend)
                                  setIsInfoModalOpen(true)
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault()
                                  setActiveContextMenu({
                                    id: friend.id,
                                    userId: parseInt(friend.userId),
                                    x: e.clientX,
                                    y: e.clientY
                                  })
                                }}
                                className="flex items-center p-4 bg-neutral-900/40 border-neutral-800 hover:border-neutral-700 transition-all group relative cursor-pointer hover:-translate-y-0.5 h-[88px]"
                              >
                                <div className="relative mr-4 shrink-0">
                                  <Avatar className="w-14 h-14 border border-neutral-800">
                                    <AvatarImage src={friend.avatarUrl} alt={friend.displayName} />
                                    <AvatarFallback>
                                      {friend.displayName.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div
                                    className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-dotted ${getStatusBorderColor(friend.status)} ${getStatusColor(friend.status)}`}
                                  />

                                  {isFavorite && (
                                    <div className="absolute -top-1 -right-1 bg-neutral-950 rounded-full p-0.5 border border-neutral-800 z-10">
                                      <Star size={12} className="fill-yellow-500 text-yellow-500" />
                                    </div>
                                  )}
                                </div>

                                <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
                                  <div className="flex items-center gap-2">
                                    <h3 className="font-bold text-white truncate text-base leading-none">
                                      {friend.displayName}
                                    </h3>
                                  </div>
                                  <span className="text-xs text-neutral-500 truncate leading-none">
                                    @{friend.username}
                                  </span>

                                  {friend.gameActivity && (
                                    <div className="flex items-center gap-1  min-w-0">
                                      {friend.status === AccountStatus.InStudio ? (
                                        <Wrench size={16} className="text-orange-400 shrink-0" />
                                      ) : (
                                        <Gamepad2 size={16} className="text-emerald-400 shrink-0" />
                                      )}
                                      <span
                                        className={`text-sm font-medium truncate hover:underline cursor-pointer ${friend.status === AccountStatus.InStudio ? 'text-orange-400' : 'text-emerald-400'}`}
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          if (friend.gameActivity?.placeId)
                                            handleGameClick(friend.gameActivity.placeId)
                                        }}
                                      >
                                        {friend.gameActivity.name}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col items-end gap-2 ml-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {shouldShowJoinButton && (
                                    <Button
                                      variant="default"
                                      size="icon"
                                      className="h-9 w-9 shrink-0 rounded-full bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg shadow-emerald-900/20"
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
                                      <Play size={16} fill="currentColor" />
                                    </Button>
                                  )}
                                </div>
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
          onRequestCountChange={() =>
            queryClient.invalidateQueries({
              queryKey: queryKeys.friends.requests(selectedAccount?.id || '')
            })
          }
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
