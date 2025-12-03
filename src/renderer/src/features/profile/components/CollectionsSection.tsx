import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight, ChevronLeft, Sparkles, Music, TrendingUp, Flame, Star } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { SkeletonSquareCard } from '@renderer/components/UI/display/SkeletonCard'
import { TruncatedTextWithTooltip } from './TruncatedTextWithTooltip'
import { useRolimonsItem } from '@renderer/hooks/queries'
import { useHorizontalScroll } from '@renderer/hooks/useHorizontalScroll'

const SOUND_HAT_IDS = [24114402, 305888394, 24112667, 33070696]

interface CollectionItem {
  id: number
  name: string
  imageUrl: string
  cssTag?: string
}

interface CollectionsSectionProps {
  collections: CollectionItem[]
  isLoading: boolean
  onItemClick: (item: { id: number; name: string; imageUrl: string }) => void
  onViewAllClick?: () => void
}

export const CollectionsSection: React.FC<CollectionsSectionProps> = ({
  collections,
  isLoading,
  onItemClick,
  onViewAllClick
}) => {
  const { scrollRef, canScrollLeft, canScrollRight, scroll } = useHorizontalScroll([collections])

  if (!isLoading && collections.length === 0) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.25 }}
      className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Collections</h3>
        <button
          onClick={onViewAllClick}
          className="pressable text-xs font-bold text-neutral-400 hover:text-white flex items-center gap-2 transition-colors bg-neutral-800 px-3 py-1.5 rounded-lg"
        >
          View All <ChevronRight size={14} />
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
              className="absolute -left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full shadow-lg transition-colors border border-neutral-700"
              aria-label="Scroll left"
            >
              <ChevronLeft size={24} className="text-white" />
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
              className="absolute -right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-neutral-800 hover:bg-neutral-700 rounded-full shadow-lg transition-colors border border-neutral-700"
              aria-label="Scroll right"
            >
              <ChevronRight size={24} className="text-white" />
            </motion.button>
          )}
        </AnimatePresence>
        {/* Left fade gradient */}
        {canScrollLeft && (
          <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-[rgb(16,16,16)] to-transparent z-10 pointer-events-none" />
        )}
        {/* Right fade gradient */}
        {canScrollRight && (
          <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-l from-[rgb(16,16,16)] to-transparent z-10 pointer-events-none" />
        )}
        <div ref={scrollRef} className="overflow-x-auto pb-2 scrollbar-hide">
          <div className="flex gap-3 px-1">
        {isLoading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="w-[calc(25%-9px)] shrink-0">
                <SkeletonSquareCard />
              </div>
            ))
          : collections.slice(0, 6).map((item) => {
              const isLimited = item.cssTag === 'limited' || item.cssTag === 'limited-unique'
              const isLimitedUnique = item.cssTag === 'limited-unique'
              const isSoundHat = SOUND_HAT_IDS.includes(item.id)
              return (
                <div key={item.id} className="w-[calc(25%-9px)] shrink-0">
                  <CollectionItemCard
                    item={item}
                    isLimited={isLimited}
                    isLimitedUnique={isLimitedUnique}
                    isSoundHat={isSoundHat}
                    onItemClick={onItemClick}
                  />
                </div>
              )
            })}
          </div>
        </div>
      </div>
      {!isLoading && collections.length === 0 && (
        <div className="col-span-5 text-neutral-500 text-sm py-4 text-center">
          No collectibles found.
        </div>
      )}
    </motion.div>
  )
}

interface CollectionItemCardProps {
  item: CollectionItem
  isLimited: boolean
  isLimitedUnique: boolean
  isSoundHat: boolean
  onItemClick: (item: { id: number; name: string; imageUrl: string }) => void
}

const CollectionItemCard: React.FC<CollectionItemCardProps> = ({
  item,
  isLimited,
  isLimitedUnique,
  isSoundHat,
  onItemClick
}) => {
  // Get rolimons data for limited items
  const rolimonsItem = useRolimonsItem(isLimited ? item.id : null)

  return (
    <div
      className="group relative aspect-square bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden cursor-pointer transition-all hover:border-neutral-600 hover:shadow-lg isolate"
      onClick={() => onItemClick({ id: item.id, name: item.name, imageUrl: item.imageUrl })}
    >
      <div
        className="absolute inset-0 bg-cover bg-center blur-xl opacity-10 scale-110"
        style={{ backgroundImage: `url(${item.imageUrl})` }}
      />
      <div className="w-full h-full p-4 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800/30 to-transparent backdrop-blur-sm">
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-contain drop-shadow-lg transform group-hover:scale-110 transition-transform duration-300 relative z-10"
        />
      </div>
      <div className="absolute top-2 left-2 flex flex-col gap-1.5 z-20">
        {isLimited && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className={`flex items-center justify-center w-7 h-7 rounded-full ${isLimitedUnique ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'} backdrop-blur-md transition-all hover:scale-105 shadow-sm`}
              >
                <Sparkles size={13} strokeWidth={2.5} className="shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold text-xs">
              {isLimitedUnique ? 'Limited Unique' : 'Limited'}
            </TooltipContent>
          </Tooltip>
        )}
        {rolimonsItem?.isProjected && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm">
                <TrendingUp size={13} strokeWidth={2.5} className="shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold text-xs">
              Projected
            </TooltipContent>
          </Tooltip>
        )}
        {rolimonsItem?.isHyped && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm">
                <Flame size={13} strokeWidth={2.5} className="shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold text-xs">
              Hyped
            </TooltipContent>
          </Tooltip>
        )}
        {rolimonsItem?.isRare && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm">
                <Star size={13} strokeWidth={2.5} className="shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold text-xs">
              Rare
            </TooltipContent>
          </Tooltip>
        )}
        {isSoundHat && (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm">
                <Music size={13} strokeWidth={2.5} className="shrink-0" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-bold text-xs">
              Sound Hat
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-10 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-b-xl">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(180deg, rgba(8,8,8,0) 0%, rgba(8,8,8,0.15) 35%, rgba(8,8,8,0.85) 100%)'
          }}
        />
        <TruncatedTextWithTooltip
          text={item.name}
          className="relative p-3 text-xs font-semibold text-white line-clamp-2 leading-tight"
        />
      </div>
    </div>
  )
}
