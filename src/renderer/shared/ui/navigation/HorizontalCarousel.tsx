import React, { ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'
import { useHorizontalScroll } from '@renderer/shared/hooks/useHorizontalScroll'

interface HorizontalCarouselProps {
  children: ReactNode
  className?: string
  onNearEnd?: () => void
  nearEndThreshold?: number
  showControls?: boolean
  showEdgeFade?: boolean
  title?: string
  titleExtra?: ReactNode
}

export const HorizontalCarousel: React.FC<HorizontalCarouselProps> = ({
  children,
  className,
  onNearEnd,
  nearEndThreshold = 200,
  showControls = true,
  showEdgeFade,
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
  const shouldShowEdgeFade = showEdgeFade ?? showControls

  return (
    <div className={className}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          {title && (
            <h3 className="text-lg font-semibold text-white flex items-center gap-2">
              {title}
              {titleExtra}
            </h3>
          )}
        </div>
      )}
      <div className="relative overflow-visible">
        <AnimatePresence>
          {showControls && hasChildren && canScrollLeft && (
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
          {showControls && hasChildren && canScrollRight && (
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
        {shouldShowEdgeFade && canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[var(--color-surface)] to-transparent z-10 pointer-events-none" />
        )}
        {shouldShowEdgeFade && canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[var(--color-surface)] to-transparent z-10 pointer-events-none" />
        )}
        <div
          ref={carouselRef}
          className="overflow-x-auto pb-2 pt-2 scrollbar-hide"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex gap-3 pr-3">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

