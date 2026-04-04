import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Award, Ribbon, ChevronLeft, ChevronRight } from 'lucide-react'
import { SkeletonSquareCard } from '@renderer/shared/ui/display/SkeletonCard'
import { useHorizontalScroll } from '@renderer/shared/hooks/useHorizontalScroll'
import { BadgeDetailsModal } from './BadgeDetailsModal'

interface Badge {
  id: number
  name: string
  description: string
  imageUrl: string
}

interface BadgesSectionProps {
  robloxBadges: Badge[]
  experienceBadges: Badge[]
  isLoadingRobloxBadges: boolean
  isLoadingExperienceBadges: boolean
  cookie: string
}

const BadgeCard: React.FC<{ badge: Badge; index: number; onClick?: () => void }> = ({ badge, index, onClick }) => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    transition={{ duration: 0.3, delay: Math.min(index * 0.03, 0.3) }}
    className={`group relative flex items-center gap-3.5 p-3 rounded-xl bg-[var(--color-surface-strong)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-all hover:shadow-md w-64 shrink-0 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
    onClick={onClick}
  >
    <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
      <img
        src={badge.imageUrl}
        alt={badge.name}
        className="w-14 h-14 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300"
      />
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-semibold text-[var(--color-text-primary)] truncate leading-tight">
        {badge.name}
      </div>
      <div className="text-xs text-[var(--color-text-muted)] line-clamp-2 leading-snug mt-0.5">
        {badge.description}
      </div>
    </div>
  </motion.div>
)

const BadgeCarousel: React.FC<{ badges: Badge[]; isLoading: boolean; onBadgeClick?: (badge: Badge) => void }> = ({ badges, isLoading, onBadgeClick }) => {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useHorizontalScroll([badges])

  return (
    <div className="relative overflow-visible">
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
      {canScrollLeft && (
        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[var(--color-surface)] to-transparent z-10 pointer-events-none" />
      )}
      {canScrollRight && (
        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-surface)] to-transparent z-10 pointer-events-none" />
      )}
      <div ref={scrollRef} className="overflow-x-auto pb-1 scrollbar-hide">
        <div className="flex gap-3 px-1">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="w-64 shrink-0">
                <SkeletonSquareCard className="!aspect-auto h-20" />
              </div>
            ))
            : badges.map((badge, index) => (
              <BadgeCard key={badge.id} badge={badge} index={index} onClick={onBadgeClick ? () => onBadgeClick(badge) : undefined} />
            ))}
        </div>
      </div>
    </div>
  )
}

export const BadgesSection: React.FC<BadgesSectionProps> = ({
  robloxBadges,
  experienceBadges,
  isLoadingRobloxBadges,
  isLoadingExperienceBadges,
  cookie
}) => {
  const [selectedBadge, setSelectedBadge] = useState<Badge | null>(null)
  const hasRobloxBadges = isLoadingRobloxBadges || robloxBadges.length > 0
  const hasExperienceBadges = isLoadingExperienceBadges || experienceBadges.length > 0

  if (!hasRobloxBadges && !hasExperienceBadges) return null

  return (
    <div className="space-y-6">
      {/* Roblox Badges */}
      {hasRobloxBadges && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="mb-3">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Award size={16} className="text-[var(--color-text-secondary)]" />
              Roblox Badges
              <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums">
                {robloxBadges.length}
              </span>
            </h3>
          </div>
          {!isLoadingRobloxBadges && robloxBadges.length === 0 ? (
            <div className="text-[var(--color-text-muted)] text-sm py-2">No badges found.</div>
          ) : (
            <BadgeCarousel badges={robloxBadges} isLoading={isLoadingRobloxBadges} />
          )}
        </motion.div>
      )}

      {/* Experience Badges */}
      {hasExperienceBadges && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
        >
          <div className="mb-3">
            <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Ribbon size={16} className="text-[var(--color-text-secondary)]" />
              Experience Badges
              <span className="text-xs font-medium text-[var(--color-text-muted)] tabular-nums">
                {experienceBadges.length}
              </span>
            </h3>
          </div>
          {!isLoadingExperienceBadges && experienceBadges.length === 0 ? (
            <div className="text-[var(--color-text-muted)] text-sm py-2">No badges found.</div>
          ) : (
            <BadgeCarousel badges={experienceBadges} isLoading={isLoadingExperienceBadges} onBadgeClick={setSelectedBadge} />
          )}
        </motion.div>
      )}

      <BadgeDetailsModal
        isOpen={!!selectedBadge}
        onClose={() => setSelectedBadge(null)}
        badgeId={selectedBadge?.id ?? null}
        badgeImageUrl={selectedBadge?.imageUrl}
        cookie={cookie}
      />
    </div>
  )
}

