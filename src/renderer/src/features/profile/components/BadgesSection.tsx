import React from 'react'
import { motion } from 'framer-motion'
import { Award, Ribbon } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { SkeletonSquareCard } from '@renderer/components/UI/display/SkeletonCard'

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
}

const BadgeGrid: React.FC<{ badges: Badge[]; isLoading: boolean }> = ({ badges, isLoading }) => {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
      {isLoading
        ? Array.from({ length: 6 }).map((_, i) => <SkeletonSquareCard key={i} />)
        : badges.map((badge) => (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <div className="group relative aspect-square bg-[var(--color-surface-hover)] border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden cursor-pointer transition-all hover:border-[var(--color-border-strong)] hover:shadow-lg isolate">
                  <div className="w-full h-full p-4 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[var(--color-surface-hover)] to-transparent">
                    <img
                      src={badge.imageUrl}
                      alt={badge.name}
                      className="w-full h-full object-contain drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <div className="absolute inset-x-0 bottom-0 z-10 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-b-[var(--radius-lg)] overflow-hidden">
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(8,8,8,0) 0%, rgba(8,8,8,0.12) 35%, rgba(8,8,8,0.65) 100%)'
                      }}
                    />
                    <div className="relative p-3 text-[11px] font-semibold text-[var(--color-text-primary)] line-clamp-2 leading-tight">
                      {badge.name}
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent>{badge.description}</TooltipContent>
            </Tooltip>
          ))}
      {!isLoading && badges.length === 0 && (
        <div className="col-span-full text-[var(--color-text-muted)] text-sm py-4 text-center">
          No badges found.
        </div>
      )}
    </div>
  )
}

export const BadgesSection: React.FC<BadgesSectionProps> = ({
  robloxBadges,
  experienceBadges,
  isLoadingRobloxBadges,
  isLoadingExperienceBadges
}) => {
  const hasRobloxBadges = isLoadingRobloxBadges || robloxBadges.length > 0
  const hasExperienceBadges = isLoadingExperienceBadges || experienceBadges.length > 0

  if (!hasRobloxBadges && !hasExperienceBadges) return null

  return (
    <>
      {/* Roblox Badges Section */}
      {hasRobloxBadges && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-lg)]/40"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Award size={18} className="text-[var(--color-text-secondary)]" />
              Roblox Badges
            </h3>
          </div>
          <BadgeGrid badges={robloxBadges} isLoading={isLoadingRobloxBadges} />
        </motion.div>
      )}

      {/* Experience Badges Section */}
      {hasExperienceBadges && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.35 }}
          className="bg-[var(--color-surface-strong)] border border-[var(--color-border)] rounded-[var(--radius-xl)] p-5 shadow-[var(--shadow-lg)]/40"
        >
          <div className="mb-4">
            <h3 className="text-lg font-bold text-[var(--color-text-primary)] flex items-center gap-2">
              <Ribbon size={18} className="text-[var(--color-text-secondary)]" />
              Experience Badges
            </h3>
          </div>
          <BadgeGrid badges={experienceBadges} isLoading={isLoadingExperienceBadges} />
        </motion.div>
      )}
    </>
  )
}
