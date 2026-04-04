import React, { useRef, useState, useEffect } from 'react'
import { Box, Check, Star, Loader2, PackageOpen, Plus } from 'lucide-react'
import { SkeletonInventoryCard } from '@renderer/shared/ui/display/SkeletonCard'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import FavoriteParticles from '@renderer/shared/ui/specialized/FavoriteParticles'
import SkinColorEditor from '../components/SkinColorEditor'
import BodyScaleEditor from '../components/BodyScaleEditor'
import type { Account } from '@renderer/shared/types'
import type { MainCategory } from '../categoryUtils'

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
  loadingItemId: number | null
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
  onCreateOutfit?: () => void
  scrollPosition: number
  onScroll: (scrollTop: number) => void
}

export const InventoryGrid: React.FC<InventoryGridProps> = ({
  account,
  filteredItems,
  isLoading,
  loadingItemId,
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
  onCreateOutfit,
  scrollPosition,
  onScroll
}) => {
  const inventoryGridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (inventoryGridRef.current && scrollPosition > 0 && !isLoading) {
      inventoryGridRef.current.scrollTop = scrollPosition
    }
  }, [isLoading, scrollPosition])

  return (
    <div
      ref={inventoryGridRef}
      className="flex-1 overflow-y-auto p-3 scrollbar-thin bg-[var(--color-surface)] relative"
      onScroll={(e) => onScroll(e.currentTarget.scrollTop)}
    >
      {mainCategory === 'Body' && subCategory === 'Skin Color' ? (
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
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <SkeletonInventoryCard key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
          {mainCategory === 'Characters' && onCreateOutfit && (
            <div>
              <div
                onClick={onCreateOutfit}
                className="group relative aspect-square rounded-xl cursor-pointer transition-all duration-200 overflow-hidden isolate bg-[var(--color-surface-muted)] border-2 border-dashed border-[var(--color-border)] hover:border-[var(--accent-color)] hover:bg-[var(--accent-color)]/5"
              >
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)] group-hover:text-[var(--accent-color)] transition-colors">
                  <Plus size={28} strokeWidth={2} />
                  <span className="text-xs font-semibold">Create Outfit</span>
                </div>
              </div>
            </div>
          )}
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => {
              const isEquipped = equippedIds.has(item.id)
              const isFavorite = favoriteIds.has(item.id)
              const isItemLoading = loadingItemId === item.id
              return (
                <div key={item.id}>
                  <div
                    onClick={() => onItemClick(item.id)}
                    onContextMenu={(e) => onItemContextMenu(e, item)}
                    className={`group relative aspect-square rounded-xl cursor-pointer transition-all duration-200 overflow-hidden isolate ${isItemLoading
                        ? 'bg-blue-500/10 border-2 border-blue-500 ring-2 ring-blue-500/20'
                        : isEquipped
                          ? 'bg-emerald-500/10 border-2 border-emerald-500 ring-2 ring-emerald-500/20'
                          : 'bg-[var(--color-surface-muted)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:shadow-lg hover:shadow-black/20'
                      }`}
                  >
                    {/* Loading Overlay */}
                    {isItemLoading && (
                      <div className="absolute inset-0 z-30 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center">
                        <Loader2 size={22} className="text-blue-400 animate-spin" />
                      </div>
                    )}

                    <div className="w-full h-full p-3.5 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain transform group-hover:scale-105 transition-transform duration-300 drop-shadow-md relative z-10"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-[var(--color-surface-muted)] rounded-full flex items-center justify-center text-[var(--color-text-muted)]">
                          <Box size={18} />
                        </div>
                      )}
                    </div>

                    {/* Favorite Indicator */}
                    {isFavorite && (
                      <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-neutral-900/80 flex items-center justify-center text-yellow-400 shadow-sm z-10 pointer-events-none relative overflow-visible">
                        <Star size={14} className="fill-current" style={{ strokeWidth: 0 }} />
                        <FavoriteParticles
                          active={!!favoriteBurstKeys[item.id]}
                          color={[251, 191, 36]}
                        />
                      </div>
                    )}

                    {/* Selection Indicator */}
                    <div
                      className={`absolute top-1.5 right-1.5 w-5.5 h-5.5 rounded-full flex items-center justify-center transition-all duration-200 z-10 ${isEquipped
                          ? 'bg-emerald-500 text-white scale-100 shadow-sm'
                          : 'bg-neutral-800/80 text-neutral-500 scale-0 group-hover:scale-100'
                        }`}
                    >
                      <Check size={12} strokeWidth={3} />
                    </div>

                    {/* Name Overlay on Hover */}
                    <div className="absolute inset-x-0 bottom-0 z-20 w-full translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out">
                      <div className="bg-gradient-to-t from-black/80 via-black/40 to-transparent pt-6 pb-2 px-2.5">
                        <TruncatedText
                          text={item.name}
                          className="text-xs font-semibold text-white drop-shadow-md line-clamp-2 whitespace-normal leading-tight"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          ) : mainCategory === 'Characters' && onCreateOutfit ? null : (
            <EmptyState
              icon={PackageOpen}
              title="No items found"
              description="Try a different category or search term"
              className="col-span-full"
            />
          )}
        </div>
      )}
    </div>
  )
}




