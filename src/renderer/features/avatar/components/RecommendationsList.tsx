import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'
import { RecommendationItem } from '@shared/contracts/avatar'
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@renderer/shared/ui/display/Tooltip'
import { useHorizontalScroll } from '@renderer/shared/hooks/useHorizontalScroll'
import { RecommendationCard } from './RecommendationCard'

interface RecommendationsListProps {
  recommendations: RecommendationItem[]
  recommendationThumbnails: Map<number, string>
  onItemClick: (item: RecommendationItem) => void
  showSeparator?: boolean
}

export const RecommendationsList: React.FC<RecommendationsListProps> = ({
  recommendations,
  recommendationThumbnails,
  onItemClick,
  showSeparator = true
}) => {
  const {
    scrollRef: carouselRef,
    canScrollLeft,
    canScrollRight,
    scroll: scrollCarousel
  } = useHorizontalScroll([recommendations])

  if (recommendations.length === 0) return null

  return (
    <TooltipProvider>
      <div className={cn(showSeparator ? 'pt-6 border-t border-neutral-800' : 'pt-3')}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-white">Recommended Accessories</h3>
        </div>
        <div className="relative overflow-visible">
          <AnimatePresence>
            {canScrollLeft && (
              <motion.button
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.15 }}
                onClick={() => scrollCarousel('left')}
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
                onClick={() => scrollCarousel('right')}
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
          <div
            ref={carouselRef}
            className="overflow-x-auto overflow-y-visible py-2 -my-2 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <div className="flex gap-3 pr-3">
              {recommendations.map((item, index) => (
                <RecommendationCard
                  key={item.id}
                  item={item}
                  imageUrl={recommendationThumbnails.get(item.id)}
                  index={index}
                  onClick={() => onItemClick(item)}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}

