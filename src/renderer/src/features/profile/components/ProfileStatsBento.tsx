import React, { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Activity, Calendar, Coins, Heart, History, MapPin, TrendingUp, Users, Clock } from 'lucide-react'
import { ProfileData } from '../hooks/useProfileData'
import { StatRow } from './StatRow'
import { SlidingNumber } from '@renderer/components/UI/specialized/SlidingNumber'
import { formatNumber } from '@renderer/utils/numberUtils'
import { formatDate, formatDateTime, formatRelativeDate } from '@renderer/utils/dateUtils'
import { useRolimonsPlayer } from '@renderer/features/avatar/api/useRolimons'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'

interface ProfileStatsBentoProps {
  profile: ProfileData
  userId: number
  pastUsernames?: string[]
}

const BentoCard: React.FC<
  React.PropsWithChildren<{ title: string; className?: string; icon?: React.ReactNode }>
> = ({ title, className, icon, children }) => {
  return (
    <div
      className={`bg-[var(--color-surface-strong)] border border-[var(--color-border)] rounded-xl p-4 shadow-[var(--shadow-lg)]/40 ${className ?? ''}`}
    >
      <h3 className="text-sm font-bold text-[var(--color-text-primary)] flex items-center gap-2">
        {icon}
        {title}
      </h3>
      <div className="h-px bg-[var(--color-border-subtle)] mt-3 mb-1 -mx-4" />
      {children}
    </div>
  )
}

export const ProfileStatsBento: React.FC<ProfileStatsBentoProps> = ({
  profile,
  userId,
  pastUsernames = []
}) => {
  const [showRelativeJoinDate, setShowRelativeJoinDate] = useState(false)
  const { data: rolimonsPlayer } = useRolimonsPlayer(userId, true)

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

  const hasValueStats =
    (rolimonsPlayer?.value !== undefined && rolimonsPlayer.value !== null) ||
    (rolimonsPlayer?.rap !== undefined && rolimonsPlayer.rap !== null)

  const hasActivityStats =
    profile.placeVisits !== undefined ||
    profile.totalFavorites !== undefined ||
    profile.concurrentPlayers !== undefined

  const hasAny =
    hasValueStats || hasActivityStats || filteredPastUsernames.length > 0 || !!lastOnlineDate

  if (!hasAny) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay: 0.12 }}
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4"
    >
      <BentoCard
        title="Account"
        icon={<Users size={14} className="text-[var(--color-text-muted)]" />}
        className="lg:col-span-4"
      >
        {(() => {
          const relative = formatRelativeDate(profile.joinDate, { fallback: '-' })
          const absolute = formatDate(profile.joinDate, { fallback: '-' })
          const value = showRelativeJoinDate ? relative : absolute
          const tooltip = showRelativeJoinDate ? absolute : relative
          return (
            <StatRow
              icon={Calendar}
              label="Join Date"
              value={value}
              onClick={() => setShowRelativeJoinDate((prev) => !prev)}
              title={tooltip}
            />
          )
        })()}

        <StatRow
          icon={Users}
          label="Groups"
          value={
            <SlidingNumber
              number={profile.groupMemberCount}
              formatter={formatNumber}
              className="text-sm text-[var(--color-text-primary)] font-semibold"
            />
          }
        />

        {lastOnlineDate && (
          <StatRow
            icon={Clock}
            label="Last Online"
            value={
              <span className="text-sm text-[var(--color-text-primary)] font-semibold">
                {formatRelativeDate(lastOnlineDate)}
              </span>
            }
            title={formatDateTime(lastOnlineDate)}
          />
        )}

        {filteredPastUsernames.length > 0 && (
          <StatRow
            icon={History}
            label="Past Usernames"
            value={
              <span className="text-sm text-[var(--color-text-primary)] font-semibold">
                {formatNumber(filteredPastUsernames.length)}
              </span>
            }
            title={`${filteredPastUsernames.slice(0, 20).join(', ')}${
              filteredPastUsernames.length > 20 ? '…' : ''
            }`}
          />
        )}
      </BentoCard>

      <BentoCard
        title="Activity"
        icon={<Activity size={14} className="text-[var(--color-text-muted)]" />}
        className="lg:col-span-4"
      >
        {profile.placeVisits !== undefined && (
          <StatRow
            icon={MapPin}
            label="Place Visits"
            value={
              <SlidingNumber
                number={profile.placeVisits}
                formatter={formatNumber}
                className="text-sm text-[var(--color-text-primary)] font-semibold"
              />
            }
          />
        )}

        {profile.totalFavorites !== undefined && (
          <StatRow
            icon={Heart}
            label="Favorites"
            value={
              <SlidingNumber
                number={profile.totalFavorites}
                formatter={formatNumber}
                className="text-sm text-[var(--color-text-primary)] font-semibold"
              />
            }
          />
        )}

        {profile.concurrentPlayers !== undefined && (
          <StatRow
            icon={Activity}
            label="Current Active"
            value={
              <SlidingNumber
                number={profile.concurrentPlayers}
                formatter={formatNumber}
                className="text-sm text-[var(--color-text-primary)] font-semibold"
              />
            }
          />
        )}

        {!hasActivityStats && (
          <div className="px-4 py-3 text-sm text-[var(--color-text-muted)] -mx-4">
            No activity stats available
          </div>
        )}
      </BentoCard>

      {hasValueStats && (
        <BentoCard
          title="Value"
          icon={<Coins size={14} className="text-[var(--color-text-muted)]" />}
          className="lg:col-span-4"
        >
          {rolimonsPlayer?.value !== undefined && rolimonsPlayer.value !== null && (
            <StatRow
              icon={Coins}
              label="Value"
              value={
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-primary)] font-semibold">
                  {formatNumber(rolimonsPlayer.value)}
                  <RobuxIcon className="w-3.5 h-3.5" />
                </span>
              }
              title="Rolimons Value"
            />
          )}
          {rolimonsPlayer?.rap !== undefined && rolimonsPlayer.rap !== null && (
            <StatRow
              icon={TrendingUp}
              label="RAP"
              value={
                <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-primary)] font-semibold">
                  {formatNumber(rolimonsPlayer.rap)}
                  <RobuxIcon className="w-3.5 h-3.5" />
                </span>
              }
              title="Recent Average Price"
            />
          )}
        </BentoCard>
      )}

    </motion.div>
  )
}
