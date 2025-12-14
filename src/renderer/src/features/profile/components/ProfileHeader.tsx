import React, { useState, useMemo, useLayoutEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { Shield, X, ChevronRight, Gamepad2 } from 'lucide-react'
import Avatar3DThumbnail from '@renderer/components/Avatar/Avatar3DThumbnail'
import { Avatar, AvatarFallback, AvatarImage } from '@renderer/components/UI/display/Avatar'
import { SlidingNumber } from '@renderer/components/UI/specialized/SlidingNumber'
import { getStatusRingUtilityClass } from '@renderer/utils/statusUtils'
import { AccountStatus } from '@renderer/types'
import RobloxPremiumIcon from '@assets/svg/Premium.svg'
import VerifiedIcon from '@assets/svg/Verified.svg'
import { ProfileData } from '../hooks/useProfileData'
import { formatNumber } from '@renderer/utils/numberUtils'
import { RolimonsBadges } from './RolimonsBadges'
import { useRolimonsPlayer, ROLIMONS_BADGES } from '@renderer/features/avatar/api/useRolimons'
import { Button } from '@renderer/components/UI/buttons/Button'

interface ProfileHeaderProps {
  userId: number
  profile: ProfileData
  cookie?: string
  showCloseButton?: boolean
  onClose?: () => void
  onAvatarClick: () => void
  blurIdentity?: boolean
  onSocialStatClick: (type: 'friends' | 'followers' | 'following') => void
  hasRawDescription: boolean
  rawDescription: string
  onJoinGame?: (placeId: number | string, jobId?: string, userId?: number | string) => void
  variant?: 'default' | 'transparent'
}

export const ProfileHeader: React.FC<ProfileHeaderProps> = ({
  userId,
  profile,
  cookie,
  showCloseButton,
  onClose,
  onAvatarClick,
  blurIdentity,
  onSocialStatClick,
  hasRawDescription,
  rawDescription,
  onJoinGame,
  variant = 'default'
}) => {
  const [isAvatarHovered, setIsAvatarHovered] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragStartPos = React.useRef<{ x: number; y: number } | null>(null)
  const infoSectionRef = useRef<HTMLDivElement>(null)
  const [infoHeight, setInfoHeight] = useState(0)
  const badgesRef = useRef<HTMLDivElement>(null)
  const [badgesHeight, setBadgesHeight] = useState(0)

  // Fetch rolimons data to know if badges exist
  const { data: rolimonsPlayer } = useRolimonsPlayer(userId, true)
  const hasBadges = useMemo(() => {
    if (!rolimonsPlayer?.rolibadges) return false
    return Object.keys(rolimonsPlayer.rolibadges).some((key) => ROLIMONS_BADGES[key])
  }, [rolimonsPlayer?.rolibadges])

  // Calculate badge count for dynamic spacing
  const badgeCount = useMemo(() => {
    if (!rolimonsPlayer?.rolibadges) return 0
    return Object.keys(rolimonsPlayer.rolibadges).filter((key) => ROLIMONS_BADGES[key]).length
  }, [rolimonsPlayer?.rolibadges])

  // Calculate estimated badge rows
  const badgeRows = useMemo(() => {
    return Math.ceil(badgeCount / 4)
  }, [badgeCount])

  // Measure the info block so we can keep a tight gap before badges
  useLayoutEffect(() => {
    const updateHeight = () => {
      if (infoSectionRef.current) {
        setInfoHeight(infoSectionRef.current.getBoundingClientRect().height)
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [
    profile.displayName,
    profile.username,
    profile.gameActivity,
    hasRawDescription,
    rawDescription,
    badgeCount,
    hasBadges
  ])

  // Measure the badges to avoid vertical drift when many badges wrap
  useLayoutEffect(() => {
    const updateBadgeHeight = () => {
      if (badgesRef.current) {
        setBadgesHeight(badgesRef.current.getBoundingClientRect().height)
      } else {
        setBadgesHeight(0)
      }
    }

    updateBadgeHeight()
    window.addEventListener('resize', updateBadgeHeight)
    return () => window.removeEventListener('resize', updateBadgeHeight)
  }, [badgeCount])

  const infoGapPx = 15
  const fallbackInfoHeight = profile.gameActivity ? 220 : 200
  const effectiveInfoHeight = infoHeight || fallbackInfoHeight
  const spacerHeightPx = hasBadges ? effectiveInfoHeight + infoGapPx : 5

  // Container min height ensures the overlay + spacing + badges all fit without overflow
  const minHeightPx = useMemo(() => {
    if (!hasBadges) {
      return Math.max(effectiveInfoHeight + 40, 240)
    }

    // Ensure a sensible minimum even before measurement kicks in
    const safeBadgesHeight = badgesHeight || Math.max(32 * badgeRows + 24, 48)
    return spacerHeightPx + safeBadgesHeight
  }, [hasBadges, spacerHeightPx, badgesHeight, badgeRows, effectiveInfoHeight])
  const gameActivity = profile.gameActivity

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5, delay: 0 }}
      className={`relative w-full rounded-xl overflow-hidden flex flex-col text-[var(--color-text-secondary)] ${
        variant === 'default'
          ? 'bg-[var(--color-surface-strong)] border border-[var(--color-border)]'
          : ''
      }`}
      style={{ minHeight: `${minHeightPx}px` }}
    >
      {/* Background Gradients */}
      {variant === 'default' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[rgba(var(--accent-color-rgb),0.08)] via-[var(--color-app-bg)] to-[var(--color-app-bg)] opacity-90" />

          {/* Animated Floor Grid */}
          <div
            className="absolute inset-0 opacity-25"
            style={{
              backgroundImage:
                'linear-gradient(0deg, transparent 24%, rgba(255, 255, 255, 0.06) 25%, rgba(255, 255, 255, 0.06) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.06) 75%, rgba(255, 255, 255, 0.06) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(255, 255, 255, 0.06) 25%, rgba(255, 255, 255, 0.06) 26%, transparent 27%, transparent 74%, rgba(255, 255, 255, 0.06) 75%, rgba(255, 255, 255, 0.06) 76%, transparent 77%, transparent)',
              backgroundSize: '60px 60px',
              transform: 'perspective(800px) rotateX(60deg) translateY(0) scale(1.5)',
              transformOrigin: 'top center'
            }}
          />
        </>
      )}

      {/* Main 3D Render - Centered/Right */}
      <div className="absolute inset-0 flex items-center justify-end pointer-events-none pb-0 pr-0 avatar-wrapper">
        {userId ? (
          <div
            className="w-[30%] h-[140%] mr-0 pointer-events-auto cursor-pointer relative bg-transparent z-20"
            onPointerEnter={() => setIsAvatarHovered(true)}
            onPointerLeave={(e) => {
              if (e.buttons === 0) {
                setIsAvatarHovered(false)
              }
            }}
            onPointerDown={(e) => {
              dragStartPos.current = { x: e.clientX, y: e.clientY }
              setIsDragging(false)
            }}
            onPointerMove={(e) => {
              if (dragStartPos.current && e.buttons > 0) {
                const dx = Math.abs(e.clientX - dragStartPos.current.x)
                const dy = Math.abs(e.clientY - dragStartPos.current.y)
                if (dx > 5 || dy > 5) {
                  setIsDragging(true)
                }
              }
            }}
            onPointerUp={() => {
              dragStartPos.current = null
            }}
            onClick={() => {
              if (!isDragging) {
                onAvatarClick()
              }
              setIsDragging(false)
            }}
          >
            <motion.div
              className="w-full h-full"
              animate={
                isAvatarHovered
                  ? { x: '10%', y: '-15%', scale: 1.2 }
                  : { x: '10%', y: '0%', scale: 1 }
              }
              transition={{ type: 'spring', stiffness: 240, damping: 24, mass: 0.8 }}
              style={{ originX: 0.5, originY: 0.5 }}
            >
              <div className={blurIdentity ? 'privacy-blur' : ''}>
                <Avatar3DThumbnail
                  userId={userId.toString()}
                  cookie={cookie}
                  className="w-full h-full drop-shadow-[0_24px_60px_rgba(0,0,0,0.65)]"
                  autoRotateSpeed={0.008}
                  cameraDistanceFactor={1.4}
                  manualRotationEnabled={isAvatarHovered}
                  manualZoomEnabled={isAvatarHovered}
                />
              </div>
            </motion.div>
          </div>
        ) : (
          <img
            src={profile.avatarUrl}
            alt=""
            className={`h-[80%] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.5)] transition-transform duration-700 ease-in-out group-hover:scale-105 mr-10 ${blurIdentity ? 'privacy-blur' : ''}`}
          />
        )}
      </div>

      {/* Close Button if requested */}
      {showCloseButton && onClose && (
        <div className="absolute top-4 right-4 z-50">
          <button
            onClick={onClose}
            className="pressable p-3 bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] rounded-full transition-colors backdrop-blur-md cursor-pointer border border-[var(--color-border-subtle)]"
          >
            <X size={22} />
          </button>
        </div>
      )}

      {/* Profile Info Overlay */}
      <div
        ref={infoSectionRef}
        className={`absolute left-0 right-0 p-6 flex flex-col md:flex-row items-center gap-6 z-10 pointer-events-none ${hasBadges ? 'top-0' : 'top-1/2 -translate-y-1/2'}`}
      >
        {/* Profile Picture */}
        <div className="shrink-0 relative pointer-events-auto">
          <div className="relative flex items-center justify-center">
            <Avatar
              className={`w-32 h-32 md:w-40 md:h-40 shadow-2xl bg-[var(--color-surface-strong)] ${
                profile.status !== AccountStatus.Offline
                  ? `ring-4 ${getStatusRingUtilityClass(profile.status)}`
                  : ''
              } ${blurIdentity ? 'privacy-blur' : ''}`}
            >
              <AvatarImage src={profile.avatarUrl} alt={blurIdentity ? '' : profile.displayName} />
              <AvatarFallback className="text-xl font-bold text-[var(--color-text-primary)] bg-[var(--color-surface-hover)]">
                {profile.displayName?.slice(0, 2)?.toUpperCase() || 'RB'}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>

        {/* Info Section */}
        <div className="flex-1 pointer-events-auto">
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--color-text-primary)] flex items-center gap-3 drop-shadow-lg mb-0">
                <span className={`break-words ${blurIdentity ? 'privacy-blur' : ''}`}>
                  {profile.displayName}
                </span>
              </h1>
              <div className="flex items-center gap-2">
                {profile.isVerified && (
                  <img
                    src={VerifiedIcon}
                    alt="Verified"
                    className="w-5 h-5 md:w-6 md:h-6 object-contain drop-shadow-sm select-none"
                    draggable={false}
                  />
                )}
                {profile.isPremium && (
                  <img
                    src={RobloxPremiumIcon}
                    alt="Roblox Premium"
                    className="w-5 h-5 object-contain drop-shadow-sm select-none brightness-400"
                    draggable={false}
                  />
                )}
                {profile.isAdmin && (
                  <Shield size={20} className="text-red-500 fill-red-500 drop-shadow-sm" />
                )}
              </div>
            </div>

            <p
              className={`text-base md:text-lg text-[var(--color-text-secondary)] drop-shadow-md leading-none break-words ${
                blurIdentity ? 'privacy-blur' : ''
              }`}
            >
              @{profile.username}
            </p>

            {/* Social Stats Row */}
            <div className="flex items-center gap-6">
              <button
                type="button"
                className="flex items-center gap-2 group/stat cursor-pointer hover:bg-[var(--color-surface-muted)] px-2 py-1 -mx-2 rounded-lg transition-colors"
                onClick={() => onSocialStatClick('friends')}
                aria-label={`View ${profile.friendCount} friends`}
              >
                <SlidingNumber
                  number={profile.friendCount}
                  formatter={formatNumber}
                  className="text-[var(--color-text-primary)] font-bold text-base transition-colors"
                />
                <span className="text-[var(--color-text-secondary)] text-sm font-medium tracking-wide group-hover/stat:text-[var(--color-text-primary)] group-hover/stat:underline underline-offset-2 transition-colors">
                  Friends
                </span>
                <ChevronRight
                  size={14}
                  className="text-[var(--color-text-muted)] opacity-0 -ml-1 group-hover/stat:opacity-100 group-hover/stat:ml-0 transition-all"
                />
              </button>
              <button
                type="button"
                className="flex items-center gap-2 group/stat cursor-pointer hover:bg-[var(--color-surface-muted)] px-2 py-1 -mx-2 rounded-lg transition-colors"
                onClick={() => onSocialStatClick('followers')}
                aria-label={`View ${profile.followerCount} followers`}
              >
                <SlidingNumber
                  number={profile.followerCount}
                  formatter={formatNumber}
                  className="text-[var(--color-text-primary)] font-bold text-base transition-colors"
                />
                <span className="text-[var(--color-text-secondary)] text-sm font-medium tracking-wide group-hover/stat:text-[var(--color-text-primary)] group-hover/stat:underline underline-offset-2 transition-colors">
                  Followers
                </span>
                <ChevronRight
                  size={14}
                  className="text-[var(--color-text-muted)] opacity-0 -ml-1 group-hover/stat:opacity-100 group-hover/stat:ml-0 transition-all"
                />
              </button>
              <button
                type="button"
                className="flex items-center gap-2 group/stat cursor-pointer hover:bg-[var(--color-surface-muted)] px-2 py-1 -mx-2 rounded-lg transition-colors"
                onClick={() => onSocialStatClick('following')}
                aria-label={`View ${profile.followingCount} following`}
              >
                <SlidingNumber
                  number={profile.followingCount}
                  formatter={formatNumber}
                  className="text-[var(--color-text-primary)] font-bold text-base transition-colors"
                />
                <span className="text-[var(--color-text-secondary)] text-sm font-medium tracking-wide group-hover/stat:text-[var(--color-text-primary)] group-hover/stat:underline underline-offset-2 transition-colors">
                  Following
                </span>
                <ChevronRight
                  size={14}
                  className="text-[var(--color-text-muted)] opacity-0 -ml-1 group-hover/stat:opacity-100 group-hover/stat:ml-0 transition-all"
                />
              </button>
            </div>

            {/* Game Activity - shown above bio when in game */}
            {gameActivity && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg max-w-fit">
                  <Gamepad2 size={14} className="text-emerald-400 shrink-0" />
                  <span className="text-sm text-emerald-300 font-medium truncate max-w-[300px]">
                    Playing {gameActivity.name}
                  </span>
                </div>
                {onJoinGame && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-9 px-3 gap-2 bg-emerald-500/90 text-white border border-emerald-400/50 hover:bg-emerald-500"
                    onClick={() => onJoinGame(gameActivity.placeId, gameActivity.jobId, userId)}
                  >
                    <Gamepad2 size={16} className="shrink-0" />
                    <span>Join game</span>
                  </Button>
                )}
              </div>
            )}

            {/* Description Preview */}
            {hasRawDescription && (
              <div className="max-w-md">
                <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed line-clamp-2 drop-shadow-md">
                  {rawDescription}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic spacer to push badges to bottom */}
      <div className="flex-none" style={{ height: `${spacerHeightPx}px` }} aria-hidden="true" />

      {/* Rolimons Badges */}
      <div ref={badgesRef}>
        <RolimonsBadges userId={userId} />
      </div>
    </motion.div>
  )
}
