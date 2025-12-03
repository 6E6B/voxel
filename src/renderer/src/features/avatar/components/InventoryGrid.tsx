import React, { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Search, Box, Check, Star } from 'lucide-react'
import { SkeletonInventoryCard } from '@renderer/components/UI/display/SkeletonCard'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import FavoriteParticles from '@renderer/components/UI/specialized/FavoriteParticles'
import SkinColorEditor from '../UI/SkinColorEditor'
import BodyScaleEditor from '../UI/BodyScaleEditor'
import type { Account } from '@renderer/types'
import type { MainCategory } from '../utils/categoryUtils'

interface InventoryItem {
  id: number
  name: string
  type: string
  imageUrl: string
}

interface TruncatedTextProps {
  text: string
  className?: string
}

const TruncatedText: React.FC<TruncatedTextProps> = ({ text, className }) => {
  const textRef = useRef<HTMLDivElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const element = textRef.current
    if (!element) return

    const checkTruncation = () => {
      setIsTruncated(
        element.scrollHeight > element.clientHeight || element.scrollWidth > element.clientWidth
      )
    }

    checkTruncation()

    // Use ResizeObserver instead of window resize for better performance
    const resizeObserver = new ResizeObserver(checkTruncation)
    resizeObserver.observe(element)

    return () => {
      resizeObserver.disconnect()
    }
  }, [text])

  const content = (
    <div ref={textRef} className={className}>
      {text}
    </div>
  )

  if (!isTruncated) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}

interface InventoryGridProps {
  account: Account
  filteredItems: InventoryItem[]
  isLoading: boolean
  isUpdatingAvatar: boolean
  equippedIds: Set<number>
  favoriteIds: Set<number>
  favoriteBurstKeys: Record<number, number>
  mainCategory: MainCategory
  subCategory: string
  currentBodyColors: any
  currentScales: any
  currentAvatarType: any
  onItemClick: (itemId: number) => void
  onItemContextMenu: (e: React.MouseEvent, item: InventoryItem) => void
  onUpdate: () => void
  scrollPosition: number
  onScroll: (scrollTop: number) => void
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({
  account,
  filteredItems,
  isLoading,
  isUpdatingAvatar,
  equippedIds,
  favoriteIds,
  favoriteBurstKeys,
  mainCategory,
  subCategory,
  currentBodyColors,
  currentScales,
  currentAvatarType,
  onItemClick,
  onItemContextMenu,
  onUpdate,
  scrollPosition,
  onScroll
}) => {
  const inventoryGridRef = useRef<HTMLDivElement>(null)

  // Restore scroll position when component mounts or data loads
  useEffect(() => {
    if (inventoryGridRef.current && scrollPosition > 0 && !isLoading) {
      inventoryGridRef.current.scrollTop = scrollPosition
    }
  }, [isLoading, scrollPosition])

  return (
    <div
      ref={inventoryGridRef}
      className="flex-1 overflow-y-auto p-4 scrollbar-thin bg-neutral-950 relative"
      onScroll={(e) => onScroll(e.currentTarget.scrollTop)}
    >
      {mainCategory === 'Body' && subCategory === 'Skin' ? (
        <SkinColorEditor
          account={account}
          currentBodyColors={currentBodyColors}
          onUpdate={onUpdate}
        />
      ) : mainCategory === 'Body' && subCategory === 'Scale' ? (
        <BodyScaleEditor
          account={account}
          currentScales={currentScales}
          currentAvatarType={currentAvatarType}
          onUpdate={onUpdate}
        />
      ) : isLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonInventoryCard key={i} />
          ))}
        </div>
      ) : (
        <>
          {isUpdatingAvatar && (
            <div className="absolute inset-x-0 top-0 z-20 bg-emerald-500/10 border-b border-emerald-500/20 p-2 text-center text-xs text-emerald-500 font-medium">
              Updating Avatar...
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
            {filteredItems.length > 0 ? (
              filteredItems.map((item, index) => {
                const isEquipped = equippedIds.has(item.id)
                const isFavorite = favoriteIds.has(item.id)
                return (
                  <div key={item.id}>
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.4, delay: index * 0.03 }}
                      onClick={() => onItemClick(item.id)}
                      onContextMenu={(e) => onItemContextMenu(e, item)}
                      className={`group relative aspect-square bg-neutral-900 border rounded-xl cursor-pointer transition-all overflow-hidden hover:shadow-lg isolate ${
                        isEquipped
                          ? 'border-emerald-500 ring-1 ring-emerald-500/50'
                          : 'border-neutral-800 hover:border-neutral-600'
                      }`}
                    >
                      {item.imageUrl && (
                        <div
                          className="absolute inset-0 bg-cover bg-center blur-xl opacity-10 scale-110"
                          style={{ backgroundImage: `url(${item.imageUrl})` }}
                        />
                      )}
                      <div className="w-full h-full p-4 flex items-center justify-center bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-neutral-800/30 to-transparent backdrop-blur-sm">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain transform group-hover:scale-110 transition-transform duration-300 drop-shadow-lg relative z-10"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center text-neutral-600">
                            <Box size={20} />
                          </div>
                        )}
                      </div>

                      {/* Favorite Indicator */}
                      {isFavorite && (
                        <div className="absolute top-2 left-2 w-6 h-6 rounded-full bg-neutral-900/80 flex items-center justify-center text-yellow-400 shadow-sm z-10 pointer-events-none relative overflow-visible">
                          <Star size={18} strokeWidth={0} className="fill-current" />
                          <FavoriteParticles
                            active={!!favoriteBurstKeys[item.id]}
                            color={[251, 191, 36]}
                          />
                        </div>
                      )}

                      {/* Selection Indicator */}
                      <div
                        className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm z-10 ${
                          isEquipped
                            ? 'bg-emerald-500 text-white scale-100'
                            : 'bg-neutral-800 text-neutral-600 group-hover:bg-neutral-700 group-hover:text-neutral-300 scale-0 group-hover:scale-100'
                        }`}
                      >
                        <Check size={14} strokeWidth={3} />
                      </div>

                      {/* Hover Overlay */}
                      <div className="absolute inset-x-0 bottom-0 z-20 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out">
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(180deg, rgba(8,8,8,0) 0%, rgba(8,8,8,0.15) 35%, rgba(8,8,8,0.85) 100%)'
                          }}
                        />
                        <div className="relative p-3">
                          <TruncatedText
                            text={item.name}
                            className="text-sm font-bold text-white line-clamp-2 whitespace-normal leading-tight"
                          />
                        </div>
                      </div>
                    </motion.div>
                  </div>
                )
              })
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center py-20 text-neutral-500">
                <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-4">
                  <Search size={24} className="opacity-40" />
                </div>
                <p className="text-sm font-medium text-neutral-400">No items found</p>
                <p className="text-xs mt-1 text-neutral-600">
                  Try changing categories or search terms.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
