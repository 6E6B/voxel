import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  MapPin,
  Heart,
  Activity,
  Users,
  History,
  Coins,
  TrendingUp,
  Clock
} from 'lucide-react'
import { StatRow } from './StatRow'
import { SlidingNumber } from '@renderer/components/UI/specialized/SlidingNumber'
import { ProfileData } from '../hooks/useProfileData'
import { formatNumber } from '@renderer/utils/numberUtils'
import { formatDate, formatDateTime, formatRelativeDate } from '@renderer/utils/dateUtils'
import { useRolimonsPlayer } from '@renderer/features/avatar/api/useRolimons'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'

interface ProfileStatsProps {
  profile: ProfileData
  userId: number
  pastUsernames?: string[]
}

export const ProfileStats: React.FC<ProfileStatsProps> = ({
  profile,
  userId,
  pastUsernames = []
}) => {
  const [showRelativeJoinDate, setShowRelativeJoinDate] = useState(false)
  const { data: rolimonsPlayer } = useRolimonsPlayer(userId, true)
  const lastOnlineDate = rolimonsPlayer?.last_online
    ? new Date(rolimonsPlayer.last_online * 1000)
    : null
  const filteredPastUsernames = pastUsernames.filter((name) => !/^#+$/.test(name.trim()))
  const hasValueStats =
    (rolimonsPlayer?.value !== undefined && rolimonsPlayer.value !== null) ||
    (rolimonsPlayer?.rap !== undefined && rolimonsPlayer.rap !== null)
  const hasActivityStats =
    profile.placeVisits !== undefined ||
    profile.totalFavorites !== undefined ||
    profile.concurrentPlayers !== undefined

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.15 }}
      className="bg-neutral-900/50 border border-neutral-800 rounded-xl p-4 shadow-sm"
    >
      <h3 className="text-lg font-bold text-white flex items-center gap-2">Statistics</h3>

      {/* Separator after header */}
      <div className="h-px bg-neutral-800 mt-3 mb-3 -mx-4" />

      {/* Account Info */}
      <div>
        <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider pb-1">
          Account
        </div>
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
              className="text-sm text-white font-semibold"
            />
          }
        />
        {rolimonsPlayer?.last_online !== undefined && rolimonsPlayer.last_online !== null && (
          <StatRow
            icon={Clock}
            label="Last Online"
            value={
              <span className="text-sm text-white font-semibold">
                {formatRelativeDate(lastOnlineDate)}
              </span>
            }
            title={formatDateTime(lastOnlineDate)}
          />
        )}
        {filteredPastUsernames.length > 0 && (
          <div className="py-1.5">
            <div className="flex items-center gap-2 text-neutral-400 mb-2">
              <History size={14} className="shrink-0" />
              <span className="text-sm font-medium">Past Usernames</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-[22px]">
              {filteredPastUsernames.slice(0, 8).map((name, i) => (
                <span
                  key={i}
                  className="text-xs text-neutral-300 bg-neutral-800 px-2 py-1 rounded-md"
                >
                  {name}
                </span>
              ))}
              {filteredPastUsernames.length > 8 && (
                <span className="text-xs text-neutral-500 px-1 py-1">
                  +{filteredPastUsernames.length - 8} more
                </span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Value Stats */}
      {hasValueStats && (
        <>
          {/* Separator */}
          <div className="h-px bg-neutral-800 my-3 -mx-4" />

          <div>
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider pb-1">
              Value
            </div>
            {rolimonsPlayer?.value !== undefined && rolimonsPlayer.value !== null && (
              <StatRow
                icon={Coins}
                label="Value"
                value={
                  <span className="flex items-center gap-1.5 text-sm text-white font-semibold">
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
                  <span className="flex items-center gap-1.5 text-sm text-white font-semibold">
                    {formatNumber(rolimonsPlayer.rap)}
                    <RobuxIcon className="w-3.5 h-3.5" />
                  </span>
                }
                title="Recent Average Price"
              />
            )}
          </div>
        </>
      )}

      {/* Activity Stats */}
      {hasActivityStats && (
        <>
          {/* Separator */}
          <div className="h-px bg-neutral-800 my-3 -mx-4" />

          <div>
            <div className="text-[11px] font-semibold text-neutral-500 uppercase tracking-wider pb-1">
              Activity
            </div>
            {profile.placeVisits !== undefined && (
              <StatRow
                icon={MapPin}
                label="Place Visits"
                value={
                  <SlidingNumber
                    number={profile.placeVisits}
                    formatter={formatNumber}
                    className="text-sm text-white font-semibold"
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
                    className="text-sm text-white font-semibold"
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
                    className="text-sm text-white font-semibold"
                  />
                }
              />
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}
