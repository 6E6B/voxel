import React from 'react'
import { motion } from 'framer-motion'
import { Shield, X } from 'lucide-react'
import { RoAvatarViewer } from '@renderer/shared/lib/avatar3d/RoAvatarViewer'
import { SlidingNumber } from '@renderer/shared/ui/specialized/SlidingNumber'
import RobloxPremiumIcon from '@assets/svg/Premium.svg'
import VerifiedIcon from '@assets/svg/Verified.svg'
import { ProfileData } from '../hooks/useProfileData'
import { formatNumber } from '@renderer/shared/utils/numberUtils'
import { RolimonsBadges } from './RolimonsBadges'
import { DescriptionWithMentions } from './DescriptionWithMentions'

interface ProfileHeaderProps {
  userId: number
  profile: ProfileData
  cookie?: string
  showCloseButton?: boolean
  onClose?: () => void
  blurIdentity?: boolean
  onSocialStatClick: (type: 'friends' | 'followers' | 'following') => void
  hasRawDescription: boolean
  rawDescription: string
  onSelectProfile?: (userId: number) => void
  onJoinGame?: (placeId: number | string, jobId?: string, userId?: number | string) => void
  variant?: 'default' | 'transparent'
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userId,
  profile,
  cookie,
  showCloseButton,
  onClose,
  blurIdentity,
  onSocialStatClick,
  hasRawDescription,
  rawDescription,
  onSelectProfile,
  onJoinGame,
  variant = 'default'
}) => {
  const gameActivity = profile.gameActivity

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="relative w-full"
    >
      <div
        className={`relative w-full rounded-2xl overflow-hidden ${variant === 'default'
          ? 'bg-[var(--color-surface-strong)] border border-[var(--color-border)]'
          : ''
          }`}
      >
        <div className="relative flex">
          {/* 3D Avatar Panel */}
          <div className="relative w-56 shrink-0 self-stretch">
            <div className="absolute inset-0 flex items-center justify-center">
              {userId ? (
                <div className={`w-full h-[180%] ${blurIdentity ? 'privacy-blur' : ''}`}>
                  <RoAvatarViewer
                    userId={userId.toString()}
                    cookie={cookie}
                    cameraYawDeg={-15}
                    className="w-full h-full drop-shadow-[0_20px_40px_rgba(0,0,0,0.5)]"
                    autoRotateSpeed={0.006}
                    renderPriority={1}
                  />
                </div>
              ) : (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className={`h-3/4 object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.4)] ${blurIdentity ? 'privacy-blur' : ''}`}
                />
              )}
            </div>
            {/* Subtle right edge separator */}
            <div className="absolute right-0 top-4 bottom-4 w-px bg-[var(--color-border-subtle)]" />
          </div>

          {/* Profile Content */}
          <div className="flex-1 min-w-0 p-6 flex flex-col gap-4">
            {/* Top row: identity + stats */}
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className={`text-2xl font-bold text-[var(--color-text-primary)] leading-tight truncate ${blurIdentity ? 'privacy-blur' : ''}`}>
                    {profile.displayName}
                  </h1>
                  {profile.isVerified && (
                    <img
                      src={VerifiedIcon}
                      alt="Verified"
                      className="w-5 h-5 object-contain select-none shrink-0"
                      draggable={false}
                    />
                  )}
                  {profile.isPremium && (
                    <img
                      src={RobloxPremiumIcon}
                      alt="Roblox Premium"
                      className="w-[18px] h-[18px] object-contain select-none brightness-400 shrink-0"
                      draggable={false}
                    />
                  )}
                  {profile.isAdmin && (
                    <Shield size={18} className="text-red-500 fill-red-500 shrink-0" />
                  )}
                </div>
                <p className={`text-sm text-[var(--color-text-muted)] mt-0.5 truncate ${blurIdentity ? 'privacy-blur' : ''}`}>
                  @{profile.username}
                </p>
                <div className="flex items-center gap-3 mt-1.5">
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
                    onClick={() => onSocialStatClick('followers')}
                  >
                    <span className="font-semibold text-[var(--color-text-secondary)]">
                      <SlidingNumber number={profile.followerCount} formatter={formatNumber} />
                    </span>
                    <span>Followers</span>
                  </button>
                  <span className="text-[var(--color-text-muted)]/30 text-xs select-none">·</span>
                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors cursor-pointer"
                    onClick={() => onSocialStatClick('following')}
                  >
                    <span className="font-semibold text-[var(--color-text-secondary)]">
                      <SlidingNumber number={profile.followingCount} formatter={formatNumber} />
                    </span>
                    <span>Following</span>
                  </button>
                </div>
              </div>

              {/* Close button */}
              {showCloseButton && onClose && (
                <button
                  onClick={onClose}
                  className="pressable self-start p-2 bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] rounded-xl transition-colors border border-[var(--color-border-subtle)] shrink-0"
                >
                  <X size={18} />
                </button>
              )}
            </div>

            {hasRawDescription && <div className="h-px bg-[var(--color-border-subtle)]" />}

            {/* Bio */}
            {hasRawDescription && (
              <div className="max-w-full whitespace-pre-wrap break-words text-sm leading-relaxed text-[var(--color-text-secondary)]">
                <DescriptionWithMentions
                  description={rawDescription}
                  mentionSourceText={rawDescription}
                  onSelectProfile={onSelectProfile}
                />
              </div>
            )}

            {/* Game activity */}
            {gameActivity && (
              <div className="flex items-center gap-2.5 text-sm">
                <span className="text-[var(--color-text-muted)]">
                  Playing <span className="text-[var(--color-text-secondary)] font-medium">{gameActivity.name}</span>
                </span>
                {onJoinGame && (
                  <button
                    type="button"
                    className="pressable px-3 py-1 text-xs font-semibold rounded-lg bg-emerald-500/90 hover:bg-emerald-500 text-white transition-colors"
                    onClick={() => onJoinGame(gameActivity.placeId, gameActivity.jobId, userId)}
                  >
                    Join
                  </button>
                )}
              </div>
            )}

            {/* Rolimons Badges */}
            <RolimonsBadges userId={userId} />
          </div>
        </div>

      </div>
    </motion.div>
  )
}

