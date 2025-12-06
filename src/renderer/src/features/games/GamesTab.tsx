import { useState, useEffect, useMemo, useRef, CSSProperties, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Users, Star, Gamepad2, ThumbsUp, Play, X } from 'lucide-react'
import { VirtuosoGrid } from 'react-virtuoso'
import { Game } from '@renderer/types'
import GameContextMenu from './UI/GameContextMenu'
import { useNotification } from '@renderer/features/system/stores/useSnackbarStore'
import { Button } from '@renderer/components/UI/buttons/Button'
import { SearchInput } from '@renderer/components/UI/inputs/SearchInput'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider
} from '@renderer/components/UI/display/Tooltip'
import CustomDropdown, { DropdownOption } from '@renderer/components/UI/menus/CustomDropdown'
import { SkeletonGameGrid } from '@renderer/components/UI/display/SkeletonGrid'
import FavoriteParticles from '@renderer/components/UI/specialized/FavoriteParticles'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import VerifiedIcon from '@renderer/components/UI/icons/VerifiedIcon'
import { formatNumber } from '@renderer/utils/numberUtils'
import {
  useGameSorts,
  useGamesInSort,
  useSearchGames,
  useGamesByPlaceIds,
  useFavoriteGames,
  useAddFavoriteGame,
  useRemoveFavoriteGame
} from '@renderer/hooks/queries'
import { useOpenModal } from '@renderer/stores/useUIStore'
import { useSelectedIds } from '@renderer/stores/useSelectionStore'

interface GamesTabProps {
  onGameSelect: (game: Game) => void
}

const responsiveGridStyle: CSSProperties = {
  gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))'
}

const TruncatedTitle = ({ text, className }: { text: string; className?: string }) => {
  const textRef = useRef<HTMLHeadingElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useEffect(() => {
    const checkTruncation = () => {
      if (textRef.current) {
        setIsTruncated(textRef.current.scrollWidth > textRef.current.clientWidth)
      }
    }

    checkTruncation()
    // Add small delay to allow layout to settle
    const timer = setTimeout(checkTruncation, 100)

    window.addEventListener('resize', checkTruncation)
    return () => {
      window.removeEventListener('resize', checkTruncation)
      clearTimeout(timer)
    }
  }, [text])

  const titleElement = (
    <h3 ref={textRef} className={className}>
      {text}
    </h3>
  )

  if (isTruncated) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{titleElement}</TooltipTrigger>
        <TooltipContent>{text}</TooltipContent>
      </Tooltip>
    )
  }

  return titleElement
}

interface GameCardProps {
  game: Game
  onGameSelect: (game: Game) => void
  onContextMenu: (e: React.MouseEvent, game: Game) => void
  formatPlayerCount: (num: number) => string
  isFavorite: boolean
  favoriteBurst: boolean
}

const GameCard = ({
  game,
  onGameSelect,
  onContextMenu,
  formatPlayerCount,
  isFavorite,
  favoriteBurst
}: GameCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const mediaRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const isHoveredRef = useRef(false)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [hasImageError, setHasImageError] = useState(false)

  const targetTransform = useRef({ x: 0, y: 0, scale: 1 })
  const currentTransform = useRef({ x: 0, y: 0, scale: 1 })

  const PARALLAX_INTENSITY = 0.01 // Max translate percentage of width/height
  const HOVER_SCALE = 1.05
  const SMOOTHING = 0.12
  const EPSILON = 0.001

  const applyTransform = () => {
    if (!mediaRef.current) return
    const { x, y, scale } = currentTransform.current
    const transform = `translate(${x * 100}%, ${y * 100}%) scale(${scale})`
    if (mediaRef.current) {
      mediaRef.current.style.transform = transform
    }
  }

  const animate = () => {
    if (!imageRef.current) {
      rafRef.current = null
      return
    }

    const { x: targetX, y: targetY, scale: targetScale } = targetTransform.current
    const { x, y, scale } = currentTransform.current

    const nextX = x + (targetX - x) * SMOOTHING
    const nextY = y + (targetY - y) * SMOOTHING
    const nextScale = scale + (targetScale - scale) * SMOOTHING

    currentTransform.current = { x: nextX, y: nextY, scale: nextScale }
    applyTransform()

    const isSettled =
      Math.abs(nextX - targetX) < EPSILON &&
      Math.abs(nextY - targetY) < EPSILON &&
      Math.abs(nextScale - targetScale) < EPSILON

    if (!isSettled) {
      rafRef.current = requestAnimationFrame(animate)
      return
    }

    currentTransform.current = { ...targetTransform.current }
    applyTransform()
    rafRef.current = null
  }

  const startAnimation = () => {
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(animate)
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current || !imageRef.current || !isHoveredRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const relativeX = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1)
    const relativeY = Math.min(Math.max((e.clientY - rect.top) / rect.height, 0), 1)

    targetTransform.current.x = (relativeX - 0.5) * 2 * PARALLAX_INTENSITY
    targetTransform.current.y = (relativeY - 0.5) * 2 * PARALLAX_INTENSITY

    startAnimation()
  }

  const handleMouseEnter = () => {
    isHoveredRef.current = true
    targetTransform.current = { ...targetTransform.current, scale: HOVER_SCALE, x: 0, y: 0 }
    startAnimation()
  }

  const handleMouseLeave = () => {
    isHoveredRef.current = false
    targetTransform.current = { x: 0, y: 0, scale: 1 }
    startAnimation()
  }

  useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current)
      }
    }
  }, [])

  // Reset image loaded state when game changes
  useEffect(() => {
    setImageLoaded(false)
    setHasImageError(false)

    // Handle cached images that may already be loaded
    const img = imageRef.current
    if (img && img.complete && img.naturalWidth > 0) {
      setImageLoaded(true)
    }
  }, [game.thumbnailUrl])

  return (
    <div
      ref={cardRef}
      onClick={() => onGameSelect(game)}
      onContextMenu={(e) => onContextMenu(e, game)}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className="group bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden cursor-pointer hover:border-neutral-600 hover:bg-neutral-900 hover:-translate-y-1 transition-all shadow-sm animate-in fade-in duration-150"
    >
      <div className="aspect-square w-full relative overflow-hidden bg-black transform-gpu backface-hidden">
        {isFavorite && (
          <div className="absolute top-3 left-3 z-10 pointer-events-none">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-yellow-500/90 to-amber-600/90 flex items-center justify-center text-white shadow-lg shadow-yellow-500/20 backdrop-blur-sm border border-yellow-400/30 relative overflow-visible">
              <Star size={16} strokeWidth={0} className="fill-current" />
              <FavoriteParticles active={favoriteBurst} color={[251, 191, 36]} />
            </div>
          </div>
        )}
        {game.thumbnailUrl && !hasImageError ? (
          <div ref={mediaRef} className="absolute inset-0 will-change-transform">
            {!imageLoaded && (
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-neutral-700/50 to-transparent" />
              </div>
            )}
            <img
              ref={imageRef}
              src={game.thumbnailUrl}
              alt={game.name}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setHasImageError(true)
                setImageLoaded(true)
              }}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                display: 'block',
                opacity: imageLoaded ? 1 : 0,
                transition: 'opacity 0.4s ease-out'
              }}
              className="absolute inset-0 backface-hidden"
              loading="lazy"
            />
            <div
              className="absolute inset-0 pointer-events-none translate-z-0"
              style={{
                background:
                  'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.45) 45%, rgba(0,0,0,0.9) 100%)'
              }}
            ></div>
          </div>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-700">
            <Users size={32} />
          </div>
        )}
        <div className="absolute bottom-3 left-3 right-3 z-20">
          <TruncatedTitle
            text={game.name}
            className="font-bold text-white truncate text-shadow-sm"
          />
          <p className="text-xs text-neutral-300 truncate flex items-center gap-1">
            <span>by</span>
            <span
              className={`truncate flex items-center gap-1 ${
                game.creatorHasVerifiedBadge ? 'text-[#3385ff]' : ''
              }`}
            >
              {game.creatorName}
              {game.creatorHasVerifiedBadge && (
                <VerifiedIcon width={14} height={14} className="shrink-0" />
              )}
            </span>
          </p>
        </div>
      </div>
      <div className="p-3 flex items-center justify-between text-xs border-t border-neutral-800">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5 text-neutral-400">
              <Users size={14} />
              <span className="font-semibold">{formatPlayerCount(game.playing)}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-semibold">{game.playing.toLocaleString()}</div>
              <div className="text-xs text-neutral-400">playing now</div>
            </div>
          </TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`flex items-center gap-1.5 ${
                (game.likes + game.dislikes > 0
                  ? (game.likes / (game.likes + game.dislikes)) * 100
                  : 0) >= 80
                  ? 'text-green-400'
                  : (game.likes + game.dislikes > 0
                        ? (game.likes / (game.likes + game.dislikes)) * 100
                        : 0) >= 50
                    ? 'text-yellow-400'
                    : 'text-neutral-400'
              }`}
            >
              <ThumbsUp size={14} />
              <span className="font-semibold">
                {game.likes + game.dislikes > 0
                  ? ((game.likes / (game.likes + game.dislikes)) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <div className="font-semibold">{game.likes.toLocaleString()} likes</div>
              <div className="text-xs text-neutral-400">
                {game.dislikes.toLocaleString()} dislikes
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}

const GamesTab = ({ onGameSelect }: GamesTabProps) => {
  const { showNotification } = useNotification()
  const openModal = useOpenModal()
  const selectedIds = useSelectedIds()
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedSortId, setSelectedSortId] = useState<string | null>(null)
  const [showFavorites, setShowFavorites] = useState(false)

  const [favoriteGameBurstKeys, setFavoriteGameBurstKeys] = useState<Record<string, number>>({})
  const favoriteGameBurstTimeouts = useRef<Map<string, number>>(new Map())
  const [activeContextMenu, setActiveContextMenu] = useState<{
    id: string
    placeId?: string
    universeId?: string
    isFavorite: boolean
    x: number
    y: number
  } | null>(null)

  // Generate a session ID once per mount
  const [sessionId] = useState(() => self.crypto.randomUUID())

  // TanStack Query hooks
  const { data: sorts = [] } = useGameSorts(sessionId)
  const { data: favorites = [] } = useFavoriteGames()

  const addFavoriteMutation = useAddFavoriteGame()
  const removeFavoriteMutation = useRemoveFavoriteGame()

  // Determine which query to use based on mode
  const isSearchMode = debouncedSearchQuery.trim().length > 0
  const isFavoritesMode = showFavorites

  // Games in sort (default mode)
  const { data: sortGames = [], isLoading: isSortLoading } = useGamesInSort(
    !isSearchMode && !isFavoritesMode ? selectedSortId : null,
    sessionId
  )

  // Search results
  const { data: searchGames = [], isLoading: isSearchLoading } = useSearchGames(
    !isFavoritesMode ? debouncedSearchQuery : '',
    sessionId
  )

  // Favorite games
  const { data: favoriteGames = [], isLoading: isFavoritesLoading } = useGamesByPlaceIds(
    isFavoritesMode ? favorites : []
  )

  // Compute final games list
  const games = useMemo(() => {
    if (isFavoritesMode) {
      // Filter favorites by search if searching while in favorites mode
      if (debouncedSearchQuery.trim()) {
        const lowerQuery = debouncedSearchQuery.toLowerCase()
        return favoriteGames.filter((g) => g.name.toLowerCase().includes(lowerQuery))
      }
      return favoriteGames
    }
    if (isSearchMode) {
      return searchGames
    }
    return sortGames
  }, [isFavoritesMode, isSearchMode, favoriteGames, searchGames, sortGames, debouncedSearchQuery])

  const isLoading = isFavoritesMode
    ? isFavoritesLoading
    : isSearchMode
      ? isSearchLoading
      : isSortLoading

  const sortOptions: DropdownOption[] = useMemo(() => {
    return sorts.map((sort) => ({
      value: sort.token,
      label: sort.displayName || sort.name
    }))
  }, [sorts])

  // Auto-select first sort when sorts load
  useEffect(() => {
    if (sorts.length > 0 && !selectedSortId && !searchQuery) {
      const popularSort = sorts.find(
        (s) =>
          s.name.toLowerCase().includes('popular') ||
          s.name.toLowerCase().includes('trending') ||
          s.token.toLowerCase().includes('popular') ||
          s.token.toLowerCase().includes('trending')
      )
      setSelectedSortId(popularSort ? popularSort.token : sorts[0].token)
    }
  }, [sorts, selectedSortId, searchQuery])

  const triggerGameFavoriteBurst = (placeId: string) => {
    setFavoriteGameBurstKeys((prev) => ({
      ...prev,
      [placeId]: (prev[placeId] ?? 0) + 1
    }))

    const existingTimeout = favoriteGameBurstTimeouts.current.get(placeId)
    if (existingTimeout) {
      clearTimeout(existingTimeout)
    }

    const timeoutId = window.setTimeout(() => {
      setFavoriteGameBurstKeys((prev) => {
        const { [placeId]: _, ...rest } = prev
        return rest
      })
      favoriteGameBurstTimeouts.current.delete(placeId)
    }, 900)

    favoriteGameBurstTimeouts.current.set(placeId, timeoutId)
  }

  useEffect(() => {
    return () => {
      favoriteGameBurstTimeouts.current.forEach((timeoutId) => clearTimeout(timeoutId))
      favoriteGameBurstTimeouts.current.clear()
    }
  }, [])

  const handleFavorite = async (placeId: string) => {
    try {
      if (favorites.includes(placeId)) {
        await removeFavoriteMutation.mutateAsync(placeId)
        showNotification('Removed from favorites', 'success')
      } else {
        await addFavoriteMutation.mutateAsync(placeId)
        triggerGameFavoriteBurst(placeId)
        showNotification('Added to favorites', 'success')
      }
    } catch (error) {
      console.error('Failed to update favorites:', error)
      showNotification('Failed to update favorites', 'error')
    }
  }

  const handleCopyPlaceId = (placeId: string) => {
    navigator.clipboard.writeText(placeId)
    showNotification('Place ID copied to clipboard', 'success')
  }

  const handleCopyUniverseId = (universeId: string) => {
    navigator.clipboard.writeText(universeId)
    showNotification('Universe ID copied to clipboard', 'success')
  }

  // Handle debounce of search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  // Clear search handler
  const handleClearSearch = useCallback(() => {
    setSearchQuery('')
    setDebouncedSearchQuery('')
  }, [])

  const formatPlayerCount = (num: number) => formatNumber(num)

  return (
    <TooltipProvider>
      <div className="flex flex-col h-full bg-neutral-950">
        <div className="shrink-0 h-[72px] bg-neutral-950 border-b border-neutral-800 z-20 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-white">Games</h1>
            <span className="flex items-center justify-center px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-semibold tracking-tight text-neutral-400">
              {isLoading ? '...' : games.length.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Launch Button */}
            {selectedIds.size > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="default"
                    size="default"
                    onClick={() => openModal('join')}
                    className="gap-2 bg-[rgba(var(--accent-color-rgb),0.95)] hover:bg-[var(--accent-color-muted)] text-[var(--accent-color-foreground)] border-[var(--accent-color-border)] shadow-[0_0_20px_var(--accent-color-shadow)]"
                  >
                    <Play size={16} fill="currentColor" />
                    <span>Launch</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Launch game with {selectedIds.size} selected account
                  {selectedIds.size !== 1 ? 's' : ''}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Sort Selector */}
            {!showFavorites && sorts.length > 0 && (
              <CustomDropdown
                options={sortOptions}
                value={selectedSortId}
                onChange={(value) => setSelectedSortId(value)}
                placeholder="Sort By"
                className="w-44"
              />
            )}

            {/* Favorites Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={showFavorites ? 'default' : 'outline'}
                  size="default"
                  onClick={() => setShowFavorites(!showFavorites)}
                  className={
                    showFavorites
                      ? 'gap-2 bg-yellow-500/20 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/30'
                      : 'gap-2 text-neutral-400'
                  }
                  aria-pressed={showFavorites}
                  aria-label="Toggle favorite games view"
                >
                  <Star size={16} className={showFavorites ? 'fill-current' : ''} />
                  <span>Favorites</span>
                  {favorites.length > 0 && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        showFavorites
                          ? 'bg-yellow-500/30 text-yellow-300'
                          : 'bg-neutral-800 text-neutral-400'
                      }`}
                    >
                      {favorites.length}
                    </span>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{showFavorites ? 'Show all games' : 'Show favorites'}</TooltipContent>
            </Tooltip>

            {/* Search Input */}
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search games..."
              containerClassName="w-64"
            />
          </div>
        </div>

        {/* Active Filters */}
        {(showFavorites || isSearchMode) && (
          <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-t border-neutral-800 bg-neutral-900/20">
            <span className="text-xs font-medium text-neutral-500 uppercase tracking-wider mr-2">
              Active Filters:
            </span>
            <AnimatePresence>
              {showFavorites && (
                <motion.div
                  key="favorites-filter"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-400 group"
                >
                  <Star size={12} className="fill-current" />
                  <span className="font-medium">Favorites</span>
                  <span>{favorites.length} games</span>
                  <button
                    onClick={() => setShowFavorites(false)}
                    className="p-0.5 rounded-full hover:bg-yellow-500/20 transition-colors ml-1"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              )}
              {isSearchMode && (
                <motion.div
                  key="search-filter"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[rgba(var(--accent-color-rgb),0.1)] border border-[rgba(var(--accent-color-rgb),0.2)] text-xs text-[var(--accent-color)] group"
                >
                  <span className="font-medium">Search:</span>
                  <span>"{debouncedSearchQuery}"</span>
                  <button
                    onClick={handleClearSearch}
                    className="p-0.5 rounded-full hover:bg-[rgba(var(--accent-color-rgb),0.2)] transition-colors ml-1"
                  >
                    <X size={12} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {showFavorites && isSearchMode && (
              <button
                onClick={() => {
                  setShowFavorites(false)
                  handleClearSearch()
                }}
                className="text-xs text-neutral-500 hover:text-neutral-300 underline decoration-neutral-700 underline-offset-2 ml-2 transition-colors"
              >
                Clear all
              </button>
            )}
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
          <AnimatePresence>
            {isLoading ? (
              <SkeletonGameGrid count={15} gridStyle={responsiveGridStyle} />
            ) : games.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="flex items-center justify-center h-full"
              >
                <EmptyState
                  icon={Gamepad2}
                  title="No games found"
                  description={searchQuery ? 'Try adjusting your search terms' : undefined}
                  variant="minimal"
                />
              </motion.div>
            ) : (
              <motion.div
                key="games"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
                className="h-full"
              >
                <VirtuosoGrid
                  totalCount={games.length}
                  overscan={200}
                  listClassName="grid gap-6 grid-cols-[repeat(auto-fill,minmax(220px,1fr))]"
                  itemContent={(index) => {
                    const game = games[index]
                    return (
                      <GameCard
                        key={game.id || index}
                        game={game}
                        onGameSelect={onGameSelect}
                        onContextMenu={(e, game) => {
                          e.preventDefault()
                          setActiveContextMenu({
                            id: game.id,
                            placeId: game.placeId,
                            universeId: game.universeId,
                            isFavorite: Boolean(game.placeId && favorites.includes(game.placeId)),
                            x: e.clientX,
                            y: e.clientY
                          })
                        }}
                        formatPlayerCount={formatPlayerCount}
                        isFavorite={Boolean(game.placeId && favorites.includes(game.placeId))}
                        favoriteBurst={Boolean(game.placeId && favoriteGameBurstKeys[game.placeId])}
                      />
                    )
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <GameContextMenu
          activeMenu={activeContextMenu}
          onClose={() => setActiveContextMenu(null)}
          onFavorite={handleFavorite}
          onCopyPlaceId={handleCopyPlaceId}
          onCopyUniverseId={handleCopyUniverseId}
        />
      </div>
    </TooltipProvider>
  )
}

export default GamesTab
