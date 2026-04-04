import React, { useState } from 'react'
import {
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  ExternalLink
} from 'lucide-react'
import { ResaleData, AssetOwner } from '@shared/contracts/avatar'
import type { RolimonsItemPage as RolimonsItemPageData } from '@shared/contracts/rolimons'
import { EmptyStateCompact } from '@renderer/shared/ui/feedback/EmptyState'
import { ValueChart, PriceChart, CombinedChart } from './EconomyChart'
import { HoardersList, OwnersList } from './UserLists'
import { cn } from '@renderer/shared/lib/utils'
import { RobuxIcon } from '@renderer/shared/ui/icons/RobuxIcon'
import { DEMAND_LABELS, TREND_LABELS, DEMAND_COLORS, TREND_COLORS } from '@renderer/features/avatar/api/useRolimons'

interface AssetEconomyTabProps {
  rolimonsItem: any
  resaleData: ResaleData | null
  resaleDataLoading: boolean
  rolimonsPageData: RolimonsItemPageData | null
  rolimonsPageLoading: boolean
  owners: AssetOwner[]
  ownersLoading: boolean
  ownerAvatars: Map<number, string>
  ownerNames: Map<number, string>
  onLoadMoreOwners: () => void
  onOwnerClick?: (userId: string | number, displayName?: string, avatarUrl?: string) => void
}

const TREND_ICONS = {
  0: ArrowDownRight,
  1: Minus,
  2: Minus,
  3: ArrowUpRight
}

const formatNumber = (num: number | undefined | null): string => {
  if (num === undefined || num === null) return '-'
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  }
  return num.toLocaleString()
}

export const AssetEconomyTab: React.FC<AssetEconomyTabProps> = ({
  rolimonsItem,
  resaleData: _resaleData,
  resaleDataLoading,
  rolimonsPageData,
  rolimonsPageLoading,
  owners,
  ownersLoading,
  ownerAvatars,
  ownerNames,
  onLoadMoreOwners,
  onOwnerClick
}) => {
  const [activeChart, setActiveChart] = useState<'value' | 'price' | 'combined'>('value')
  const isLoading = resaleDataLoading || rolimonsPageLoading

  const itemDetails = rolimonsPageData?.itemDetails
  const TrendIcon = rolimonsItem
    ? TREND_ICONS[rolimonsItem.trend as keyof typeof TREND_ICONS] || Minus
    : Minus

  // Get values from either source
  const value = itemDetails?.value ?? rolimonsItem?.value
  const rap = itemDetails?.rap ?? rolimonsItem?.rap
  const demand = itemDetails?.demand ?? rolimonsItem?.demand
  const trend = itemDetails?.trend ?? rolimonsItem?.trend

  const demandLabel = demand != null ? DEMAND_LABELS[demand] || 'Unknown' : '-'
  const trendLabel = trend != null ? TREND_LABELS[trend] || 'Unknown' : '-'
  const demandColor = demand != null ? DEMAND_COLORS[demand] : 'text-neutral-500'
  const trendColor = trend != null ? TREND_COLORS[trend] : 'text-neutral-500'

  const hasValueChart = rolimonsPageData?.valueChanges && rolimonsPageData.valueChanges.length > 0
  const hasPriceChart =
    rolimonsPageData?.historyData?.rap && rolimonsPageData.historyData.rap.length > 0

  return (
    <div className="space-y-6">
      {/* Market Overview */}
      {(value != null || rap != null) && (
        <div className="rounded-xl border border-neutral-800/60 bg-neutral-900/40 overflow-hidden">
          {/* Value & RAP */}
          <div className="grid grid-cols-2 divide-x divide-neutral-800/60">
            <div className="px-4 py-3.5">
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">Value</div>
              <div className="text-xl font-bold text-white flex items-baseline gap-1.5">
                {value != null ? formatNumber(value) : '—'}
                {value != null && <RobuxIcon className="w-3.5 h-3.5 text-neutral-500" />}
              </div>
            </div>
            <div className="px-4 py-3.5">
              <div className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">RAP</div>
              <div className="text-xl font-bold text-white flex items-baseline gap-1.5">
                {rap != null ? formatNumber(rap) : '—'}
                {rap != null && <RobuxIcon className="w-3.5 h-3.5 text-neutral-500" />}
              </div>
            </div>
          </div>

          {/* Demand & Trend footer */}
          {(demand != null || trend != null) && (
            <div className="flex items-center gap-5 px-4 py-2.5 border-t border-neutral-800/60 bg-neutral-900/30">
              {demand != null && (
                <div className="flex items-center gap-2">
                  <div className={cn(
                    'w-1.5 h-1.5 rounded-full',
                    demand >= 4 ? 'bg-cyan-400' :
                      demand >= 3 ? 'bg-emerald-400' :
                        demand >= 2 ? 'bg-yellow-400' :
                          demand >= 1 ? 'bg-orange-400' :
                            'bg-red-400'
                  )} />
                  <span className="text-xs text-neutral-400">
                    {demandLabel} demand
                  </span>
                </div>
              )}
              {trend != null && (
                <div className="flex items-center gap-1.5">
                  <TrendIcon size={12} className={trendColor} />
                  <span className="text-xs text-neutral-400">
                    {trendLabel}
                  </span>
                </div>
              )}
              <div className="ml-auto">
                {rolimonsItem && (
                  <a
                    href={`https://www.rolimons.com/item/${rolimonsItem.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-neutral-600 hover:text-neutral-400 flex items-center gap-1 transition-colors"
                  >
                    Rolimons
                    <ExternalLink size={9} />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Chart Section */}
      {(hasValueChart || hasPriceChart) && (
        <div className="space-y-3">
          <div className="flex gap-1 p-1 bg-neutral-900/50 rounded-lg w-fit">
            {hasValueChart && (
              <button
                onClick={() => setActiveChart('value')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  activeChart === 'value'
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                Value
              </button>
            )}
            {hasPriceChart && (
              <button
                onClick={() => setActiveChart('price')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  activeChart === 'price'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                RAP
              </button>
            )}
            {hasValueChart && hasPriceChart && (
              <button
                onClick={() => setActiveChart('combined')}
                className={cn(
                  'px-3 py-1.5 text-xs font-medium rounded-md transition-all',
                  activeChart === 'combined'
                    ? 'bg-cyan-500/20 text-cyan-400'
                    : 'text-neutral-500 hover:text-neutral-300'
                )}
              >
                Combined
              </button>
            )}
          </div>

          {activeChart === 'value' && hasValueChart ? (
            <ValueChart
              valueChanges={rolimonsPageData!.valueChanges ?? null}
              demand={demand}
              trend={trend}
            />
          ) : activeChart === 'price' && hasPriceChart ? (
            <PriceChart
              historyData={rolimonsPageData!.historyData ?? null}
              demand={demand}
              trend={trend}
            />
          ) : activeChart === 'combined' && hasValueChart && hasPriceChart ? (
            <CombinedChart
              valueChanges={rolimonsPageData!.valueChanges ?? null}
              historyData={rolimonsPageData?.historyData ?? null}
            />
          ) : hasValueChart ? (
            <ValueChart
              valueChanges={rolimonsPageData!.valueChanges ?? null}
              demand={demand}
              trend={trend}
            />
          ) : hasPriceChart ? (
            <PriceChart
              historyData={rolimonsPageData!.historyData ?? null}
              demand={demand}
              trend={trend}
            />
          ) : null}
        </div>
      )}

      {/* Hoarders */}
      {rolimonsPageData?.hoardsData &&
        rolimonsPageData.hoardsData.owner_names &&
        rolimonsPageData.hoardsData.owner_names.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-white mb-3">
              Top Hoarders
              <span className="text-neutral-500 font-normal ml-1.5 text-xs">
                ({rolimonsPageData.hoardsData.owner_names.length})
              </span>
            </h3>
            <HoardersList
              hoardsData={rolimonsPageData.hoardsData}
              onOwnerClick={onOwnerClick}
            />
          </div>
        )}

      {/* Owners */}
      {owners.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-white mb-3">
            Owners
            <span className="text-neutral-500 font-normal ml-1.5 text-xs">
              ({owners.length})
            </span>
          </h3>
          <OwnersList
            owners={owners}
            ownersLoading={ownersLoading}
            ownerAvatars={ownerAvatars}
            ownerNames={ownerNames}
            onLoadMore={onLoadMoreOwners}
            onOwnerClick={onOwnerClick}
          />
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !rolimonsItem && !itemDetails && (
        <EmptyStateCompact message="No market data available for this item" className="py-8" />
      )}
    </div>
  )
}

