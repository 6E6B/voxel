import React from 'react'
import { Sparkles, TrendingUp, Flame, Star, Music, User } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'
import { AssetDetails, RecommendationItem, ResellerItem } from '@shared/contracts/avatar'
import { SalesItem } from '@renderer/shared/utils/salesData'
import { linkify } from '@renderer/shared/utils/linkify'
import { AssetStats } from './AssetStats'
import { AssetPricing } from './AssetPricing'
import { RecommendationsList } from './RecommendationsList'
import { ResellersList } from './UserLists'
import VerifiedIcon from '@renderer/shared/ui/icons/VerifiedIcon'

// Sound Hat IDs
const SOUND_HAT_IDS = [24114402, 305888394, 24112667, 33070696]

// Inline AssetMetadata component
const AssetMetadata: React.FC<{
  details: AssetDetails
  creatorAvatarUrl: string | null
  onCreatorClick?: () => void
}> = ({ details, creatorAvatarUrl, onCreatorClick }) => (
  <div>
    <div className="flex items-center gap-2 text-neutral-400 min-w-0">
      {creatorAvatarUrl ? (
        <img
          src={creatorAvatarUrl}
          alt={details.creatorName}
          className={cn(
            'w-7 h-7 rounded-full shrink-0 object-cover',
            details.creatorType === 'User' &&
            'cursor-pointer hover:ring-2 hover:ring-white/30 transition-all'
          )}
          onClick={onCreatorClick}
        />
      ) : (
        <User size={16} className="shrink-0" />
      )}
      <span className="truncate">
        Created by{' '}
        <span
          className={cn(
            'inline-flex items-center gap-1 font-semibold',
            details.creatorHasVerifiedBadge ? 'text-[#3385ff]' : 'text-white',
            details.creatorType === 'User' && 'hover:underline cursor-pointer'
          )}
          onClick={onCreatorClick}
        >
          <span className="truncate">{details.creatorName}</span>
          {details.creatorHasVerifiedBadge && (
            <VerifiedIcon width={14} height={14} className="shrink-0" />
          )}
        </span>
      </span>
      {details.creatorType === 'Group' && (
        <span className="px-1.5 py-0.5 text-[10px] bg-neutral-800 rounded text-neutral-400 shrink-0">
          GROUP
        </span>
      )}
    </div>
  </div>
)

// Inline AssetDescription component
const AssetDescription: React.FC<{ description: string | null | undefined }> = ({
  description
}) => (
  <div className="space-y-2">
    <h3 className="text-sm font-medium text-white">Description</h3>
    <div className="text-sm text-neutral-400 whitespace-pre-wrap leading-relaxed max-h-[200px] overflow-y-auto scrollbar-thin">
      {description ? linkify(description) : 'No description available.'}
    </div>
  </div>
)

interface AssetInfoTabProps {
  details: AssetDetails
  currentAssetId: number | null
  creatorAvatarUrl: string | null
  salesData: SalesItem | null
  rolimonsItem: any
  recommendations: RecommendationItem[]
  recommendationThumbnails: Map<number, string>
  resellers: ResellerItem[]
  resellersLoading: boolean
  resellerAvatars: Map<number, string>
  purchasingReseller: string | null
  onBuyReseller: (reseller: ResellerItem) => void
  onLoadMoreResellers: () => void
  onCreatorClick: () => void
  onRecommendationClick: (item: RecommendationItem) => void
  onPurchaseSuccess?: (details: AssetDetails, price: number | string) => void
  onPurchaseError?: (error: string) => void
  cookie?: string
  userId?: string
  ownershipRefreshKey?: number
}

export const AssetInfoTab: React.FC<AssetInfoTabProps> = ({
  details,
  currentAssetId,
  creatorAvatarUrl,
  salesData,
  rolimonsItem,
  recommendations,
  recommendationThumbnails,
  resellers,
  resellersLoading,
  resellerAvatars,
  purchasingReseller,
  onBuyReseller,
  onLoadMoreResellers,
  onCreatorClick,
  onRecommendationClick,
  onPurchaseSuccess,
  onPurchaseError,
  cookie,
  userId,
  ownershipRefreshKey
}) => {
  const isLimited = details.isLimited || details.isLimitedUnique
  return (
    <>
      <div className="flex flex-col gap-2">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-white">{details.name}</h1>
            <div className="flex flex-wrap gap-2 items-center">
              {details.isLimited && !details.isLimitedUnique && (
                <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded text-xs font-medium flex items-center gap-1">
                  <Sparkles size={10} /> Limited
                </span>
              )}
              {details.isLimitedUnique && (
                <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 rounded text-xs font-medium flex items-center gap-1">
                  <Sparkles size={10} /> Limited U
                </span>
              )}
              {rolimonsItem?.isProjected && (
                <span className="px-2 py-1 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs font-medium flex items-center gap-1">
                  <TrendingUp size={10} /> Projected
                </span>
              )}
              {rolimonsItem?.isHyped && (
                <span className="px-2 py-1 bg-orange-500/10 text-orange-400 border border-orange-500/20 rounded text-xs font-medium flex items-center gap-1">
                  <Flame size={10} /> Hyped
                </span>
              )}
              {rolimonsItem?.isRare && (
                <span className="px-2 py-1 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded text-xs font-medium flex items-center gap-1">
                  <Star size={10} /> Rare
                </span>
              )}
              {currentAssetId && SOUND_HAT_IDS.includes(currentAssetId) && (
                <span className="px-2 py-1 bg-cyan-500/10 text-cyan-500 border border-cyan-500/20 rounded text-xs font-medium flex items-center gap-1">
                  <Music size={10} /> Sound Hat
                </span>
              )}
              {details.isPBR && (
                <span className="px-2 py-1 bg-purple-500/10 text-purple-500 border border-purple-500/20 rounded text-xs font-medium">
                  PBR
                </span>
              )}
              {details.itemStatus?.includes('New') && (
                <span className="px-2 py-1 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded text-xs font-medium">
                  New
                </span>
              )}
              {details.itemStatus?.includes('Sale') && (
                <span className="px-2 py-1 bg-red-500/10 text-red-500 border border-red-500/20 rounded text-xs font-medium">
                  Sale
                </span>
              )}
            </div>
          </div>
        </div>

        <AssetMetadata
          details={details}
          creatorAvatarUrl={creatorAvatarUrl}
          onCreatorClick={onCreatorClick}
        />
      </div>

      <AssetPricing
        details={details}
        onPurchaseSuccess={onPurchaseSuccess}
        onPurchaseError={onPurchaseError}
        cookie={cookie}
        userId={userId}
        ownershipRefreshKey={ownershipRefreshKey}
      />

      <AssetDescription description={details.description} />

      <AssetStats details={details} salesData={salesData} />

      {/* Resellers - Only for limited items */}
      {isLimited && (
        <ResellersList
          resellers={resellers}
          resellersLoading={resellersLoading}
          resellerAvatars={resellerAvatars}
          purchasingReseller={purchasingReseller}
          onBuy={onBuyReseller}
          onLoadMore={onLoadMoreResellers}
        />
      )}

      {/* Recommendations Carousel */}
      <RecommendationsList
        recommendations={recommendations}
        recommendationThumbnails={recommendationThumbnails}
        onItemClick={onRecommendationClick}
        showSeparator={isLimited}
      />
    </>
  )
}

