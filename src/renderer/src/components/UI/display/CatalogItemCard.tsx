import { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import { Package, Star, Sparkles, Music, TrendingUp, Flame } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from './Tooltip'
import { RobuxIcon } from '../icons/RobuxIcon'
import { formatNumber } from '@renderer/utils/numberUtils'
import { useRolimonsItem } from '@renderer/hooks/queries'
import VerifiedIcon from '../icons/VerifiedIcon'

// Sound Hat IDs
const SOUND_HAT_IDS = [24114402, 305888394, 24112667, 33070696]

export interface CatalogItemCardItem {
  id: number
  name: string
  itemType: string
  assetType?: number
  creatorTargetId?: number
  price?: number | null
  lowestPrice?: number | null
  lowestResalePrice?: number | null
  creatorName?: string
  creatorHasVerifiedBadge?: boolean
  favoriteCount?: number
  collectibleItemId?: string | null
  totalQuantity?: number | null
  hasResellers?: boolean
  priceStatus?: string
  itemStatus?: string[]
  itemRestrictions?: string[]
}

export interface CatalogItemCardProps {
  item: CatalogItemCardItem
  thumbnailUrl?: string
  index: number
  onClick: () => void
  onContextMenu?: (
    e: React.MouseEvent,
    item: { id: number; name: string; assetType?: number }
  ) => void
  onCreatorClick?: (creatorId: number, creatorName?: string) => void
  isCompact?: boolean
}

export const CatalogItemCard = ({
  item,
  thumbnailUrl,
  index,
  onClick,
  onContextMenu,
  onCreatorClick,
  isCompact = false
}: CatalogItemCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [isNameTruncated, setIsNameTruncated] = useState(false)
  const [isCreatorTruncated, setIsCreatorTruncated] = useState(false)
  const [isPriceTruncated, setIsPriceTruncated] = useState(false)
  const nameRef = useRef<HTMLHeadingElement>(null)
  const creatorRef = useRef<HTMLButtonElement | HTMLSpanElement>(null)
  const priceRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onContextMenu) {
      onContextMenu(e, { id: item.id, name: item.name, assetType: item.assetType })
    }
  }
  const handleCreatorClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (item.creatorTargetId && onCreatorClick) {
      onCreatorClick(item.creatorTargetId, item.creatorName)
    }
  }
  // Check if item is limited based on itemRestrictions array
  const isLimitedUnique = item.itemRestrictions?.includes('LimitedUnique') ?? false
  const isLimited = isLimitedUnique || (item.itemRestrictions?.includes('Limited') ?? false)
  const hasResale = item.hasResellers && item.lowestResalePrice

  // Get rolimons data for limited items
  const rolimonsItem = useRolimonsItem(isLimited ? item.id : null)

  // Determine price to display
  const displayPrice = useMemo(() => {
    // For limited items, show lowest resale price if available
    if (
      isLimited &&
      item.lowestResalePrice !== null &&
      item.lowestResalePrice !== undefined &&
      item.lowestResalePrice > 0
    ) {
      return formatNumber(item.lowestResalePrice)
    }

    // Check status first - if off sale, it's not free
    if (item.priceStatus === 'Off Sale') return 'Off Sale'

    if (item.price === 0) return 'Free'
    if (item.price !== null && item.price !== undefined) return formatNumber(item.price)
    if (item.lowestPrice !== null && item.lowestPrice !== undefined)
      return formatNumber(item.lowestPrice)

    return 'Not For Sale'
  }, [item.price, item.lowestPrice, item.lowestResalePrice, item.priceStatus, isLimited])

  const isOffSale = displayPrice === 'Off Sale' || displayPrice === 'Not For Sale'

  // Check if text is truncated
  useEffect(() => {
    const checkTruncation = () => {
      if (nameRef.current) {
        setIsNameTruncated(nameRef.current.scrollWidth > nameRef.current.clientWidth)
      }
      if (creatorRef.current) {
        setIsCreatorTruncated(creatorRef.current.scrollWidth > creatorRef.current.clientWidth)
      }
      if (priceRef.current) {
        setIsPriceTruncated(priceRef.current.scrollWidth > priceRef.current.clientWidth)
      }
    }

    checkTruncation()
    window.addEventListener('resize', checkTruncation)
    return () => window.removeEventListener('resize', checkTruncation)
  }, [item.name, item.creatorName, displayPrice, isCompact])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className="group relative flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden cursor-pointer hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)] hover:shadow-lg hover:-translate-y-1 transition-all duration-300 text-[var(--color-text-secondary)]"
    >
      {/* Image Container */}
      <div
        className={`w-full relative overflow-hidden bg-[var(--color-surface-muted)] ${isCompact ? 'aspect-square p-0' : 'aspect-square p-2'}`}
      >
        <div
          className={`w-full h-full relative overflow-hidden bg-[var(--color-surface-hover)] ${isCompact ? '' : 'rounded-lg'}`}
        >
          {/* Tags  */}
          <div
            className={`absolute flex flex-col gap-1.5 z-10 ${isCompact ? 'top-1 left-1' : 'top-2 left-2'}`}
          >
            {isLimitedUnique && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 hover:bg-yellow-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
                    <Sparkles size={13} strokeWidth={2.5} className="shrink-0" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">
                  Limited Unique
                </TooltipContent>
              </Tooltip>
            )}
            {isLimited && !isLimitedUnique && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
                    <Sparkles size={13} strokeWidth={2.5} className="shrink-0" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">
                  Limited
                </TooltipContent>
              </Tooltip>
            )}
            {rolimonsItem?.isProjected && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
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
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
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
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
                    <Star size={13} strokeWidth={2.5} className="shrink-0" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">
                  Rare
                </TooltipContent>
              </Tooltip>
            )}
            {item.id && SOUND_HAT_IDS.includes(item.id) && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
                    <Music size={13} strokeWidth={2.5} className="shrink-0" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">
                  Sound Hat
                </TooltipContent>
              </Tooltip>
            )}
            {item.itemStatus?.includes('New') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
                    <span className="text-[10px] font-bold">N</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">
                  New
                </TooltipContent>
              </Tooltip>
            )}
            {item.itemStatus?.includes('Sale') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
                    <span className="text-[10px] font-bold">%</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="font-bold text-xs">
                  On Sale
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {thumbnailUrl ? (
            <>
              {!imageLoaded && (
                <div className="absolute inset-0 bg-[var(--color-border-subtle)] animate-pulse" />
              )}
              <img
                src={thumbnailUrl}
                alt={item.name}
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-contain transition-all duration-500 group-hover:scale-110 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-[var(--color-text-muted)]">
              <Package size={32} />
            </div>
          )}
        </div>
      </div>

      {/* Item Info */}
      <div
        className={`flex flex-col gap-1.5 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-muted)] ${isCompact ? 'p-2' : 'p-3'}`}
      >
        {isNameTruncated ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <h3
                ref={nameRef}
                className="font-medium text-sm text-[var(--color-text-primary)] truncate"
              >
                {item.name}
              </h3>
            </TooltipTrigger>
            <TooltipContent>{item.name}</TooltipContent>
          </Tooltip>
        ) : (
          <h3
            ref={nameRef}
            className="font-medium text-sm text-[var(--color-text-primary)] truncate"
          >
            {item.name}
          </h3>
        )}

        {!isCompact && (
          <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)]">
            {/* Creator */}
            <div className="flex items-center gap-1 truncate max-w-[70%]">
              {item.creatorTargetId && onCreatorClick ? (
                isCreatorTruncated ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        ref={creatorRef as React.RefObject<HTMLButtonElement>}
                        type="button"
                        onClick={handleCreatorClick}
                        className={`truncate text-left hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-sm transition-colors text-xs ${item.creatorHasVerifiedBadge ? 'text-[#3385ff] font-medium' : 'text-[var(--color-text-muted)]'}`}
                      >
                        {item.creatorName}
                      </button>
                    </TooltipTrigger>
                    {item.creatorName && <TooltipContent>{item.creatorName}</TooltipContent>}
                  </Tooltip>
                ) : (
                  <button
                    ref={creatorRef as React.RefObject<HTMLButtonElement>}
                    type="button"
                    onClick={handleCreatorClick}
                    className={`truncate text-left hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] rounded-sm transition-colors text-xs ${item.creatorHasVerifiedBadge ? 'text-[#3385ff] font-medium' : 'text-[var(--color-text-muted)]'}`}
                  >
                    {item.creatorName}
                  </button>
                )
              ) : isCreatorTruncated ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span
                      ref={creatorRef as React.RefObject<HTMLSpanElement>}
                      className={`truncate text-xs ${item.creatorHasVerifiedBadge ? 'text-[#3385ff] font-medium' : 'text-[var(--color-text-muted)]'}`}
                    >
                      {item.creatorName}
                    </span>
                  </TooltipTrigger>
                  {item.creatorName && <TooltipContent>{item.creatorName}</TooltipContent>}
                </Tooltip>
              ) : (
                <span
                  ref={creatorRef as React.RefObject<HTMLSpanElement>}
                  className={`truncate text-xs ${item.creatorHasVerifiedBadge ? 'text-[#3385ff] font-medium' : 'text-[var(--color-text-muted)]'}`}
                >
                  {item.creatorName}
                </span>
              )}
              {item.creatorHasVerifiedBadge && (
                <VerifiedIcon width={14} height={14} className="shrink-0" />
              )}
            </div>

            {/* Favorite Count */}
            {item.favoriteCount !== undefined && item.favoriteCount > 0 && (
              <div className="flex items-center gap-1.5 shrink-0">
                <Star size={16} className="text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-secondary)]">
                  {formatNumber(item.favoriteCount)}
                </span>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          {/* Price */}
          {isPriceTruncated ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  ref={priceRef}
                  className={`flex items-center gap-1 font-bold text-sm ${
                    isOffSale
                      ? 'text-[var(--color-text-muted)]'
                      : 'text-[var(--color-text-primary)]'
                  }`}
                >
                  {!isOffSale && displayPrice !== 'Free' && (
                    <RobuxIcon className="w-4 h-4 text-[var(--color-text-primary)]" />
                  )}
                  <span className={displayPrice === 'Free' ? 'text-emerald-400' : ''}>
                    {displayPrice}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {displayPrice !== 'Free' &&
                displayPrice !== 'Off Sale' &&
                displayPrice !== 'Not For Sale' ? (
                  <span className="flex items-center gap-1">
                    {!isOffSale && displayPrice !== 'Free' && (
                      <RobuxIcon className="w-4 h-4 text-white" />
                    )}
                    {displayPrice}
                  </span>
                ) : (
                  displayPrice
                )}
              </TooltipContent>
            </Tooltip>
          ) : (
            <div
              ref={priceRef}
              className={`flex items-center gap-1 font-bold text-sm ${
                isOffSale ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
              }`}
            >
              {!isOffSale && displayPrice !== 'Free' && (
                <RobuxIcon className="w-4 h-4 text-[var(--color-text-primary)]" />
              )}
              <span className={displayPrice === 'Free' ? 'text-emerald-400' : ''}>
                {displayPrice}
              </span>
            </div>
          )}

          {/* Resale Price tooltip or indicator */}
          {hasResale && !isLimited && (
            <div
              className="flex items-center gap-1 text-xs text-[var(--color-text-muted)]"
              title="Resale available"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default CatalogItemCard
