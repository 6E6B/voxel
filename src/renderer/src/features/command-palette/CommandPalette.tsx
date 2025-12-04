import React, { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { Virtuoso } from 'react-virtuoso'
import {
  Search,
  User,
  Users,
  Gamepad2,
  Play,
  Settings,
  UserPlus,
  UserMinus,
  Palette,
  ArrowLeft,
  Command,
  CornerDownLeft,
  ChevronRight,
  Sparkles,
  Boxes,
  History,
  TrendingUp,
  FileText,
  Download,
  Hash,
  Globe,
  Clock,
  RefreshCw,
  LogOut,
  Star,
  Ban,
  Copy,
  ExternalLink,
  ShieldCheck,
  Cookie,
  Gem,
  Flame,
  Zap,
  Loader2,
  Terminal,
  Package,
  UserCircle2
} from 'lucide-react'
import { cn } from '@renderer/lib/utils'
import {
  useCommandPaletteOpen,
  useCommandPaletteStep,
  useCommandPaletteQuery,
  useCommandPaletteSelectedIndex,
  useCommandPaletteActiveCommand,
  useCommandPaletteInputValue,
  useCommandPaletteLoading,
  useCommandPaletteRecentCommands,
  useCommandPaletteSearchResults,
  useCommandPaletteResultSelectedIndex,
  useCommandPaletteClose,
  useCommandPaletteSetQuery,
  useCommandPaletteSetSelectedIndex,
  useCommandPaletteSelectCommand,
  useCommandPaletteSetInputValue,
  useCommandPaletteSubmitInput,
  useCommandPaletteGoBack,
  useCommandPaletteSetResultSelectedIndex,
  useCommandPaletteSelectResult,
  Command as CommandType,
  LimitedSearchResult,
  CatalogSearchResult,
  UniversalSearchResult
} from './stores/useCommandPaletteStore'
import { useSetActiveTab, useOpenModal } from '../../stores/useUIStore'
import { useSelectedIds, useSetSelectedIds } from '../../stores/useSelectionStore'
import { JoinMethod } from '../../types'
import { useAccountsManager, useFriends } from '../../hooks/queries/index'
import { useNotification } from '../system/stores/useSnackbarStore'
import { createAllCommands, CommandCallbacks } from './commands/index'
import { useLimitedsSearch, useCatalogSearch, usePlayerSearch } from './hooks'
import type { PlayerSearchResult } from './hooks'
import { LimitedThumbnail } from './components/LimitedThumbnail'
import VerifiedIcon from '../../components/UI/icons/VerifiedIcon'
import { DEMAND_COLORS, TREND_COLORS } from '../avatar/api/useRolimons'

const iconMap: Record<string, React.ReactNode> = {
  user: <User size={16} strokeWidth={1.75} />,
  users: <Users size={16} strokeWidth={1.75} />,
  gamepad: <Gamepad2 size={16} strokeWidth={1.75} />,
  play: <Play size={16} strokeWidth={1.75} />,
  settings: <Settings size={16} strokeWidth={1.75} />,
  'user-plus': <UserPlus size={16} strokeWidth={1.75} />,
  'user-minus': <UserMinus size={16} strokeWidth={1.75} />,
  palette: <Palette size={16} strokeWidth={1.75} />,
  sparkles: <Sparkles size={16} strokeWidth={1.75} />,
  boxes: <Boxes size={16} strokeWidth={1.75} />,
  history: <History size={16} strokeWidth={1.75} />,
  trending: <TrendingUp size={16} strokeWidth={1.75} />,
  file: <FileText size={16} strokeWidth={1.75} />,
  download: <Download size={16} strokeWidth={1.75} />,
  hash: <Hash size={16} strokeWidth={1.75} />,
  globe: <Globe size={16} strokeWidth={1.75} />,
  clock: <Clock size={16} strokeWidth={1.75} />,
  refresh: <RefreshCw size={16} strokeWidth={1.75} />,
  logout: <LogOut size={16} strokeWidth={1.75} />,
  star: <Star size={16} strokeWidth={1.75} />,
  ban: <Ban size={16} strokeWidth={1.75} />,
  copy: <Copy size={16} strokeWidth={1.75} />,
  'external-link': <ExternalLink size={16} strokeWidth={1.75} />,
  'shield-check': <ShieldCheck size={16} strokeWidth={1.75} />,
  cookie: <Cookie size={16} strokeWidth={1.75} />
}

const resultTypeBadges: Record<
  string,
  { label: string; className: string; icon: React.ReactNode }
> = {
  player: {
    label: 'Player',
    className: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    icon: <UserCircle2 size={10} />
  },
  friend: {
    label: 'Friend',
    className: 'bg-green-500/15 text-green-400 border-green-500/20',
    icon: <Users size={10} />
  },
  limited: {
    label: 'Limited',
    className: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    icon: <Gem size={10} />
  },
  catalog: {
    label: 'Catalog',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/20',
    icon: <Package size={10} />
  },
  command: {
    label: 'Command',
    className: 'bg-neutral-500/15 text-neutral-400 border-neutral-500/20',
    icon: <Terminal size={10} />
  }
}

const categoryLabels: Record<string, string> = {
  navigation: 'Navigation',
  accounts: 'Accounts',
  games: 'Games',
  profiles: 'Profiles',
  social: 'Social',
  actions: 'Actions',
  values: 'Values',
  catalog: 'Catalog'
}

const categoryOrder = [
  'navigation',
  'accounts',
  'games',
  'profiles',
  'social',
  'actions',
  'values',
  'catalog'
]

interface CatalogResultItemForAccessory {
  id: number
  itemType: string
  name: string
  imageUrl?: string
}

// Memoized row components to prevent re-renders when selectedIndex changes
// Only re-render when the item becomes selected or deselected

interface UniversalLimitedRowProps {
  result: LimitedSearchResult
  idx: number
  selectedIndex: number
  onSelect: (result: UniversalSearchResult) => void
  onHover: (idx: number) => void
}

const UniversalLimitedRow = memo(
  ({ result, idx, selectedIndex, onSelect, onHover }: UniversalLimitedRowProps) => {
    const isSelected = idx === selectedIndex
    const badge = resultTypeBadges.limited
    return (
      <motion.button
        initial={false}
        animate={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent' }}
        transition={{ duration: 0.1 }}
        data-selected={isSelected}
        data-index={idx}
        onClick={() => onSelect(result)}
        onMouseEnter={() => onHover(idx)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg mx-1 group',
          'transition-colors duration-100'
        )}
        style={{ width: 'calc(100% - 8px)' }}
      >
        <LimitedThumbnail
          assetId={result.id}
          name={result.name}
          className="flex-shrink-0 w-9 h-9 rounded-lg ring-1 ring-white/5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium truncate text-neutral-200 group-hover:text-white transition-colors">
              {result.name}
            </span>
            {result.isRare && <Gem size={11} className="text-purple-400 flex-shrink-0" />}
            {result.isHyped && <Flame size={11} className="text-orange-400 flex-shrink-0" />}
            {result.isProjected && <Zap size={11} className="text-yellow-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
            {result.value !== null ? (
              <span className="text-emerald-400/90">{result.value.toLocaleString()} Value</span>
            ) : (
              <span className="text-neutral-500">{result.rap.toLocaleString()} RAP</span>
            )}
            <span className="text-neutral-700">·</span>
            <span className={DEMAND_COLORS[result.demand]}>D: {result.demandLabel}</span>
            <span className="text-neutral-700">·</span>
            <span className={TREND_COLORS[result.trend]}>T: {result.trendLabel}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex items-center gap-1',
              badge.className
            )}
          >
            {badge.icon}
            {badge.label}
          </span>
          <ChevronRight
            size={14}
            className={cn(
              'text-neutral-600 transition-all duration-150',
              isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
            )}
          />
        </div>
      </motion.button>
    )
  },
  (prev, next) => {
    const wasSelected = prev.idx === prev.selectedIndex
    const isSelected = next.idx === next.selectedIndex
    return prev.result === next.result && wasSelected === isSelected
  }
)
UniversalLimitedRow.displayName = 'UniversalLimitedRow'

interface UniversalCatalogRowProps {
  result: CatalogSearchResult
  idx: number
  selectedIndex: number
  onSelect: (result: UniversalSearchResult) => void
  onHover: (idx: number) => void
}

const UniversalCatalogRow = memo(
  ({ result, idx, selectedIndex, onSelect, onHover }: UniversalCatalogRowProps) => {
    const isSelected = idx === selectedIndex
    const badge = resultTypeBadges.catalog
    return (
      <motion.button
        initial={false}
        animate={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent' }}
        transition={{ duration: 0.1 }}
        data-selected={isSelected}
        data-index={idx}
        onClick={() => onSelect(result)}
        onMouseEnter={() => onHover(idx)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg mx-1 group',
          'transition-colors duration-100'
        )}
        style={{ width: 'calc(100% - 8px)' }}
      >
        <LimitedThumbnail
          assetId={result.id}
          name={result.name}
          className="flex-shrink-0 w-9 h-9 rounded-lg ring-1 ring-white/5"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium truncate text-neutral-200 group-hover:text-white transition-colors">
              {result.name}
            </span>
            {(result.isLimited || result.isLimitedUnique) && (
              <Gem size={11} className="text-amber-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
            {result.isForSale && result.price > 0 ? (
              <span className="text-emerald-400/90">R$ {result.price.toLocaleString()}</span>
            ) : (
              <span className="text-neutral-500">Off Sale</span>
            )}
            {result.description && (
              <>
                <span className="text-neutral-700">·</span>
                <span className="truncate max-w-[180px] text-neutral-500">
                  {result.description}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex items-center gap-1',
              badge.className
            )}
          >
            {badge.icon}
            {badge.label}
          </span>
          <ChevronRight
            size={14}
            className={cn(
              'text-neutral-600 transition-all duration-150',
              isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
            )}
          />
        </div>
      </motion.button>
    )
  },
  (prev, next) => {
    const wasSelected = prev.idx === prev.selectedIndex
    const isSelected = next.idx === next.selectedIndex
    return prev.result === next.result && wasSelected === isSelected
  }
)
UniversalCatalogRow.displayName = 'UniversalCatalogRow'

interface UniversalCommandRowProps {
  result: { type: 'command'; command: CommandType }
  idx: number
  selectedIndex: number
  onSelect: (result: UniversalSearchResult) => void
  onHover: (idx: number) => void
}

const UniversalCommandRow = memo(
  ({ result, idx, selectedIndex, onSelect, onHover }: UniversalCommandRowProps) => {
    const isSelected = idx === selectedIndex
    const cmd = result.command
    const badge = resultTypeBadges.command
    return (
      <motion.button
        initial={false}
        animate={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent' }}
        transition={{ duration: 0.1 }}
        data-selected={isSelected}
        data-index={idx}
        onClick={() => onSelect(result)}
        onMouseEnter={() => onHover(idx)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg mx-1 group',
          'transition-colors duration-100'
        )}
        style={{ width: 'calc(100% - 8px)' }}
      >
        <div
          className={cn(
            'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150',
            isSelected
              ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)] shadow-lg shadow-[var(--accent-color)]/20'
              : 'bg-neutral-800/80 text-neutral-400 group-hover:bg-neutral-800 group-hover:text-neutral-300'
          )}
        >
          {iconMap[cmd.icon] || <Sparkles size={16} strokeWidth={1.75} />}
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-[13px] font-medium truncate block text-neutral-200 group-hover:text-white transition-colors">
            {cmd.label}
          </span>
          {cmd.description && (
            <div className="text-[11px] text-neutral-500 truncate mt-0.5">{cmd.description}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex items-center gap-1',
              badge.className
            )}
          >
            {badge.icon}
            {badge.label}
          </span>
          {cmd.requiresInput ? (
            <ChevronRight size={14} className="text-neutral-600" />
          ) : (
            <CornerDownLeft
              size={13}
              className={cn(
                'transition-all duration-150',
                isSelected ? 'opacity-100 text-neutral-500' : 'opacity-0'
              )}
            />
          )}
        </div>
      </motion.button>
    )
  },
  (prev, next) => {
    const wasSelected = prev.idx === prev.selectedIndex
    const isSelected = next.idx === next.selectedIndex
    return prev.result === next.result && wasSelected === isSelected
  }
)
UniversalCommandRow.displayName = 'UniversalCommandRow'

interface UniversalPlayerRowProps {
  result: PlayerSearchResult
  idx: number
  selectedIndex: number
  onSelect: (result: UniversalSearchResult) => void
  onHover: (idx: number) => void
}

const UniversalPlayerRow = memo(
  ({ result, idx, selectedIndex, onSelect, onHover }: UniversalPlayerRowProps) => {
    const isSelected = idx === selectedIndex
    const badge = result.isFriend ? resultTypeBadges.friend : resultTypeBadges.player
    return (
      <motion.button
        initial={false}
        animate={{ backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent' }}
        transition={{ duration: 0.1 }}
        data-selected={isSelected}
        data-index={idx}
        onClick={() => onSelect(result)}
        onMouseEnter={() => onHover(idx)}
        className={cn(
          'w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg mx-1 group',
          'transition-colors duration-100'
        )}
        style={{ width: 'calc(100% - 8px)' }}
      >
        {result.avatarUrl ? (
          <img
            src={result.avatarUrl}
            alt={result.displayName}
            className="flex-shrink-0 w-9 h-9 rounded-full bg-neutral-800 ring-1 ring-white/5"
          />
        ) : (
          <div
            className={cn(
              'flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150',
              isSelected
                ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
                : 'bg-neutral-800/80 text-neutral-400 group-hover:bg-neutral-800'
            )}
          >
            <User size={16} strokeWidth={1.75} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[13px] font-medium truncate text-neutral-200 group-hover:text-white transition-colors">
              {result.displayName}
            </span>
            {result.hasVerifiedBadge && (
              <VerifiedIcon width={11} height={11} className="flex-shrink-0" />
            )}
            {result.isFriend && <Users size={11} className="text-emerald-400 flex-shrink-0" />}
          </div>
          <div className="text-[11px] text-neutral-500 truncate mt-0.5">@{result.name}</div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              'text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex items-center gap-1',
              badge.className
            )}
          >
            {badge.icon}
            {badge.label}
          </span>
          <ChevronRight
            size={14}
            className={cn(
              'text-neutral-600 transition-all duration-150',
              isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
            )}
          />
        </div>
      </motion.button>
    )
  },
  (prev, next) => {
    const wasSelected = prev.idx === prev.selectedIndex
    const isSelected = next.idx === next.selectedIndex
    return prev.result === next.result && wasSelected === isSelected
  }
)
UniversalPlayerRow.displayName = 'UniversalPlayerRow'

interface CommandPaletteProps {
  onViewProfile: (userId: string) => void
  onLaunchGame: (method: JoinMethod, target: string) => void
  onViewAccessory: (item: CatalogResultItemForAccessory) => void
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  onViewProfile,
  onLaunchGame,
  onViewAccessory
}) => {
  const [viewport, setViewport] = useState(() => ({
    width: typeof window !== 'undefined' ? window.innerWidth : 1400,
    height: typeof window !== 'undefined' ? window.innerHeight : 1000
  }))

  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleResize = () => {
      setViewport({
        width: window.innerWidth,
        height: window.innerHeight
      })
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])
  // State selectors
  const isOpen = useCommandPaletteOpen()
  const step = useCommandPaletteStep()
  const query = useCommandPaletteQuery()
  const selectedIndex = useCommandPaletteSelectedIndex()
  const activeCommand = useCommandPaletteActiveCommand()
  const inputValue = useCommandPaletteInputValue()
  const isLoading = useCommandPaletteLoading()
  const recentCommandIds = useCommandPaletteRecentCommands()
  const searchResults = useCommandPaletteSearchResults()
  const resultSelectedIndex = useCommandPaletteResultSelectedIndex()

  // Action selectors (individual to prevent re-renders)
  const close = useCommandPaletteClose()
  const setQuery = useCommandPaletteSetQuery()
  const setSelectedIndex = useCommandPaletteSetSelectedIndex()
  const selectCommand = useCommandPaletteSelectCommand()
  const setInputValue = useCommandPaletteSetInputValue()
  const submitInput = useCommandPaletteSubmitInput()
  const goBack = useCommandPaletteGoBack()
  const setResultSelectedIndex = useCommandPaletteSetResultSelectedIndex()
  const selectResult = useCommandPaletteSelectResult()

  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)
  const resultsRef = useRef<HTMLDivElement>(null)

  const setActiveTab = useSetActiveTab()
  const openModal = useOpenModal()
  const { accounts } = useAccountsManager()
  const selectedIds = useSelectedIds()
  const setSelectedIds = useSetSelectedIds()
  const { showNotification } = useNotification()

  const selectedAccountId = useMemo(() => {
    return selectedIds.size === 1 ? Array.from(selectedIds)[0] : null
  }, [selectedIds])

  const selectedAccount = useMemo(() => {
    return (
      accounts.find((a) => a.id === selectedAccountId) || accounts.find((a) => a.cookie) || null
    )
  }, [accounts, selectedAccountId])

  const { data: friends = [] } = useFriends(selectedAccount)

  // Limiteds search (FlexSearch powered)
  const {
    searchLimiteds,
    resetSearch: resetLimitedsSearch,
    results: limitedsResults,
    isLoading: limitedsLoading,
    itemCount: limitedsCount
  } = useLimitedsSearch({ maxResults: 20 })

  // Catalog search (FlexSearch powered)
  const {
    searchCatalog,
    resetSearch: resetCatalogSearch,
    results: catalogResults,
    isLoading: catalogLoading,
    itemCount: catalogCount
  } = useCatalogSearch({ maxResults: 20 })

  // Player search (username lookup + friends)
  const {
    searchPlayer,
    reset: resetPlayerSearch,
    result: playerResult,
    matchingFriends: playerFriends,
    isLoading: playerLoading
  } = usePlayerSearch({ debounceMs: 300, friends })

  const [suggestionIndex, setSuggestionIndex] = useState(0)

  const callbacksRef = useRef<CommandCallbacks>({
    setActiveTab,
    openModal,
    setSelectedIds,
    showNotification,
    onViewProfile,
    onLaunchGame,
    onViewAccessory,
    getSelectedAccount: () => selectedAccount,
    getAccounts: () => accounts
  })

  useEffect(() => {
    callbacksRef.current = {
      setActiveTab,
      openModal,
      setSelectedIds,
      showNotification,
      onViewProfile,
      onLaunchGame,
      onViewAccessory,
      getSelectedAccount: () => selectedAccount,
      getAccounts: () => accounts
    }
  })

  const commands = useMemo<CommandType[]>(() => {
    return createAllCommands(callbacksRef.current)
  }, [accounts])

  // Trigger searches when query changes
  useEffect(() => {
    if (step === 'search' && query.trim()) {
      searchLimiteds(query)
      searchCatalog(query)
      searchPlayer(query)
    }
  }, [step, query, searchLimiteds, searchCatalog, searchPlayer])

  // Universal search results - combines players, limiteds, catalog items, and commands
  const universalSearchResults = useMemo<UniversalSearchResult[]>(() => {
    if (step !== 'search' || !query.trim()) return []

    const results: UniversalSearchResult[] = []
    const addedPlayerIds = new Set<number>()

    // Add best player match at the top (from API)
    if (playerResult) {
      results.push(playerResult)
      addedPlayerIds.add(playerResult.id)
    }

    // Add matching friends
    playerFriends.forEach((friend) => {
      if (!addedPlayerIds.has(friend.id)) {
        results.push(friend)
        addedPlayerIds.add(friend.id)
      }
    })

    limitedsResults.forEach((limited) => {
      results.push(limited)
    })

    catalogResults.forEach((item) => {
      const isLimitedDuplicate = limitedsResults.some((l) => l.id === item.AssetId)
      if (!isLimitedDuplicate) {
        results.push({
          type: 'catalog',
          id: item.AssetId,
          name: item.Name,
          description: item.Description || '',
          assetTypeId: item.AssetTypeId,
          isLimited: item.IsLimited,
          isLimitedUnique: item.IsLimitedUnique,
          price: item.PriceInRobux,
          isForSale: item.IsForSale
        })
      }
    })

    // Search commands
    const lowerQuery = query.toLowerCase()
    const matchingCommands = commands
      .filter((cmd) => {
        const matchLabel = cmd.label.toLowerCase().includes(lowerQuery)
        const matchDesc = cmd.description?.toLowerCase().includes(lowerQuery)
        const matchKeywords = cmd.keywords?.some((k) => k.includes(lowerQuery))
        return matchLabel || matchDesc || matchKeywords
      })
      .slice(0, 5) // Limit commands to 5 in universal search

    matchingCommands.forEach((cmd) => {
      results.push({ type: 'command', command: cmd })
    })

    return results
  }, [step, query, playerResult, playerFriends, limitedsResults, catalogResults, commands])

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      const recent = recentCommandIds
        .map((id) => commands.find((c) => c.id === id))
        .filter(Boolean) as CommandType[]

      const rest = commands.filter((c) => !recentCommandIds.includes(c.id))
      return [...recent, ...rest]
    }

    const lowerQuery = query.toLowerCase()
    return commands.filter((cmd) => {
      const matchLabel = cmd.label.toLowerCase().includes(lowerQuery)
      const matchDesc = cmd.description?.toLowerCase().includes(lowerQuery)
      const matchKeywords = cmd.keywords?.some((k) => k.includes(lowerQuery))
      return matchLabel || matchDesc || matchKeywords
    })
  }, [commands, query, recentCommandIds])

  // Group filtered commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandType[]> = {}

    filteredCommands.forEach((cmd) => {
      if (!groups[cmd.category]) {
        groups[cmd.category] = []
      }
      groups[cmd.category].push(cmd)
    })

    const sortedGroups: { category: string; commands: CommandType[] }[] = []
    categoryOrder.forEach((cat) => {
      if (groups[cat]?.length) {
        sortedGroups.push({ category: cat, commands: groups[cat] })
      }
    })

    return sortedGroups
  }, [filteredCommands])

  // Flatten for keyboard navigation
  const flatCommands = useMemo(() => {
    return groupedCommands.flatMap((g) => g.commands)
  }, [groupedCommands])

  const handleSelectUniversalResult = useCallback(
    (result: UniversalSearchResult) => {
      if (result.type === 'command') {
        selectCommand(result.command)
      } else if (result.type === 'player') {
        onViewProfile(result.id.toString())
        close()
      } else if (result.type === 'limited') {
        onViewAccessory({
          id: result.id,
          itemType: 'Asset',
          name: result.name
        })
        close()
      } else if (result.type === 'catalog') {
        onViewAccessory({
          id: result.id,
          itemType: 'Asset',
          name: result.name
        })
        close()
      }
    },
    [selectCommand, onViewProfile, onViewAccessory, close]
  )

  const filteredFriends = useMemo(() => {
    if (step !== 'input' || !activeCommand) return []
    const usernameCommands = ['view-profile-username', 'launch-username', 'view-value', 'view-rap']
    if (!usernameCommands.includes(activeCommand.id)) return []

    if (!inputValue.trim()) {
      return friends.slice(0, 8)
    }

    const lowerInput = inputValue.toLowerCase()
    return friends
      .filter(
        (f) =>
          f.username.toLowerCase().includes(lowerInput) ||
          f.displayName.toLowerCase().includes(lowerInput)
      )
      .slice(0, 8)
  }, [step, activeCommand, inputValue, friends])

  useEffect(() => {
    setSuggestionIndex(0)
  }, [filteredFriends.length, inputValue])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      resetLimitedsSearch()
      resetCatalogSearch()
      resetPlayerSearch()
    }
  }, [isOpen, step, resetLimitedsSearch, resetCatalogSearch, resetPlayerSearch])

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (step === 'input' || step === 'results') {
          goBack()
        } else if (step === 'select') {
          goBack()
        } else {
          close()
        }
        return
      }

      if (step === 'search') {
        // In command mode (query starts with >)
        if (query.startsWith('>')) {
          const cmdQuery = query.slice(1).trim().toLowerCase()
          const filteredCmds = cmdQuery
            ? commands.filter((cmd) => {
                const matchLabel = cmd.label.toLowerCase().includes(cmdQuery)
                const matchDesc = cmd.description?.toLowerCase().includes(cmdQuery)
                const matchKeywords = cmd.keywords?.some((k) => k.includes(cmdQuery))
                return matchLabel || matchDesc || matchKeywords
              })
            : commands
          const maxIndex = Math.min(filteredCmds.length, 15) - 1

          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(Math.min(selectedIndex + 1, maxIndex))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(Math.max(selectedIndex - 1, 0))
          } else if (e.key === 'Enter' && filteredCmds[selectedIndex]) {
            e.preventDefault()
            selectCommand(filteredCmds[selectedIndex])
          } else if (e.key === 'Backspace' && query === '>') {
            e.preventDefault()
            setQuery('')
          }
        } else {
          // Normal universal search mode
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex(Math.min(selectedIndex + 1, universalSearchResults.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex(Math.max(selectedIndex - 1, 0))
          } else if (e.key === 'Enter' && universalSearchResults[selectedIndex]) {
            e.preventDefault()
            handleSelectUniversalResult(universalSearchResults[selectedIndex])
          }
        }
      } else if (step === 'select') {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setSelectedIndex(Math.min(selectedIndex + 1, flatCommands.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setSelectedIndex(Math.max(selectedIndex - 1, 0))
        } else if (e.key === 'Enter' && flatCommands[selectedIndex]) {
          e.preventDefault()
          selectCommand(flatCommands[selectedIndex])
        }
      } else if (step === 'input') {
        if (e.key === 'ArrowDown' && filteredFriends.length > 0) {
          e.preventDefault()
          setSuggestionIndex(Math.min(suggestionIndex + 1, filteredFriends.length - 1))
        } else if (e.key === 'ArrowUp' && filteredFriends.length > 0) {
          e.preventDefault()
          setSuggestionIndex(Math.max(suggestionIndex - 1, 0))
        } else if (e.key === 'Tab' && filteredFriends.length > 0) {
          e.preventDefault()
          // Auto-complete with selected friend
          const selectedFriend = filteredFriends[suggestionIndex]
          if (selectedFriend) {
            setInputValue(selectedFriend.username)
          }
        } else if (e.key === 'Enter' && !isLoading) {
          e.preventDefault()
          if (filteredFriends.length > 0 && !inputValue.trim()) {
            const selectedFriend = filteredFriends[suggestionIndex]
            if (selectedFriend) {
              setInputValue(selectedFriend.username)
              // Submit after setting the value
              setTimeout(() => submitInput(), 0)
              return
            }
          }
          submitInput()
        } else if (e.key === 'Backspace' && !inputValue) {
          goBack()
        }
      } else if (step === 'results') {
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setResultSelectedIndex(Math.min(resultSelectedIndex + 1, searchResults.length - 1))
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setResultSelectedIndex(Math.max(resultSelectedIndex - 1, 0))
        } else if (e.key === 'Enter' && searchResults[resultSelectedIndex]) {
          e.preventDefault()
          selectResult(searchResults[resultSelectedIndex])
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    isOpen,
    step,
    selectedIndex,
    flatCommands,
    inputValue,
    isLoading,
    close,
    goBack,
    setSelectedIndex,
    selectCommand,
    submitInput,
    filteredFriends,
    suggestionIndex,
    setInputValue,
    searchResults,
    resultSelectedIndex,
    setResultSelectedIndex,
    selectResult,
    universalSearchResults,
    handleSelectUniversalResult,
    query,
    setQuery,
    commands
  ])

  // Scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return
    const selected = listRef.current.querySelector('[data-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [selectedIndex])

  // Scroll selected suggestion into view
  useEffect(() => {
    if (!suggestionsRef.current) return
    const selected = suggestionsRef.current.querySelector('[data-suggestion-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [suggestionIndex])

  // Scroll selected result into view
  useEffect(() => {
    if (!resultsRef.current) return
    const selected = resultsRef.current.querySelector('[data-result-selected="true"]')
    if (selected) {
      selected.scrollIntoView({ block: 'nearest' })
    }
  }, [resultSelectedIndex])

  let commandIndex = 0

  const paletteWidth = useMemo(() => {
    const minWidth = 420
    const maxWidth = 900
    const responsiveWidth = viewport.width * 0.55
    return Math.max(minWidth, Math.min(maxWidth, responsiveWidth))
  }, [viewport.width])

  const listMaxHeight = useMemo(() => {
    const minHeight = 240
    const maxHeight = 560
    const responsiveHeight = viewport.height * 0.45
    return Math.max(minHeight, Math.min(maxHeight, responsiveHeight))
  }, [viewport.height])

  const secondaryListMaxHeight = useMemo(() => {
    const minHeight = 200
    const maxHeight = 420
    const responsiveHeight = viewport.height * 0.35
    return Math.max(minHeight, Math.min(maxHeight, responsiveHeight))
  }, [viewport.height])

  const overlayPaddingTop = useMemo(() => {
    const minPadding = 40
    const maxPadding = 120
    const responsivePadding = viewport.height * 0.08
    return Math.max(minPadding, Math.min(maxPadding, responsivePadding))
  }, [viewport.height])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.12 }}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/80 backdrop-blur-md"
      style={{ paddingTop: overlayPaddingTop }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: -10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: -5 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="bg-neutral-950/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl shadow-black/50 overflow-hidden"
        style={{ width: paletteWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.06] bg-gradient-to-b from-white/[0.02] to-transparent">
          {step === 'input' ? (
            <>
              <motion.button
                onClick={goBack}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-all duration-150"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </motion.button>
              <div className="flex-1 flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/[0.04] flex items-center justify-center text-neutral-400">
                  {iconMap[activeCommand?.icon || 'sparkles']}
                </div>
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-0.5">
                    {activeCommand?.inputLabel || 'Input'}
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={activeCommand?.inputPlaceholder}
                    disabled={isLoading}
                    className="w-full bg-transparent text-white text-[13px] placeholder:text-neutral-600 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
              {isLoading && <Loader2 size={16} className="text-neutral-500 animate-spin" />}
            </>
          ) : step === 'select' ? (
            <>
              <motion.button
                onClick={goBack}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-all duration-150"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </motion.button>
              <div className="flex-1 flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.04]">
                <Terminal size={15} className="text-neutral-500" strokeWidth={1.75} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search commands..."
                  className="flex-1 bg-transparent text-white text-[13px] placeholder:text-neutral-500 focus:outline-none"
                  autoFocus
                />
              </div>
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-neutral-500 bg-white/[0.04] border border-white/[0.06] rounded-md">
                ESC
              </kbd>
            </>
          ) : (
            <>
              <div className="flex-1 flex items-center gap-2.5 bg-white/[0.03] rounded-xl px-3 py-2 border border-white/[0.04] focus-within:border-white/[0.08] focus-within:bg-white/[0.04] transition-all duration-150">
                <Search size={15} className="text-neutral-500" strokeWidth={1.75} />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search players, limiteds, catalog..."
                  className="flex-1 bg-transparent text-white text-[13px] placeholder:text-neutral-500 focus:outline-none"
                  autoFocus
                />
                {query && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => setQuery('')}
                    className="p-0.5 rounded-md hover:bg-white/[0.08] text-neutral-500 hover:text-neutral-300 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path
                        d="M3 3L9 9M9 3L3 9"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </motion.button>
                )}
              </div>
              <div className="hidden sm:flex items-center gap-2">
                {(limitedsCount > 0 || catalogCount > 0) && (
                  <span className="text-[10px] text-neutral-600 tabular-nums">
                    {(limitedsCount + catalogCount).toLocaleString()} items
                  </span>
                )}
                <kbd className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-neutral-500 bg-white/[0.04] border border-white/[0.06] rounded-md">
                  ESC
                </kbd>
              </div>
            </>
          )}
        </div>

        {/* Universal Search Results */}
        {step === 'search' && (
          <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: listMaxHeight }}>
            {!query.trim() ? (
              <div className="px-6 py-10 text-center">
                <div className="w-12 h-12 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center">
                  <Search size={20} className="text-neutral-500" strokeWidth={1.5} />
                </div>
                <div className="text-neutral-300 text-[13px] font-medium mb-1.5">
                  Search anything
                </div>
                <div className="text-neutral-500 text-[12px] mb-5 max-w-[280px] mx-auto leading-relaxed">
                  Find players, limiteds, catalog items, or run commands
                </div>
                <div className="flex flex-wrap justify-center gap-1.5">
                  {Object.entries(resultTypeBadges).map(([key, badge]) => (
                    <span
                      key={key}
                      className={cn(
                        'text-[10px] font-medium px-2 py-1 rounded-lg border flex items-center gap-1.5',
                        badge.className
                      )}
                    >
                      {badge.icon}
                      {badge.label}
                    </span>
                  ))}
                </div>
                <div className="mt-5 pt-4 border-t border-white/[0.04]">
                  <div className="text-[11px] text-neutral-600 flex items-center justify-center gap-2">
                    <span>Type</span>
                    <kbd className="px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06] rounded text-neutral-400 font-mono">
                      &gt;
                    </kbd>
                    <span>for commands only</span>
                  </div>
                </div>
              </div>
            ) : query.startsWith('>') ? (
              (() => {
                const cmdQuery = query.slice(1).trim().toLowerCase()
                const filteredCmds = cmdQuery
                  ? commands.filter((cmd) => {
                      const matchLabel = cmd.label.toLowerCase().includes(cmdQuery)
                      const matchDesc = cmd.description?.toLowerCase().includes(cmdQuery)
                      const matchKeywords = cmd.keywords?.some((k) => k.includes(cmdQuery))
                      return matchLabel || matchDesc || matchKeywords
                    })
                  : commands

                if (filteredCmds.length === 0) {
                  return (
                    <div className="px-6 py-12 text-center">
                      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.04] flex items-center justify-center">
                        <Terminal size={18} className="text-neutral-600" strokeWidth={1.5} />
                      </div>
                      <div className="text-neutral-400 text-[13px]">No commands found</div>
                      <div className="text-neutral-600 text-[11px] mt-1">
                        Try a different search term
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="py-1.5">
                    <div className="px-4 py-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2">
                      <Terminal size={11} strokeWidth={2} />
                      Commands
                      <span className="ml-auto text-neutral-600 normal-case font-normal tracking-normal">
                        {filteredCmds.length} {filteredCmds.length === 1 ? 'result' : 'results'}
                      </span>
                    </div>
                    {filteredCmds.slice(0, 15).map((cmd, idx) => {
                      const isSelected = idx === selectedIndex
                      return (
                        <motion.button
                          key={cmd.id}
                          initial={false}
                          animate={{
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent'
                          }}
                          transition={{ duration: 0.1 }}
                          data-selected={isSelected}
                          onClick={() => selectCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg mx-1 group transition-colors duration-100"
                          style={{ width: 'calc(100% - 8px)' }}
                        >
                          <div
                            className={cn(
                              'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150',
                              isSelected
                                ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)] shadow-lg shadow-[var(--accent-color)]/20'
                                : 'bg-neutral-800/80 text-neutral-400 group-hover:bg-neutral-800 group-hover:text-neutral-300'
                            )}
                          >
                            {iconMap[cmd.icon] || <Sparkles size={16} strokeWidth={1.75} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="text-[13px] font-medium truncate block text-neutral-200 group-hover:text-white transition-colors">
                              {cmd.label}
                            </span>
                            {cmd.description && (
                              <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          {cmd.requiresInput ? (
                            <ChevronRight size={14} className="text-neutral-600 flex-shrink-0" />
                          ) : (
                            <CornerDownLeft
                              size={13}
                              className={cn(
                                'flex-shrink-0 transition-all duration-150',
                                isSelected ? 'opacity-100 text-neutral-500' : 'opacity-0'
                              )}
                            />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                )
              })()
            ) : universalSearchResults.length === 0 ? (
              <div className="px-6 py-12 text-center">
                {limitedsLoading || catalogLoading || playerLoading ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center">
                      <Loader2 size={18} className="text-neutral-400 animate-spin" />
                    </div>
                    <div className="text-neutral-400 text-[13px]">
                      {playerLoading ? 'Searching players...' : 'Indexing items...'}
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.04] flex items-center justify-center">
                      <Search size={18} className="text-neutral-600" strokeWidth={1.5} />
                    </div>
                    <div className="text-neutral-400 text-[13px]">No results found</div>
                    <div className="text-neutral-600 text-[11px] mt-1">
                      Try a different search term
                    </div>
                  </>
                )}
              </div>
            ) : (
              <div className="py-1">
                <Virtuoso
                  data={universalSearchResults}
                  overscan={20}
                  computeItemKey={(_idx, item) =>
                    item.type === 'command' ? `cmd-${item.command.id}` : `${item.type}-${item.id}`
                  }
                  style={{ height: listMaxHeight - 16 }}
                  itemContent={(idx, result) => {
                    if (result.type === 'player') {
                      return (
                        <UniversalPlayerRow
                          result={result}
                          idx={idx}
                          selectedIndex={selectedIndex}
                          onSelect={handleSelectUniversalResult}
                          onHover={setSelectedIndex}
                        />
                      )
                    }

                    if (result.type === 'limited') {
                      return (
                        <UniversalLimitedRow
                          result={result}
                          idx={idx}
                          selectedIndex={selectedIndex}
                          onSelect={handleSelectUniversalResult}
                          onHover={setSelectedIndex}
                        />
                      )
                    }

                    if (result.type === 'catalog') {
                      return (
                        <UniversalCatalogRow
                          result={result}
                          idx={idx}
                          selectedIndex={selectedIndex}
                          onSelect={handleSelectUniversalResult}
                          onHover={setSelectedIndex}
                        />
                      )
                    }

                    if (result.type === 'command') {
                      return (
                        <UniversalCommandRow
                          result={result}
                          idx={idx}
                          selectedIndex={selectedIndex}
                          onSelect={handleSelectUniversalResult}
                          onHover={setSelectedIndex}
                        />
                      )
                    }

                    return null
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* Command List */}
        {step === 'select' && (
          <div ref={listRef} className="overflow-y-auto" style={{ maxHeight: listMaxHeight }}>
            {flatCommands.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.04] flex items-center justify-center">
                  <Terminal size={18} className="text-neutral-600" strokeWidth={1.5} />
                </div>
                <div className="text-neutral-400 text-[13px]">No commands found</div>
                <div className="text-neutral-600 text-[11px] mt-1">Try a different search</div>
              </div>
            ) : (
              <div className="py-1.5">
                {groupedCommands.map(({ category, commands: cmds }) => (
                  <div key={category} className="mb-1">
                    <div className="px-4 py-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-neutral-950/95 backdrop-blur-sm z-10">
                      {categoryLabels[category]}
                      <span className="w-px h-3 bg-neutral-800" />
                      <span className="text-neutral-600 normal-case font-normal tracking-normal">
                        {cmds.length}
                      </span>
                    </div>
                    {cmds.map((cmd) => {
                      const idx = commandIndex++
                      const isSelected = idx === selectedIndex
                      const isRecent = recentCommandIds.includes(cmd.id)

                      return (
                        <motion.button
                          key={cmd.id}
                          initial={false}
                          animate={{
                            backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent'
                          }}
                          transition={{ duration: 0.1 }}
                          data-selected={isSelected}
                          onClick={() => selectCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg mx-1 group transition-colors duration-100"
                          style={{ width: 'calc(100% - 8px)' }}
                        >
                          <div
                            className={cn(
                              'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150',
                              isSelected
                                ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)] shadow-lg shadow-[var(--accent-color)]/20'
                                : 'bg-neutral-800/80 text-neutral-400 group-hover:bg-neutral-800 group-hover:text-neutral-300'
                            )}
                          >
                            {iconMap[cmd.icon] || <Sparkles size={16} strokeWidth={1.75} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-[13px] font-medium truncate text-neutral-200 group-hover:text-white transition-colors">
                                {cmd.label}
                              </span>
                              {isRecent && (
                                <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                                  <Clock size={9} />
                                  Recent
                                </span>
                              )}
                            </div>
                            {cmd.description && (
                              <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          {cmd.requiresInput ? (
                            <ChevronRight size={14} className="text-neutral-600 flex-shrink-0" />
                          ) : (
                            <CornerDownLeft
                              size={13}
                              className={cn(
                                'flex-shrink-0 transition-all duration-150',
                                isSelected ? 'opacity-100 text-neutral-500' : 'opacity-0'
                              )}
                            />
                          )}
                        </motion.button>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Input Step Content */}
        {step === 'input' && (
          <div>
            {/* Friend Suggestions */}
            {filteredFriends.length > 0 && (
              <div
                ref={suggestionsRef}
                className="overflow-y-auto"
                style={{ maxHeight: secondaryListMaxHeight }}
              >
                <div className="px-4 py-2 text-[10px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-2 sticky top-0 bg-neutral-950/95 backdrop-blur-sm z-10">
                  <Users size={11} strokeWidth={2} />
                  Friends
                  <span className="ml-auto text-neutral-600 normal-case font-normal tracking-normal">
                    {filteredFriends.length}
                  </span>
                </div>
                {filteredFriends.map((friend, idx) => {
                  const isSelected = idx === suggestionIndex
                  return (
                    <motion.button
                      key={friend.id}
                      initial={false}
                      animate={{
                        backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent'
                      }}
                      transition={{ duration: 0.1 }}
                      data-suggestion-selected={isSelected}
                      onClick={() => {
                        setInputValue(friend.username)
                        setTimeout(() => submitInput(), 0)
                      }}
                      onMouseEnter={() => setSuggestionIndex(idx)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg mx-1 group transition-colors duration-100"
                      style={{ width: 'calc(100% - 8px)' }}
                    >
                      <img
                        src={friend.avatarUrl}
                        alt={friend.displayName}
                        className="w-9 h-9 rounded-full bg-neutral-800 flex-shrink-0 ring-1 ring-white/5"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium truncate text-neutral-200 group-hover:text-white transition-colors">
                          {friend.displayName}
                        </div>
                        <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                          @{friend.username}
                        </div>
                      </div>
                      {friend.gameActivity && (
                        <div className="flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <Gamepad2 size={11} />
                          <span className="max-w-[80px] truncate">{friend.gameActivity.name}</span>
                        </div>
                      )}
                      <CornerDownLeft
                        size={13}
                        className={cn(
                          'flex-shrink-0 transition-all duration-150',
                          isSelected ? 'opacity-100 text-neutral-500' : 'opacity-0'
                        )}
                      />
                    </motion.button>
                  )
                })}
              </div>
            )}

            {/* Help text */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-white/[0.04] bg-gradient-to-b from-transparent to-white/[0.01]">
              <span className="text-neutral-500 text-[12px]">
                {filteredFriends.length > 0
                  ? 'Select a friend or type a username'
                  : 'Type a username'}
              </span>
              <div className="flex items-center gap-3">
                {filteredFriends.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 bg-white/[0.04] border border-white/[0.06] rounded">
                      Tab
                    </kbd>
                    <span className="text-neutral-600 text-[10px]">autocomplete</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 bg-white/[0.04] border border-white/[0.06] rounded">
                    ↵
                  </kbd>
                  <span className="text-neutral-600 text-[10px]">confirm</span>
                </div>
              </div>
            </div>

            {isLoading && (
              <div className="px-4 py-4 flex items-center justify-center gap-2 border-t border-white/[0.04]">
                <Loader2 size={15} className="text-neutral-400 animate-spin" />
                <span className="text-[12px] text-neutral-400">Loading...</span>
              </div>
            )}
          </div>
        )}

        {/* Results Step Content */}
        {step === 'results' && (
          <div>
            {/* Results Header */}
            <div className="px-4 py-3 border-b border-white/[0.06] flex items-center gap-3 bg-gradient-to-b from-white/[0.02] to-transparent">
              <motion.button
                onClick={goBack}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-neutral-400 hover:text-white transition-all duration-150"
              >
                <ArrowLeft size={16} strokeWidth={2} />
              </motion.button>
              <div className="flex-1">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500 font-medium mb-0.5">
                  Search Results
                </div>
                <div className="text-[13px] text-white font-medium">
                  {searchResults.length} {searchResults.length === 1 ? 'item' : 'items'} found
                </div>
              </div>
            </div>

            {/* Results List */}
            <div ref={resultsRef} style={{ height: listMaxHeight }}>
              {searchResults.length === 0 ? (
                <div className="px-6 py-12 text-center">
                  <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/[0.04] flex items-center justify-center">
                    <Boxes size={18} className="text-neutral-600" strokeWidth={1.5} />
                  </div>
                  <div className="text-neutral-400 text-[13px]">No items found</div>
                </div>
              ) : (
                <Virtuoso
                  data={searchResults}
                  overscan={20}
                  computeItemKey={(_idx, item) => `${item.itemType}-${item.id}`}
                  itemContent={(idx, item) => {
                    const isSelected = idx === resultSelectedIndex
                    return (
                      <motion.button
                        key={`${item.itemType}-${item.id}`}
                        initial={false}
                        animate={{
                          backgroundColor: isSelected ? 'rgba(255,255,255,0.04)' : 'transparent'
                        }}
                        transition={{ duration: 0.1 }}
                        data-result-selected={isSelected}
                        data-index={idx}
                        onClick={() => selectResult(item)}
                        onMouseEnter={() => setResultSelectedIndex(idx)}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left rounded-lg mx-1 group transition-colors duration-100"
                        style={{ width: 'calc(100% - 8px)' }}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="flex-shrink-0 w-9 h-9 rounded-lg bg-neutral-800 object-cover ring-1 ring-white/5"
                          />
                        ) : (
                          <div
                            className={cn(
                              'flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center transition-all duration-150',
                              isSelected
                                ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
                                : 'bg-neutral-800/80 text-neutral-400 group-hover:bg-neutral-800'
                            )}
                          >
                            <Boxes size={16} strokeWidth={1.75} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[13px] font-medium truncate text-neutral-200 group-hover:text-white transition-colors">
                              {item.name}
                            </span>
                            {item.creatorHasVerifiedBadge && (
                              <VerifiedIcon width={11} height={11} className="flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 text-[11px] text-neutral-500 mt-0.5">
                            <span className="truncate">by {item.creatorName || 'Unknown'}</span>
                            {item.price !== null && item.price !== undefined && (
                              <>
                                <span className="text-neutral-700">·</span>
                                <span className="text-emerald-400/90">
                                  R$ {item.price.toLocaleString()}
                                </span>
                              </>
                            )}
                            {item.isOffSale && (
                              <>
                                <span className="text-neutral-700">·</span>
                                <span className="text-red-400/80">Off Sale</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span
                            className={cn(
                              'text-[10px] font-medium px-1.5 py-0.5 rounded-md border flex items-center gap-1',
                              resultTypeBadges.catalog.className
                            )}
                          >
                            {resultTypeBadges.catalog.icon}
                            {item.itemType}
                          </span>
                          <ChevronRight
                            size={14}
                            className={cn(
                              'text-neutral-600 transition-all duration-150',
                              isSelected ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-1'
                            )}
                          />
                        </div>
                      </motion.button>
                    )
                  }}
                />
              )}
            </div>

            {/* Results Help text */}
            <div className="px-4 py-3 flex items-center justify-between border-t border-white/[0.04] bg-gradient-to-b from-transparent to-white/[0.01]">
              <span className="text-neutral-500 text-[12px]">Select an item to open</span>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 bg-white/[0.04] border border-white/[0.06] rounded">
                    ↵
                  </kbd>
                  <span className="text-neutral-600 text-[10px]">open</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <kbd className="px-1.5 py-0.5 text-[10px] font-medium text-neutral-500 bg-white/[0.04] border border-white/[0.06] rounded">
                    ESC
                  </kbd>
                  <span className="text-neutral-600 text-[10px]">back</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.04] bg-gradient-to-b from-transparent to-neutral-950/50">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-neutral-600">
              <kbd className="w-5 h-5 flex items-center justify-center text-[10px] font-medium bg-white/[0.04] border border-white/[0.06] rounded">
                ↑
              </kbd>
              <kbd className="w-5 h-5 flex items-center justify-center text-[10px] font-medium bg-white/[0.04] border border-white/[0.06] rounded">
                ↓
              </kbd>
              <span className="ml-0.5 text-[10px]">navigate</span>
            </div>
            <div className="w-px h-3 bg-white/[0.06]" />
            <div className="flex items-center gap-1.5 text-neutral-600">
              <kbd className="px-1.5 h-5 flex items-center justify-center text-[10px] font-medium bg-white/[0.04] border border-white/[0.06] rounded">
                ↵
              </kbd>
              <span className="text-[10px]">select</span>
            </div>
            {step === 'search' && (
              <>
                <div className="w-px h-3 bg-white/[0.06]" />
                <div className="flex items-center gap-1.5 text-neutral-600">
                  <kbd className="px-1.5 h-5 flex items-center justify-center text-[10px] font-medium bg-white/[0.04] border border-white/[0.06] rounded">
                    &gt;
                  </kbd>
                  <span className="text-[10px]">commands</span>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 text-[10px] text-neutral-600 bg-white/[0.02] px-2 py-1 rounded-md border border-white/[0.04]">
            <Command size={11} strokeWidth={1.5} />
            <span className="font-medium">K</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default CommandPalette
