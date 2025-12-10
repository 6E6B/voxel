import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Users,
  Clock,
  Shield,
  ExternalLink,
  Gamepad2,
  ChevronRight,
  ChevronLeft,
  Twitter,
  MessageCircle,
  Youtube,
  Link as LinkIcon,
  TrendingUp,
  LogOut,
  X,
  RefreshCw,
  MoreHorizontal,
  Info,
  ShoppingBag
} from 'lucide-react'
import { Account } from '@renderer/types'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Input } from '@renderer/components/UI/inputs/Input'
import { Card } from '@renderer/components/UI/display/Card'
import { Avatar, AvatarImage, AvatarFallback } from '@renderer/components/UI/display/Avatar'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import { ErrorMessage } from '@renderer/components/UI/feedback/ErrorMessage'
import { Tabs } from '@renderer/components/UI/navigation/Tabs'
import { CatalogItemCard } from '@renderer/components/UI/display/CatalogItemCard'
import VerifiedIcon from '@renderer/components/UI/icons/VerifiedIcon'
import CustomDropdown from '@renderer/components/UI/menus/CustomDropdown'
import { formatNumber } from '@renderer/utils/numberUtils'
import { formatRelativeDate } from '@renderer/utils/dateUtils'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import { useHorizontalScroll } from '@renderer/hooks/useHorizontalScroll'
import {
  useGroupDetails,
  useGroupRoles,
  useGroupGames,
  useGroupSocialLinks,
  useCancelPendingRequest,
  useLeaveGroup,
  useGroupWallPosts,
  useGroupMembers,
  useGroupStore,
  useBatchUserAvatars,
  type GroupGame,
  type GroupRole,
  type GroupSocialLink
} from '../api/useGroups'
import type {
  GroupWallPost,
  GroupMember,
  GroupRoleMember,
  GroupStoreResponse
} from '@shared/ipc-schemas/games'
import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@shared/queryKeys'
import type { ChangeEvent } from 'react'

// Social Link Icon Component
const SocialIcon = ({ type }: { type: string }) => {
  const iconProps = { size: 16 }
  switch (type.toLowerCase()) {
    case 'twitter':
      return <Twitter {...iconProps} />
    case 'discord':
      return <MessageCircle {...iconProps} />
    case 'youtube':
      return <Youtube {...iconProps} />
    default:
      return <LinkIcon {...iconProps} />
  }
}

// Game Card Component
interface GameCardProps {
  game: GroupGame
}

const GameCard = ({ game }: GameCardProps) => {
  const handleOpenGame = () => {
    if (game.rootPlace?.id) {
      window.open(`https://www.roblox.com/games/${game.rootPlace.id}`, '_blank')
    }
  }

  return (
    <Card
      className="flex items-center gap-3 p-3 bg-neutral-900/50 border-neutral-800 hover:border-neutral-700 transition-all cursor-pointer group"
      onClick={handleOpenGame}
    >
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-neutral-800 shrink-0">
        {game.thumbnailUrl ? (
          <img src={game.thumbnailUrl} alt={game.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-600">
            <Gamepad2 size={24} />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-white truncate text-sm group-hover:text-[var(--accent-color)] transition-colors">
          {game.name}
        </h4>
        {game.placeVisits !== undefined && (
          <div className="flex items-center gap-1 text-xs text-neutral-500 mt-0.5">
            <TrendingUp size={12} />
            <span>{formatNumber(game.placeVisits)} visits</span>
          </div>
        )}
      </div>
      <ExternalLink
        size={16}
        className="text-neutral-600 group-hover:text-neutral-400 transition-colors shrink-0"
      />
    </Card>
  )
}

const MemberAvatar = ({
  member,
  thumbnail = '',
  index = 0,
  onClick
}: {
  member: GroupMember | GroupRoleMember
  thumbnail?: string
  index?: number
  onClick?: () => void
}) => {
  const username = 'user' in member ? member.user.username : member.username
  const displayName = 'user' in member ? member.user.displayName : member.displayName
  const hasVerifiedBadge = 'user' in member ? member.user.hasVerifiedBadge : member.hasVerifiedBadge

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="group w-28 flex flex-col items-center gap-2 cursor-pointer shrink-0"
      onClick={onClick}
    >
      <div className="relative w-24 h-24 rounded-full bg-neutral-800 shadow-md ring-2 ring-transparent group-hover:ring-neutral-700 transition-all overflow-hidden">
        {thumbnail && (
          <img
            src={thumbnail}
            alt={displayName}
            className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
          />
        )}
      </div>
      <div className="text-center w-full">
        <div
          className={`text-sm font-bold truncate flex items-center justify-center gap-1 ${hasVerifiedBadge ? 'text-[#3385ff]' : 'text-white'}`}
        >
          <span className="truncate">{displayName}</span>
          {hasVerifiedBadge && <VerifiedIcon width={12} height={12} className="shrink-0" />}
        </div>
        <div className="text-xs font-medium text-neutral-500 truncate mt-0.5">@{username}</div>
      </div>
    </motion.div>
  )
}

// Members Section Component with scroll functionality
interface MembersSectionProps {
  members: (GroupMember | GroupRoleMember)[]
  membersLoading: boolean
  sortedRoles: GroupRole[]
  selectedRoleId: string | null
  setSelectedRoleId: (value: string | null) => void
  memberThumbnails: Record<number, string>
  onViewProfile?: (userId: number) => void
}

const MembersSection = ({
  members,
  membersLoading,
  sortedRoles,
  selectedRoleId,
  setSelectedRoleId,
  memberThumbnails,
  onViewProfile
}: MembersSectionProps) => {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useHorizontalScroll([members])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Members</h3>
        <CustomDropdown
          options={[
            { value: 'all', label: 'All Members' },
            ...sortedRoles.map((role) => ({
              value: role.id.toString(),
              label: role.name,
              subLabel: role.memberCount ? formatNumber(role.memberCount) : undefined
            }))
          ]}
          value={selectedRoleId || 'all'}
          onChange={(val: string) => setSelectedRoleId(val === 'all' ? null : val)}
          placeholder="Filter by Role"
          className="w-48"
        />
      </div>

      <div className="relative flex items-center">
        {/* Left scroll button */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll('left')}
              className="absolute -left-3 z-20 w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full shadow-lg transition-colors border border-neutral-700"
              aria-label="Scroll left"
            >
              <ChevronLeft size={24} className="text-white" />
            </motion.button>
          )}
        </AnimatePresence>
        {/* Right scroll button */}
        <AnimatePresence>
          {canScrollRight && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll('right')}
              className="absolute -right-3 z-20 w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full shadow-lg transition-colors border border-neutral-700"
              aria-label="Scroll right"
            >
              <ChevronRight size={24} className="text-white" />
            </motion.button>
          )}
        </AnimatePresence>

        <div ref={scrollRef} className="overflow-x-auto pt-2 pb-4 scrollbar-hide">
          <div className="flex gap-4">
            {membersLoading ? (
              [1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="w-28 space-y-2 flex flex-col items-center shrink-0">
                  <div className="w-24 h-24 rounded-full bg-neutral-800 animate-pulse" />
                  <div className="h-4 w-16 bg-neutral-800 rounded animate-pulse" />
                  <div className="h-3 w-12 bg-neutral-800 rounded animate-pulse" />
                </div>
              ))
            ) : members.length > 0 ? (
              members.map((member, i) => {
                const memberId = 'user' in member ? member.user.userId : member.userId
                return (
                  <MemberAvatar
                    key={`${memberId}-${i}`}
                    member={member}
                    thumbnail={memberThumbnails[memberId] || ''}
                    index={i}
                    onClick={memberId ? () => onViewProfile?.(memberId) : undefined}
                  />
                )
              })
            ) : (
              <div className="text-neutral-500 text-sm py-4">No members found.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const WallPost = ({
  post,
  thumbnail = '',
  onViewProfile
}: {
  post: GroupWallPost
  thumbnail?: string
  onViewProfile?: (userId: number) => void
}) => {
  if (!post.poster) return null

  const handlePosterClick = () => {
    if (post.poster?.user?.userId && onViewProfile) {
      onViewProfile(post.poster.user.userId)
    }
  }

  return (
    <div className="flex gap-4 p-4 bg-neutral-900/30 rounded-xl border border-neutral-800/50">
      <Avatar
        className="w-10 h-10 rounded-full border border-neutral-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-neutral-600 transition-all"
        onClick={handlePosterClick}
      >
        <AvatarImage src={thumbnail} alt={post.poster.user.username} />
        <AvatarFallback>{post.poster.user.username.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span
              className={`font-semibold text-sm inline-flex items-center gap-1 cursor-pointer hover:underline ${post.poster.user.hasVerifiedBadge ? 'text-[#3385ff]' : 'text-neutral-200'}`}
              onClick={handlePosterClick}
            >
              {post.poster.user.displayName}
              {post.poster.user.hasVerifiedBadge && (
                <VerifiedIcon width={12} height={12} className="shrink-0" />
              )}
            </span>
            <span
              className="text-xs text-neutral-500 cursor-pointer hover:text-neutral-400"
              onClick={handlePosterClick}
            >
              @{post.poster.user.username}
            </span>
            {post.poster.role && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-neutral-800 text-neutral-400 border border-neutral-700">
                {post.poster.role.name}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-600">{formatRelativeDate(post.created)}</span>
            <button className="text-neutral-600 hover:text-neutral-400 transition-colors">
              <MoreHorizontal size={14} />
            </button>
          </div>
        </div>
        <p className="text-sm text-neutral-300 whitespace-pre-wrap leading-relaxed">{post.body}</p>
      </div>
    </div>
  )
}

// Group Details Panel Component
export interface GroupDetailsPanelProps {
  groupId: number | null
  selectedAccount: Account | null
  isPending?: boolean
  userRole?: { name: string; rank: number }
  onViewProfile?: (userId: number) => void
  onStoreItemSelect?: (item: { id: number; name: string; imageUrl?: string }) => void
  /** Custom empty state message when no group is selected */
  emptyStateMessage?: string
  /** Whether to show the leave/cancel buttons */
  showActions?: boolean
  /** Layout ID for tab animations (to avoid conflicts when used in multiple places) */
  tabLayoutId?: string
}

export const GroupDetailsPanel = ({
  groupId,
  selectedAccount,
  isPending,
  userRole,
  onViewProfile,
  onStoreItemSelect,
  emptyStateMessage = 'Select a group',
  showActions = true,
  tabLayoutId = 'groupDetailsTabIndicator'
}: GroupDetailsPanelProps) => {
  const { showNotification } = useNotification()
  const queryClient = useQueryClient()

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [activeDetailsTab, setActiveDetailsTab] = useState<'about' | 'store'>('about')
  const [storeSearchQuery, setStoreSearchQuery] = useState('')
  const [debouncedStoreSearch, setDebouncedStoreSearch] = useState('')

  // Debounce store search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedStoreSearch(storeSearchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [storeSearchQuery])

  // Ref for tracking fetched store thumbnail IDs (store items use catalog thumbnails API, not user avatars)
  const fetchedStoreIdsRef = useRef<Set<number>>(new Set())

  // Reset selected role when group changes
  useEffect(() => {
    setSelectedRoleId(null)
    setActiveDetailsTab('about')
    setStoreSearchQuery('')
    setDebouncedStoreSearch('')
    // Reset store thumbnail cache
    setStoreThumbnails({})
    fetchedStoreIdsRef.current.clear()
  }, [groupId])

  const {
    data: details,
    isLoading: detailsLoading,
    error: detailsError
  } = useGroupDetails(groupId, selectedAccount?.cookie)
  const { data: rolesData } = useGroupRoles(groupId)
  const { data: games = [] } = useGroupGames(groupId)
  const { data: socialLinks = [] } = useGroupSocialLinks(selectedAccount, groupId)
  const {
    data: wallPostsData,
    isLoading: wallLoading,
    error: wallError
  } = useGroupWallPosts(groupId)
  const { data: membersData, isLoading: membersLoading } = useGroupMembers(
    groupId,
    selectedRoleId ? parseInt(selectedRoleId) : undefined
  )

  // Group store query
  const {
    data: storeData,
    isLoading: storeLoading,
    fetchNextPage: fetchNextStorePage,
    hasNextPage: hasNextStorePage,
    isFetchingNextPage: isFetchingNextStorePage
  } = useGroupStore(
    activeDetailsTab === 'store' ? groupId : null,
    debouncedStoreSearch || undefined,
    selectedAccount?.cookie
  )

  const storeItems = useMemo(() => {
    if (!storeData?.pages) return []
    return storeData.pages.flatMap((page: GroupStoreResponse) => page.data)
  }, [storeData])

  // Store item thumbnails (uses catalog thumbnails API, not user avatars)
  const [storeThumbnails, setStoreThumbnails] = useState<Record<number, string>>({})

  useEffect(() => {
    if (storeItems.length === 0) return
    const itemsToFetch = storeItems.filter(
      (item: GroupStoreResponse['data'][0]) => !fetchedStoreIdsRef.current.has(item.id)
    )
    if (itemsToFetch.length === 0) return

    // Mark as fetched immediately to prevent duplicate requests
    itemsToFetch.forEach((item) => fetchedStoreIdsRef.current.add(item.id))

    window.api
      .getCatalogThumbnails(
        itemsToFetch.map((item: GroupStoreResponse['data'][0]) => ({
          id: item.id,
          itemType: item.itemType
        }))
      )
      .then((thumbnails: Record<string, string>) => {
        setStoreThumbnails((prev) => ({
          ...prev,
          ...Object.fromEntries(Object.entries(thumbnails).map(([k, v]) => [parseInt(k), v]))
        }))
      })
      .catch(() => {})
  }, [storeItems])

  const cancelRequestMutation = useCancelPendingRequest(selectedAccount)
  const leaveGroupMutation = useLeaveGroup(selectedAccount)

  const [thumbnailUrl, setThumbnailUrl] = useState<string>('')

  // Fetch group thumbnail
  useEffect(() => {
    if (groupId) {
      window.api
        .getGroupThumbnails([groupId])
        .then((thumbnails: Record<number, string>) => {
          setThumbnailUrl(thumbnails[groupId] || '')
        })
        .catch(() => {})
    }
  }, [groupId])

  const roles = rolesData?.roles || []
  const sortedRoles = [...roles].sort((a, b) => b.rank - a.rank)
  const wallPosts = wallPostsData?.data || []
  const members = membersData?.data || []

  // Extract user IDs for batch thumbnail fetching using TanStack Query
  const memberUserIds = useMemo(() => {
    return members
      .map((member: GroupMember | GroupRoleMember) =>
        'user' in member ? member.user.userId : member.userId
      )
      .filter((id): id is number => !!id)
  }, [members])

  const wallPostUserIds = useMemo(() => {
    const posterIds = wallPosts
      .map((post: GroupWallPost) => post.poster?.user?.userId)
      .filter((id): id is number => !!id)
    return [...new Set(posterIds)] // Deduplicate
  }, [wallPosts])

  const shoutUserId = details?.shout?.poster?.userId

  // Use TanStack Query for batch user avatars - handles caching and deduplication automatically
  const { data: memberThumbnails = {} } = useBatchUserAvatars(memberUserIds)
  const { data: wallPostThumbnails = {} } = useBatchUserAvatars(wallPostUserIds)
  const { data: shoutThumbnailData = {} } = useBatchUserAvatars(shoutUserId ? [shoutUserId] : [])

  const shoutThumbnail = shoutUserId ? shoutThumbnailData[shoutUserId] || '' : ''

  const handleCancelRequest = async () => {
    if (!groupId) return
    try {
      await cancelRequestMutation.mutateAsync(groupId)
      showNotification('Cancelled group join request', 'success')
    } catch (error) {
      showNotification('Failed to cancel request', 'error')
    }
  }

  const handleLeaveGroup = async () => {
    if (!groupId) return
    if (!window.confirm('Are you sure you want to leave this group?')) return

    try {
      await leaveGroupMutation.mutateAsync(groupId)
      showNotification('Left group successfully', 'success')
    } catch (error) {
      showNotification('Failed to leave group', 'error')
    }
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-thin relative">
      <AnimatePresence mode="wait">
        {!groupId ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center h-full"
          >
            <EmptyState
              icon={Users}
              title={emptyStateMessage}
              description="Choose a group from the sidebar to view its details"
              variant="minimal"
            />
          </motion.div>
        ) : detailsLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="p-8 space-y-8 max-w-5xl mx-auto w-full"
          >
            <div className="flex items-start gap-4">
              <div className="w-32 h-32 rounded-2xl bg-neutral-800 animate-pulse" />
              <div className="flex-1 space-y-3 pt-2">
                <div className="h-8 w-64 bg-neutral-800 rounded animate-pulse" />
                <div className="h-4 w-48 bg-neutral-800 rounded animate-pulse" />
                <div className="flex gap-2 pt-2">
                  <div className="h-8 w-24 bg-neutral-800 rounded animate-pulse" />
                  <div className="h-8 w-24 bg-neutral-800 rounded animate-pulse" />
                </div>
              </div>
            </div>
            <div className="h-12 bg-neutral-800 rounded-lg animate-pulse" />
            <div className="space-y-4">
              <div className="h-32 bg-neutral-800 rounded-xl animate-pulse" />
              <div className="h-48 bg-neutral-800 rounded-xl animate-pulse" />
            </div>
          </motion.div>
        ) : detailsError || !details ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex items-center justify-center p-6 h-full"
          >
            <ErrorMessage
              message="Failed to load group details"
              onRetry={() =>
                queryClient.invalidateQueries({ queryKey: queryKeys.groups.details(groupId) })
              }
            />
          </motion.div>
        ) : (
          <motion.div
            key={groupId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="p-8 space-y-8 max-w-5xl mx-auto"
          >
            {/* Header Section */}
            <div className="relative">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <Avatar className="w-32 h-32 rounded-2xl border-4 border-neutral-800 shadow-xl shrink-0 bg-neutral-800">
                  <AvatarImage src={thumbnailUrl} alt={details.name} />
                  <AvatarFallback className="rounded-2xl bg-neutral-800 text-neutral-400 text-3xl">
                    {details.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0 space-y-4">
                  <div>
                    <div className="flex items-center gap-3 flex-wrap mb-1">
                      <h2 className="text-3xl font-bold text-white tracking-tight">
                        {details.name}
                      </h2>
                      {details.hasVerifiedBadge && <VerifiedIcon width={24} height={24} />}
                      {showActions && (
                        <div className="flex items-center gap-2 ml-auto">
                          {isPending ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/10"
                              onClick={handleCancelRequest}
                              disabled={cancelRequestMutation.isPending}
                            >
                              <X size={14} />
                              <span className="hidden sm:inline">
                                {cancelRequestMutation.isPending
                                  ? 'Cancelling...'
                                  : 'Cancel Request'}
                              </span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="gap-2 text-red-400 border-red-500/30 hover:bg-red-500/10"
                              onClick={handleLeaveGroup}
                              disabled={leaveGroupMutation.isPending}
                            >
                              <LogOut size={14} />
                              <span className="hidden sm:inline">
                                {leaveGroupMutation.isPending ? 'Leaving...' : 'Leave Group'}
                              </span>
                            </Button>
                          )}
                        </div>
                      )}
                    </div>

                    {details.owner && (
                      <p className="text-sm text-neutral-400 flex items-center gap-1">
                        By{' '}
                        <span
                          className={`font-medium hover:underline cursor-pointer inline-flex items-center gap-1 ${details.owner.hasVerifiedBadge ? 'text-[#3385ff]' : 'text-white'}`}
                          onClick={
                            details.owner?.userId
                              ? () => onViewProfile?.(details.owner?.userId!)
                              : undefined
                          }
                        >
                          {details.owner.displayName || details.owner.username}
                          {details.owner.hasVerifiedBadge && (
                            <VerifiedIcon width={14} height={14} className="shrink-0" />
                          )}
                        </span>
                      </p>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center gap-2">
                      <Users size={14} className="text-neutral-400" />
                      <span className="font-medium text-white">
                        {details.memberCount ? formatNumber(details.memberCount) : '0'}
                      </span>
                      <span className="text-neutral-500">Members</span>
                    </div>

                    {userRole && !isPending && (
                      <div className="px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center gap-2">
                        <Shield size={14} className="text-neutral-400" />
                        <span className="text-neutral-500">Rank:</span>
                        <span className="font-medium text-white">{userRole.name}</span>
                      </div>
                    )}

                    {isPending && (
                      <div className="px-3 py-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-2 text-yellow-500">
                        <Clock size={14} />
                        <span className="font-medium">Pending Approval</span>
                      </div>
                    )}
                  </div>

                  {/* Description */}
                  {details.description && (
                    <p className="text-sm text-neutral-400 leading-relaxed max-w-3xl line-clamp-3">
                      {details.description}
                    </p>
                  )}

                  {/* Social Links */}
                  {socialLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 pt-2">
                      {socialLinks.map((link: GroupSocialLink) => (
                        <a
                          key={link.id}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 text-sm text-neutral-400 hover:text-white transition-colors"
                        >
                          <SocialIcon type={link.type} />
                          <span>{link.title}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              tabs={[
                { id: 'about', label: 'About', icon: Info },
                { id: 'store', label: 'Store', icon: ShoppingBag }
              ]}
              activeTab={activeDetailsTab}
              onTabChange={(id: string) => setActiveDetailsTab(id as 'about' | 'store')}
              layoutId={tabLayoutId}
              className="mb-6"
            />

            {activeDetailsTab === 'about' ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-8"
              >
                {/* Shout Section */}
                {details.shout && details.shout.body && details.shout.body.trim() && (
                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-white">Shout</h3>
                    <Card className="p-5 bg-neutral-900/50 border-neutral-800 relative overflow-hidden">
                      <div className="flex gap-4">
                        <Avatar
                          className="w-12 h-12 rounded-full border border-neutral-700 shrink-0 cursor-pointer hover:ring-2 hover:ring-neutral-600 transition-all"
                          onClick={
                            details.shout?.poster?.userId
                              ? () => onViewProfile?.(details.shout?.poster?.userId!)
                              : undefined
                          }
                        >
                          <AvatarImage src={shoutThumbnail} alt={details.shout.poster?.username} />
                          <AvatarFallback>
                            {details.shout.poster?.username?.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span
                              className={`font-semibold inline-flex items-center gap-1 cursor-pointer hover:underline ${details.shout.poster?.hasVerifiedBadge ? 'text-[#3385ff]' : 'text-white'}`}
                              onClick={
                                details.shout?.poster?.userId
                                  ? () => onViewProfile?.(details.shout?.poster?.userId!)
                                  : undefined
                              }
                            >
                              {details.shout.poster?.displayName}
                              {details.shout.poster?.hasVerifiedBadge && (
                                <VerifiedIcon width={14} height={14} className="shrink-0" />
                              )}
                            </span>
                            <span className="text-xs text-neutral-500">
                              {formatRelativeDate(details.shout.updated)}
                            </span>
                          </div>
                          <p className="text-neutral-300 whitespace-pre-wrap">
                            {details.shout.body}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </div>
                )}

                {/* Members Section */}
                <MembersSection
                  members={members}
                  membersLoading={membersLoading}
                  sortedRoles={sortedRoles}
                  selectedRoleId={selectedRoleId}
                  setSelectedRoleId={setSelectedRoleId}
                  memberThumbnails={memberThumbnails}
                  onViewProfile={onViewProfile}
                />

                {/* Wall Section */}
                {!wallError && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-bold text-white">Wall</h3>

                    <div className="relative">
                      <textarea
                        placeholder="Say something..."
                        className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-neutral-700 resize-none h-24"
                      />
                      <div className="absolute bottom-4 right-3">
                        <Button size="sm" className="h-8 px-4">
                          Post
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {wallLoading ? (
                        [1, 2, 3].map((i) => (
                          <div
                            key={i}
                            className="h-24 bg-neutral-900/30 rounded-xl border border-neutral-800/50 animate-pulse"
                          />
                        ))
                      ) : wallPosts.length > 0 ? (
                        wallPosts.map((post: GroupWallPost) => (
                          <WallPost
                            key={post.id}
                            post={post}
                            thumbnail={
                              post.poster?.user?.userId
                                ? wallPostThumbnails[post.poster.user.userId] || ''
                                : ''
                            }
                            onViewProfile={onViewProfile}
                          />
                        ))
                      ) : (
                        <div className="text-center py-8 text-neutral-500">No wall posts yet</div>
                      )}
                    </div>
                  </div>
                )}

                {/* Games Section */}
                {games.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-white">Games</h3>
                      <span className="text-xs text-neutral-500">{games.length} games</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {games.slice(0, 6).map((game: GroupGame) => (
                        <GameCard key={game.id} game={game} />
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              /* Store Tab Content */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="space-y-6"
              >
                {/* Store Search Bar */}
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={16} className="text-neutral-500" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search store items..."
                    value={storeSearchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) =>
                      setStoreSearchQuery(e.target.value)
                    }
                    className="pl-11 h-10 text-sm bg-neutral-900/50 border-neutral-800"
                  />
                </div>

                {/* Store Items Grid */}
                {storeLoading && storeItems.length === 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-xl bg-neutral-900/50 border border-neutral-800 animate-pulse"
                      />
                    ))}
                  </div>
                ) : storeItems.length > 0 ? (
                  <>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {storeItems.map((item: GroupStoreResponse['data'][0], index: number) => {
                        const handleItemClick = () => {
                          if (onStoreItemSelect) {
                            onStoreItemSelect({
                              id: item.id,
                              name: item.name,
                              imageUrl: storeThumbnails[item.id]
                            })
                            return
                          }

                          // If creator is a User, open their profile, otherwise open catalog page
                          if (
                            item.creatorType === 'User' &&
                            item.creatorTargetId &&
                            onViewProfile
                          ) {
                            onViewProfile(item.creatorTargetId)
                          } else {
                            window.open(`https://www.roblox.com/catalog/${item.id}`, '_blank')
                          }
                        }

                        return (
                          <CatalogItemCard
                            key={item.id}
                            item={item}
                            thumbnailUrl={storeThumbnails[item.id]}
                            index={index}
                            onClick={handleItemClick}
                            onCreatorClick={
                              item.creatorType === 'User' && item.creatorTargetId
                                ? (creatorId) => onViewProfile?.(creatorId)
                                : undefined
                            }
                            isCompact
                          />
                        )
                      })}
                    </div>

                    {/* Load More Button */}
                    {hasNextStorePage && (
                      <div className="flex justify-center pt-4">
                        <Button
                          variant="outline"
                          onClick={() => fetchNextStorePage()}
                          disabled={isFetchingNextStorePage}
                          className="gap-2"
                        >
                          {isFetchingNextStorePage ? (
                            <>
                              <RefreshCw size={14} className="animate-spin" />
                              Loading...
                            </>
                          ) : (
                            'Load More'
                          )}
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center py-16">
                    <EmptyState
                      icon={ShoppingBag}
                      title={debouncedStoreSearch ? 'No items found' : 'No store items'}
                      description={
                        debouncedStoreSearch
                          ? 'Try a different search term'
                          : 'This group has no items in their store'
                      }
                      variant="minimal"
                    />
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default GroupDetailsPanel
