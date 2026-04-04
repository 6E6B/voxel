import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Users, User, Gamepad2, ShoppingBag, Loader2 } from 'lucide-react'
import { Friend, Game, AccountStatus } from '@renderer/shared/types'
import { getDropdownMotion } from '@renderer/shared/ui/menus/dropdownMotion'
import { getStatusRingUtilityClass } from '@renderer/shared/utils/statusUtils'

interface TitleBarSearchProps {
    friends: Friend[]
    onOpenUserProfile: (userId: string) => void
    onGameSelect?: (game: Game) => void
}

interface UserSearchResult {
    id: number
    name: string
    displayName: string
    avatarUrl?: string
}

interface CatalogSearchResult {
    id: number
    itemType: string
    name: string
    price: number | null
    thumbnailUrl?: string
}

// --- Search functions ---

async function searchUserByUsername(query: string): Promise<UserSearchResult | null> {
    if (!query.trim()) return null
    try {
        const result = await window.api.getUserByUsername(query.trim()) as { id: number; name: string; displayName: string } | null
        if (!result) return null

        // Fetch avatar
        try {
            const avatarMap = await window.api.getBatchUserAvatars([result.id], '48x48') as Map<number, string | null> | Record<number, string | null>
            const url = avatarMap instanceof Map ? avatarMap.get(result.id) : avatarMap[result.id]
            return { ...result, avatarUrl: url ?? undefined }
        } catch {
            return { id: result.id, name: result.name, displayName: result.displayName }
        }
    } catch {
        return null
    }
}

async function searchGames(query: string): Promise<Game[]> {
    if (!query.trim()) return []
    try {
        const results = (await window.api.searchGames(query)) as Game[]
        return results.slice(0, 4)
    } catch {
        return []
    }
}

async function searchCatalogItems(query: string): Promise<CatalogSearchResult[]> {
    if (!query.trim()) return []
    try {
        const result = (await window.api.searchCatalogItems({
            keyword: query,
            limit: 10,
            salesTypeFilter: 2,
            creatorName: 'Roblox'
        })) as { data: any[]; nextPageCursor?: string }

        if (!result.data || result.data.length === 0) return []
        const items = result.data.slice(0, 4)

        try {
            const thumbnailItems = items.map((item) => ({
                id: item.id,
                itemType: item.itemType || 'Asset'
            }))
            const thumbMap = (await window.api.getCatalogThumbnails(thumbnailItems)) as Record<number, string>
            return items.map((item) => ({
                id: item.id,
                itemType: item.itemType || 'Asset',
                name: item.name,
                price: item.price ?? item.lowestPrice ?? item.lowestResalePrice ?? null,
                thumbnailUrl: thumbMap[item.id] ?? undefined
            }))
        } catch {
            return items.map((item) => ({
                id: item.id,
                itemType: item.itemType || 'Asset',
                name: item.name,
                price: item.price ?? item.lowestPrice ?? item.lowestResalePrice ?? null
            }))
        }
    } catch {
        return []
    }
}

// --- Flattened result item for keyboard nav ---
type FlatItem =
    | { type: 'friend'; data: Friend }
    | { type: 'user'; data: UserSearchResult }
    | { type: 'game'; data: Game }
    | { type: 'catalog'; data: CatalogSearchResult }

// --- Animation helpers ---
const dropdownMotion = getDropdownMotion({ transformOrigin: 'top center', direction: 'down', collapsedScale: 0.96, offset: 4 })

const itemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: (i: number) => ({
        opacity: 1,
        x: 0,
        transition: { delay: i * 0.03, duration: 0.2, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] }
    })
}

// --- Section header ---
const SectionHeader: React.FC<{ icon: React.ReactNode; label: string }> = ({ icon, label }) => (
    <div className="flex items-center gap-2 px-3.5 pt-2.5 pb-1">
        {icon}
        <span className="text-[13px] font-medium text-[var(--color-text-muted)] select-none">
            {label}
        </span>
    </div>
)

// --- Main component ---

const TitleBarSearch: React.FC<TitleBarSearchProps> = ({ friends, onOpenUserProfile, onGameSelect }) => {
    const [query, setQuery] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [userResult, setUserResult] = useState<UserSearchResult | null>(null)
    const [gameResults, setGameResults] = useState<Game[]>([])
    const [catalogResults, setCatalogResults] = useState<CatalogSearchResult[]>([])
    const [isSearching, setIsSearching] = useState(false)
    const [selectedIndex, setSelectedIndex] = useState(-1)
    const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number } | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Filter friends locally
    const matchedFriends = useMemo(() => {
        if (!query.trim()) return []
        const q = query.toLowerCase()
        return friends
            .filter(
                (f) =>
                    f.displayName.toLowerCase().includes(q) ||
                    f.username.toLowerCase().includes(q)
            )
            .slice(0, 5)
    }, [query, friends])

    // Build flat list of all results for keyboard navigation
    const flatItems = useMemo<FlatItem[]>(() => {
        const items: FlatItem[] = []
        for (const f of matchedFriends) items.push({ type: 'friend', data: f })
        if (userResult) items.push({ type: 'user', data: userResult })
        for (const g of gameResults) items.push({ type: 'game', data: g })
        for (const c of catalogResults) items.push({ type: 'catalog', data: c })
        return items
    }, [matchedFriends, userResult, gameResults, catalogResults])

    const showDropdown = isFocused && query.trim().length > 0

    // Position the dropdown
    const updateDropdownPosition = useCallback(() => {
        if (!containerRef.current) return
        const rect = containerRef.current.getBoundingClientRect()
        const dropdownWidth = 420
        setDropdownPos({
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2 - dropdownWidth / 2,
            width: dropdownWidth
        })
    }, [])

    useEffect(() => {
        if (showDropdown) {
            updateDropdownPosition()
            window.addEventListener('resize', updateDropdownPosition)
            return () => window.removeEventListener('resize', updateDropdownPosition)
        }
    }, [showDropdown, updateDropdownPosition])

    // Debounced API searches
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current)

        if (!query.trim()) {
            setUserResult(null)
            setGameResults([])
            setCatalogResults([])
            setIsSearching(false)
            return
        }

        setIsSearching(true)
        debounceRef.current = setTimeout(async () => {
            const q = query.trim()

            const [user, games, catalog] = await Promise.all([
                searchUserByUsername(q),
                searchGames(q),
                searchCatalogItems(q)
            ])

            // Exclude user if already in friends
            const friendUserIds = new Set(matchedFriends.map((f) => f.userId))
            setUserResult(user && !friendUserIds.has(String(user.id)) ? user : null)
            setGameResults(games)
            setCatalogResults(catalog)
            setIsSearching(false)
        }, 300)

        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current)
        }
    }, [query, friends])

    useEffect(() => {
        setSelectedIndex(-1)
    }, [flatItems.length])

    useEffect(() => {
        const handleGlobalShortcut = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                setIsFocused(true)
                inputRef.current?.focus()
                inputRef.current?.select()
            }
        }

        document.addEventListener('keydown', handleGlobalShortcut)
        return () => document.removeEventListener('keydown', handleGlobalShortcut)
    }, [])

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node
            if (
                containerRef.current &&
                !containerRef.current.contains(target) &&
                dropdownRef.current &&
                !dropdownRef.current.contains(target)
            ) {
                setIsFocused(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const selectItem = useCallback(
        (item: FlatItem) => {
            switch (item.type) {
                case 'friend':
                    onOpenUserProfile(item.data.userId)
                    break
                case 'user':
                    onOpenUserProfile(String(item.data.id))
                    break
                case 'game':
                    onGameSelect?.(item.data)
                    break
                case 'catalog':
                    break
            }
            setQuery('')
            setIsFocused(false)
            inputRef.current?.blur()
        },
        [onOpenUserProfile, onGameSelect]
    )

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (!showDropdown || flatItems.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelectedIndex((prev) => (prev < flatItems.length - 1 ? prev + 1 : 0))
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelectedIndex((prev) => (prev > 0 ? prev - 1 : flatItems.length - 1))
        } else if (e.key === 'Enter' && selectedIndex >= 0 && flatItems[selectedIndex]) {
            e.preventDefault()
            selectItem(flatItems[selectedIndex])
        } else if (e.key === 'Escape') {
            setIsFocused(false)
            inputRef.current?.blur()
        }
    }

    const getFlatIndex = (sectionType: FlatItem['type'], indexInSection: number) => {
        let idx = 0
        for (const item of flatItems) {
            if (item.type === sectionType) {
                if (indexInSection === 0) return idx
                indexInSection--
            }
            idx++
        }
        return -1
    }

    const formatPlaying = (n: number) => {
        if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
        if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
        return String(n)
    }

    const hasAnyResults = flatItems.length > 0

    // Compute which sections exist for divider logic
    const hasFriends = matchedFriends.length > 0
    const hasUser = !!userResult
    const hasGames = gameResults.length > 0
    const hasCatalog = catalogResults.length > 0

    let globalItemCounter = 0

    const dropdown = dropdownPos
        ? createPortal(
            <AnimatePresence>
                {showDropdown && (
                    <motion.div
                        ref={dropdownRef}
                        className="fixed rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-2xl overflow-hidden backdrop-blur-sm"
                        initial={dropdownMotion.initial}
                        animate={dropdownMotion.animate}
                        exit={dropdownMotion.exit}
                        transition={dropdownMotion.transition}
                        style={{
                            ...dropdownMotion.style,
                            top: dropdownPos.top,
                            left: dropdownPos.left,
                            width: dropdownPos.width,
                            zIndex: 99999
                        }}
                    >
                        <div className="overflow-y-auto max-h-[480px] py-1.5 overscroll-contain">
                            {/* Friends */}
                            {hasFriends && (
                                <div>
                                    <SectionHeader
                                        icon={<Users size={15} className="text-[var(--accent-color)]" />}
                                        label="Friends"
                                    />
                                    {matchedFriends.map((friend, i) => {
                                        const flatIdx = getFlatIndex('friend', i)
                                        const animIdx = globalItemCounter++
                                        return (
                                            <motion.button
                                                key={friend.userId}
                                                custom={animIdx}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                onClick={() => selectItem({ type: 'friend', data: friend })}
                                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                                onMouseLeave={() => setSelectedIndex(-1)}
                                                className={`flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors rounded-lg mx-1 ${selectedIndex === flatIdx
                                                    ? 'bg-[var(--color-surface-hover)]'
                                                    : 'hover:bg-[var(--color-surface-hover)]'
                                                    }`}
                                                style={{ width: 'calc(100% - 8px)' }}
                                            >
                                                <img
                                                    src={friend.avatarUrl}
                                                    alt=""
                                                    className={`h-9 w-9 rounded-full bg-[var(--color-surface-muted)] object-cover flex-shrink-0 ring-2 ${friend.status !== AccountStatus.Offline ? getStatusRingUtilityClass(friend.status) : 'ring-[var(--color-border)]'}`}
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                                                        {friend.displayName}
                                                    </div>
                                                    <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                                                        @{friend.username}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* User match */}
                            {hasFriends && hasUser && (
                                <div className="mx-3.5 my-1 border-t border-[var(--color-border)]" />
                            )}
                            {hasUser && userResult && (
                                <div>
                                    <SectionHeader
                                        icon={<User size={15} className="text-[var(--accent-color)]" />}
                                        label="User"
                                    />
                                    {(() => {
                                        const flatIdx = getFlatIndex('user', 0)
                                        const animIdx = globalItemCounter++
                                        return (
                                            <motion.button
                                                key={userResult.id}
                                                custom={animIdx}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                onClick={() => selectItem({ type: 'user', data: userResult })}
                                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                                onMouseLeave={() => setSelectedIndex(-1)}
                                                className={`flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors rounded-lg mx-1 ${selectedIndex === flatIdx
                                                    ? 'bg-[var(--color-surface-hover)]'
                                                    : 'hover:bg-[var(--color-surface-hover)]'
                                                    }`}
                                                style={{ width: 'calc(100% - 8px)' }}
                                            >
                                                {userResult.avatarUrl ? (
                                                    <img
                                                        src={userResult.avatarUrl}
                                                        alt=""
                                                        className="h-9 w-9 rounded-full bg-[var(--color-surface-muted)] object-cover flex-shrink-0 ring-2 ring-[var(--color-border)]"
                                                    />
                                                ) : (
                                                    <div className="h-9 w-9 rounded-full bg-[var(--color-surface-muted)] flex items-center justify-center flex-shrink-0 ring-2 ring-[var(--color-border)]">
                                                        <User size={16} className="text-[var(--color-text-muted)]" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                                                        {userResult.displayName}
                                                    </div>
                                                    <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                                                        @{userResult.name}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        )
                                    })()}
                                </div>
                            )}

                            {/* Games */}
                            {(hasFriends || hasUser) && hasGames && (
                                <div className="mx-3.5 my-1 border-t border-[var(--color-border)]" />
                            )}
                            {hasGames && (
                                <div>
                                    <SectionHeader
                                        icon={<Gamepad2 size={15} className="text-[var(--accent-color)]" />}
                                        label="Games"
                                    />
                                    {gameResults.map((game, i) => {
                                        const flatIdx = getFlatIndex('game', i)
                                        const animIdx = globalItemCounter++
                                        return (
                                            <motion.button
                                                key={game.id}
                                                custom={animIdx}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                onClick={() => selectItem({ type: 'game', data: game })}
                                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                                onMouseLeave={() => setSelectedIndex(-1)}
                                                className={`flex w-full items-center gap-3 pl-2.5 pr-3.5 py-2 text-left transition-colors rounded-lg mx-1 ${selectedIndex === flatIdx
                                                    ? 'bg-[var(--color-surface-hover)]'
                                                    : 'hover:bg-[var(--color-surface-hover)]'
                                                    }`}
                                                style={{ width: 'calc(100% - 8px)' }}
                                            >
                                                {game.thumbnailUrl ? (
                                                    <img
                                                        src={game.thumbnailUrl}
                                                        alt=""
                                                        className="h-10 w-10 rounded-md bg-[var(--color-surface-muted)] object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-md bg-[var(--color-surface-muted)] flex items-center justify-center flex-shrink-0">
                                                        <Gamepad2 size={16} className="text-[var(--color-text-muted)]" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                                                        {game.name}
                                                    </div>
                                                    <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                                                        {game.creatorName} · {formatPlaying(game.playing)} playing
                                                    </div>
                                                </div>
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Catalog */}
                            {(hasFriends || hasUser || hasGames) && hasCatalog && (
                                <div className="mx-3.5 my-1 border-t border-[var(--color-border)]" />
                            )}
                            {hasCatalog && (
                                <div>
                                    <SectionHeader
                                        icon={<ShoppingBag size={15} className="text-[var(--accent-color)]" />}
                                        label="Catalog"
                                    />
                                    {catalogResults.map((item, i) => {
                                        const flatIdx = getFlatIndex('catalog', i)
                                        const animIdx = globalItemCounter++
                                        return (
                                            <motion.button
                                                key={`${item.itemType}-${item.id}`}
                                                custom={animIdx}
                                                variants={itemVariants}
                                                initial="hidden"
                                                animate="visible"
                                                onClick={() => selectItem({ type: 'catalog', data: item })}
                                                onMouseEnter={() => setSelectedIndex(flatIdx)}
                                                onMouseLeave={() => setSelectedIndex(-1)}
                                                className={`flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors rounded-lg mx-1 ${selectedIndex === flatIdx
                                                    ? 'bg-[var(--color-surface-hover)]'
                                                    : 'hover:bg-[var(--color-surface-hover)]'
                                                    }`}
                                                style={{ width: 'calc(100% - 8px)' }}
                                            >
                                                {item.thumbnailUrl ? (
                                                    <img
                                                        src={item.thumbnailUrl}
                                                        alt=""
                                                        className="h-10 w-10 rounded-xl bg-[var(--color-surface-muted)] object-cover flex-shrink-0"
                                                    />
                                                ) : (
                                                    <div className="h-10 w-10 rounded-xl bg-[var(--color-surface-muted)] flex items-center justify-center flex-shrink-0">
                                                        <ShoppingBag size={16} className="text-[var(--color-text-muted)]" />
                                                    </div>
                                                )}
                                                <div className="min-w-0 flex-1">
                                                    <div className="text-[13px] font-medium text-[var(--color-text-primary)] truncate">
                                                        {item.name}
                                                    </div>
                                                    <div className="text-[11px] text-[var(--color-text-muted)] truncate">
                                                        {item.price != null
                                                            ? `R$ ${item.price.toLocaleString()}`
                                                            : 'Price unavailable'}
                                                    </div>
                                                </div>
                                            </motion.button>
                                        )
                                    })}
                                </div>
                            )}

                            {/* Loading */}
                            {isSearching && !hasAnyResults && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex items-center justify-center gap-2.5 px-4 py-6"
                                >
                                    <Loader2 size={16} className="animate-spin text-[var(--accent-color)]" />
                                    <span className="text-[13px] text-[var(--color-text-muted)]">Searching...</span>
                                </motion.div>
                            )}

                            {/* No results */}
                            {!isSearching && !hasAnyResults && query.trim() && (
                                <motion.div
                                    initial={{ opacity: 0, y: 4 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="px-4 py-6 text-[13px] text-[var(--color-text-muted)] text-center"
                                >
                                    No results found for "{query.trim()}"
                                </motion.div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>,
            document.body
        )
        : null

    return (
        <div
            ref={containerRef}
            className="relative flex w-full max-w-[360px] items-center"
        >
            <div
                className="relative flex w-full items-center group"
                style={{ WebkitAppRegion: isFocused ? 'no-drag' : 'drag' } as React.CSSProperties}
            >
                <Search
                    size={14}
                    className="pointer-events-none absolute left-3 text-[var(--color-text-muted)] transition-colors group-focus-within:text-[var(--accent-color)]"
                />
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onFocus={() => setIsFocused(true)}
                    onKeyDown={handleKeyDown}
                    placeholder="Quick Search..."
                    style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
                    className="h-[34px] w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] pl-9 pr-8 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-color)]/40 focus:border-[var(--accent-color)]/60 transition-all duration-200"
                />
                {query && (
                    <button
                        type="button"
                        onClick={() => {
                            setQuery('')
                            setUserResult(null)
                            setGameResults([])
                            setCatalogResults([])
                            inputRef.current?.focus()
                        }}
                        className="absolute right-2 flex h-5 w-5 items-center justify-center rounded-md text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-all"
                    >
                        <X size={12} />
                    </button>
                )}
            </div>
            {dropdown}
        </div>
    )
}

export default TitleBarSearch
