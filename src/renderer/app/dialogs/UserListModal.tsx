import React, { useState, useEffect, useTransition, useCallback, useRef, useMemo } from 'react'
import { User, Gamepad2, Monitor, Hammer, ExternalLink } from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'
import { SkeletonUserList } from '@renderer/shared/ui/display/SkeletonGrid'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogClose,
    DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'
import { SearchInput } from '@renderer/shared/ui/inputs/SearchInput'
import { ErrorMessage } from '@renderer/shared/ui/feedback/ErrorMessage'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import {
    getStatusBorderColor,
    getStatusColor,
    mapPresenceToStatus
} from '@renderer/shared/utils/statusUtils'
import { AccountStatus } from '@renderer/shared/types'

interface UserListModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    type: 'friends' | 'followers' | 'following'
    userId: number | string
    requestCookie: string
    onSelectUser: (userId: number) => void
}

// Animation duration for modal open (matches Dialog spring animation)
const ANIMATION_DELAY_MS = 280

const UserListModal: React.FC<UserListModalProps> = ({
    isOpen,
    onClose,
    title,
    type,
    userId,
    requestCookie,
    onSelectUser
}) => {
    const [users, setUsers] = useState<any[]>([])
    const [loading, setLoading] = useState(false)
    const [cursor, setCursor] = useState<string | null>(null)
    const [hasMore, setHasMore] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [searchQuery, setSearchQuery] = useState('')
    const [, startTransition] = useTransition()
    const fetchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const fetchUsers = useCallback(
        async (currentCursor: string | null) => {
            if (!requestCookie || !userId) return

            setLoading(true)
            try {
                const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId
                let newUsers: any[] = []
                let nextCursor: string | null = null

                if (type === 'friends') {
                    const res = await window.api.getFriendsPaged(
                        requestCookie,
                        numericUserId,
                        currentCursor || undefined
                    )
                    newUsers = res.data
                    nextCursor = res.nextCursor
                    startTransition(() => {
                        setHasMore(!!nextCursor)
                        setCursor(nextCursor)
                    })
                } else if (type === 'followers') {
                    const res = await window.api.getFollowers(
                        requestCookie,
                        numericUserId,
                        currentCursor || undefined
                    )
                    newUsers = res.data
                    nextCursor = res.nextCursor
                    startTransition(() => {
                        setHasMore(!!nextCursor)
                        setCursor(nextCursor)
                    })
                } else if (type === 'following') {
                    const res = await window.api.getFollowings(
                        requestCookie,
                        numericUserId,
                        currentCursor || undefined
                    )
                    newUsers = res.data
                    nextCursor = res.nextCursor
                    startTransition(() => {
                        setHasMore(!!nextCursor)
                        setCursor(nextCursor)
                    })
                }

                startTransition(() => {
                    setUsers((prev) => (currentCursor ? [...prev, ...newUsers] : newUsers))
                })
            } catch (err) {
                console.error('Failed to fetch users', err)
                setError('Failed to load users.')
            } finally {
                setLoading(false)
            }
        },
        [requestCookie, userId, type]
    )

    useEffect(() => {
        if (isOpen) {
            setUsers([])
            setCursor(null)
            setHasMore(true)
            setError(null)
            setSearchQuery('')

            fetchTimeoutRef.current = setTimeout(() => {
                fetchUsers(null)
            }, ANIMATION_DELAY_MS)
        }

        return () => {
            if (fetchTimeoutRef.current) {
                clearTimeout(fetchTimeoutRef.current)
                fetchTimeoutRef.current = null
            }
        }
    }, [isOpen, userId, type, fetchUsers])

    const filteredUsers = useMemo(() => {
        if (!searchQuery.trim()) return users
        const lowerQuery = searchQuery.toLowerCase()
        return users.filter(
            (user) =>
                user.displayName?.toLowerCase().includes(lowerQuery) ||
                user.name?.toLowerCase().includes(lowerQuery) ||
                user.username?.toLowerCase().includes(lowerQuery)
        )
    }, [users, searchQuery])

    const getStatusIcon = (status: AccountStatus) => {
        switch (status) {
            case AccountStatus.Online:
                return <Monitor size={11} className="text-blue-400" />
            case AccountStatus.InGame:
                return <Gamepad2 size={11} className="text-emerald-400" />
            case AccountStatus.InStudio:
                return <Hammer size={11} className="text-orange-400" />
            default:
                return null
        }
    }

    const getStatusText = (status: AccountStatus, lastLocation?: string) => {
        switch (status) {
            case AccountStatus.Online:
                return 'Online'
            case AccountStatus.InGame:
                return lastLocation || 'In Game'
            case AccountStatus.InStudio:
                return lastLocation || 'In Studio'
            default:
                return null
        }
    }

    const getStatusDotColor = (status: AccountStatus) => {
        switch (status) {
            case AccountStatus.Online:
                return 'bg-blue-500'
            case AccountStatus.InGame:
                return 'bg-emerald-500'
            case AccountStatus.InStudio:
                return 'bg-orange-500'
            default:
                return ''
        }
    }

    // Calculate online stats
    const onlineCount = useMemo(() => {
        return users.filter((u) => {
            const s = u.userPresenceType ? mapPresenceToStatus(u.userPresenceType) : AccountStatus.Offline
            return s !== AccountStatus.Offline
        }).length
    }, [users])

    return (
        <Dialog isOpen={isOpen} onClose={onClose}>
            <DialogContent className="max-w-lg h-[80vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2.5">
                        <DialogTitle>{title}</DialogTitle>
                        {users.length > 0 && !loading && (
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[var(--color-surface-strong)] text-[var(--color-text-muted)]">
                                {users.length}
                            </span>
                        )}
                    </div>
                    <DialogClose />
                </DialogHeader>

                <DialogBody className="flex flex-1 flex-col gap-3 overflow-hidden">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder={`Search ${title.toLowerCase()}...`}
                    />

                    {/* Stats bar */}
                    {users.length > 0 && !loading && (
                        <div className="flex items-center gap-3 px-1 text-[11px] text-[var(--color-text-muted)]">
                            <span>{users.length} total</span>
                            {onlineCount > 0 && (
                                <>
                                    <span className="text-[var(--color-border-strong)]">&middot;</span>
                                    <span className="text-emerald-400">{onlineCount} online</span>
                                </>
                            )}
                            {searchQuery && filteredUsers.length !== users.length && (
                                <>
                                    <span className="text-[var(--color-border-strong)]">&middot;</span>
                                    <span>{filteredUsers.length} matching</span>
                                </>
                            )}
                        </div>
                    )}

                    {users.length > 0 ? (
                        <Virtuoso
                            data={filteredUsers}
                            overscan={400}
                            endReached={() => {
                                if (!loading && hasMore && !searchQuery) {
                                    fetchUsers(cursor)
                                }
                            }}
                            className="scrollbar-thin"
                            itemContent={(_index, user) => {
                                const status = user.userPresenceType
                                    ? mapPresenceToStatus(user.userPresenceType)
                                    : AccountStatus.Offline
                                const isOnline = status !== AccountStatus.Offline
                                const statusText = getStatusText(status, user.lastLocation)
                                const statusDot = getStatusDotColor(status)

                                return (
                                    <div className="py-0.5">
                                        <div
                                            className="group flex items-center gap-3 px-3 py-2.5 rounded-[var(--control-radius)] border border-transparent cursor-pointer hover:border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] transition-all"
                                            onClick={() =>
                                                onSelectUser(typeof user.id === 'string' ? parseInt(user.id) : user.id)
                                            }
                                        >
                                            {/* Avatar with status indicator */}
                                            <div className="relative shrink-0">
                                                <img
                                                    src={user.avatarUrl}
                                                    alt={user.displayName}
                                                    className="w-10 h-10 rounded-full bg-[var(--color-surface-strong)] ring-1 ring-[var(--color-border)] group-hover:ring-[var(--accent-color-ring)] transition-all object-cover"
                                                />
                                                {isOnline && (
                                                    <div
                                                        className={`absolute bottom-0 right-0 w-3 h-3 rounded-full ${statusDot} ring-2 ring-[var(--color-surface)]`}
                                                    />
                                                )}
                                            </div>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-sm font-semibold text-[var(--color-text-primary)] truncate">
                                                        {user.displayName}
                                                    </span>
                                                    {user.hasVerifiedBadge && (
                                                        <div className="w-3.5 h-3.5 rounded-full bg-blue-500 flex items-center justify-center shrink-0">
                                                            <svg
                                                                className="w-2 h-2 text-white"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                                stroke="currentColor"
                                                                strokeWidth={3}
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    d="M5 13l4 4L19 7"
                                                                />
                                                            </svg>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    <span className="text-xs text-[var(--color-text-muted)] truncate">
                                                        @{user.username || user.name}
                                                    </span>
                                                    {statusText && (
                                                        <>
                                                            <span className="text-[var(--color-border-strong)]">&middot;</span>
                                                            <span className="inline-flex items-center gap-1 text-[11px] text-[var(--color-text-muted)] opacity-80 truncate max-w-[160px]">
                                                                {getStatusIcon(status)}
                                                                {statusText}
                                                            </span>
                                                        </>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Hover action */}
                                            <div className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                <div className="rounded-[var(--control-radius)] p-1.5 text-[var(--color-text-muted)] hover:bg-[var(--color-surface-strong)] hover:text-[var(--color-text-primary)] transition-colors">
                                                    <ExternalLink size={14} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )
                            }}
                            components={{
                                Footer: () =>
                                    loading ? (
                                        <div className="pt-2">
                                            <SkeletonUserList count={3} />
                                        </div>
                                    ) : (
                                        <div className="h-4" />
                                    )
                            }}
                        />
                    ) : loading ? (
                        <div className="pt-1">
                            <SkeletonUserList count={8} />
                        </div>
                    ) : !error ? (
                        <EmptyState
                            icon={User}
                            title={`No ${title.toLowerCase()} found`}
                            description={searchQuery ? `No results for "${searchQuery}"` : undefined}
                            variant="minimal"
                        />
                    ) : (
                        <ErrorMessage message={error} variant="inline" />
                    )}
                </DialogBody>
            </DialogContent>
        </Dialog>
    )
}

export default UserListModal
