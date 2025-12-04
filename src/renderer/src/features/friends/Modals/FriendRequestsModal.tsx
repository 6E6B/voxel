import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Users,
  Loader2,
  Check,
  UserX,
  Clock,
  Gamepad2,
  User,
  Search,
  CheckCheck,
  XCircle
} from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'
import { Account } from '@renderer/types'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { Dialog, DialogContent, DialogClose } from '@renderer/components/UI/dialogs/Dialog'
import UniversalProfileModal from '@renderer/components/Modals/UniversalProfileModal'
import { ConfirmModal } from '@renderer/components/UI/dialogs/ConfirmModal'
import { ErrorMessage } from '@renderer/components/UI/feedback/ErrorMessage'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import { LoadingSpinner } from '@renderer/components/UI/feedback/LoadingSpinner'

interface FriendRequestsModalProps {
  isOpen: boolean
  onClose: () => void
  selectedAccount: Account | null
  onFriendAdded?: () => void
  onRequestCountChange?: (count: number) => void
}

interface FriendRequest {
  id: number
  userId: number
  username: string
  displayName: string
  avatarUrl: string
  created: string
  originSourceType?: string
  sourceUniverseId?: number | string | null
  mutualFriendsList: string[]
  contactName?: string | null
  senderNickname?: string
}

const SOURCE_LABELS: Record<string, string> = {
  UserProfile: 'Profile',
  InGame: 'In-game',
  FriendFinder: 'Friend finder',
  ContactImporter: 'Contacts',
  Unknown: 'Unknown'
}

const SOURCE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  UserProfile: User,
  InGame: Gamepad2,
  FriendFinder: Search,
  ContactImporter: Users,
  Unknown: User
}

const formatTimeAgo = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)
  const diffWeeks = Math.floor(diffDays / 7)

  if (diffMins < 1) return 'Just now'
  if (diffMins < 60) return `${diffMins}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays < 7) return `${diffDays}d ago`
  if (diffWeeks < 4) return `${diffWeeks}w ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const formatSource = (request: FriendRequest, universeNames: Record<string, string>) => {
  if (!request.originSourceType) {
    return 'Unknown'
  }

  const label = SOURCE_LABELS[request.originSourceType] ?? request.originSourceType
  if (request.originSourceType === 'InGame' && request.sourceUniverseId) {
    const key = request.sourceUniverseId.toString()
    const universeName = universeNames[key]
    if (universeName) {
      return universeName
    }
    return label
  }
  return label
}

const formatMutualFriends = (mutuals: string[]) => {
  if (!mutuals.length) return null
  if (mutuals.length === 1) return `${mutuals[0]} is a mutual friend`
  if (mutuals.length <= 2) return `${mutuals.join(' & ')} are mutual friends`
  return `${mutuals.length} mutual friends`
}

const getAlias = (request: FriendRequest) => request.contactName || request.senderNickname || ''

// Request card item component
const RequestCard: React.FC<{
  request: FriendRequest
  universeNames: Record<string, string>
  processingId: number | null
  onAccept: (request: FriendRequest) => void
  onDecline: (request: FriendRequest) => void
  onOpenProfile: (request: FriendRequest) => void
}> = ({ request, universeNames, processingId, onAccept, onDecline, onOpenProfile }) => {
  const isProcessing = processingId === request.userId
  const SourceIcon = SOURCE_ICONS[request.originSourceType || 'Unknown'] || User
  const alias = getAlias(request)
  const mutualText = formatMutualFriends(request.mutualFriendsList)

  return (
    <div className="group relative bg-neutral-900/40 hover:bg-neutral-900/70 border border-neutral-800/50 hover:border-neutral-700/50 rounded-xl transition-all duration-200">
      <div className="p-4">
        {/* Main content row */}
        <div className="flex items-start gap-3">
          {/* Avatar */}
          <button
            onClick={() => onOpenProfile(request)}
            className="relative shrink-0 pressable group/avatar"
          >
            <img
              src={request.avatarUrl}
              alt={request.displayName}
              className="w-12 h-12 rounded-full bg-neutral-800 ring-2 ring-transparent group-hover/avatar:ring-[var(--accent-color-soft)] transition-all"
            />
          </button>

          {/* User info */}
          <div className="flex-1 min-w-0">
            <button onClick={() => onOpenProfile(request)} className="text-left pressable w-full">
              <div className="flex items-center gap-2">
                <h4 className="font-semibold text-white truncate group-hover:text-[var(--accent-color)] transition-colors">
                  {request.displayName}
                </h4>
                {alias && <span className="text-xs text-neutral-500 truncate">({alias})</span>}
              </div>
              <p className="text-sm text-neutral-500 truncate">@{request.username}</p>
            </button>

            {/* Meta info badges */}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {/* Source badge */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-neutral-800/50 rounded-md text-xs text-neutral-400">
                    <SourceIcon size={12} />
                    <span className="truncate max-w-[100px]">
                      {formatSource(request, universeNames)}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Sent from {formatSource(request, universeNames)}</TooltipContent>
              </Tooltip>

              {/* Time badge */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-neutral-800/50 rounded-md text-xs text-neutral-500">
                    <Clock size={11} />
                    <span>{formatTimeAgo(request.created)}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>{new Date(request.created).toLocaleString()}</TooltipContent>
              </Tooltip>

              {/* Mutual friends badge */}
              {mutualText && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-[var(--accent-color-faint)] rounded-md text-xs text-[var(--accent-color)]">
                      <Users size={11} />
                      <span>{request.mutualFriendsList.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{mutualText}</TooltipContent>
                </Tooltip>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onAccept(request)}
                  disabled={isProcessing}
                  className="pressable flex items-center justify-center w-9 h-9 bg-[var(--accent-color)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] rounded-lg transition-all disabled:opacity-50 shadow-sm"
                >
                  {isProcessing ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} strokeWidth={2.5} />
                  )}
                </button>
              </TooltipTrigger>
              <TooltipContent>Accept request</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDecline(request)}
                  disabled={isProcessing}
                  className="pressable flex items-center justify-center w-9 h-9 bg-neutral-800/80 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-all disabled:opacity-50"
                >
                  <UserX size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent>Decline request</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  )
}

const FriendRequestsModal: React.FC<FriendRequestsModalProps> = ({
  isOpen,
  onClose,
  selectedAccount,
  onFriendAdded,
  onRequestCountChange
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [error, setError] = useState<string | null>(null)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [processingAll, setProcessingAll] = useState<'accept' | 'decline' | null>(null)
  const [universeNames, setUniverseNames] = useState<Record<string, string>>({})
  const [selectedProfileUserId, setSelectedProfileUserId] = useState<number | null>(null)
  const [confirmAction, setConfirmAction] = useState<'accept' | 'decline' | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const { showNotification } = useNotification()

  // Stats computed from requests
  const stats = useMemo(() => {
    const withMutuals = requests.filter((r) => r.mutualFriendsList.length > 0).length
    return { total: requests.length, withMutuals }
  }, [requests])

  const filteredRequests = useMemo(() => {
    if (!searchQuery.trim()) return requests
    const lowerQuery = searchQuery.toLowerCase()
    return requests.filter(
      (req) =>
        req.displayName.toLowerCase().includes(lowerQuery) ||
        req.username.toLowerCase().includes(lowerQuery) ||
        (req.contactName && req.contactName.toLowerCase().includes(lowerQuery)) ||
        (req.senderNickname && req.senderNickname.toLowerCase().includes(lowerQuery))
    )
  }, [requests, searchQuery])

  const fetchUniverseNames = useCallback(async (pendingRequests: FriendRequest[]) => {
    const inGameUniverseIds = Array.from(
      new Set(
        pendingRequests
          .filter((req) => req.originSourceType === 'InGame' && req.sourceUniverseId)
          .map((req) => {
            if (typeof req.sourceUniverseId === 'number') return req.sourceUniverseId
            if (typeof req.sourceUniverseId === 'string') {
              const parsed = parseInt(req.sourceUniverseId, 10)
              return Number.isNaN(parsed) ? null : parsed
            }
            return null
          })
          .filter((id): id is number => typeof id === 'number' && Number.isFinite(id) && id > 0)
      )
    )

    if (!inGameUniverseIds.length) {
      setUniverseNames({})
      return
    }

    if (typeof window.api?.getGamesByUniverseIds !== 'function') {
      console.warn('getGamesByUniverseIds API not available')
      return
    }

    try {
      const games = await window.api.getGamesByUniverseIds(inGameUniverseIds)
      const map: Record<string, string> = {}
      games?.forEach((game: any) => {
        const universeId = (game?.universeId ?? game?.id)?.toString()
        if (universeId && game?.name) {
          map[universeId] = game.name
        }
      })
      setUniverseNames(map)
    } catch (err) {
      console.error('Failed to fetch universe names for friend requests', err)
    }
  }, [])

  const fetchRequests = useCallback(async () => {
    if (!selectedAccount?.cookie) {
      setRequests([])
      onRequestCountChange?.(0)
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const fetchedRequests = await window.api.getFriendRequests(selectedAccount.cookie)
      const toNumber = (value: string | number | undefined): number => {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
          const parsed = parseInt(value, 10)
          return Number.isNaN(parsed) ? 0 : parsed
        }
        return 0
      }

      const normalizedRequests: FriendRequest[] = fetchedRequests.map((req: any) => ({
        id: toNumber(req.id),
        userId: toNumber(req.userId ?? req.id),
        username: req.username,
        displayName: req.displayName,
        avatarUrl: req.avatarUrl || '',
        created: req.created || new Date().toISOString(),
        originSourceType: req.originSourceType ?? req.friendRequest?.originSourceType,
        sourceUniverseId: req.sourceUniverseId ?? req.friendRequest?.sourceUniverseId ?? null,
        mutualFriendsList: Array.isArray(req.mutualFriendsList) ? req.mutualFriendsList : [],
        contactName: req.contactName ?? req.friendRequest?.contactName ?? null,
        senderNickname: req.senderNickname ?? req.friendRequest?.senderNickname ?? ''
      }))

      setRequests(normalizedRequests)
      void fetchUniverseNames(normalizedRequests)
      onRequestCountChange?.(normalizedRequests.length)
    } catch (err) {
      console.error('Failed to fetch friend requests:', err)
      setError('Failed to load friend requests.')
      onRequestCountChange?.(0)
    } finally {
      setIsLoading(false)
    }
  }, [selectedAccount, onRequestCountChange, fetchUniverseNames])

  useEffect(() => {
    if (isOpen) {
      fetchRequests()
    }
  }, [isOpen, fetchRequests])

  const handleAccept = async (request: FriendRequest) => {
    if (processingId || processingAll || !selectedAccount?.cookie) return
    setProcessingId(request.userId)

    try {
      await window.api.acceptFriendRequest(selectedAccount.cookie, request.userId)
      showNotification(`Accepted friend request from ${request.displayName}`, 'success')
      setRequests((prev) => {
        const updated = prev.filter((r) => r.userId !== request.userId)
        onRequestCountChange?.(updated.length)
        return updated
      })
      onFriendAdded?.()
    } catch (err) {
      console.error('Failed to accept friend request:', err)
      showNotification('Failed to accept friend request', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleDecline = async (request: FriendRequest) => {
    if (processingId || processingAll || !selectedAccount?.cookie) return
    setProcessingId(request.userId)

    try {
      await window.api.declineFriendRequest(selectedAccount.cookie, request.userId)
      showNotification(`Declined friend request from ${request.displayName}`, 'success')
      setRequests((prev) => {
        const updated = prev.filter((r) => r.userId !== request.userId)
        onRequestCountChange?.(updated.length)
        return updated
      })
    } catch (err) {
      console.error('Failed to decline friend request:', err)
      showNotification('Failed to decline friend request', 'error')
    } finally {
      setProcessingId(null)
    }
  }

  const handleAcceptAll = async () => {
    if (processingId || processingAll || !selectedAccount?.cookie || requests.length === 0) return
    setProcessingAll('accept')
    setConfirmAction(null)

    let successCount = 0
    let failCount = 0
    const currentRequests = [...requests]

    for (const request of currentRequests) {
      try {
        await window.api.acceptFriendRequest(selectedAccount.cookie, request.userId)
        successCount++
        setRequests((prev) => {
          const updated = prev.filter((r) => r.userId !== request.userId)
          onRequestCountChange?.(updated.length)
          return updated
        })
        onFriendAdded?.()
      } catch (err) {
        console.error('Failed to accept friend request:', err)
        failCount++
      }
    }

    if (failCount === 0) {
      showNotification(`Accepted all ${successCount} friend requests`, 'success')
    } else {
      showNotification(`Accepted ${successCount} requests, ${failCount} failed`, 'error')
    }
    setProcessingAll(null)
  }

  const handleDeclineAll = async () => {
    if (processingId || processingAll || !selectedAccount?.cookie || requests.length === 0) return
    setProcessingAll('decline')
    setConfirmAction(null)

    let successCount = 0
    let failCount = 0
    const currentRequests = [...requests]

    for (const request of currentRequests) {
      try {
        await window.api.declineFriendRequest(selectedAccount.cookie, request.userId)
        successCount++
        setRequests((prev) => {
          const updated = prev.filter((r) => r.userId !== request.userId)
          onRequestCountChange?.(updated.length)
          return updated
        })
      } catch (err) {
        console.error('Failed to decline friend request:', err)
        failCount++
      }
    }

    if (failCount === 0) {
      showNotification(`Declined all ${successCount} friend requests`, 'success')
    } else {
      showNotification(`Declined ${successCount} requests, ${failCount} failed`, 'error')
    }
    setProcessingAll(null)
  }

  const handleOpenProfile = (request: FriendRequest) => {
    setSelectedProfileUserId(request.userId)
  }

  return (
    <Dialog isOpen={isOpen} onClose={onClose}>
      <DialogContent className="w-full max-w-xl h-[85vh] bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden ring-1 ring-[var(--accent-color-ring)] flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md z-10 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
                <Users className="text-white" size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-bold text-white tracking-tight">Friend Requests</h3>
                  {stats.total > 0 && (
                    <span className="px-2 py-0.5 bg-[var(--accent-color)] text-[var(--accent-color-foreground)] text-xs font-semibold rounded-full">
                      {stats.total}
                    </span>
                  )}
                </div>
                <p className="text-sm text-neutral-400 font-medium">
                  {stats.total === 0
                    ? 'No pending requests'
                    : stats.withMutuals > 0
                      ? `${stats.withMutuals} with mutual friends`
                      : 'Manage incoming requests'}
                </p>
              </div>
            </div>
            <DialogClose />
          </div>

          {/* Search Bar */}
          <div className="relative group">
            <Search
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-white transition-colors"
              size={18}
            />
            <input
              type="text"
              placeholder="Search requests..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-neutral-700 transition-all"
            />
          </div>
        </div>

        {/* Bulk Actions */}
        {requests.length > 1 && !isLoading && !error && (
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-800/50 bg-neutral-900/30 shrink-0">
            <span className="text-xs text-neutral-500">Bulk actions</span>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setConfirmAction('accept')}
                    disabled={!!processingId || !!processingAll}
                    className="pressable inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[var(--accent-color-faint)] hover:bg-[var(--accent-color-soft)] text-[var(--accent-color)] rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processingAll === 'accept' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <CheckCheck size={12} />
                    )}
                    <span>Accept All</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Accept all {stats.total} requests</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={() => setConfirmAction('decline')}
                    disabled={!!processingId || !!processingAll}
                    className="pressable inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-neutral-800/50 hover:bg-red-500/10 text-neutral-400 hover:text-red-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {processingAll === 'decline' ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <XCircle size={12} />
                    )}
                    <span>Decline All</span>
                  </button>
                </TooltipTrigger>
                <TooltipContent>Decline all {stats.total} requests</TooltipContent>
              </Tooltip>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {isLoading && requests.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <LoadingSpinner size="lg" label="Loading requests..." />
            </div>
          ) : error ? (
            <div className="py-8 px-4">
              <ErrorMessage message={error} onRetry={fetchRequests} />
            </div>
          ) : requests.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No pending requests"
              description="Friend requests you receive will appear here"
              variant="minimal"
              className="h-64"
            />
          ) : filteredRequests.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No requests found"
              description={`No requests match "${searchQuery}"`}
              variant="minimal"
              className="h-64"
            />
          ) : (
            <Virtuoso
              data={filteredRequests}
              overscan={400}
              className="scrollbar-thin"
              itemContent={(_index, request) => (
                <div className="px-4 py-1">
                  <RequestCard
                    key={request.userId}
                    request={request}
                    universeNames={universeNames}
                    processingId={processingId}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    onOpenProfile={handleOpenProfile}
                  />
                </div>
              )}
              components={{
                Header: () => <div className="h-4" />,
                Footer: () => <div className="h-4" />
              }}
            />
          )}
        </div>
      </DialogContent>

      <UniversalProfileModal
        isOpen={selectedProfileUserId !== null}
        onClose={() => setSelectedProfileUserId(null)}
        userId={selectedProfileUserId}
        selectedAccount={selectedAccount}
        initialData={
          selectedProfileUserId
            ? (() => {
                const request = requests.find((r) => r.userId === selectedProfileUserId)
                return request
                  ? {
                      id: request.userId,
                      name: request.username,
                      displayName: request.displayName,
                      headshotUrl: request.avatarUrl,
                      description: '',
                      created: request.created,
                      isBanned: false,
                      externalAppDisplayName: null,
                      followerCount: 0,
                      followingCount: 0,
                      friendCount: 0,
                      isPremium: false,
                      isAdmin: false,
                      avatarImageUrl: null
                    }
                  : undefined
              })()
            : undefined
        }
      />

      <ConfirmModal
        isOpen={confirmAction === 'accept'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleAcceptAll}
        title="Accept All Requests"
        message={`Are you sure you want to accept all ${stats.total} friend requests? This will add them all as friends.`}
        confirmText="Accept All"
        cancelText="Cancel"
      />

      <ConfirmModal
        isOpen={confirmAction === 'decline'}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleDeclineAll}
        title="Decline All Requests"
        message={`Are you sure you want to decline all ${stats.total} friend requests? This action cannot be undone.`}
        confirmText="Decline All"
        cancelText="Cancel"
        isDangerous
      />
    </Dialog>
  )
}

export default FriendRequestsModal
