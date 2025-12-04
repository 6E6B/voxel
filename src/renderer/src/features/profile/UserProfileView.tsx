import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Shirt,
  Package,
  Copy,
  Box,
  ArrowLeft,
  Loader2,
  Sparkles,
  TrendingUp,
  Flame,
  Star,
  Music
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { Account } from '@renderer/types'
import UserListModal from '@renderer/components/Modals/UserListModal'
import AccessoryDetailsModal from '@renderer/features/avatar/Modals/AccessoryDetailsModal'
import PlayerInventorySheet from '@renderer/features/inventory/Modals/PlayerInventorySheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/components/UI/dialogs/Dialog'
import { SkeletonSquareGrid } from '@renderer/components/UI/display/SkeletonGrid'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import { Tooltip, TooltipTrigger, TooltipContent } from '@renderer/components/UI/display/Tooltip'
import {
  useUserGroups,
  useUserCollections,
  useUserExperienceBadges as useExperienceBadges,
  useUserWearing as useUserWearingItems,
  useUserProfilePlatform,
  useUserRobloxBadges
} from '@renderer/hooks/queries'
import { useUserProfileOutfits } from './hooks/useUserProfileOutfits'
import { useProfileData } from './hooks/useProfileData'
import { useFriendStatuses } from './hooks/useFriendStatuses'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileStats } from './components/ProfileStats'
import { FriendsSection } from './components/FriendsSection'
import { GroupsSection } from './components/GroupsSection'
import GroupDetailsModal from '@renderer/features/groups/Modals/GroupDetailsModal'
import { CollectionsSection } from './components/CollectionsSection'
import { BadgesSection } from './components/BadgesSection'
import { ExpandedAvatarModal } from './components/ExpandedAvatarModal'
import { TruncatedTextWithTooltip } from './components/TruncatedTextWithTooltip'
import { QuickActionsBar } from './components/QuickActionsBar'
import { useRolimonsItem } from '@renderer/hooks/queries'

const SOUND_HAT_IDS = [24114402, 305888394, 24112667, 33070696]

const ItemTagBadges: React.FC<{ assetId: number }> = ({ assetId }) => {
  const rolimonsItem = useRolimonsItem(assetId)
  const isLimited = !!rolimonsItem
  const isSoundHat = SOUND_HAT_IDS.includes(assetId)

  if (!isLimited && !isSoundHat) return null

  return (
    <div className="absolute flex flex-col gap-1.5 z-20 top-2 left-2">
      {isLimited && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
              <Sparkles size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            Limited
          </TooltipContent>
        </Tooltip>
      )}
      {rolimonsItem?.isProjected && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
              <TrendingUp size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            Projected
          </TooltipContent>
        </Tooltip>
      )}
      {rolimonsItem?.isHyped && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
              <Flame size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            Hyped
          </TooltipContent>
        </Tooltip>
      )}
      {rolimonsItem?.isRare && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-pink-500/10 text-pink-400 border border-pink-500/20 hover:bg-pink-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
              <Star size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            Rare
          </TooltipContent>
        </Tooltip>
      )}
      {isSoundHat && (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center justify-center w-7 h-7 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 hover:bg-cyan-500/20 backdrop-blur-md transition-all hover:scale-105 shadow-sm cursor-default">
              <Music size={13} strokeWidth={2.5} className="shrink-0" />
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="font-bold text-xs">
            Sound Hat
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export interface ProfileViewProps {
  userId: string | number
  requestCookie: string
  accountUserId?: string | number
  initialData?: {
    displayName?: string
    username?: string
    avatarUrl?: string
    status?: any
    notes?: string
    joinDate?: string
    placeVisits?: number
    friendCount?: number
    followerCount?: number
    followingCount?: number
    isPremium?: boolean
    isAdmin?: boolean
    totalFavorites?: number
    concurrentPlayers?: number
    groupMemberCount?: number
  }
  isOwnAccount?: boolean
  onClose?: () => void
  showCloseButton?: boolean
  onSelectProfile?: (userId: number) => void
}

const UserProfileView: React.FC<ProfileViewProps> = ({
  userId,
  requestCookie,
  accountUserId,
  initialData,
  isOwnAccount,
  onClose,
  showCloseButton = false,
  onSelectProfile
}) => {
  const [isWearingOpen, setIsWearingOpen] = useState(false)
  const [isOutfitsOpen, setIsOutfitsOpen] = useState(false)
  const [selectedAccessory, setSelectedAccessory] = useState<{
    id: number
    name: string
    imageUrl: string
  } | null>(null)
  const [isAvatarExpanded, setIsAvatarExpanded] = useState(false)
  const [userListModal, setUserListModal] = useState<{
    isOpen: boolean
    type: 'friends' | 'followers' | 'following'
    title: string
  }>({
    isOpen: false,
    type: 'friends',
    title: ''
  })
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const [isInventoryOpen, setIsInventoryOpen] = useState(false)
  const [selectedOutfit, setSelectedOutfit] = useState<{
    id: number
    name: string
    imageUrl: string
  } | null>(null)
  const [outfitDetails, setOutfitDetails] = useState<{
    assets: Array<{ id: number; name: string; imageUrl: string }>
  } | null>(null)
  const [outfitDetailsLoading, setOutfitDetailsLoading] = useState(false)
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null)

  const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId

  const { profile } = useProfileData({ userId: userIdNum, requestCookie, initialData })
  const { sortedFriends } = useFriendStatuses(userIdNum, requestCookie)
  const { data: profilePlatform, isLoading: isLoadingProfilePlatform } = useUserProfilePlatform(
    userIdNum,
    requestCookie
  )

  const { data: groups = [], isLoading: isLoadingGroups } = useUserGroups(userIdNum)
  const { data: collections = [], isLoading: isLoadingCollections } = useUserCollections(
    userIdNum,
    requestCookie
  )
  const { data: robloxBadges = [], isLoading: isLoadingRobloxBadges } = useUserRobloxBadges(
    userIdNum,
    requestCookie
  )
  const { data: experienceBadges = [], isLoading: isLoadingExperienceBadges } = useExperienceBadges(
    userIdNum,
    requestCookie
  )
  const { data: wearingItems = [], isLoading: wearingLoading } = useUserWearingItems(
    userIdNum,
    requestCookie,
    isWearingOpen
  )
  const { data: outfits = [], isLoading: outfitsLoading } = useUserProfileOutfits(
    userIdNum,
    requestCookie,
    isOutfitsOpen
  )

  const pastUsernames = profilePlatform?.nameHistory ?? []
  const profileWithGroupCount = useMemo(
    () => ({
      ...profile,
      groupMemberCount: groups.length || profile.groupMemberCount || 0
    }),
    [profile, groups.length]
  )

  const loading =
    isLoadingGroups || isLoadingCollections || isLoadingRobloxBadges || isLoadingExperienceBadges

  const rawDescription = profile.notes?.trim() || ''
  const hasRawDescription = rawDescription.length > 0

  useEffect(() => {
    setContextMenu(null)
  }, [userId])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleCopyUserId = useCallback(() => {
    navigator.clipboard.writeText(userId.toString())
    setContextMenu(null)
  }, [userId])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        setContextMenu(null)
      }
    }

    if (contextMenu) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [contextMenu])

  return (
    <div
      className="relative flex flex-col w-full h-full bg-neutral-950 overflow-hidden font-sans"
      onContextMenu={handleContextMenu}
    >
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <ProfileHeader
            userId={userIdNum}
            profile={profileWithGroupCount}
            cookie={requestCookie}
            showCloseButton={showCloseButton}
            onClose={onClose}
            onAvatarClick={() => setIsAvatarExpanded(true)}
            onSocialStatClick={(type) => {
              const titles = { friends: 'Friends', followers: 'Followers', following: 'Following' }
              setUserListModal({ isOpen: true, type, title: titles[type] })
            }}
            hasRawDescription={hasRawDescription}
            rawDescription={rawDescription}
          />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-4 space-y-6">
              <QuickActionsBar
                onWearingClick={() => setIsWearingOpen(true)}
                onOutfitsClick={() => setIsOutfitsOpen(true)}
                onInventoryClick={() => setIsInventoryOpen(true)}
                onCopyIdClick={handleCopyUserId}
              />

              <ProfileStats
                profile={profileWithGroupCount}
                userId={userIdNum}
                pastUsernames={pastUsernames}
              />
            </div>

            <div className="lg:col-span-8 space-y-6">
              <FriendsSection
                friends={sortedFriends as any}
                isLoading={loading}
                friendCount={profile.friendCount ?? sortedFriends.length}
                onViewAll={() =>
                  setUserListModal({ isOpen: true, type: 'friends', title: 'Friends' })
                }
                onSelectProfile={onSelectProfile}
              />

              <GroupsSection
                groups={groups}
                isLoading={isLoadingGroups}
                groupMemberCount={profileWithGroupCount.groupMemberCount}
                onSelectGroup={(groupId) => setSelectedGroupId(groupId)}
              />

              <CollectionsSection
                collections={collections}
                isLoading={isLoadingCollections}
                onItemClick={setSelectedAccessory}
                onViewAllClick={() => setIsInventoryOpen(true)}
              />

              <BadgesSection
                robloxBadges={robloxBadges}
                experienceBadges={experienceBadges}
                isLoadingRobloxBadges={isLoadingRobloxBadges}
                isLoadingExperienceBadges={isLoadingExperienceBadges}
              />
            </div>
          </div>
        </div>
      </div>

      <Dialog isOpen={isWearingOpen} onClose={() => setIsWearingOpen(false)}>
        <DialogContent className="max-w-3xl bg-neutral-950 border-neutral-800/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 pl-0">
              <div className="p-2 bg-neutral-900 rounded-lg">
                <Shirt size={20} className="text-neutral-300" />
              </div>
              <div className="flex flex-col">
                <span>Currently Wearing</span>
                {!wearingLoading && wearingItems.length > 0 && (
                  <span className="text-xs font-normal text-neutral-500">
                    {wearingItems.length} items equipped
                  </span>
                )}
              </div>
            </DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody>
            <AnimatePresence mode="wait">
              {wearingLoading ? (
                <SkeletonSquareGrid
                  count={10}
                  className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin"
                />
              ) : wearingItems.length > 0 ? (
                <motion.div
                  key="items"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin"
                >
                  {wearingItems.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                      className="group relative aspect-square bg-neutral-900/80 border border-neutral-800/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-800/80 hover:shadow-lg"
                      onClick={() =>
                        setSelectedAccessory({
                          id: item.id,
                          name: item.name,
                          imageUrl: item.imageUrl
                        })
                      }
                    >
                      <ItemTagBadges assetId={item.id} />
                      <div className="w-full h-full p-3 flex items-center justify-center">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain drop-shadow-md transform group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      {/* Always visible name overlay */}
                      <div className="absolute inset-x-0 bottom-0 z-20">
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%)'
                          }}
                        />
                        <div className="relative px-2 py-2">
                          <TruncatedTextWithTooltip
                            text={item.name}
                            className="text-xs font-medium text-neutral-200 line-clamp-1 group-hover:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <EmptyState
                  icon={Shirt}
                  title="No items found"
                  description="This user isn't wearing any items"
                />
              )}
            </AnimatePresence>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog isOpen={isOutfitsOpen} onClose={() => setIsOutfitsOpen(false)}>
        <DialogContent className="max-w-3xl bg-neutral-950 border-neutral-800/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 pl-0">
              <div className="p-2 bg-neutral-900 rounded-lg">
                <Package size={20} className="text-neutral-300" />
              </div>
              <div className="flex flex-col">
                <span>Outfits</span>
                {!outfitsLoading && outfits.length > 0 && (
                  <span className="text-xs font-normal text-neutral-500">
                    {outfits.length} saved outfits
                  </span>
                )}
              </div>
            </DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody>
            <AnimatePresence mode="wait">
              {outfitsLoading ? (
                <SkeletonSquareGrid
                  count={10}
                  className="max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin"
                />
              ) : outfits.length > 0 ? (
                <motion.div
                  key="outfits"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin"
                >
                  {outfits.map((outfit, index) => (
                    <motion.div
                      key={outfit.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                      className="group relative aspect-square bg-neutral-900/80 border border-neutral-800/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-800/80 hover:shadow-lg"
                      onClick={async () => {
                        setSelectedOutfit({
                          id: outfit.id,
                          name: outfit.name,
                          imageUrl: outfit.imageUrl
                        })
                        setOutfitDetailsLoading(true)
                        setOutfitDetails(null)
                        try {
                          const details = await window.api.getOutfitDetails(
                            requestCookie,
                            outfit.id
                          )
                          if (details && details.assets) {
                            const assetIds = details.assets.map((a: any) => a.id)
                            const thumbnails = await window.api.getBatchThumbnails(
                              assetIds,
                              'Asset'
                            )
                            const thumbMap = new Map(
                              thumbnails.data.map((t: any) => [t.targetId, t.imageUrl])
                            )
                            setOutfitDetails({
                              assets: details.assets.map((asset: any) => ({
                                id: asset.id,
                                name: asset.name,
                                imageUrl: thumbMap.get(asset.id) || ''
                              }))
                            })
                          }
                        } catch (err) {
                          console.error('Failed to load outfit details:', err)
                        } finally {
                          setOutfitDetailsLoading(false)
                        }
                      }}
                    >
                      <div className="w-full h-full p-3 flex items-center justify-center">
                        {outfit.imageUrl ? (
                          <img
                            src={outfit.imageUrl}
                            alt={outfit.name}
                            className="w-full h-full object-contain drop-shadow-md transform group-hover:scale-105 transition-transform duration-200"
                          />
                        ) : (
                          <div className="flex flex-col items-center gap-2 text-neutral-600">
                            <Package size={28} />
                            <span className="text-xs">No preview</span>
                          </div>
                        )}
                      </div>
                      {/* Always visible name overlay */}
                      <div className="absolute inset-x-0 bottom-0 z-20">
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.85) 100%)'
                          }}
                        />
                        <div className="relative px-2 py-2">
                          <TruncatedTextWithTooltip
                            text={outfit.name}
                            className="text-xs font-medium text-neutral-200 line-clamp-1 group-hover:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <EmptyState
                  icon={Package}
                  title="No outfits found"
                  description="This user hasn't saved any outfits"
                />
              )}
            </AnimatePresence>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <Dialog
        isOpen={!!selectedOutfit}
        onClose={() => {
          setSelectedOutfit(null)
          setOutfitDetails(null)
        }}
      >
        <DialogContent className="max-w-3xl bg-neutral-950 border-neutral-800/60">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 pl-0">
              <button
                onClick={() => {
                  setSelectedOutfit(null)
                  setOutfitDetails(null)
                }}
                className="p-2 bg-neutral-900 rounded-lg hover:bg-neutral-800 transition-colors"
              >
                <ArrowLeft size={20} className="text-neutral-300" />
              </button>
              <div className="flex flex-col">
                <span className="line-clamp-1">{selectedOutfit?.name || 'Outfit'}</span>
                {!outfitDetailsLoading && outfitDetails && (
                  <span className="text-xs font-normal text-neutral-500">
                    {outfitDetails.assets.length} items
                  </span>
                )}
              </div>
            </DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody>
            <AnimatePresence mode="wait">
              {outfitDetailsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={24} className="text-neutral-500 animate-spin" />
                </div>
              ) : outfitDetails && outfitDetails.assets.length > 0 ? (
                <motion.div
                  key="outfit-assets"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[60vh] overflow-y-auto pr-2 scrollbar-thin"
                >
                  {outfitDetails.assets.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.2, delay: Math.min(index * 0.02, 0.3) }}
                      className="group relative aspect-square bg-neutral-900/80 border border-neutral-800/60 rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-neutral-600 hover:bg-neutral-800/80 hover:shadow-lg"
                      onClick={() =>
                        setSelectedAccessory({
                          id: item.id,
                          name: item.name,
                          imageUrl: item.imageUrl
                        })
                      }
                    >
                      <ItemTagBadges assetId={item.id} />
                      <div className="w-full h-full p-3 flex items-center justify-center">
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-contain drop-shadow-md transform group-hover:scale-105 transition-transform duration-200"
                        />
                      </div>
                      <div className="absolute inset-x-0 bottom-0 z-20">
                        <div
                          className="absolute inset-0 pointer-events-none"
                          style={{
                            background:
                              'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.8) 100%)'
                          }}
                        />
                        <div className="relative px-2 py-2">
                          <TruncatedTextWithTooltip
                            text={item.name}
                            className="text-xs font-medium text-neutral-200 line-clamp-1 group-hover:text-white transition-colors"
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              ) : (
                <EmptyState
                  icon={Package}
                  title="No items in outfit"
                  description="This outfit doesn't contain any accessories"
                />
              )}
            </AnimatePresence>
          </DialogBody>
        </DialogContent>
      </Dialog>

      <UserListModal
        isOpen={userListModal.isOpen}
        onClose={() => setUserListModal((prev) => ({ ...prev, isOpen: false }))}
        title={userListModal.title}
        type={userListModal.type}
        userId={userId}
        requestCookie={requestCookie}
        onSelectUser={(id) => {
          setUserListModal((prev) => ({ ...prev, isOpen: false }))
          onSelectProfile?.(id)
        }}
      />

      <AccessoryDetailsModal
        isOpen={!!selectedAccessory}
        onClose={() => setSelectedAccessory(null)}
        assetId={selectedAccessory?.id || null}
        account={
          {
            cookie: requestCookie,
            userId: accountUserId || (isOwnAccount ? userId : undefined)
          } as Account
        }
        initialData={
          selectedAccessory
            ? {
                name: selectedAccessory.name,
                imageUrl: selectedAccessory.imageUrl
              }
            : undefined
        }
      />

      <ExpandedAvatarModal
        isOpen={isAvatarExpanded}
        onClose={() => setIsAvatarExpanded(false)}
        userId={userIdNum}
        profile={profile}
        cookie={requestCookie}
      />

      {contextMenu &&
        createPortal(
          <AnimatePresence>
            <motion.div
              ref={contextMenuRef}
              initial={{ opacity: 0, y: 8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="fixed z-[100] w-52 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden"
              style={{
                top: Math.min(contextMenu.y, window.innerHeight - 220),
                left: Math.min(contextMenu.x, window.innerWidth - 220)
              }}
            >
              <div className="p-1.5">
                <button
                  onClick={() => {
                    setIsWearingOpen(true)
                    setContextMenu(null)
                  }}
                  className="pressable w-full text-left px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2.5 rounded-lg transition-colors"
                >
                  <Shirt size={16} />
                  <span className="font-medium">Currently Wearing</span>
                </button>
                <button
                  onClick={() => {
                    setIsOutfitsOpen(true)
                    setContextMenu(null)
                  }}
                  className="pressable w-full text-left px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2.5 rounded-lg transition-colors"
                >
                  <Package size={16} />
                  <span className="font-medium">View Outfits</span>
                </button>
                <button
                  onClick={() => {
                    setIsInventoryOpen(true)
                    setContextMenu(null)
                  }}
                  className="pressable w-full text-left px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2.5 rounded-lg transition-colors"
                >
                  <Box size={16} />
                  <span className="font-medium">View Inventory</span>
                </button>
                <div className="h-px bg-neutral-800 my-1" />
                <button
                  onClick={handleCopyUserId}
                  className="pressable w-full text-left px-3 py-2.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white flex items-center gap-2.5 rounded-lg transition-colors"
                >
                  <Copy size={16} />
                  <span className="font-medium">Copy User ID</span>
                </button>
                <div className="h-px bg-neutral-800 my-1" />
                <div className="px-3 py-2 text-xs text-neutral-500 font-mono">{userId}</div>
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}

      <PlayerInventorySheet
        isOpen={isInventoryOpen}
        onClose={() => setIsInventoryOpen(false)}
        userId={userIdNum}
        username={profile?.username || profile?.displayName || String(userId)}
        cookie={requestCookie}
      />

      <GroupDetailsModal
        isOpen={!!selectedGroupId}
        onClose={() => setSelectedGroupId(null)}
        groupId={selectedGroupId}
        selectedAccount={{ cookie: requestCookie } as Account}
        userRole={groups.find((g) => g.group.id === selectedGroupId)?.role}
        onViewProfile={onSelectProfile}
      />
    </div>
  )
}

export default UserProfileView
