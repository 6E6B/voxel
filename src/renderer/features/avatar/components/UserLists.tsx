import React from 'react'
import { Loader2, User } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'
import { AssetOwner, ResellerItem } from '@shared/contracts/avatar'
import { HorizontalCarousel } from '@renderer/shared/ui/navigation/HorizontalCarousel'
import { PaginatedList } from '@renderer/shared/ui/navigation/PaginatedList'
import { UserCard } from '@renderer/shared/ui/display/UserCard'
import { RobuxIcon } from '@renderer/shared/ui/icons/RobuxIcon'
import VerifiedIcon from '@renderer/shared/ui/icons/VerifiedIcon'

// ============================================================================
// Owners List
// ============================================================================

interface OwnersListProps {
  owners: AssetOwner[]
  ownersLoading: boolean
  ownerAvatars: Map<number, string>
  ownerNames: Map<number, string>
  onLoadMore: () => void
  onOwnerClick?: (userId: string | number, displayName?: string, avatarUrl?: string) => void
}

export const OwnersList: React.FC<OwnersListProps> = ({
  owners,
  ownersLoading,
  ownerAvatars,
  ownerNames,
  onLoadMore,
  onOwnerClick
}) => {
  if (ownersLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 size={20} className="animate-spin text-neutral-500" />
      </div>
    )
  }

  if (owners.length === 0) {
    return (
      <div className="text-center py-4 text-neutral-500 text-sm">No owners found</div>
    )
  }

  return (
    <HorizontalCarousel onNearEnd={onLoadMore} showControls={false}>
      {owners.map((owner) => {
        const ownerId = owner.owner?.id
        const ownerName =
          owner.owner?.name ||
          (ownerId ? ownerNames.get(ownerId) : undefined) ||
          `User ${ownerId}`
        const avatarUrl = ownerId ? ownerAvatars.get(ownerId) : undefined

        return (
          <UserCard
            key={owner.id}
            variant="owner"
            name={ownerName}
            avatarUrl={avatarUrl}
            userId={ownerId}
            serialNumber={owner.serialNumber}
            ownedSince={owner.created}
            onClick={
              onOwnerClick && ownerId
                ? () => onOwnerClick(ownerId, ownerNames.get(ownerId), ownerAvatars.get(ownerId))
                : undefined
            }
          />
        )
      })}
    </HorizontalCarousel>

  )
}

// ============================================================================
// Resellers List
// ============================================================================

interface ResellersListProps {
  resellers: ResellerItem[]
  resellersLoading: boolean
  resellerAvatars: Map<number, string>
  purchasingReseller: string | null
  onBuy: (reseller: ResellerItem) => void
  onLoadMore: () => void
}

export const ResellersList: React.FC<ResellersListProps> = ({
  resellers,
  resellersLoading,
  resellerAvatars,
  purchasingReseller,
  onBuy,
  onLoadMore
}) => {
  if (resellersLoading) {
    return (
      <div className="pt-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 size={20} className="animate-spin text-neutral-500" />
        </div>
      </div>
    )
  }

  if (resellers.length === 0) {
    return (
      <div className="pt-4">
        <h3 className="text-sm font-medium text-white mb-3">Resellers</h3>
        <div className="text-center py-4 text-neutral-500 text-sm">No resellers available</div>
      </div>
    )
  }

  return (
    <div className="pt-4">
      <h3 className="text-sm font-medium text-white mb-3">Resellers</h3>
      <div className="flex flex-col divide-y divide-neutral-800/60">
        {resellers.map((reseller) => {
          const isPurchasing = purchasingReseller === reseller.collectibleProductId
          return (
            <div
              key={reseller.collectibleProductId}
              className="flex items-center gap-3 py-2.5"
            >
              <div className="w-7 h-7 rounded-full bg-neutral-800 overflow-hidden flex-shrink-0">
                {resellerAvatars.get(reseller.seller.sellerId) ? (
                  <img
                    src={resellerAvatars.get(reseller.seller.sellerId)}
                    alt={reseller.seller.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <User size={12} className="text-neutral-600" />
                  </div>
                )}
              </div>
              <div className="flex flex-col min-w-0 flex-1">
                <div className="text-sm text-white truncate flex items-center gap-1">
                  {reseller.seller.name}
                  {reseller.seller.hasVerifiedBadge && (
                    <VerifiedIcon width={11} height={11} className="flex-shrink-0" />
                  )}
                </div>
                {reseller.serialNumber != null && (
                  <span className="text-[10px] text-neutral-500">#{reseller.serialNumber.toLocaleString()}</span>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-semibold text-emerald-400 flex items-center gap-1">
                  {reseller.price.toLocaleString()}
                  <RobuxIcon className="w-3 h-3" />
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onBuy(reseller)
                  }}
                  disabled={isPurchasing}
                  className={cn(
                    'px-3 py-1 text-xs font-medium rounded-lg transition-colors',
                    isPurchasing
                      ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                      : 'bg-neutral-800 text-white hover:bg-emerald-600 hover:text-white'
                  )}
                >
                  {isPurchasing ? <Loader2 size={10} className="animate-spin" /> : 'Buy'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
      {resellers.length >= 10 && (
        <button
          onClick={onLoadMore}
          className="w-full mt-2 py-2 text-xs text-neutral-500 hover:text-neutral-300 transition-colors"
        >
          Load more
        </button>
      )}
    </div>
  )
}

// ============================================================================
// Hoarders List
// ============================================================================

interface Hoarder {
  id?: string
  name: string
  quantity: number
}

interface HoardersListProps {
  hoardsData: {
    num_hoards?: number | null
    owner_ids?: string[] | null
    owner_names?: string[] | null
    quantities?: number[] | null
  } | null
  onOwnerClick?: (userId: string | number, displayName?: string, avatarUrl?: string) => void
}

export const HoardersList: React.FC<HoardersListProps> = ({ hoardsData, onOwnerClick }) => {
  if (!hoardsData || !hoardsData.owner_names || hoardsData.owner_names.length === 0) {
    return null
  }

  const { owner_ids, owner_names, quantities } = hoardsData

  // Create combined and sorted list
  const hoarders: Hoarder[] = owner_names
    .map((name, index) => ({
      id: owner_ids?.[index],
      name,
      quantity: quantities?.[index] || 0
    }))
    .sort((a, b) => b.quantity - a.quantity)

  if (hoarders.length === 0) return null

  const renderHoarderItem = (hoarder: Hoarder, _index: number, globalIndex: number) => (
    <div
      className={cn(
        'flex items-center justify-between p-2.5 rounded-lg transition-colors',
        'bg-neutral-800/30 hover:bg-neutral-800/50',
        onOwnerClick && hoarder.id ? 'cursor-pointer' : ''
      )}
      onClick={
        onOwnerClick && hoarder.id ? () => onOwnerClick(hoarder.id!, hoarder.name) : undefined
      }
    >
      <div className="flex items-center gap-3">
        <span className="text-neutral-500 text-xs font-medium pl-3">#{globalIndex + 1}</span>
        {onOwnerClick && hoarder.id ? (
          <span className="text-sm text-white hover:text-emerald-400 transition-colors">
            {hoarder.name}
          </span>
        ) : (
          <a
            href={`https://www.roblox.com/users/${hoarder.id}/profile`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-white hover:text-emerald-400 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            {hoarder.name}
          </a>
        )}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-amber-400 font-semibold">{hoarder.quantity}</span>
        <span className="text-neutral-500 text-xs">copies</span>
      </div>
    </div>
  )

  return (
    <PaginatedList
      items={hoarders}
      itemsPerPage={5}
      renderItem={renderHoarderItem}
      keyExtractor={(hoarder, index) => hoarder.id || index}
    />
  )
}

