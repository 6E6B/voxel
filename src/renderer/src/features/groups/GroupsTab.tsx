import { useState, useMemo, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Users, Clock, ChevronRight, User, RefreshCw } from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'
import { Account } from '@renderer/types'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Input } from '@renderer/components/UI/inputs/Input'
import { Avatar, AvatarImage, AvatarFallback } from '@renderer/components/UI/display/Avatar'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@renderer/components/UI/display/Tooltip'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import { ErrorMessage } from '@renderer/components/UI/feedback/ErrorMessage'
import { Tabs } from '@renderer/components/UI/navigation/Tabs'
import VerifiedIcon from '@renderer/components/UI/icons/VerifiedIcon'
import { formatNumber } from '@renderer/utils/numberUtils'
import {
  useActiveGroupsTab,
  useSetActiveGroupsTab,
  useSelectedGroupId,
  useSetSelectedGroupId,
  useGroupsSearchQuery,
  useSetGroupsSearchQuery
} from './stores/useGroupsStore'
import {
  useJoinedGroups,
  usePendingGroups,
  type GroupMembership,
  type PendingGroupRequest
} from './api/useGroups'
import type { ChangeEvent } from 'react'
import UniversalProfileModal from '@renderer/components/Modals/UniversalProfileModal'
import { GroupDetailsPanel } from './components/GroupDetailsPanel'

interface GroupsTabProps {
  selectedAccount: Account | null
}

// Sidebar Group Item Component
interface GroupItemProps {
  group: {
    id: number
    name: string
    memberCount?: number
    hasVerifiedBadge?: boolean
  }
  role?: {
    name: string
    rank: number
  }
  thumbnail?: string
  isSelected: boolean
  isPending?: boolean
  created?: string
  onClick: () => void
}

const GroupItem = ({ group, role, thumbnail, isSelected, isPending, onClick }: GroupItemProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.2 }}
    >
      <button
        onClick={onClick}
        className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group overflow-hidden ${
          isSelected
            ? 'bg-[var(--color-surface-hover)] border border-[var(--color-border-strong)] shadow-[0_10px_30px_rgba(0,0,0,0.28)]'
            : 'hover:bg-[var(--color-surface-hover)] border border-transparent'
        }`}
      >
        {isSelected && (
          <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[var(--accent-color)]" />
        )}
        <Avatar className="w-10 h-10 rounded-lg border border-neutral-700 shrink-0">
          <AvatarImage src={thumbnail} alt={group.name} />
          <AvatarFallback className="rounded-lg bg-neutral-800 text-neutral-400">
            {group.name.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-medium truncate text-sm ${
                isSelected ? 'text-[var(--color-text-primary)]' : 'text-neutral-200'
              }`}
            >
              {group.name}
            </span>
            {group.hasVerifiedBadge && <VerifiedIcon width={14} height={14} className="shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {role && !isPending && <span className="truncate">{role.name}</span>}
            {isPending && (
              <span className="text-yellow-500 flex items-center gap-1">
                <Clock size={10} />
                Pending
              </span>
            )}
            {group.memberCount && (
              <span className="flex items-center gap-1">
                <Users size={12} />
                {formatNumber(group.memberCount)}
              </span>
            )}
          </div>
        </div>

        <ChevronRight
          size={16}
          className={`shrink-0 transition-colors ${
            isSelected
              ? 'text-[var(--color-text-muted)]'
              : 'text-neutral-600 group-hover:text-neutral-400'
          }`}
        />
      </button>
    </motion.div>
  )
}

// Main Groups Tab Component
const GroupsTab = ({ selectedAccount }: GroupsTabProps) => {
  // Store state
  const activeTab = useActiveGroupsTab()
  const setActiveTab = useSetActiveGroupsTab()
  const selectedGroupId = useSelectedGroupId()
  const setSelectedGroupId = useSetSelectedGroupId()
  const searchQuery = useGroupsSearchQuery()
  const setSearchQuery = useSetGroupsSearchQuery()

  // Profile modal state
  const [profileUserId, setProfileUserId] = useState<number | null>(null)

  // Sidebar resize state
  const [sidebarWidth, setSidebarWidth] = useState(320) // default to 80 * 4
  const [isResizing, setIsResizing] = useState(false)
  const sidebarWidthRef = useRef(sidebarWidth)
  const MIN_SIDEBAR_WIDTH = 240
  const MAX_SIDEBAR_WIDTH = 480
  const sidebarRef = useRef<HTMLDivElement | null>(null)
  const resizeOriginRef = useRef(0)

  const clampWidth = (width: number) =>
    Math.min(Math.max(width, MIN_SIDEBAR_WIDTH), MAX_SIDEBAR_WIDTH)

  // Keep ref in sync
  useEffect(() => {
    sidebarWidthRef.current = sidebarWidth
  }, [sidebarWidth])

  // Restore saved width
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem('groupsSidebarWidth')
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!Number.isNaN(parsed)) {
          setSidebarWidth(clampWidth(parsed))
        }
      }
    } catch (error) {
      console.error('Failed to load groups sidebar width', error)
    }
  }, [])

  // Handle drag-to-resize lifecycle
  useEffect(() => {
    if (!isResizing) return

    const handleMouseMove = (event: MouseEvent) => {
      const newWidth = clampWidth(event.clientX - resizeOriginRef.current)
      setSidebarWidth(newWidth)
      sidebarWidthRef.current = newWidth
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
      try {
        window.localStorage.setItem('groupsSidebarWidth', sidebarWidthRef.current.toString())
      } catch (error) {
        console.error('Failed to save groups sidebar width', error)
      }
    }

    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Get user ID
  const userId = selectedAccount?.userId ? parseInt(selectedAccount.userId) : null

  // Queries
  const {
    data: joinedGroups = [],
    isLoading: joinedLoading,
    error: joinedError,
    refetch: refetchJoined,
    isFetching: joinedFetching
  } = useJoinedGroups(userId)

  const {
    data: pendingGroups = [],
    isLoading: pendingLoading,
    error: pendingError,
    refetch: refetchPending,
    isFetching: pendingFetching
  } = usePendingGroups(selectedAccount)

  // Filter groups by search
  const filteredJoinedGroups = useMemo(() => {
    if (!searchQuery.trim()) return joinedGroups
    const query = searchQuery.toLowerCase()
    return joinedGroups.filter(
      (g: GroupMembership) =>
        g.group.name.toLowerCase().includes(query) || g.role.name.toLowerCase().includes(query)
    )
  }, [joinedGroups, searchQuery])

  const filteredPendingGroups = useMemo(() => {
    if (!searchQuery.trim()) return pendingGroups
    const query = searchQuery.toLowerCase()
    return pendingGroups.filter((g: PendingGroupRequest) =>
      g.group.name.toLowerCase().includes(query)
    )
  }, [pendingGroups, searchQuery])

  const displayGroups = activeTab === 'joined' ? filteredJoinedGroups : filteredPendingGroups
  const isLoading = activeTab === 'joined' ? joinedLoading : pendingLoading
  const isFetching = activeTab === 'joined' ? joinedFetching : pendingFetching
  const error = activeTab === 'joined' ? joinedError : pendingError

  // Get the selected group's user role (for joined groups)
  const selectedGroupMembership = useMemo(() => {
    if (activeTab !== 'joined' || !selectedGroupId) return null
    return joinedGroups.find((g) => g.group.id === selectedGroupId)
  }, [activeTab, selectedGroupId, joinedGroups])

  const handleRefresh = () => {
    if (activeTab === 'joined') {
      refetchJoined()
    } else {
      refetchPending()
    }
  }

  // Auto-select first group when data loads or tab changes
  useEffect(() => {
    if (!isLoading && displayGroups.length > 0 && !selectedGroupId) {
      setSelectedGroupId(displayGroups[0].group.id)
    }
  }, [isLoading, displayGroups, selectedGroupId, setSelectedGroupId])

  // Clear selection when changing tabs
  useEffect(() => {
    setSelectedGroupId(null)
    setSearchQuery('')
  }, [activeTab, setSelectedGroupId, setSearchQuery])

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-neutral-950">
        {/* Toolbar */}
        <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Groups</h1>
          </div>

          <div className="flex items-center gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoading || isFetching || !selectedAccount}
                >
                  <RefreshCw size={18} className={isLoading || isFetching ? 'animate-spin' : ''} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh Groups</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Main Content */}
        {!selectedAccount ? (
          <div className="flex-1 flex items-center justify-center">
            <EmptyState
              icon={User}
              title="Select an account"
              description="Choose an account from the Accounts tab to view your groups"
            />
          </div>
        ) : (
          <div className="flex-1 flex min-h-0">
            {/* Sidebar */}
            <div
              ref={sidebarRef}
              className={`relative border-r border-neutral-800 flex flex-col shrink-0 bg-neutral-900/30 ${!isResizing ? 'transition-[width] duration-150 ease-in-out' : ''}`}
              style={{ width: `${sidebarWidth}px` }}
            >
              {/* Sidebar Tabs */}
              <Tabs
                tabs={[
                  {
                    id: 'joined',
                    label: 'Joined',
                    icon: Users
                  },
                  {
                    id: 'pending',
                    label: 'Pending',
                    icon: Clock
                  }
                ]}
                activeTab={activeTab}
                onTabChange={(tabId: string) => setActiveTab(tabId as 'joined' | 'pending')}
                layoutId="groupsSidebarTabIndicator"
              />

              {/* Search */}
              <div className="p-3 border-b border-neutral-800">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={14} className="text-neutral-500" />
                  </div>
                  <Input
                    type="text"
                    placeholder="Search groups..."
                    value={searchQuery}
                    onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Groups List */}
              <div className="flex-1 overflow-hidden p-2">
                <AnimatePresence mode="wait">
                  {isLoading ? (
                    <div className="space-y-2 p-2">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-2.5">
                          <div className="w-10 h-10 rounded-lg bg-neutral-800 animate-pulse" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 w-24 bg-neutral-800 rounded animate-pulse" />
                            <div className="h-3 w-16 bg-neutral-800 rounded animate-pulse" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : error ? (
                    <div className="p-4">
                      <ErrorMessage message="Failed to load groups" onRetry={handleRefresh} />
                    </div>
                  ) : displayGroups.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center h-full text-center p-4"
                    >
                      <Users size={32} className="text-neutral-600 mb-2" />
                      <p className="text-sm text-neutral-500">
                        {searchQuery
                          ? 'No groups match your search'
                          : activeTab === 'joined'
                            ? 'No groups joined yet'
                            : 'No pending requests'}
                      </p>
                    </motion.div>
                  ) : (
                    <Virtuoso
                      data={displayGroups as (GroupMembership | PendingGroupRequest)[]}
                      overscan={200}
                      itemContent={(_index, item) => {
                        if (activeTab === 'joined') {
                          const joinedItem = item as GroupMembership
                          return (
                            <GroupItem
                              key={joinedItem.group.id}
                              group={joinedItem.group}
                              role={joinedItem.role}
                              thumbnail={joinedItem.thumbnail}
                              isSelected={selectedGroupId === joinedItem.group.id}
                              onClick={() => setSelectedGroupId(joinedItem.group.id)}
                            />
                          )
                        } else {
                          const pendingItem = item as PendingGroupRequest
                          return (
                            <GroupItem
                              key={pendingItem.group.id}
                              group={pendingItem.group}
                              thumbnail={pendingItem.thumbnail}
                              isSelected={selectedGroupId === pendingItem.group.id}
                              isPending
                              created={pendingItem.created}
                              onClick={() => setSelectedGroupId(pendingItem.group.id)}
                            />
                          )
                        }
                      }}
                    />
                  )}
                </AnimatePresence>
              </div>

              {/* Resize Handle */}
              <div
                className="absolute top-0 right-0 h-full cursor-col-resize z-20"
                style={{
                  right: '-2px',
                  width: '4px',
                  background: isResizing ? 'rgb(115, 115, 115)' : 'transparent'
                }}
                onMouseDown={() => {
                  const left = sidebarRef.current?.getBoundingClientRect().left ?? 0
                  resizeOriginRef.current = left
                  setIsResizing(true)
                }}
              >
                <div className="absolute inset-0 hover:bg-neutral-600/50 transition-colors" />
              </div>
            </div>

            {/* Details Panel */}
            <GroupDetailsPanel
              groupId={selectedGroupId}
              selectedAccount={selectedAccount}
              isPending={activeTab === 'pending'}
              userRole={selectedGroupMembership?.role}
              onViewProfile={(userId) => setProfileUserId(userId)}
            />
          </div>
        )}
      </div>

      {/* Profile Modal */}
      <UniversalProfileModal
        isOpen={!!profileUserId}
        onClose={() => setProfileUserId(null)}
        userId={profileUserId}
        selectedAccount={selectedAccount}
        initialData={null}
      />
    </TooltipProvider>
  )
}

export default GroupsTab
