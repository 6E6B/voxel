import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  User,
  Users,
  Play,
  ThumbsUp,
  ThumbsDown,
  Globe,
  Info,
  Calendar,
  Clock,
  Gamepad2,
  Star,
  Twitter,
  Youtube,
  Twitch,
  Facebook,
  MessageCircle,
  ShoppingBag,
  Check,
  Server,
  Loader2,
  Shield,
  MonitorSmartphone,
  Link2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { Account, Game, JoinMethod } from '@renderer/types'
import { RobuxIcon } from '@renderer/components/UI/icons/RobuxIcon'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import {
  Sheet,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody
} from '@renderer/components/UI/dialogs/Sheet'
import { Dialog, DialogBody, DialogContent } from '@renderer/components/UI/dialogs/Dialog'
import { Button } from '@renderer/components/UI/buttons/Button'
import { SlidingNumber } from '@renderer/components/UI/specialized/SlidingNumber'
import { Tabs } from '@renderer/components/UI/navigation/Tabs'
import { formatNumber } from '@renderer/utils/numberUtils'
import { linkify } from '@renderer/utils/linkify'
import { cn } from '@renderer/lib/utils'
import ServersList from '../ServersView'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { SocialLink, VoteResponse, GamePass } from '@shared/ipc-schemas/games'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import FavoriteParticles from '@renderer/components/UI/specialized/FavoriteParticles'
import {
  useFavoriteGames,
  useAddFavoriteGame,
  useRemoveFavoriteGame
} from '@renderer/hooks/queries'
import {
  PurchaseErrorDialog,
  PurchaseSuccessDialog
} from '@renderer/features/avatar/components/AssetPricing'
import GameImageContextMenu from './GameImageContextMenu'
import VerifiedIcon from '@renderer/components/UI/icons/VerifiedIcon'
import UniversalProfileModal from '@renderer/components/Modals/UniversalProfileModal'
import { GroupDetailsModal } from '@renderer/features/groups/Modals/GroupDetailsModal'

interface GameDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  onLaunch: (config: { method: JoinMethod; target: string }) => void
  game: Game | null
  account?: Account | null
  onViewServers?: (placeId: string) => void // Kept for compatibility but unused
}

const CAROUSEL_INTERVAL = 5000

const getSocialIcon = (type: string) => {
  switch (type.toLowerCase()) {
    case 'twitter':
      return <Twitter size={20} className="text-[#1DA1F2]" />
    case 'youtube':
      return <Youtube size={20} className="text-[#FF0000]" />
    case 'twitch':
      return <Twitch size={20} className="text-[#9146FF]" />
    case 'facebook':
      return <Facebook size={20} className="text-[#1877F2]" />
    case 'discord':
      return <MessageCircle size={20} className="text-[#5865F2]" />
    default:
      return <Globe size={20} className="text-neutral-400" />
  }
}

const getPlatformName = (type: string): string => {
  const normalized = type.toLowerCase()
  if (normalized === 'pc' || normalized === 'desktop') return 'PC'
  if (normalized === 'mobile' || normalized === 'phone') return 'Mobile'
  if (normalized === 'console') return 'Console'
  if (normalized === 'tablet') return 'Tablet'
  return type.charAt(0).toUpperCase() + type.slice(1).toLowerCase()
}

const GameDetailsModal: React.FC<GameDetailsModalProps> = ({
  isOpen,
  onClose,
  onLaunch,
  game,
  account
}) => {
  const [displayedGame, setDisplayedGame] = useState<Game | null>(null)
  const [thumbnails, setThumbnails] = useState<string[]>([])
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [activeTab, setActiveTab] = useState<'info' | 'servers' | 'store'>('info')
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [selectedCreatorId, setSelectedCreatorId] = useState<string | number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartX, setDragStartX] = useState(0)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const dragOffsetRef = useRef(0)
  const carouselRef = useRef<HTMLDivElement>(null)
  const { showNotification } = useNotification()

  const handleCreatorClick = () => {
    if (!displayedGame) return

    if (displayedGame.creatorType === 'Group') {
      setSelectedCreatorId(parseInt(displayedGame.creatorId))
      setIsGroupModalOpen(true)
    } else {
      setSelectedCreatorId(displayedGame.creatorId)
      setIsProfileModalOpen(true)
    }
  }

  const queryClient = useQueryClient()
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    imageUrl: string
    gameName: string
  } | null>(null)

  // Favorite logic
  const { data: favorites = [] } = useFavoriteGames()
  const addFavoriteMutation = useAddFavoriteGame()
  const removeFavoriteMutation = useRemoveFavoriteGame()
  const [favoriteBurst, setFavoriteBurst] = useState(false)

  const isFavorite = displayedGame
    ? favorites.includes(displayedGame.placeId || displayedGame.id.toString())
    : false

  const handleFavorite = async () => {
    if (!displayedGame) return
    const placeId = displayedGame.placeId || displayedGame.id.toString()

    try {
      if (isFavorite) {
        await removeFavoriteMutation.mutateAsync(placeId)
        showNotification('Removed from favorites', 'success')
      } else {
        setFavoriteBurst(true)
        await addFavoriteMutation.mutateAsync(placeId)
        showNotification('Added to favorites', 'success')
        setTimeout(() => setFavoriteBurst(false), 1000)
      }
    } catch (error) {
      console.error('Failed to update favorites:', error)
      showNotification('Failed to update favorites', 'error')
    }
  }

  const handleImageContextMenu = useCallback(
    (e: React.MouseEvent, imageUrl: string) => {
      e.preventDefault()
      e.stopPropagation()
      if (!displayedGame) return
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        imageUrl,
        gameName: displayedGame.name
      })
    },
    [displayedGame]
  )

  const handleSaveImage = useCallback(
    async (imageUrl: string, gameName: string) => {
      try {
        const result = await window.api.saveGameImage(imageUrl, gameName)
        if (result.success) {
          showNotification('Image saved successfully', 'success')
        } else if (result.canceled) {
          // User canceled, don't show notification
        } else {
          showNotification('Failed to save image', 'error')
        }
      } catch (error) {
        console.error('Failed to save image:', error)
        showNotification('Failed to save image', 'error')
      }
    },
    [showNotification]
  )

  const handleCopyLink = useCallback(async () => {
    if (!displayedGame) return
    const link = `https://www.roblox.com/games/${displayedGame.placeId || displayedGame.id}`

    try {
      await navigator.clipboard.writeText(link)
      showNotification('Game link copied to clipboard', 'success')
    } catch (err) {
      console.error('Failed to copy link', err)
      showNotification('Failed to copy link', 'error')
    }
  }, [displayedGame, showNotification])

  const targetPlaceId = displayedGame?.placeId || displayedGame?.id
  const lastServerJobId = displayedGame?.lastServerJobId ?? null
  const hasFriendsPlaying = (displayedGame?.friendsPlayingCount ?? 0) > 0

  const handleRejoinLastServer = useCallback(() => {
    if (!displayedGame || !targetPlaceId) return
    if (!lastServerJobId) {
      showNotification('No recent server to rejoin', 'info')
      return
    }

    onLaunch({ method: JoinMethod.JobId, target: `${targetPlaceId}:${lastServerJobId}` })
    onClose()
  }, [displayedGame, lastServerJobId, onClose, onLaunch, showNotification, targetPlaceId])

  const handleJoinFriends = useCallback(() => {
    if (!hasFriendsPlaying) {
      showNotification('No friends playing this game right now', 'info')
      return
    }

    // We don’t yet have a direct friend join target; jump to Servers tab so they can pick.
    setActiveTab('servers')
    showNotification('Jumped to Servers — look for friends online', 'info')
  }, [hasFriendsPlaying, showNotification])

  const { data: socialLinks } = useQuery({
    queryKey: ['gameSocialLinks', game?.universeId],
    queryFn: async () => {
      if (!game?.universeId) return []
      return window.api.getGameSocialLinks(Number(game.universeId))
    },
    enabled: !!game?.universeId && isOpen
  })

  // Fetch game passes
  const { data: gamePassesData, isLoading: _isLoadingPasses } = useQuery({
    queryKey: ['gamePasses', game?.universeId],
    queryFn: async () => {
      if (!game?.universeId) return { gamePasses: [], nextPageToken: null }
      return window.api.getGamePasses(Number(game.universeId))
    },
    enabled: !!game?.universeId && isOpen
  })

  // Filter to only show passes that are for sale
  const gamePassesForSale = gamePassesData?.gamePasses?.filter((p: GamePass) => p.isForSale) || []
  const hasGamePasses = gamePassesForSale.length > 0

  const voteMutation = useMutation({
    mutationFn: async ({ vote }: { vote: boolean }) => {
      if (!game?.universeId) throw new Error('No universe ID')
      return window.api.voteOnGame(Number(game.universeId), vote)
    },
    onSuccess: (data: VoteResponse) => {
      if (data.success) {
        showNotification(
          `Successfully ${data.model?.userVote ? 'liked' : 'disliked'} the game!`,
          'success'
        )

        // Update local state
        if (data.model) {
          setDisplayedGame((prev) => {
            if (!prev) return null
            return {
              ...prev,
              likes: data.model?.upVotes ?? prev.likes,
              dislikes: data.model?.downVotes ?? prev.dislikes,
              userVote: data.model?.userVote
            }
          })
        }

        // Refresh game stats
        queryClient.invalidateQueries({ queryKey: ['gameDetails', game?.universeId] })
      } else if (data.modalType === 'PlayGame') {
        showNotification('You must play the game before you can vote', 'error')
      } else {
        showNotification(data.message || 'Failed to vote on game', 'error')
      }
    },
    onError: (error: any) => {
      console.error('Vote error:', error)
      showNotification('Failed to vote on game', 'error')
    }
  })

  // Auto-advance carousel
  const startCarousel = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % Math.max(thumbnails.length, 1))
    }, CAROUSEL_INTERVAL)
  }, [thumbnails.length])

  const showCarouselControls = thumbnails.length > 1
  const canCarouselLeft = showCarouselControls && carouselIndex > 0
  const canCarouselRight = showCarouselControls && carouselIndex < thumbnails.length - 1

  const handleCarouselLeft = useCallback(() => {
    if (!showCarouselControls) return
    setCarouselIndex((prev) => Math.max(prev - 1, 0))
    startCarousel()
  }, [showCarouselControls, startCarousel])

  const handleCarouselRight = useCallback(() => {
    if (!showCarouselControls) return
    setCarouselIndex((prev) => Math.min(prev + 1, thumbnails.length - 1))
    startCarousel()
  }, [showCarouselControls, startCarousel, thumbnails.length])

  useEffect(() => {
    if (isOpen && thumbnails.length > 1) {
      startCarousel()
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [isOpen, thumbnails.length, startCarousel])

  const finishDrag = useCallback(() => {
    if (!isDragging) return
    setIsDragging(false)

    const threshold = 100
    const finalOffset = dragOffsetRef.current
    let nextIndex = carouselIndex

    if (finalOffset > threshold && carouselIndex > 0) {
      nextIndex = carouselIndex - 1
    } else if (finalOffset < -threshold && carouselIndex < thumbnails.length - 1) {
      nextIndex = carouselIndex + 1
    }

    dragOffsetRef.current = 0

    if (carouselRef.current) {
      carouselRef.current.style.transition = 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'
      carouselRef.current.style.transform = `translateX(calc(-${nextIndex * 100}%))`
    }

    setCarouselIndex(nextIndex)
    startCarousel()
  }, [carouselIndex, isDragging, startCarousel, thumbnails.length])

  // Update carousel transform when index changes (when not dragging)
  useEffect(() => {
    if (!isDragging && carouselRef.current) {
      carouselRef.current.style.transform = `translateX(calc(-${carouselIndex * 100}%))`
    }
  }, [carouselIndex, isDragging])

  // Refresh game stats
  useEffect(() => {
    if (!isOpen || !game?.universeId) return

    const fetchStats = async () => {
      try {
        const games = await window.api.getGamesByUniverseIds([Number(game.universeId)])
        if (games && games.length > 0) {
          const details = games[0]
          setDisplayedGame((prev) => {
            if (!prev) return null
            return {
              ...prev,
              playing: details.playing ?? prev.playing,
              visits: details.visits ?? prev.visits
            }
          })
        }
      } catch (error) {
        console.error('Failed to refresh game stats', error)
      }
    }

    const statsInterval = setInterval(fetchStats, 10000)
    return () => clearInterval(statsInterval)
  }, [isOpen, game])

  useEffect(() => {
    if (game) {
      setDisplayedGame(game)
      setCarouselIndex(0)
      setActiveTab('info')
      // Start with the fallback thumbnail
      setThumbnails(game.thumbnailUrl ? [game.thumbnailUrl] : [])

      // Fetch high-res thumbnails
      if (game.universeId) {
        window.api
          .getGameThumbnail16x9(Number(game.universeId))
          .then((urls) => {
            if (urls && urls.length > 0) {
              setThumbnails(urls)
            }
          })
          .catch((err) => {
            console.error('Failed to fetch high-res thumbnails', err)
          })
      }
    }
  }, [game])

  // Calculate stats safely
  const totalVotes = displayedGame ? displayedGame.likes + displayedGame.dislikes : 0
  const likePercentage =
    displayedGame && totalVotes > 0 ? Math.round((displayedGame.likes / totalVotes) * 100) : 0
  if (!displayedGame) return null

  const ageRating = displayedGame.ageRating || 'Not rated'
  const deviceNames =
    displayedGame.supportedDevices && displayedGame.supportedDevices.length > 0
      ? displayedGame.supportedDevices.map((device) => getPlatformName(device)).join(' / ')
      : 'Unknown devices'

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetContent className="h-full flex flex-col">
        <SheetHandle />

        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <Gamepad2 className="text-neutral-300" size={20} />
            </div>
            <SheetTitle>Game Details</SheetTitle>
          </div>
          <SheetClose />
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="flex flex-col h-full">
            <div className="flex flex-col lg:flex-row flex-1 min-h-0">
              {/* LEFT SIDE: Preview & Actions */}
              <div className="w-full lg:w-1/2 flex flex-col bg-neutral-950 border-b lg:border-b-0 lg:border-r border-neutral-800 relative">
                {/* Carousel */}
                <div
                  className="relative w-full aspect-video bg-neutral-900 overflow-hidden cursor-grab active:cursor-grabbing group"
                  onMouseDown={(e) => {
                    setIsDragging(true)
                    setDragStartX(e.clientX)
                    dragOffsetRef.current = 0
                    if (intervalRef.current) clearInterval(intervalRef.current)
                    if (carouselRef.current) {
                      carouselRef.current.style.transition = 'none'
                    }
                  }}
                  onMouseMove={(e) => {
                    if (!isDragging || !carouselRef.current) return
                    const diff = e.clientX - dragStartX
                    dragOffsetRef.current = diff
                    carouselRef.current.style.transform = `translateX(calc(-${carouselIndex * 100}% + ${diff}px))`
                  }}
                  onMouseUp={finishDrag}
                  onMouseLeave={() => {
                    if (isDragging) {
                      finishDrag()
                    }
                  }}
                >
                  {showCarouselControls && (
                    <>
                      {canCarouselLeft && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCarouselLeft()
                          }}
                          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] rounded-full shadow-lg transition-colors border border-[var(--color-border)]"
                          aria-label="Previous screenshot"
                        >
                          <ChevronLeft size={22} className="text-[var(--color-text-primary)]" />
                        </button>
                      )}
                      {canCarouselRight && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleCarouselRight()
                          }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 flex items-center justify-center bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] rounded-full shadow-lg transition-colors border border-[var(--color-border)]"
                          aria-label="Next screenshot"
                        >
                          <ChevronRight size={22} className="text-[var(--color-text-primary)]" />
                        </button>
                      )}
                      {canCarouselLeft && (
                        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-neutral-950 to-transparent z-10" />
                      )}
                      {canCarouselRight && (
                        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-neutral-950 to-transparent z-10" />
                      )}
                    </>
                  )}
                  <div
                    ref={carouselRef}
                    className="flex h-full"
                    style={{
                      transform: `translateX(calc(-${carouselIndex * 100}%))`,
                      transition: 'transform 500ms cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                  >
                    {thumbnails.map((url, idx) => (
                      <img
                        key={`thumbnail-${idx}`}
                        src={url}
                        alt={displayedGame.name}
                        className="w-full h-full object-cover shrink-0 select-none"
                        draggable={false}
                        onContextMenu={(e) => handleImageContextMenu(e, url)}
                      />
                    ))}
                  </div>

                  {/* Carousel indicators */}
                  {thumbnails.length > 1 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {thumbnails.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => {
                            setCarouselIndex(idx)
                            startCarousel()
                          }}
                          className={`w-1.5 h-1.5 rounded-full transition-all ${idx === carouselIndex ? 'bg-white w-4' : 'bg-white/50 hover:bg-white/70'}`}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Game Title & Creator */}
                <div className="p-6 flex flex-col gap-4">
                  <div>
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <h2 className="text-2xl font-bold text-white">{displayedGame.name}</h2>
                      {/* Favorite Button */}
                      <button
                        onClick={handleFavorite}
                        className="relative w-10 h-10 shrink-0 rounded-full bg-neutral-800 hover:bg-neutral-700 border border-neutral-700/50 flex items-center justify-center transition-all group"
                        title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                      >
                        <Star
                          size={20}
                          className={cn(
                            'transition-all duration-300',
                            isFavorite
                              ? 'fill-yellow-400 text-yellow-400'
                              : 'text-neutral-400 group-hover:text-white'
                          )}
                        />
                        <FavoriteParticles active={favoriteBurst} />
                      </button>
                    </div>
                    <div className="flex items-center gap-1 text-neutral-400">
                      <User size={16} />
                      <span className="text-sm font-medium flex items-center gap-1">
                        by{' '}
                        <button
                          onClick={handleCreatorClick}
                          className={cn(
                            'hover:underline focus:outline-none',
                            displayedGame.creatorHasVerifiedBadge
                              ? 'text-[#3385ff] flex items-center gap-1'
                              : 'text-white'
                          )}
                        >
                          {displayedGame.creatorName}
                          {displayedGame.creatorHasVerifiedBadge && (
                            <VerifiedIcon width={14} height={14} />
                          )}
                        </button>
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-3">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 text-xs text-neutral-200 border border-neutral-800">
                        <Shield size={14} className="text-neutral-400" />
                        Age: {ageRating}
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-neutral-900 text-xs text-neutral-200 border border-neutral-800">
                        <MonitorSmartphone size={14} className="text-neutral-400" />
                        {deviceNames}
                      </span>
                    </div>
                  </div>

                  {/* Play Button */}
                  <button
                    className="w-full pressable bg-[rgba(var(--accent-color-rgb),0.95)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] font-bold text-base py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-[0_0_25px_var(--accent-color-shadow)] border border-[var(--accent-color-border)]"
                    onClick={() => {
                      const targetId = displayedGame.placeId || displayedGame.id
                      onLaunch({ method: JoinMethod.PlaceId, target: targetId })
                      onClose()
                    }}
                  >
                    <Play fill="currentColor" size={20} />
                    <span>Play Now</span>
                  </button>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={handleJoinFriends}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm flex items-center justify-center gap-2 transition-colors',
                        hasFriendsPlaying
                          ? 'hover:bg-neutral-800 text-white'
                          : 'text-neutral-500 cursor-not-allowed'
                      )}
                    >
                      <Users size={16} />
                      <span>{hasFriendsPlaying ? 'Join friends' : 'No friends playing'}</span>
                    </button>
                    <button
                      onClick={handleRejoinLastServer}
                      className={cn(
                        'w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm flex items-center justify-center gap-2 transition-colors',
                        lastServerJobId
                          ? 'hover:bg-neutral-800 text-white'
                          : 'text-neutral-500 cursor-not-allowed'
                      )}
                    >
                      <Clock size={16} />
                      <span>{lastServerJobId ? 'Rejoin last server' : 'No recent server'}</span>
                    </button>
                    <button
                      onClick={handleCopyLink}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-800 bg-neutral-900 text-sm flex items-center justify-center gap-2 transition-colors hover:bg-neutral-800 text-white"
                    >
                      <Link2 size={16} />
                      <span>Copy link</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT SIDE: Info & Tabs */}
              <div className="w-full lg:w-1/2 flex flex-col overflow-hidden bg-neutral-950">
                <Tabs
                  tabs={[
                    { id: 'info', label: 'Info', icon: Info },
                    { id: 'servers', label: 'Servers', icon: Server },
                    { id: 'store', label: 'Store', icon: ShoppingBag, hidden: !hasGamePasses }
                  ]}
                  activeTab={activeTab}
                  onTabChange={(tabId) => setActiveTab(tabId as 'info' | 'servers' | 'store')}
                  layoutId="gameDetailsTabIndicator"
                />

                <div
                  className={cn(
                    'flex-1 bg-neutral-950',
                    activeTab === 'info'
                      ? 'overflow-y-auto scrollbar-thin'
                      : 'overflow-hidden flex flex-col'
                  )}
                >
                  {activeTab === 'info' ? (
                    <div className="p-6 space-y-6">
                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800/50">
                          <div className="flex items-center gap-2 text-neutral-400 mb-1 text-xs uppercase tracking-wide font-semibold">
                            <Users size={16} />
                            <span>Playing</span>
                          </div>
                          <SlidingNumber
                            number={displayedGame.playing}
                            formatter={formatNumber}
                            className="text-2xl font-bold text-white leading-none"
                          />
                        </div>
                        <div className="bg-neutral-900/50 p-4 rounded-lg border border-neutral-800/50">
                          <div className="flex items-center gap-2 text-neutral-400 mb-1 text-xs uppercase tracking-wide font-semibold">
                            <Globe size={16} />
                            <span>Visits</span>
                          </div>
                          <SlidingNumber
                            number={displayedGame.visits}
                            formatter={formatNumber}
                            className="text-2xl font-bold text-white leading-none"
                          />
                        </div>
                      </div>

                      {/* Like Ratio */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <button
                            className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                            onClick={() => voteMutation.mutate({ vote: true })}
                            disabled={voteMutation.isPending}
                            title="Like"
                          >
                            <ThumbsUp
                              size={16}
                              className={
                                displayedGame.userVote === true
                                  ? 'fill-current'
                                  : 'group-hover:fill-current'
                              }
                            />
                            <SlidingNumber
                              number={displayedGame.likes}
                              formatter={formatNumber}
                              className="font-bold"
                            />
                          </button>
                          <button
                            className="flex items-center gap-2 text-red-400 hover:text-red-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed group"
                            onClick={() => voteMutation.mutate({ vote: false })}
                            disabled={voteMutation.isPending}
                            title="Dislike"
                          >
                            <SlidingNumber
                              number={displayedGame.dislikes}
                              formatter={formatNumber}
                              className="font-bold"
                            />
                            <ThumbsDown
                              size={16}
                              className={
                                displayedGame.userVote === false
                                  ? 'fill-current'
                                  : 'group-hover:fill-current'
                              }
                            />
                          </button>
                        </div>
                        <div className="h-2 w-full bg-neutral-800 rounded-full overflow-hidden flex">
                          <div
                            className="h-full bg-emerald-500"
                            style={{ width: `${likePercentage}%` }}
                          ></div>
                          <div className="h-full bg-red-500 flex-1"></div>
                        </div>
                      </div>

                      {/* Description */}
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-white">Description</h3>
                        <div className="flex gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-300 text-xs border border-neutral-700">
                            {displayedGame.genre}
                          </span>
                        </div>
                        <p className="text-neutral-400 text-sm leading-relaxed whitespace-pre-wrap">
                          {linkify(displayedGame.description)}
                        </p>
                      </div>

                      {/* Detail Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/50">
                          <div className="flex items-center gap-2 text-neutral-400 mb-1 text-xs uppercase tracking-wide font-semibold">
                            <Info size={14} />
                            <span>Place ID</span>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="text-lg font-bold text-white font-mono truncate">
                                {displayedGame.placeId || displayedGame.id}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              {displayedGame.placeId || displayedGame.id.toString()}
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/50">
                          <div className="flex items-center gap-2 text-neutral-400 mb-1 text-xs uppercase tracking-wide font-semibold">
                            <Users size={14} />
                            <span>Max Players</span>
                          </div>
                          <div className="text-lg font-bold text-white">
                            {displayedGame.maxPlayers}
                          </div>
                        </div>
                        <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/50">
                          <div className="flex items-center gap-2 text-neutral-400 mb-1 text-xs uppercase tracking-wide font-semibold">
                            <Calendar size={14} />
                            <span>Created</span>
                          </div>
                          <div className="text-lg font-bold text-white">
                            {displayedGame.created
                              ? new Date(displayedGame.created).toLocaleDateString()
                              : '-'}
                          </div>
                        </div>
                        <div className="bg-neutral-900/50 p-3 rounded-lg border border-neutral-800/50">
                          <div className="flex items-center gap-2 text-neutral-400 mb-1 text-xs uppercase tracking-wide font-semibold">
                            <Clock size={14} />
                            <span>Updated</span>
                          </div>
                          <div className="text-lg font-bold text-white">
                            {displayedGame.updated
                              ? new Date(displayedGame.updated).toLocaleDateString()
                              : '-'}
                          </div>
                        </div>
                      </div>

                      {/* Social Links */}
                      {socialLinks && socialLinks.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-neutral-800">
                          <h3 className="text-lg font-semibold text-white">Social Links</h3>
                          <div className="flex flex-wrap gap-2">
                            {socialLinks.map((link: SocialLink) => (
                              <Tooltip key={link.id}>
                                <TooltipTrigger asChild>
                                  <a
                                    href={link.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 px-3 py-2 bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 rounded-lg transition-colors text-sm font-medium text-neutral-300 hover:text-white"
                                  >
                                    {getSocialIcon(link.type)}
                                    <span>{link.title}</span>
                                  </a>
                                </TooltipTrigger>
                                <TooltipContent>{getPlatformName(link.type)}</TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : activeTab === 'servers' ? (
                    <div className="flex-1 min-h-0">
                      <ServersList
                        placeId={displayedGame.placeId || displayedGame.id.toString()}
                        onJoin={(jobId) => {
                          const targetId = displayedGame.placeId || displayedGame.id.toString()
                          onLaunch({ method: JoinMethod.JobId, target: `${targetId}:${jobId}` })
                          onClose()
                        }}
                      />
                    </div>
                  ) : activeTab === 'store' ? (
                    <div className="flex-1 overflow-y-auto scrollbar-thin p-4">
                      <div className="grid grid-cols-1 gap-3">
                        {gamePassesForSale.map((pass: GamePass) => (
                          <GamePassCard
                            key={pass.id}
                            pass={pass}
                            account={account}
                            showNotification={showNotification}
                          />
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </SheetBody>
      </SheetContent>

      <GameImageContextMenu
        activeMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        onSaveImage={handleSaveImage}
      />

      <UniversalProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        userId={selectedCreatorId}
        selectedAccount={account || null}
      />

      <GroupDetailsModal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        groupId={typeof selectedCreatorId === 'number' ? selectedCreatorId : null}
        selectedAccount={account || null}
      />
    </Sheet>
  )
}

// Game Pass Card Component
const GamePassCard: React.FC<{
  pass: GamePass
  account?: Account | null
  showNotification: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void
}> = ({ pass, account, showNotification }) => {
  const [imageUrl, setImageUrl] = useState<string>('')
  const [isPurchasing, setIsPurchasing] = useState(false)
  const [isOwned, setIsOwned] = useState(pass.isOwned)
  const [showConfirm, setShowConfirm] = useState(false)
  const [purchaseSuccess, setPurchaseSuccess] = useState<{
    name: string
    creator: string
    price: number | string
    thumbnailUrl: string
  } | null>(null)
  const [purchaseError, setPurchaseError] = useState<string | null>(null)

  useEffect(() => {
    if (pass.displayIconImageAssetId) {
      fetch(
        `https://thumbnails.roblox.com/v1/assets?assetIds=${pass.displayIconImageAssetId}&size=150x150&format=Png&isCircular=false`
      )
        .then((res) => res.json())
        .then((data) => {
          if (data.data && data.data.length > 0 && data.data[0].imageUrl) {
            setImageUrl(data.data[0].imageUrl)
          }
        })
        .catch(() => {
          console.error('Failed to load game pass thumbnail')
        })
    }
  }, [pass.displayIconImageAssetId])

  const handleOpenConfirm = () => {
    if (isOwned) return
    if (pass.price === null) {
      showNotification('This game pass is not currently for sale', 'warning')
      return
    }
    if (!account?.cookie) {
      showNotification('Select an account with a valid cookie to purchase', 'error')
      return
    }
    setPurchaseError(null)
    setShowConfirm(true)
  }

  const handleConfirmPurchase = async () => {
    if (!account?.cookie || pass.price === null) return

    setIsPurchasing(true)
    setPurchaseError(null)

    const sellerId = pass.creator?.creatorId
    if (!sellerId) {
      const message = 'Unable to determine seller for this game pass'
      setPurchaseError(message)
      showNotification(message, 'error')
      setIsPurchasing(false)
      setShowConfirm(false)
      return
    }
    const idempotencyKey =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : undefined

    try {
      const result = await window.api.purchaseGamePass(
        account.cookie,
        pass.productId,
        pass.price,
        sellerId,
        account.userId,
        idempotencyKey
      )

      if (result?.purchased) {
        setIsOwned(true)
        setPurchaseSuccess({
          name: pass.displayName || pass.name,
          creator: pass.creator?.name || 'Unknown Creator',
          price: pass.price,
          thumbnailUrl: imageUrl
        })
        showNotification('Game pass purchased successfully', 'success')
      } else {
        const message =
          result?.reason ||
          result?.errorMessage ||
          result?.shortMessage ||
          result?.purchaseResult ||
          'Failed to purchase game pass'
        setPurchaseError(message)
        showNotification(message, 'error')
      }
    } catch (error: any) {
      const message = error?.message || 'Failed to purchase game pass'
      setPurchaseError(message)
      showNotification(message, 'error')
    } finally {
      setIsPurchasing(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="bg-neutral-900/50 border border-neutral-800/50 rounded-lg p-3 flex gap-3 hover:bg-neutral-900 transition-colors">
      <div className="w-16 h-16 rounded-lg bg-neutral-800 overflow-hidden flex-shrink-0">
        {imageUrl ? (
          <img src={imageUrl} alt={pass.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={24} className="text-neutral-600" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0 flex flex-col justify-center">
        <h4 className="text-sm font-semibold text-white truncate">{pass.displayName}</h4>
        {pass.displayDescription && (
          <p className="text-xs text-neutral-400 line-clamp-2 mt-0.5">{pass.displayDescription}</p>
        )}
      </div>

      <div className="flex flex-col items-end justify-center gap-1 flex-shrink-0">
        {isOwned ? (
          <div className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400">
            <Check size={14} />
            <span className="text-xs font-medium">Owned</span>
          </div>
        ) : pass.price !== null ? (
          <button
            onClick={handleOpenConfirm}
            disabled={isPurchasing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[rgba(var(--accent-color-rgb),0.15)] hover:bg-[rgba(var(--accent-color-rgb),0.25)] border border-[var(--accent-color-border)] rounded-lg text-[var(--accent-color)] transition-colors disabled:opacity-50"
          >
            <RobuxIcon className="w-4 h-4" />
            <span className="text-sm font-semibold">{pass.price.toLocaleString()}</span>
          </button>
        ) : (
          <span className="text-xs text-neutral-500">Not for sale</span>
        )}
      </div>

      <Dialog isOpen={showConfirm} onClose={() => !isPurchasing && setShowConfirm(false)}>
        <DialogContent className="max-w-sm">
          <DialogBody className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                {imageUrl ? (
                  <img src={imageUrl} alt={pass.displayName} className="w-full h-full object-cover" />
                ) : (
                  <ShoppingBag size={24} className="text-neutral-600" />
                )}
              </div>
              <div>
                <p className="text-sm text-neutral-400">Confirm Purchase</p>
                <p className="text-base font-semibold text-white truncate">{pass.displayName}</p>
              </div>
            </div>

            <div className="text-sm text-neutral-300">
              Buy this game pass for{' '}
              <span className="inline-flex items-center gap-1 font-semibold text-emerald-400">
                {pass.price?.toLocaleString()}
                <RobuxIcon className="w-4 h-4" />
              </span>
              ?
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline" className="flex-1" disabled={isPurchasing} onClick={() => setShowConfirm(false)}>
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={isPurchasing}
                onClick={handleConfirmPurchase}
              >
                {isPurchasing && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {isPurchasing ? 'Purchasing...' : 'Confirm'}
              </Button>
            </div>
          </DialogBody>
        </DialogContent>
      </Dialog>

      {purchaseSuccess && (
        <PurchaseSuccessDialog
          isOpen={!!purchaseSuccess}
          onClose={() => setPurchaseSuccess(null)}
          assetName={purchaseSuccess.name}
          creatorName={purchaseSuccess.creator}
          price={purchaseSuccess.price}
          thumbnailUrl={purchaseSuccess.thumbnailUrl}
        />
      )}

      <PurchaseErrorDialog
        isOpen={!!purchaseError}
        onClose={() => setPurchaseError(null)}
        errorMessage={purchaseError || ''}
      />
    </div>
  )
}

export default GameDetailsModal
