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
import { Account, Game } from '@renderer/shared/types'
import { AccountStatus } from '@renderer/shared/types'
import UserListModal from '@renderer/app/dialogs/UserListModal'
import AccessoryDetailsModal from '@renderer/features/avatar/dialogs/AccessoryDetailsModal'
import PlayerInventorySheet from '@renderer/features/inventory/PlayerInventorySheet'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
  DialogBody
} from '@renderer/shared/ui/dialogs/Dialog'
import { SkeletonSquareGrid } from '@renderer/shared/ui/display/SkeletonGrid'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { ItemCard, ItemCardTag } from '@renderer/shared/ui/display/ItemCard'
import {
  useUserGroups,
  useUserCollections,
  useExperienceBadges,
  useUserWearingItems,
  useRobloxBadges as useUserRobloxBadges
} from '@renderer/features/profile/api/useUserProfile'
import {
  useUserProfilePlatform
} from '@renderer/features/profile/api/useUserProfilePlatform'
import { useUserProfileOutfits } from './hooks/useUserProfileOutfits'
import { useProfileData } from './hooks/useProfileData'
import { useFriendStatuses } from './hooks/useFriendStatuses'
import { ProfileHeader } from './components/ProfileHeader'
import { ProfileStatsBento } from './components/ProfileStatsBento'
import { FriendsSection } from './components/FriendsSection'
import { GroupsSection } from './components/GroupsSection'
import GroupDetailsModal from '@renderer/features/groups/GroupDetailsModal'
import { CollectionsSection } from './components/CollectionsSection'
import { useLastSeenStore } from './useLastSeenStore'
import { BadgesSection } from './components/BadgesSection'
import { ProfileFloatingToolbar } from './components/ProfileFloatingToolbar'
import { useRolimonsItem } from '@renderer/features/avatar/api/useRolimons'
import GenericContextMenu, {
  ContextMenuSection
} from '@renderer/shared/ui/menus/GenericContextMenu'
import {
  createAnchoredOverlayPosition,
  type AnchoredOverlayPosition
} from '@renderer/shared/ui/menus/anchoredPosition'
import { useSetSelectedGame } from '@renderer/shared/stores/useUIStore'

const SOUND_HAT_IDS = [24114402, 305888394, 24112667, 33070696]

const ItemTagBadges: React.FC<{ assetId: number }> = ({ assetId }) => {
  const rolimonsItem = useRolimonsItem(assetId)
  const isLimited = !!rolimonsItem
  const isSoundHat = SOUND_HAT_IDS.includes(assetId)

  if (!isLimited && !isSoundHat) return null

  return (
    <>
      {isLimited && (
        <ItemCardTag
          icon={<Sparkles size={13} strokeWidth={2.5} className="shrink-0" />}
          label="Limited"
          color="emerald"
        />
      )}
      {rolimonsItem?.isProjected && (
        <ItemCardTag
          icon={<TrendingUp size={13} strokeWidth={2.5} className="shrink-0" />}
          label="Projected"
          color="red"
        />
      )}
      {rolimonsItem?.isHyped && (
        <ItemCardTag
          icon={<Flame size={13} strokeWidth={2.5} className="shrink-0" />}
          label="Hyped"
          color="orange"
        />
      )}
      {rolimonsItem?.isRare && (
        <ItemCardTag
          icon={<Star size={13} strokeWidth={2.5} className="shrink-0" />}
          label="Rare"
          color="pink"
        />
      )}
      {isSoundHat && (
        <ItemCardTag
          icon={<Music size={13} strokeWidth={2.5} className="shrink-0" />}
          label="Sound Hat"
          color="cyan"
        />
      )}
    </>
  )
}

export interface ProfileViewProps {
  userId: string | number
  requestCookie: string
  accountUserId?: string | number
  privacyMode?: boolean
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
  onJoinGame?: (placeId: number | string, jobId?: string, userId?: number | string) => void
}

const UserProfileView: React.FC<ProfileViewProps> = ({
  userId,
  requestCookie,
  accountUserId,
  privacyMode,
  initialData,
  isOwnAccount,
  onClose,
  showCloseButton = false,
  onSelectProfile,
  onJoinGame
}) => {
  const [isWearingOpen, setIsWearingOpen] = useState(false)
  const [isOutfitsOpen, setIsOutfitsOpen] = useState(false)
  const [selectedAccessory, setSelectedAccessory] = useState<{
    id: number
    name: string
    imageUrl: string
  } | null>(null)
  const [userListModal, setUserListModal] = useState<{
    isOpen: boolean
    type: 'friends' | 'followers' | 'following'
    title: string
  }>({
    isOpen: false,
    type: 'friends',
    title: ''
  })
  const [contextMenu, setContextMenu] = useState<AnchoredOverlayPosition | null>(null)
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
  const setSelectedGame = useSetSelectedGame()

  const userIdNum = typeof userId === 'string' ? parseInt(userId) : userId
  const accountUserIdNum =
    typeof accountUserId === 'string'
      ? parseInt(accountUserId)
      : typeof accountUserId === 'number'
        ? accountUserId
        : null

  const { profile } = useProfileData({ userId: userIdNum, requestCookie, initialData })
  const { sortedFriends } = useFriendStatuses(userIdNum, requestCookie)
  const { data: profilePlatform } = useUserProfilePlatform(userIdNum, requestCookie)

  const blurIdentity = !!privacyMode && accountUserIdNum != null && accountUserIdNum === userIdNum

  const recordSeen = useLastSeenStore((s) => s.recordSeen)
  const isProfileOnline =
    profile.status === AccountStatus.Online ||
    profile.status === AccountStatus.InGame ||
    profile.status === AccountStatus.InStudio

  useEffect(() => {
    if (userIdNum && isProfileOnline) recordSeen(userIdNum)
  }, [isProfileOnline, userIdNum, recordSeen])

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

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault()
    const anchorElement = e.target instanceof HTMLElement ? e.target : e.currentTarget
    setContextMenu(createAnchoredOverlayPosition(e, anchorElement))
  }, [])

  const handleCopyUserId = useCallback(() => {
    navigator.clipboard.writeText(userId.toString())
    setContextMenu(null)
  }, [userId])

  const profileContextMenuSections = useMemo<ContextMenuSection[]>(
    () => [
      {
        items: [
          {
            label: 'Currently Wearing',
            icon: <Shirt size={16} />,
            onClick: () => {
              setIsWearingOpen(true)
              setContextMenu(null)
            }
          },
          {
            label: 'View Outfits',
            icon: <Package size={16} />,
            onClick: () => {
              setIsOutfitsOpen(true)
              setContextMenu(null)
            }
          },
          {
            label: 'View Inventory',
            icon: <Box size={16} />,
            onClick: () => {
              setIsInventoryOpen(true)
              setContextMenu(null)
            }
          }
        ]
      },
      {
        items: [
          {
            label: 'Copy User ID',
            icon: <Copy size={16} />,
            onClick: handleCopyUserId
          }
        ]
      }
    ],
    [handleCopyUserId]
  )

  const handleOpenGameDetails = useCallback(async () => {
    const placeId = profile.gameActivity?.placeId
    if (!placeId) return

    try {
      const games = (await window.api.getGamesByPlaceIds([String(placeId)])) as Game[]
      if (games?.length) {
        setSelectedGame(games[0])
      }
    } catch (err) {
      console.error('Failed to fetch game details:', err)
    }
  }, [profile.gameActivity?.placeId, setSelectedGame])

  return (
    <div
      className="relative flex flex-col w-full h-full bg-[var(--color-surface)] overflow-hidden font-sans"
      onContextMenu={handleContextMenu}
    >
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        <div className="max-w-[1400px] mx-auto">
          <ProfileHeader
            userId={userIdNum}
            profile={profileWithGroupCount}
            cookie={requestCookie}
            showCloseButton={showCloseButton}
            onClose={onClose}
            blurIdentity={blurIdentity}
            onSocialStatClick={(type) => {
              const titles = { friends: 'Friends', followers: 'Followers', following: 'Following' }
              setUserListModal({ isOpen: true, type, title: titles[type] })
            }}
            hasRawDescription={hasRawDescription}
            rawDescription={rawDescription}
            onSelectProfile={onSelectProfile}
            onJoinGame={onJoinGame}
            onOpenGameDetails={profile.gameActivity ? handleOpenGameDetails : undefined}
          />

          {/* Stat pills bar */}
          <div className="mt-5">
            <ProfileStatsBento
              profile={profileWithGroupCount}
              userId={userIdNum}
              requestCookie={requestCookie}
              pastUsernames={pastUsernames}
            />
          </div>

          {/* Friends */}
          {(loading || sortedFriends.length > 0) && (
            <>
              <div className="h-px bg-[var(--color-border-subtle)] mt-6" />
              <div className="py-5">
                <FriendsSection
                  friends={sortedFriends as any}
                  isLoading={loading}
                  friendCount={profile.friendCount ?? sortedFriends.length}
                  onViewAll={() =>
                    setUserListModal({ isOpen: true, type: 'friends', title: 'Friends' })
                  }
                  onSelectProfile={onSelectProfile}
                />
              </div>
            </>
          )}

          {/* Groups */}
          {(isLoadingGroups || groups.length > 0) && (
            <>
              <div className="h-px bg-[var(--color-border-subtle)]" />
              <div className="py-5">
                <GroupsSection
                  groups={groups}
                  isLoading={isLoadingGroups}
                  groupMemberCount={profileWithGroupCount.groupMemberCount}
                  onSelectGroup={(groupId) => setSelectedGroupId(groupId)}
                />
              </div>
            </>
          )}

          {/* Collections */}
          {(isLoadingCollections || collections.length > 0) && (
            <>
              <div className="h-px bg-[var(--color-border-subtle)]" />
              <div className="py-5">
                <CollectionsSection
                  collections={collections}
                  isLoading={isLoadingCollections}
                  onItemClick={setSelectedAccessory}
                  onViewAllClick={() => setIsInventoryOpen(true)}
                />
              </div>
            </>
          )}

          {/* Badges */}
          {(isLoadingRobloxBadges || isLoadingExperienceBadges || robloxBadges.length > 0 || experienceBadges.length > 0) && (
            <>
              <div className="h-px bg-[var(--color-border-subtle)]" />
              <div className="py-5">
                <BadgesSection
                  robloxBadges={robloxBadges}
                  experienceBadges={experienceBadges}
                  isLoadingRobloxBadges={isLoadingRobloxBadges}
                  isLoadingExperienceBadges={isLoadingExperienceBadges}
                  cookie={requestCookie}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <ProfileFloatingToolbar
        onWearingClick={() => setIsWearingOpen(true)}
        onOutfitsClick={() => setIsOutfitsOpen(true)}
        onInventoryClick={() => setIsInventoryOpen(true)}
        onCopyIdClick={handleCopyUserId}
      />

      <Dialog isOpen={isWearingOpen} onClose={() => setIsWearingOpen(false)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Currently Wearing</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody>
            <AnimatePresence mode="wait">
              {wearingLoading ? (
                <SkeletonSquareGrid
                  count={12}
                  className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin"
                />
              ) : wearingItems.length > 0 ? (
                <motion.div
                  key="items"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin"
                >
                  {wearingItems.map((item, index) => (
                    <ItemCard
                      key={item.id}
                      name={item.name}
                      thumbnailUrl={item.imageUrl}
                      index={index}
                      isCompact
                      tags={<ItemTagBadges assetId={item.id} />}
                      onClick={() =>
                        setSelectedAccessory({
                          id: item.id,
                          name: item.name,
                          imageUrl: item.imageUrl
                        })
                      }
                    />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Outfits</DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody>
            <AnimatePresence mode="wait">
              {outfitsLoading ? (
                <SkeletonSquareGrid
                  count={12}
                  className="max-h-[70vh] overflow-y-auto pr-2 scrollbar-thin"
                />
              ) : outfits.length > 0 ? (
                <motion.div
                  key="outfits"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin"
                >
                  {outfits.map((outfit, index) => (
                    <ItemCard
                      key={outfit.id}
                      name={outfit.name}
                      thumbnailUrl={outfit.imageUrl || undefined}
                      index={index}
                      isCompact
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
                    />
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
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <button
                onClick={() => {
                  setSelectedOutfit(null)
                  setOutfitDetails(null)
                }}
                className="pressable flex items-center justify-center w-6 h-6 rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors"
              >
                <ArrowLeft size={14} />
              </button>
              <span className="line-clamp-1">{selectedOutfit?.name || 'Outfit'}</span>
            </DialogTitle>
            <DialogClose />
          </DialogHeader>
          <DialogBody>
            <AnimatePresence mode="wait">
              {outfitDetailsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 size={20} className="text-[var(--color-text-muted)] animate-spin" />
                </div>
              ) : outfitDetails && outfitDetails.assets.length > 0 ? (
                <motion.div
                  key="outfit-assets"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="grid grid-cols-3 sm:grid-cols-5 gap-3 max-h-[70vh] overflow-y-auto pr-1 scrollbar-thin"
                >
                  {outfitDetails.assets.map((item, index) => (
                    <ItemCard
                      key={item.id}
                      name={item.name}
                      thumbnailUrl={item.imageUrl}
                      index={index}
                      isCompact
                      tags={<ItemTagBadges assetId={item.id} />}
                      onClick={() =>
                        setSelectedAccessory({
                          id: item.id,
                          name: item.name,
                          imageUrl: item.imageUrl
                        })
                      }
                    />
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

      <GenericContextMenu
        position={contextMenu}
        sections={profileContextMenuSections}
        onClose={() => setContextMenu(null)}
        width={220}
        footer={<div className="px-3 py-2 text-xs text-[var(--color-text-muted)] font-mono">{userId}</div>}
      />

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


