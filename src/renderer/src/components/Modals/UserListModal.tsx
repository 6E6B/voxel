import React, { useState, useEffect, useTransition, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search, User, Gamepad2, Monitor, Hammer, ExternalLink } from 'lucide-react'
import { Virtuoso } from 'react-virtuoso'
import { SkeletonUserList } from '../UI/display/SkeletonGrid'
import { Dialog, DialogContent, DialogClose } from '../UI/dialogs/Dialog'
import { ErrorMessage } from '../UI/feedback/ErrorMessage'
import { EmptyState } from '../UI/feedback/EmptyState'
import { mapPresenceToStatus, getStatusColor } from '@renderer/utils/statusUtils'
import { AccountStatus } from '@renderer/types'

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

  useEffect(() => {
    if (isOpen) {
      // Reset state immediately
      setUsers([])
      setCursor(null)
      setHasMore(true)
      setError(null)
      setSearchQuery('')

      // Defer API request until animation completes to prevent frame drops
      fetchTimeoutRef.current = setTimeout(() => {
        fetchUsers(null)
      }, ANIMATION_DELAY_MS)
    }

    return () => {
      // Cleanup timeout if modal closes during animation
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
        fetchTimeoutRef.current = null
      }
    }
  }, [isOpen, userId, type])

  const fetchUsers = useCallback(
    async (currentCursor: string | null) => {
      if (!requestCookie || !userId) return

      setLoading(true)
      try {
        const numericUserId = typeof userId === 'string' ? parseInt(userId) : userId
        let newUsers: any[] = []
        let nextCursor: string | null = null

        if (type === 'friends') {
          // Use paginated friends endpoint to avoid loading all friends at once
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

        // Wrap large list updates in startTransition to prevent animation jank
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
        return <Monitor size={14} className="text-blue-400" />
      case AccountStatus.InGame:
        return <Gamepad2 size={14} className="text-emerald-400" />
      case AccountStatus.InStudio:
        return <Hammer size={14} className="text-orange-400" />
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
        return 'Offline'
    }
  }

  return createPortal(
    <Dialog isOpen={isOpen} onClose={onClose} overlayClassName="z-[10000] p-4 backdrop-blur-sm">
      <DialogContent className="relative w-full max-w-2xl h-[85vh] bg-neutral-950 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 flex flex-col">
        {/* Header */}
        <div className="flex flex-col gap-4 p-6 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-neutral-800/50 rounded-xl border border-neutral-700/50">
                <User className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white tracking-tight">{title}</h3>
                <p className="text-sm text-neutral-400 font-medium">
                  {users.length > 0 ? `${users.length} loaded` : 'Loading...'}
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
              placeholder={`Search ${title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-white/10 focus:border-neutral-700 transition-all"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-hidden bg-neutral-950/50 pt-2">
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
                const statusColor = getStatusColor(status)

                return (
                  <div className="px-4 py-2">
                    <div
                      className="group relative flex items-center gap-4 p-3 rounded-xl bg-neutral-900/30 border border-neutral-800/50 hover:bg-neutral-800/50 hover:border-neutral-700 transition-all duration-200 cursor-pointer"
                      onClick={() =>
                        onSelectUser(typeof user.id === 'string' ? parseInt(user.id) : user.id)
                      }
                    >
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        <div className="w-14 h-14 rounded-full bg-neutral-800 overflow-hidden ring-2 ring-neutral-800 group-hover:ring-neutral-700 transition-all">
                          <img
                            src={user.avatarUrl}
                            alt={user.displayName}
                            className="w-full h-full object-cover transform group-hover:scale-110 transition-transform duration-500"
                          />
                        </div>
                        {isOnline && (
                          <div
                            className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-[3px] border-neutral-900 ${statusColor}`}
                          />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 py-1">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base font-bold text-white truncate transition-colors">
                            {user.displayName}
                          </span>
                          {user.hasVerifiedBadge && (
                            <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                              <svg
                                className="w-2.5 h-2.5 text-white"
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

                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                          <span className="truncate font-medium">
                            @{user.username || user.name}
                          </span>
                        </div>

                        {/* Status Text */}
                        {isOnline && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-xs font-medium text-neutral-400">
                            {getStatusIcon(status)}
                            <span className="truncate max-w-[200px]">
                              {getStatusText(status, user.lastLocation)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity px-2">
                        <div className="p-2 bg-white/5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/10 transition-colors">
                          <ExternalLink size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                )
              }}
              components={{
                Footer: () =>
                  loading ? (
                    <div className="p-4">
                      <SkeletonUserList count={3} />
                    </div>
                  ) : (
                    <div className="h-4" />
                  )
              }}
            />
          ) : loading ? (
            <div className="p-4">
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
        </div>
      </DialogContent>
    </Dialog>,
    document.body
  )
}

export default UserListModal
