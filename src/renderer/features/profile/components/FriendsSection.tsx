import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, UserRound } from 'lucide-react'
import { SlidingNumber } from '@renderer/shared/ui/specialized/SlidingNumber'
import { SkeletonUserRow } from '@renderer/shared/ui/display/SkeletonGrid'
import {
  getStatusBorderColor,
  getStatusColor,
  mapPresenceToStatus
} from '@renderer/shared/utils/statusUtils'
import { AccountStatus } from '@renderer/shared/types'
import { formatNumber } from '@renderer/shared/utils/numberUtils'
import { useHorizontalScroll } from '@renderer/shared/hooks/useHorizontalScroll'
import VerifiedIcon from '@renderer/shared/ui/icons/VerifiedIcon'

interface Friend {
  id: string | number
  userId?: string | number
  displayName: string
  username?: string
  avatarUrl?: string
  userPresenceType?: number
  hasVerifiedBadge?: boolean
  lastLocation?: string
}

interface FriendsSectionProps {
  friends: Friend[]
  isLoading: boolean
  friendCount: number
  onViewAll: () => void
  onSelectProfile?: (userId: number) => void
}

const getStatusLabel = (status: AccountStatus) => {
  return status
}

export const FriendsSection: React.FC<FriendsSectionProps> = ({
  friends,
  isLoading,
  friendCount,
  onViewAll,
  onSelectProfile
}) => {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useHorizontalScroll([friends])

  if (!isLoading && friends.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
          <UserRound size={16} className="text-[var(--color-text-secondary)]" />
          Friends
          <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums">
            <SlidingNumber number={friendCount} formatter={formatNumber} />
          </span>
        </h3>
        <button
          className="pressable text-xs font-medium flex items-center gap-1 px-2.5 py-1 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-color-ring)] transition-colors"
          onClick={onViewAll}
        >
          View All
          <ChevronRight size={14} />
        </button>
      </div>

      <div className="relative overflow-visible">
        {/* Left scroll button */}
        <AnimatePresence>
          {canScrollLeft && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => scroll('left')}
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] rounded-full shadow-lg transition-colors border border-[var(--color-border)]"
              aria-label="Scroll left"
            >
              <ChevronLeft size={24} className="text-[var(--color-text-primary)]" />
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
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] rounded-full shadow-lg transition-colors border border-[var(--color-border)]"
              aria-label="Scroll right"
            >
              <ChevronRight size={24} className="text-[var(--color-text-primary)]" />
            </motion.button>
          )}
        </AnimatePresence>
        {/* Left fade gradient */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[var(--color-surface)] to-transparent z-10 pointer-events-none" />
        )}
        {/* Right fade gradient */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-surface)] to-transparent z-10 pointer-events-none" />
        )}
        <div ref={scrollRef} className="overflow-x-auto pb-2 pt-2 scrollbar-hide">
          <div className="flex gap-4 pl-3 pr-3">
            {isLoading ? (
              <SkeletonUserRow count={5} variant="friend" />
            ) : friends.length > 0 ? (
              friends.map((friend, index) => {
                const friendStatus = mapPresenceToStatus(friend.userPresenceType ?? 0)
                const usernameLabel = friend.username ? `@${friend.username}` : ''
                return (
                  <motion.div
                    key={friend.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.4, delay: index * 0.05 }}
                    className="group w-24 flex flex-col items-center gap-1.5 cursor-pointer shrink-0"
                    onClick={() => {
                      const friendId =
                        typeof friend.userId === 'string' ? parseInt(friend.userId) : friend.userId
                      if (friendId) onSelectProfile?.(friendId)
                    }}
                  >
                    <div className="relative w-20 h-20 rounded-full bg-[var(--color-surface-hover)] shadow-md ring-2 ring-transparent group-hover:ring-[var(--color-border-strong)] transition-all overflow-hidden">
                      {friend.avatarUrl && (
                        <img
                          src={friend.avatarUrl}
                          alt={friend.displayName}
                          className="w-full h-full object-cover rounded-full group-hover:scale-105 transition-transform duration-300"
                        />
                      )}
                    </div>
                    <div className="text-center w-full">
                      <div className="text-sm font-bold text-[var(--color-text-primary)] truncate flex items-center justify-center gap-1">
                        <span className="truncate">{friend.displayName}</span>
                        {friend.hasVerifiedBadge && (
                          <VerifiedIcon width={14} height={14} className="shrink-0" />
                        )}
                      </div>
                      <div className="text-xs font-medium text-[var(--color-text-muted)] truncate mt-0.5">
                        {usernameLabel}
                      </div>
                      <div className="flex items-center justify-center gap-1 text-[11px] font-semibold text-[var(--color-text-secondary)] mt-0.5">
                        <span
                          className={`inline-block w-2 h-2 rounded-full border border-solid ${getStatusBorderColor(friendStatus)} ${getStatusColor(friendStatus)}`}
                        />
                        <span className="truncate">
                          {friendStatus === AccountStatus.InGame && friend.lastLocation
                            ? friend.lastLocation
                            : getStatusLabel(friendStatus)}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )
              })
            ) : (
              <div className="text-[var(--color-text-muted)] text-sm py-4 pl-2">
                No friends found.
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

