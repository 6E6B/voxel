import React, { useState } from 'react'
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
          <div className="flex items-center gap-1">
            <button
              onClick={() => scrollCarousel('left')}
              disabled={!canScrollLeft}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                canScrollLeft
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  : 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
              )}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => scrollCarousel('right')}
              disabled={!canScrollRight}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                canScrollRight
                  ? 'bg-neutral-800 hover:bg-neutral-700 text-white'
                  : 'bg-neutral-900 text-neutral-600 cursor-not-allowed'
              )}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        <div
          ref={carouselRef}
          className="flex gap-3 overflow-x-auto overflow-y-visible scrollbar-none scroll-smooth py-2 -my-2"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
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
    </TooltipProvider>
  )
}

