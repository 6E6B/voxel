import React, { useEffect, useRef, useMemo, useState, useCallback, memo } from 'react'
import { motion } from 'framer-motion'
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso'
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
  Zap
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
import { useLimitedsSearch, useCatalogSearch } from './hooks'
import { LimitedThumbnail } from './components/LimitedThumbnail'
import VerifiedIcon from '../../components/UI/icons/VerifiedIcon'
import { DEMAND_COLORS, TREND_COLORS } from '../avatar/api/useRolimons'

const iconMap: Record<string, React.ReactNode> = {
  user: <User size={18} />,
  users: <Users size={18} />,
  gamepad: <Gamepad2 size={18} />,
  play: <Play size={18} />,
  settings: <Settings size={18} />,
  'user-plus': <UserPlus size={18} />,
  'user-minus': <UserMinus size={18} />,
  palette: <Palette size={18} />,
  sparkles: <Sparkles size={18} />,
  boxes: <Boxes size={18} />,
  history: <History size={18} />,
  trending: <TrendingUp size={18} />,
  file: <FileText size={18} />,
  download: <Download size={18} />,
  hash: <Hash size={18} />,
  globe: <Globe size={18} />,
  clock: <Clock size={18} />,
  refresh: <RefreshCw size={18} />,
  logout: <LogOut size={18} />,
  star: <Star size={18} />,
  ban: <Ban size={18} />,
  copy: <Copy size={18} />,
  'external-link': <ExternalLink size={18} />,
  'shield-check': <ShieldCheck size={18} />,
  cookie: <Cookie size={18} />
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
}

const UniversalLimitedRow = memo(
  ({ result, idx, selectedIndex, onSelect }: UniversalLimitedRowProps) => {
    const isSelected = idx === selectedIndex
    return (
      <button
        data-selected={isSelected}
        data-index={idx}
        onClick={() => onSelect(result)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 text-left',
          isSelected ? 'bg-neutral-800/80' : 'hover:bg-neutral-900'
        )}
      >
        <LimitedThumbnail
          assetId={result.id}
          name={result.name}
          className="flex-shrink-0 w-10 h-10 rounded-lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium truncate',
                isSelected ? 'text-white' : 'text-neutral-300'
              )}
            >
              {result.name}
            </span>
            {result.isRare && <Gem size={12} className="text-purple-400 flex-shrink-0" />}
            {result.isHyped && <Flame size={12} className="text-orange-400 flex-shrink-0" />}
            {result.isProjected && <Zap size={12} className="text-yellow-400 flex-shrink-0" />}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {result.value !== null ? (
              <span className="text-green-400">{result.value.toLocaleString()} Value</span>
            ) : (
              <span className="text-neutral-500">{result.rap.toLocaleString()} RAP</span>
            )}
            <span>·</span>
            <span className={DEMAND_COLORS[result.demand]}>
              <span className="text-neutral-500">Demand:</span> {result.demandLabel}
            </span>
            <span>·</span>
            <span className={TREND_COLORS[result.trend]}>
              <span className="text-neutral-500">Trend:</span> {result.trendLabel}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-neutral-600 px-2 py-0.5 bg-neutral-800 rounded">
            Limited
          </span>
          {isSelected && <ExternalLink size={14} className="text-neutral-500" />}
        </div>
      </button>
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
}

const UniversalCatalogRow = memo(
  ({ result, idx, selectedIndex, onSelect }: UniversalCatalogRowProps) => {
    const isSelected = idx === selectedIndex
    return (
      <button
        data-selected={isSelected}
        data-index={idx}
        onClick={() => onSelect(result)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 text-left',
          isSelected ? 'bg-neutral-800/80' : 'hover:bg-neutral-900'
        )}
      >
        <LimitedThumbnail
          assetId={result.id}
          name={result.name}
          className="flex-shrink-0 w-10 h-10 rounded-lg"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'text-sm font-medium truncate',
                isSelected ? 'text-white' : 'text-neutral-300'
              )}
            >
              {result.name}
            </span>
            {(result.isLimited || result.isLimitedUnique) && (
              <Gem size={12} className="text-amber-400 flex-shrink-0" />
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            {result.isForSale && result.price > 0 ? (
              <span className="text-green-400">R$ {result.price.toLocaleString()}</span>
            ) : (
              <span className="text-neutral-500">Off Sale</span>
            )}
            {result.description && (
              <>
                <span>·</span>
                <span className="truncate max-w-[200px]">{result.description}</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-neutral-600 px-2 py-0.5 bg-neutral-800 rounded">
            Catalog
          </span>
          {isSelected && <ExternalLink size={14} className="text-neutral-500" />}
        </div>
      </button>
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
}

const UniversalCommandRow = memo(
  ({ result, idx, selectedIndex, onSelect }: UniversalCommandRowProps) => {
    const isSelected = idx === selectedIndex
    const cmd = result.command
    return (
      <button
        data-selected={isSelected}
        data-index={idx}
        onClick={() => onSelect(result)}
        className={cn(
          'w-full flex items-center gap-3 px-4 py-2.5 text-left',
          isSelected ? 'bg-neutral-800/80' : 'hover:bg-neutral-900'
        )}
      >
        <div
          className={cn(
            'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
            isSelected
              ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
              : 'bg-neutral-800 text-neutral-400'
          )}
        >
          {iconMap[cmd.icon] || <Sparkles size={18} />}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className={cn(
              'text-sm font-medium truncate block',
              isSelected ? 'text-white' : 'text-neutral-300'
            )}
          >
            {cmd.label}
          </span>
          {cmd.description && (
            <div className="text-xs text-neutral-500 truncate">{cmd.description}</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-neutral-600 px-2 py-0.5 bg-neutral-800 rounded">
            Command
          </span>
          {cmd.requiresInput ? (
            <ChevronRight size={16} className="text-neutral-600" />
          ) : (
            isSelected && <CornerDownLeft size={14} className="text-neutral-500" />
          )}
        </div>
      </button>
    )
  },
  (prev, next) => {
    const wasSelected = prev.idx === prev.selectedIndex
    const isSelected = next.idx === next.selectedIndex
    return prev.result === next.result && wasSelected === isSelected
  }
)
UniversalCommandRow.displayName = 'UniversalCommandRow'

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
    }
  }, [step, query, searchLimiteds, searchCatalog])

  // Universal search results - combines limiteds, catalog items, and commands
  const universalSearchResults = useMemo<UniversalSearchResult[]>(() => {
    if (step !== 'search' || !query.trim()) return []

    const results: UniversalSearchResult[] = []

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
  }, [step, query, limitedsResults, catalogResults, commands])

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
    [selectCommand, onViewAccessory, close]
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
    }
  }, [isOpen, step, resetLimitedsSearch, resetCatalogSearch])

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
      transition={{ duration: 0.15 }}
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-sm"
      style={{ paddingTop: overlayPaddingTop }}
      onClick={(e) => {
        if (e.target === e.currentTarget) close()
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -10 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        className="bg-neutral-950 border border-neutral-800 rounded-xl shadow-2xl overflow-hidden"
        style={{ width: paletteWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-neutral-800">
          {step === 'input' ? (
            <>
              <button
                onClick={goBack}
                className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1 flex items-center gap-3">
                <div className="text-neutral-400">{iconMap[activeCommand?.icon || 'sparkles']}</div>
                <div className="flex-1">
                  <div className="text-xs text-neutral-500 mb-0.5">
                    {activeCommand?.inputLabel || 'Input'}
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={activeCommand?.inputPlaceholder}
                    disabled={isLoading}
                    className="w-full bg-transparent text-white text-sm placeholder:text-neutral-600 focus:outline-none"
                    autoFocus
                  />
                </div>
              </div>
            </>
          ) : step === 'select' ? (
            <>
              <button
                onClick={goBack}
                className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <Command size={18} className="text-neutral-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search commands..."
                className="flex-1 bg-transparent text-white text-sm placeholder:text-neutral-500 focus:outline-none"
                autoFocus
              />
              <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                <kbd className="px-1.5 py-0.5 bg-neutral-900 rounded text-neutral-500 border border-neutral-800 font-mono">
                  esc
                </kbd>
                <span>back</span>
              </div>
            </>
          ) : (
            <>
              <Search size={18} className="text-neutral-500" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search limiteds, items, commands..."
                className="flex-1 bg-transparent text-white text-sm placeholder:text-neutral-500 focus:outline-none"
                autoFocus
              />
              <div className="flex items-center gap-1.5 text-xs text-neutral-600">
                {(limitedsCount > 0 || catalogCount > 0) && (
                  <span className="text-neutral-600 mr-2">
                    {limitedsCount > 0 && `${limitedsCount.toLocaleString()} limiteds`}
                    {limitedsCount > 0 && catalogCount > 0 && ' · '}
                    {catalogCount > 0 && `${catalogCount.toLocaleString()} items`}
                  </span>
                )}
                <kbd className="px-1.5 py-0.5 bg-neutral-900 rounded text-neutral-500 border border-neutral-800 font-mono">
                  esc
                </kbd>
                <span>to close</span>
              </div>
            </>
          )}
        </div>

        {/* Universal Search Results */}
        {step === 'search' && (
          <div ref={listRef} className="overflow-y-auto py-2" style={{ maxHeight: listMaxHeight }}>
            {!query.trim() ? (
              <div className="px-4 py-8 text-center">
                <div className="text-neutral-400 text-sm mb-2">
                  Search for anything Roblox-related
                </div>
                <div className="flex flex-wrap justify-center gap-2 text-xs text-neutral-600">
                  <span className="px-2 py-1 bg-neutral-900 rounded">Limiteds</span>
                  <span className="px-2 py-1 bg-neutral-900 rounded">Catalog Items</span>
                  <span className="px-2 py-1 bg-neutral-900 rounded">Commands</span>
                </div>
                <div className="mt-4 text-xs text-neutral-600">
                  Type{' '}
                  <kbd className="px-1.5 py-0.5 bg-neutral-800 rounded font-mono mx-1">&gt;</kbd>{' '}
                  for commands only
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
                    <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                      No commands found
                    </div>
                  )
                }

                return (
                  <>
                    <div className="px-4 py-1.5 text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
                      Commands
                    </div>
                    {filteredCmds.slice(0, 15).map((cmd, idx) => {
                      const isSelected = idx === selectedIndex
                      return (
                        <button
                          key={cmd.id}
                          data-selected={isSelected}
                          onClick={() => selectCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(idx)}
                          className={cn(
                            'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                            isSelected ? 'bg-neutral-800/80' : 'hover:bg-neutral-900'
                          )}
                        >
                          <div
                            className={cn(
                              'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                              isSelected
                                ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
                                : 'bg-neutral-800 text-neutral-400'
                            )}
                          >
                            {iconMap[cmd.icon] || <Sparkles size={18} />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span
                              className={cn(
                                'text-sm font-medium truncate block',
                                isSelected ? 'text-white' : 'text-neutral-300'
                              )}
                            >
                              {cmd.label}
                            </span>
                            {cmd.description && (
                              <div className="text-xs text-neutral-500 truncate">
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          {cmd.requiresInput ? (
                            <ChevronRight size={16} className="text-neutral-600 flex-shrink-0" />
                          ) : (
                            <CornerDownLeft
                              size={14}
                              className={cn(
                                'flex-shrink-0 transition-opacity',
                                isSelected ? 'opacity-100 text-neutral-500' : 'opacity-0'
                              )}
                            />
                          )}
                        </button>
                      )
                    })}
                  </>
                )
              })()
            ) : universalSearchResults.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                {limitedsLoading || catalogLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    >
                      <RefreshCw size={16} />
                    </motion.div>
                    <span>Indexing items...</span>
                  </div>
                ) : (
                  'No results found'
                )}
              </div>
            ) : (
              <Virtuoso
                data={universalSearchResults}
                overscan={20}
                computeItemKey={(idx, item) =>
                  item.type === 'command' ? `cmd-${item.command.id}` : `${item.type}-${item.id}`
                }
                style={{ height: listMaxHeight - 16 }}
                itemContent={(idx, result) => {
                  if (result.type === 'limited') {
                    return (
                      <UniversalLimitedRow
                        result={result}
                        idx={idx}
                        selectedIndex={selectedIndex}
                        onSelect={handleSelectUniversalResult}
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
                      />
                    )
                  }

                  return null
                }}
              />
            )}
          </div>
        )}

        {/* Command List */}
        {step === 'select' && (
          <div ref={listRef} className="overflow-y-auto py-2" style={{ maxHeight: listMaxHeight }}>
            {flatCommands.length === 0 ? (
              <div className="px-4 py-8 text-center text-neutral-500 text-sm">
                No commands found
              </div>
            ) : (
              groupedCommands.map(({ category, commands: cmds }) => (
                <div key={category}>
                  <div className="px-4 py-1.5 text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
                    {categoryLabels[category]}
                  </div>
                  {cmds.map((cmd) => {
                    const idx = commandIndex++
                    const isSelected = idx === selectedIndex
                    const isRecent = recentCommandIds.includes(cmd.id)

                    return (
                      <button
                        key={cmd.id}
                        data-selected={isSelected}
                        onClick={() => selectCommand(cmd)}
                        onMouseEnter={() => setSelectedIndex(idx)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors',
                          isSelected ? 'bg-neutral-800/80' : 'hover:bg-neutral-900'
                        )}
                      >
                        <div
                          className={cn(
                            'flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center',
                            isSelected
                              ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
                              : 'bg-neutral-800 text-neutral-400'
                          )}
                        >
                          {iconMap[cmd.icon] || <Sparkles size={18} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-sm font-medium truncate',
                                isSelected ? 'text-white' : 'text-neutral-300'
                              )}
                            >
                              {cmd.label}
                            </span>
                            {isRecent && (
                              <Clock size={12} className="text-neutral-600 flex-shrink-0" />
                            )}
                          </div>
                          {cmd.description && (
                            <div className="text-xs text-neutral-500 truncate">
                              {cmd.description}
                            </div>
                          )}
                        </div>
                        {cmd.requiresInput ? (
                          <ChevronRight size={16} className="text-neutral-600 flex-shrink-0" />
                        ) : (
                          <CornerDownLeft
                            size={14}
                            className={cn(
                              'flex-shrink-0 transition-opacity',
                              isSelected ? 'opacity-100 text-neutral-500' : 'opacity-0'
                            )}
                          />
                        )}
                      </button>
                    )
                  })}
                </div>
              ))
            )}
          </div>
        )}

        {/* Input Step Content */}
        {step === 'input' && (
          <div className="py-2">
            {/* Friend Suggestions */}
            {filteredFriends.length > 0 && (
              <div
                ref={suggestionsRef}
                className="overflow-y-auto"
                style={{ maxHeight: secondaryListMaxHeight }}
              >
                <div className="px-4 py-1.5 text-[11px] font-medium text-neutral-600 uppercase tracking-wider">
                  Friends
                </div>
                {filteredFriends.map((friend, idx) => {
                  const isSelected = idx === suggestionIndex
                  return (
                    <button
                      key={friend.id}
                      data-suggestion-selected={isSelected}
                      onClick={() => {
                        setInputValue(friend.username)
                        setTimeout(() => submitInput(), 0)
                      }}
                      onMouseEnter={() => setSuggestionIndex(idx)}
                      className={cn(
                        'w-full flex items-center gap-3 px-4 py-2 text-left transition-colors',
                        isSelected ? 'bg-neutral-800/80' : 'hover:bg-neutral-900'
                      )}
                    >
                      <img
                        src={friend.avatarUrl}
                        alt={friend.displayName}
                        className="w-8 h-8 rounded-full bg-neutral-800 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div
                          className={cn(
                            'text-sm font-medium truncate',
                            isSelected ? 'text-white' : 'text-neutral-300'
                          )}
                        >
                          {friend.displayName}
                        </div>
                        <div className="text-xs text-neutral-500 truncate">@{friend.username}</div>
                      </div>
                      {friend.gameActivity && (
                        <div className="flex items-center gap-1 text-xs text-green-500 flex-shrink-0">
                          <Gamepad2 size={12} />
                          <span className="max-w-[100px] truncate">{friend.gameActivity.name}</span>
                        </div>
                      )}
                      {isSelected && (
                        <CornerDownLeft size={14} className="text-neutral-500 flex-shrink-0" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* Help text */}
            <div className="px-4 py-3 flex items-center justify-between text-sm border-t border-neutral-800/50">
              <span className="text-neutral-500">
                {filteredFriends.length > 0
                  ? 'Select a friend or type a username'
                  : 'Type a username'}
              </span>
              <div className="flex items-center gap-2">
                {filteredFriends.length > 0 && (
                  <>
                    <kbd className="px-1.5 py-0.5 bg-neutral-900 rounded text-neutral-400 border border-neutral-800 font-mono text-xs">
                      Tab
                    </kbd>
                    <span className="text-neutral-500 text-xs">autocomplete</span>
                    <span className="text-neutral-700 mx-1">·</span>
                  </>
                )}
                <kbd className="px-1.5 py-0.5 bg-neutral-900 rounded text-neutral-400 border border-neutral-800 font-mono text-xs">
                  Enter
                </kbd>
                <span className="text-neutral-500 text-xs">confirm</span>
              </div>
            </div>

            {isLoading && (
              <div className="px-4 py-4 flex items-center justify-center gap-2 text-neutral-500 border-t border-neutral-800/50">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <RefreshCw size={16} />
                </motion.div>
                <span className="text-sm">Loading...</span>
              </div>
            )}
          </div>
        )}

        {/* Results Step Content */}
        {step === 'results' && (
          <div className="py-2">
            {/* Results Header */}
            <div className="px-4 py-2 border-b border-neutral-800/50 flex items-center gap-3">
              <button
                onClick={goBack}
                className="p-1.5 rounded-md hover:bg-neutral-800 text-neutral-400 hover:text-white transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="flex-1">
                <div className="text-xs text-neutral-500 mb-0.5">Search Results</div>
                <div className="text-sm text-white">
                  {searchResults.length} {searchResults.length === 1 ? 'item' : 'items'} found
                </div>
              </div>
            </div>

            {/* Results List */}
            <div ref={resultsRef} style={{ height: listMaxHeight }}>
              {searchResults.length === 0 ? (
                <div className="px-4 py-8 text-center text-neutral-500 text-sm">No items found</div>
              ) : (
                <Virtuoso
                  data={searchResults}
                  overscan={20}
                  computeItemKey={(idx, item) => `${item.itemType}-${item.id}`}
                  itemContent={(idx, item) => {
                    const isSelected = idx === resultSelectedIndex
                    return (
                      <button
                        key={`${item.itemType}-${item.id}`}
                        data-result-selected={isSelected}
                        data-index={idx}
                        onClick={() => selectResult(item)}
                        className={cn(
                          'w-full flex items-center gap-3 px-4 py-2.5 text-left',
                          isSelected ? 'bg-neutral-800/80' : 'hover:bg-neutral-900'
                        )}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="flex-shrink-0 w-10 h-10 rounded-lg bg-neutral-800 object-cover"
                          />
                        ) : (
                          <div
                            className={cn(
                              'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center',
                              isSelected
                                ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)]'
                                : 'bg-neutral-800 text-neutral-400'
                            )}
                          >
                            <Boxes size={20} />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-sm font-medium truncate',
                                isSelected ? 'text-white' : 'text-neutral-300'
                              )}
                            >
                              {item.name}
                            </span>
                            {item.creatorHasVerifiedBadge && (
                              <VerifiedIcon width={12} height={12} className="flex-shrink-0" />
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-neutral-500">
                            <span className="truncate">by {item.creatorName || 'Unknown'}</span>
                            {item.price !== null && item.price !== undefined && (
                              <>
                                <span>·</span>
                                <span className="text-green-400">
                                  R$ {item.price.toLocaleString()}
                                </span>
                              </>
                            )}
                            {item.isOffSale && (
                              <>
                                <span>·</span>
                                <span className="text-red-400">Off Sale</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className="text-xs text-neutral-600 px-2 py-0.5 bg-neutral-800 rounded">
                            {item.itemType}
                          </span>
                          {isSelected && <ExternalLink size={14} className="text-neutral-500" />}
                        </div>
                      </button>
                    )
                  }}
                />
              )}
            </div>

            {/* Results Help text */}
            <div className="px-4 py-3 flex items-center justify-between text-sm border-t border-neutral-800/50">
              <span className="text-neutral-500">Select an item to open in browser</span>
              <div className="flex items-center gap-2">
                <kbd className="px-1.5 py-0.5 bg-neutral-900 rounded text-neutral-400 border border-neutral-800 font-mono text-xs">
                  Enter
                </kbd>
                <span className="text-neutral-500 text-xs">open</span>
                <span className="text-neutral-700 mx-1">·</span>
                <kbd className="px-1.5 py-0.5 bg-neutral-900 rounded text-neutral-400 border border-neutral-800 font-mono text-xs">
                  Esc
                </kbd>
                <span className="text-neutral-500 text-xs">back</span>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-neutral-800 bg-neutral-950/50">
          <div className="flex items-center gap-3 text-xs text-neutral-600">
            <div className="flex items-center gap-1">
              <kbd className="px-1 py-0.5 bg-neutral-900 rounded border border-neutral-800 font-mono">
                ↑
              </kbd>
              <kbd className="px-1 py-0.5 bg-neutral-900 rounded border border-neutral-800 font-mono">
                ↓
              </kbd>
              <span className="ml-1">navigate</span>
            </div>
            <div className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-neutral-900 rounded border border-neutral-800 font-mono">
                ↵
              </kbd>
              <span className="ml-1">select</span>
            </div>
            {step === 'search' && (
              <div className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-neutral-900 rounded border border-neutral-800 font-mono">
                  &gt;
                </kbd>
                <span className="ml-1">commands</span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-neutral-600">
            <Command size={12} />
            <span>K</span>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default CommandPalette
