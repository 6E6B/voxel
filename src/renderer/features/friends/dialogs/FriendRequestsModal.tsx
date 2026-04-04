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
import { Account } from '@renderer/shared/types'
import { useNotification } from '@renderer/features/system/useSnackbarStore'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'
import UniversalProfileModal from '@renderer/app/dialogs/UniversalProfileModal'
import { ConfirmModal } from '@renderer/shared/ui/dialogs/ConfirmModal'
import { ErrorMessage } from '@renderer/shared/ui/feedback/ErrorMessage'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { LoadingSpinner } from '@renderer/shared/ui/feedback/LoadingSpinner'
import { SearchInput } from '@renderer/shared/ui/inputs/SearchInput'

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

// Compact request row component
const RequestRow: React.FC<{
  request: FriendRequest
  universeNames: Record<string, string>
  processingId: number | null
  onAccept: (request: FriendRequest) => void
  onDecline: (request: FriendRequest) => void
  onOpenProfile: (request: FriendRequest) => void
}> = ({ request, universeNames, processingId, onAccept, onDecline, onOpenProfile }) => {
  const isProcessing = processingId === request.userId
  const SourceIcon = SOURCE_ICONS[request.originSourceType || 'Unknown'] || User
  const mutualText = formatMutualFriends(request.mutualFriendsList)
  const sourceText = formatSource(request, universeNames)

  return (
    <div className="group flex items-center gap-3 px-3 py-2.5 rounded-[var(--control-radius)] border border-transparent hover:border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-all">
      {/* Avatar */}
      <button
        onClick={() => onOpenProfile(request)}
        className="relative shrink-0 pressable"
      >
        <img
          src={request.avatarUrl}
          alt={request.displayName}
          className="w-10 h-10 rounded-full bg-[var(--color-surface-strong)] ring-1 ring-[var(--color-border)] group-hover:ring-[var(--accent-color-ring)] transition-all"
        />
        {request.mutualFriendsList.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[var(--accent-color)] flex items-center justify-center text-[8px] font-bold text-[var(--accent-color-foreground)] ring-2 ring-[var(--color-surface)]">
                {request.mutualFriendsList.length}
              </div>
            </TooltipTrigger>
            <TooltipContent>{mutualText}</TooltipContent>
          </Tooltip>
        )}
      </button>

      {/* User info - compact */}
      <button
        onClick={() => onOpenProfile(request)}
        className="flex-1 min-w-0 text-left pressable"
      >
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold text-[var(--color-text-primary)]">
            {request.displayName}
          </span>
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="truncate text-xs text-[var(--color-text-muted)]">@{request.username}</span>
          <span className="text-[var(--color-border-strong)]">&middot;</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] opacity-70">
                <SourceIcon size={10} />
                {sourceText.length > 16 ? sourceText.slice(0, 16) + '\u2026' : sourceText}
              </span>
            </TooltipTrigger>
            <TooltipContent>Sent from {sourceText}</TooltipContent>
          </Tooltip>
          <span className="text-[var(--color-border-strong)]">&middot;</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] text-[var(--color-text-muted)] opacity-70">
                {formatTimeAgo(request.created)}
              </span>
            </TooltipTrigger>
            <TooltipContent>{new Date(request.created).toLocaleString()}</TooltipContent>
          </Tooltip>
        </div>
      </button>

      {/* Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onAccept(request)}
              disabled={isProcessing}
              className="pressable flex h-8 w-8 items-center justify-center rounded-[var(--control-radius)] bg-[var(--accent-color)] text-[var(--accent-color-foreground)] transition-all hover:brightness-110 disabled:opacity-50 shadow-sm"
            >
              {isProcessing ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} strokeWidth={2.5} />
              )}
            </button>
          </TooltipTrigger>
          <TooltipContent>Accept</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => onDecline(request)}
              disabled={isProcessing}
              className="pressable flex h-8 w-8 items-center justify-center rounded-[var(--control-radius)] bg-[var(--color-surface-strong)] text-[var(--color-text-muted)] transition-all hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
            >
              <UserX size={14} />
            </button>
          </TooltipTrigger>
          <TooltipContent>Decline</TooltipContent>
        </Tooltip>
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
      <DialogContent className="max-w-lg h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <DialogTitle>Friend Requests</DialogTitle>
            {stats.total > 0 && !isLoading && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--accent-color)]/15 text-[var(--accent-color)]">
                {stats.total}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {requests.length > 1 && !isLoading && !error && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setConfirmAction('accept')}
                      disabled={!!processingId || !!processingAll}
                      className="pressable flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors disabled:opacity-50"
                    >
                      {processingAll === 'accept' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CheckCheck size={14} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Accept All</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => setConfirmAction('decline')}
                      disabled={!!processingId || !!processingAll}
                      className="pressable flex h-7 w-7 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                    >
                      {processingAll === 'decline' ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <XCircle size={14} />
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Decline All</TooltipContent>
                </Tooltip>
              </>
            )}
            <DialogClose />
          </div>
        </DialogHeader>

        <DialogBody className="flex flex-1 flex-col gap-3 overflow-hidden">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search requests..."
          />

          {/* Stats bar */}
          {stats.total > 0 && !isLoading && !error && (
            <div className="flex items-center gap-3 px-1 text-[11px] text-[var(--color-text-muted)]">
              <span>{stats.total} pending</span>
              {stats.withMutuals > 0 && (
                <>
                  <span className="text-[var(--color-border-strong)]">&middot;</span>
                  <span className="text-[var(--accent-color)]">
                    {stats.withMutuals} with mutuals
                  </span>
                </>
              )}
            </div>
          )}

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
                <div className="py-0.5">
                  <RequestRow
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
                Footer: () => <div className="h-2" />
              }}
            />
          )}
        </DialogBody>
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

