import React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import { AssetDetails } from '@shared/contracts/avatar'
import { SalesItem } from '@renderer/shared/utils/salesData'
import { formatDateTime, formatRelativeDate } from '@renderer/shared/utils/dateUtils'
import { ASSET_TYPE_NAMES } from '../categoryUtils'

interface StatRowProps {
  label: string
  value: React.ReactNode
  tooltip?: string
  isLast?: boolean
}

const StatRow: React.FC<StatRowProps> = ({ label, value, tooltip, isLast = false }) => {
  const content = (
    <div
      className={`flex items-baseline justify-between gap-4 ${isLast ? 'pt-2 pb-0' : 'py-2'} ${tooltip ? 'cursor-default' : ''}`}
    >
      <span className="text-sm text-neutral-500 shrink-0">{label}</span>
      <span className="text-sm text-white font-medium text-right">{value}</span>
    </div>
  )
  if (!tooltip) return content
  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

interface AssetStatsProps {
  details: AssetDetails
  salesData: SalesItem | null
}

export const AssetStats: React.FC<AssetStatsProps> = ({ details }) => {
  const assetTypeId = details.AssetTypeId || details.assetType
  const assetTypeName = assetTypeId ? ASSET_TYPE_NAMES[assetTypeId] : details.itemType
  const isLimited = details.isLimited || details.isLimitedUnique

  const createdDate = details.created || details.Created || details.itemCreatedUtc
  const updatedDate = details.updated || details.Updated || details.itemUpdatedUtc
  const rows = [
    { label: 'Tradable', value: isLimited ? 'Yes' : 'No' },
    assetTypeName ? { label: 'Type', value: assetTypeName } : null,
    isLimited && details.totalQuantity !== undefined && (details.remaining ?? 0) >= 0
      ? {
        label: 'Stock',
        value: `${(details.remaining ?? 0).toLocaleString()} / ${details.totalQuantity.toLocaleString()}`
      }
      : null,
    !isLimited && details.remaining !== undefined && details.remaining > 0
      ? { label: 'Remaining', value: details.remaining.toLocaleString() }
      : null,
    createdDate
      ? {
        label: 'Created',
        value: formatRelativeDate(createdDate),
        tooltip: formatDateTime(createdDate)
      }
      : null,
    updatedDate
      ? {
        label: 'Updated',
        value: formatRelativeDate(updatedDate),
        tooltip: formatDateTime(updatedDate)
      }
      : null
  ].filter((row): row is { label: string; value: React.ReactNode; tooltip?: string } => row !== null)

  return (
    <div>
      <h3 className="text-sm font-medium text-white mb-1">Details</h3>
      <div className="flex flex-col divide-y divide-neutral-800/60">
        {rows.map((row, index) => (
          <StatRow
            key={row.label}
            label={row.label}
            value={row.value}
            tooltip={row.tooltip}
            isLast={index === rows.length - 1}
          />
        ))}
      </div>
    </div>
  )
}


