import React, { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { useRolimonsPlayer, ROLIMONS_BADGES } from '@renderer/features/avatar/api/useRolimons'

interface RolimonsBadgesProps {
  userId: number
}

export const RolimonsBadges: React.FC<RolimonsBadgesProps> = ({ userId }) => {
  const { data: rolimonsPlayer } = useRolimonsPlayer(userId, true)

  const sortedRolimonsBadges = useMemo(() => {
    if (!rolimonsPlayer?.rolibadges) return []

    const colorOrder: Record<string, number> = {
      yellow: 1,
      amber: 2,
      orange: 3,
      red: 4,
      rose: 5,
      pink: 6,
      purple: 7,
      violet: 8,
      indigo: 9,
      blue: 10,
      sky: 11,
      cyan: 12,
      teal: 13,
      emerald: 14,
      green: 15,
      lime: 16,
      neutral: 17
    }

    const getColorType = (badgeKey: string): string => {
      const badgeMeta = ROLIMONS_BADGES[badgeKey]
      if (!badgeMeta) return 'neutral'
      const colorMatch = badgeMeta.color.match(/text-(\w+)-/)
      return colorMatch ? colorMatch[1] : 'neutral'
    }

    return Object.entries(rolimonsPlayer.rolibadges)
      .map(([badgeKey, acquiredTime]) => ({
        badgeKey,
        acquiredTime,
        colorType: getColorType(badgeKey),
        colorOrder: colorOrder[getColorType(badgeKey)] ?? 999
      }))
      .sort((a, b) => {
        if (a.colorOrder !== b.colorOrder) {
          return a.colorOrder - b.colorOrder
        }
        return a.badgeKey.localeCompare(b.badgeKey)
      })
  }, [rolimonsPlayer?.rolibadges])

  if (sortedRolimonsBadges.length === 0) return null

  // Wrap at ~half of the available header width.
  const topPadding = sortedRolimonsBadges.length <= 4 ? 'pt-2' : 'pt-4'

  const renderBadge = ({ badgeKey, acquiredTime }: { badgeKey: string; acquiredTime: number }) => {
    const badgeMeta = ROLIMONS_BADGES[badgeKey]
    if (!badgeMeta) return null

    return (
      <Tooltip key={badgeKey}>
        <TooltipTrigger asChild>
          <span
            className={`px-2.5 py-1 ${badgeMeta.bgColor} ${badgeMeta.color} border ${badgeMeta.borderColor} rounded-md text-xs font-medium backdrop-blur-md shadow-lg cursor-default transition-all hover:scale-105 whitespace-nowrap shrink-0`}
          >
            {badgeMeta.label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-semibold">{badgeMeta.label}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {badgeMeta.description}
            </div>
            <div className="text-xs text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border-subtle)]">
              Earned {new Date(acquiredTime * 1000).toLocaleDateString()}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className={`relative z-10 px-6 pb-4 ${topPadding}`}>
      <div className="w-full max-w-full sm:max-w-[50%]">
        <div className="flex flex-wrap items-center justify-start gap-2">
          {sortedRolimonsBadges.map(({ badgeKey, acquiredTime }) =>
            renderBadge({ badgeKey, acquiredTime })
          )}
        </div>
      </div>
    </div>
  )
}
