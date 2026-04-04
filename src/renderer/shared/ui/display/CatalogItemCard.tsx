import { useState, useEffect, useMemo, useRef } from 'react'
import { Star, Sparkles, Music, TrendingUp, Flame } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from './Tooltip'
import { RobuxIcon } from '../icons/RobuxIcon'
import { ItemCard, ItemCardTag } from './ItemCard'
import { formatNumber } from '@renderer/shared/utils/numberUtils'
import { useRolimonsItem } from '@renderer/features/avatar/api/useRolimons'
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
  const [isCreatorTruncated, setIsCreatorTruncated] = useState(false)
  const [isPriceTruncated, setIsPriceTruncated] = useState(false)
  const creatorRef = useRef<HTMLButtonElement | HTMLSpanElement>(null)
  const priceRef = useRef<HTMLDivElement>(null)

  const handleContextMenu = (e: React.MouseEvent) => {
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
    if (
      isLimited &&
      item.lowestResalePrice !== null &&
      item.lowestResalePrice !== undefined &&
      item.lowestResalePrice > 0
    ) {
      return formatNumber(item.lowestResalePrice)
    }
    if (item.priceStatus === 'Off Sale') return 'Off Sale'
    if (item.price === 0) return 'Free'
    if (item.price !== null && item.price !== undefined) return formatNumber(item.price)
    if (item.lowestPrice !== null && item.lowestPrice !== undefined)
      return formatNumber(item.lowestPrice)
    return 'Not For Sale'
  }, [item.price, item.lowestPrice, item.lowestResalePrice, item.priceStatus, isLimited])

  const isOffSale = displayPrice === 'Off Sale' || displayPrice === 'Not For Sale'

  useEffect(() => {
    const checkTruncation = () => {
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
  }, [item.creatorName, displayPrice, isCompact])

  // Build tags
  const tags = (
    <>
      {isLimitedUnique && (
        <ItemCardTag icon={<Sparkles size={13} strokeWidth={2.5} className="shrink-0" />} label="Limited Unique" color="yellow" />
      )}
      {isLimited && !isLimitedUnique && (
        <ItemCardTag icon={<Sparkles size={13} strokeWidth={2.5} className="shrink-0" />} label="Limited" color="emerald" />
      )}
      {rolimonsItem?.isProjected && (
        <ItemCardTag icon={<TrendingUp size={13} strokeWidth={2.5} className="shrink-0" />} label="Projected" color="red" />
      )}
      {rolimonsItem?.isHyped && (
        <ItemCardTag icon={<Flame size={13} strokeWidth={2.5} className="shrink-0" />} label="Hyped" color="orange" />
      )}
      {rolimonsItem?.isRare && (
        <ItemCardTag icon={<Star size={13} strokeWidth={2.5} className="shrink-0" />} label="Rare" color="pink" />
      )}
      {item.id && SOUND_HAT_IDS.includes(item.id) && (
        <ItemCardTag icon={<Music size={13} strokeWidth={2.5} className="shrink-0" />} label="Sound Hat" color="cyan" />
      )}
      {item.itemStatus?.includes('New') && (
        <ItemCardTag icon={<span className="text-[10px] font-bold">N</span>} label="New" color="blue" />
      )}
      {item.itemStatus?.includes('Sale') && (
        <ItemCardTag icon={<span className="text-[10px] font-bold">%</span>} label="On Sale" color="red" />
      )}
    </>
  )

  return (
    <ItemCard
      name={item.name}
      thumbnailUrl={thumbnailUrl}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      index={index}
      isCompact={isCompact}
      topLabel={item.itemType}
      tags={tags}
    >
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
                className={`flex items-center gap-1 font-bold text-sm ${isOffSale
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
            className={`flex items-center gap-1 font-bold text-sm ${isOffSale ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-primary)]'
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
    </ItemCard>
  )
}

export default CatalogItemCard
