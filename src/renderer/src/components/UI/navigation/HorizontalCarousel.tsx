import React, { ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import { useHorizontalScroll } from '@renderer/hooks/useHorizontalScroll'

interface HorizontalCarouselProps {
  children: ReactNode
  className?: string
  onNearEnd?: () => void
  nearEndThreshold?: number
  showControls?: boolean
  title?: string
  titleExtra?: ReactNode
}

export const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({
  children,
  className,
  onNearEnd,
  nearEndThreshold = 200,
  showControls = true,
  title,
  titleExtra
}) => {
  const {
    scrollRef: carouselRef,
    canScrollLeft,
    canScrollRight,
    scroll: scrollCarousel
  } = useHorizontalScroll([children], { onNearEnd, nearEndThreshold })

  const hasChildren = React.Children.count(children) > 0

  return (
    <div className={className}>
      {(title || (showControls && hasChildren)) && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {title}
              {titleExtra}
            </h3>
          )}
          {showControls && hasChildren && (
            <div className="flex items-center gap-1 ml-auto">
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
          )}
        </div>
      )}
      <div
        ref={carouselRef}
        className="flex gap-3 overflow-x-auto scrollbar-none scroll-smooth pb-2"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {children}
      </div>
    </div>
  )
}
