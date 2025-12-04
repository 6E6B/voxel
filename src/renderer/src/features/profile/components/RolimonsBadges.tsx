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

  // Estimate rows based on badge count - each row fits roughly 4-5 badges
  const estimatedRows = Math.ceil(sortedRolimonsBadges.length / 4)
  const topPadding = estimatedRows <= 1 ? 'pt-2' : estimatedRows === 2 ? 'pt-4' : 'pt-6'

  return (
    <div className={`relative z-10 px-6 pb-4 ${topPadding}`}>
      <div className="flex flex-wrap items-center gap-2">
        {sortedRolimonsBadges.map(({ badgeKey, acquiredTime }) => {
          const badgeMeta = ROLIMONS_BADGES[badgeKey]
          if (!badgeMeta) return null
          return (
            <Tooltip key={badgeKey}>
              <TooltipTrigger asChild>
                <span
                  className={`px-2.5 py-1 ${badgeMeta.bgColor} ${badgeMeta.color} border ${badgeMeta.borderColor} rounded-md text-xs font-medium backdrop-blur-md shadow-lg cursor-default transition-all hover:scale-105`}
                >
                  {badgeMeta.label}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <div className="font-semibold">{badgeMeta.label}</div>
                  <div className="text-xs text-neutral-300">{badgeMeta.description}</div>
                  <div className="text-xs text-neutral-400 pt-1 border-t border-neutral-700">
                    Earned {new Date(acquiredTime * 1000).toLocaleDateString()}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </div>
  )
}
