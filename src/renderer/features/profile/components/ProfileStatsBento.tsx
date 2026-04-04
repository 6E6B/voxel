import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  History,
  MapPin,
  TrendingUp,
  Clock,
  Activity,
  Eye
} from 'lucide-react'
import { AccountStatus } from '@renderer/shared/types'
import { ProfileData } from '../hooks/useProfileData'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import { formatNumber } from '@renderer/shared/utils/numberUtils'
import { formatDate, formatDateTime, formatRelativeDate } from '@renderer/shared/utils/dateUtils'
import { useRolimonsPlayer } from '@renderer/features/avatar/api/useRolimons'
import { useUserCollectiblesRap } from '@renderer/features/profile/api/useUserCollectiblesRap'
import { RobuxIcon } from '@renderer/shared/ui/icons/RobuxIcon'
import { useLastSeenStore } from '@renderer/features/profile/useLastSeenStore'
import { LimitedsModal } from './LimitedsModal'

interface ProfileStatsBentoProps {
  profile: ProfileData
  userId: number
  requestCookie: string
  pastUsernames?: string[]
}

const StatPill: React.FC<{
  icon: React.ElementType
  label: string
  value: React.ReactNode
  tooltip?: string
  onClick?: () => void
}> = ({ icon: Icon, label, value, tooltip, onClick }) => {
  const pill = (
    <div
      className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--color-surface-strong)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)] transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <Icon size={13} className="text-[var(--color-text-muted)] shrink-0" />
      <span className="text-[11px] text-[var(--color-text-muted)] font-medium whitespace-nowrap">{label}</span>
      <span className="text-xs text-[var(--color-text-primary)] font-semibold whitespace-nowrap ml-auto">{value}</span>
    </div>
  )

  if (!tooltip) return pill

  return (
    <Tooltip>
      <TooltipTrigger asChild>{pill}</TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  )
}

export const ProfileStatsBento: React.FC<ProfileStatsBentoProps> = ({
  profile,
  userId,
  requestCookie,
  pastUsernames = []
}) => {
  const [showRelativeJoinDate, setShowRelativeJoinDate] = useState(false)
  const [isLimitedsOpen, setIsLimitedsOpen] = useState(false)
  const { data: rolimonsPlayer } = useRolimonsPlayer(userId, true)
  const { data: collectiblesRap } = useUserCollectiblesRap(userId, requestCookie, true)
  const lastSeenTimestamp = useLastSeenStore((s) => s.lastSeen[userId])
  const shouldShowLastSeen =
    !!lastSeenTimestamp &&
    (profile.status === AccountStatus.Online ||
      profile.status === AccountStatus.InGame ||
      profile.status === AccountStatus.InStudio)

  const lastOnlineDate = useMemo(() => {
    if (rolimonsPlayer?.last_online === undefined || rolimonsPlayer?.last_online === null) {
      return null
    }
    return new Date(rolimonsPlayer.last_online * 1000)
  }, [rolimonsPlayer?.last_online])

  const filteredPastUsernames = useMemo(
    () => pastUsernames.filter((name) => !/^#+$/.test(name.trim())),
    [pastUsernames]
  )

  const hasRapStat = collectiblesRap !== undefined && collectiblesRap.rap > 0

  const hasActivityStats =
    (profile.placeVisits !== undefined && profile.placeVisits !== 0) ||
    (profile.concurrentPlayers !== undefined && profile.concurrentPlayers !== 0)

  const hasAny =
    hasRapStat || hasActivityStats || filteredPastUsernames.length > 0 || !!lastOnlineDate || shouldShowLastSeen

  if (!hasAny) return null

  const joinRelative = formatRelativeDate(profile.joinDate, { fallback: '-' })
  const joinAbsolute = formatDate(profile.joinDate, { fallback: '-' })

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.12 }}
      className="flex flex-wrap gap-2"
    >
      <StatPill
        icon={Calendar}
        label="Joined"
        value={showRelativeJoinDate ? joinRelative : joinAbsolute}
        tooltip={showRelativeJoinDate ? joinAbsolute : joinRelative}
        onClick={() => setShowRelativeJoinDate((prev) => !prev)}
      />

      {lastOnlineDate && (
        <StatPill
          icon={Clock}
          label="Last Online"
          value={formatRelativeDate(lastOnlineDate)}
          tooltip={formatDateTime(lastOnlineDate)}
        />
      )}

      {shouldShowLastSeen && (
        <StatPill
          icon={Eye}
          label="Last Seen"
          value={formatRelativeDate(new Date(lastSeenTimestamp))}
          tooltip={formatDateTime(new Date(lastSeenTimestamp))}
        />
      )}

      {filteredPastUsernames.length > 0 && (
        <StatPill
          icon={History}
          label="Past Names"
          value={formatNumber(filteredPastUsernames.length)}
          tooltip={`${filteredPastUsernames.slice(0, 20).join(', ')}${filteredPastUsernames.length > 20 ? '…' : ''}`}
        />
      )}

      {/* Activity stats */}
      {profile.placeVisits !== undefined && profile.placeVisits !== 0 && (
        <StatPill
          icon={MapPin}
          label="Place Visits"
          value={formatNumber(profile.placeVisits)}
        />
      )}

      {profile.concurrentPlayers !== undefined && profile.concurrentPlayers !== 0 && (
        <StatPill
          icon={Activity}
          label="Active"
          value={formatNumber(profile.concurrentPlayers)}
        />
      )}

      {hasRapStat && collectiblesRap && (
        <StatPill
          icon={TrendingUp}
          label="RAP"
          value={
            <span className="flex items-center gap-1">
              {formatNumber(collectiblesRap.rap)}
              <RobuxIcon className="w-3 h-3" />
            </span>
          }
          tooltip={`${formatNumber(collectiblesRap.collectibleCount)} limited${collectiblesRap.collectibleCount === 1 ? '' : 's'} — click to view inventory`}
          onClick={() => setIsLimitedsOpen(true)}
        />
      )}

      <LimitedsModal
        isOpen={isLimitedsOpen}
        onClose={() => setIsLimitedsOpen(false)}
        userId={userId}
        requestCookie={requestCookie}
        displayName={profile.displayName}
      />
    </motion.div>
  )
}

