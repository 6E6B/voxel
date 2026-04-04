import React, { useMemo } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import { useRolimonsPlayer, ROLIMONS_BADGES } from '@renderer/features/avatar/api/useRolimons'

interface RolimonsBadgesProps {
  userId: number
}

const getFallbackBadgeMeta = (badgeKey: string) => ({
  label: badgeKey
    .split(/[_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' '),
  description: 'Rolimons badge',
  tier: 'common' as const,
  textColor: '#d1d5db',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  borderColor: 'rgba(255, 255, 255, 0.1)'
})

const normalizeBadgeLookup = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\+/g, 'plus')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')

const getBadgeMeta = (badgeKey: string, label?: string) => {
  const directMatch = ROLIMONS_BADGES[badgeKey]
  if (directMatch) return directMatch

  const normalizedCandidates = [badgeKey, label]
    .filter((value): value is string => Boolean(value))
    .map(normalizeBadgeLookup)

  for (const [canonicalKey, badgeMeta] of Object.entries(ROLIMONS_BADGES)) {
    const normalizedKey = normalizeBadgeLookup(canonicalKey)
    const normalizedLabel = normalizeBadgeLookup(badgeMeta.label)

    if (normalizedCandidates.includes(normalizedKey) || normalizedCandidates.includes(normalizedLabel)) {
      return badgeMeta
    }
  }

  return getFallbackBadgeMeta(label ?? badgeKey)
}

const parseBadgeTimestamp = (value: number | string | boolean | null): number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
  return null
}

export const RolimonsBadges: React.FC<RolimonsBadgesProps> = ({ userId }) => {
  const { data: rolimonsPlayer } = useRolimonsPlayer(userId, true)

  const sortedRolimonsBadges = useMemo(() => {
    if (!rolimonsPlayer?.rolibadges && !rolimonsPlayer?.rolibadgeDetails?.length) return []

    const tierOrder: Record<string, number> = {
      artifact: 1,
      award_winner: 2,
      legendary: 3,
      epic: 4,
      rare: 5,
      uncommon: 6,
      common: 7,
      award_nominee: 8,
      booster: 9
    }

    const getTier = (badgeKey: string, label?: string): string => {
      const badgeMeta = getBadgeMeta(badgeKey, label)
      return badgeMeta.tier
    }

    const badgeEntries = rolimonsPlayer.rolibadgeDetails?.length
      ? rolimonsPlayer.rolibadgeDetails.map((badge) => ({
        badgeKey: badge.key,
        label: badge.title,
        description: badge.description,
        acquiredTime: badge.acquiredTime ?? null,
        tier: getTier(badge.key, badge.title),
        tierOrder: tierOrder[getTier(badge.key, badge.title)] ?? 999
      }))
      : Object.entries(rolimonsPlayer.rolibadges ?? {})
        .filter(([, acquiredTime]) => acquiredTime !== null && acquiredTime !== false)
        .map(([badgeKey, acquiredTime]) => ({
          badgeKey,
          label: getBadgeMeta(badgeKey).label,
          description: getBadgeMeta(badgeKey).description,
          acquiredTime: parseBadgeTimestamp(acquiredTime),
          tier: getTier(badgeKey),
          tierOrder: tierOrder[getTier(badgeKey)] ?? 999
        }))

    return badgeEntries
      .sort((a, b) => {
        if (a.tierOrder !== b.tierOrder) {
          return a.tierOrder - b.tierOrder
        }
        return a.label.localeCompare(b.label)
      })
  }, [rolimonsPlayer?.rolibadges, rolimonsPlayer?.rolibadgeDetails])

  if (sortedRolimonsBadges.length === 0) return null

  const renderBadge = ({ badgeKey, label, description, acquiredTime }: { badgeKey: string; label: string; description: string; acquiredTime: number | null }) => {
    const badgeMeta = getBadgeMeta(badgeKey, label)

    return (
      <Tooltip key={badgeKey}>
        <TooltipTrigger asChild>
          <span
            className="px-2.5 py-1 border rounded-md text-xs font-medium backdrop-blur-md shadow-lg cursor-default transition-all hover:scale-105 whitespace-nowrap shrink-0"
            style={{
              color: badgeMeta.textColor,
              backgroundColor: badgeMeta.backgroundColor,
              borderColor: badgeMeta.borderColor
            }}
          >
            {label}
          </span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-semibold">{label}</div>
            <div className="text-xs text-[var(--color-text-secondary)]">
              {description}
            </div>
            {acquiredTime && (
              <div className="text-xs text-[var(--color-text-muted)] pt-1 border-t border-[var(--color-border-subtle)]">
                Earned {new Date(acquiredTime * 1000).toLocaleDateString()}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-start gap-2">
        {sortedRolimonsBadges.map(({ badgeKey, label, description, acquiredTime }) =>
          renderBadge({ badgeKey, label, description, acquiredTime })
        )}
      </div>
    </div>
  )
}

