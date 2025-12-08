import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Server, Wifi, ArrowRight, Loader2, ArrowUp, ArrowDown } from 'lucide-react'
import * as Flags from 'country-flag-icons/react/3x2'
import countries from 'i18n-iso-countries'
import enLocale from 'i18n-iso-countries/langs/en.json'
import { GameServer } from '../../types'
import { getPingColor } from '../../utils/serverUtils'
import CustomCheckbox from '../../components/UI/buttons/CustomCheckbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/UI/display/Tooltip'
import { useGameServers } from '../../hooks/queries/index'
import { ErrorMessage } from '../../components/UI/feedback/ErrorMessage'
import { EmptyState } from '../../components/UI/feedback/EmptyState'
import { useServerStore } from '../../stores/serverStore'
import { ConfirmModal } from '../../components/UI/dialogs/ConfirmModal'

countries.registerLocale(enLocale)

const RegionDisplay = ({ regionString }: { regionString: string }) => {
  const renderSimpleRegion = (text: string) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={`truncate ${text === 'Queued' ? 'text-yellow-400' : ''} ${text === 'Locating...' ? 'text-blue-400' : ''}`}
        >
          {text}
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )

  if (
    !regionString ||
    regionString === 'Unknown' ||
    regionString === 'Failed' ||
    regionString === 'Full/Restricted' ||
    regionString === 'Queued' ||
    regionString === 'Locating...' ||
    regionString === 'Full'
  ) {
    return renderSimpleRegion(regionString || 'Unknown')
  }

  const parts = regionString.split(',')
  if (parts.length < 2) {
    return renderSimpleRegion(regionString)
  }

  const countryCode = parts[0].trim().toUpperCase()
  const regionName = parts.slice(1).join(',').trim()

  const FlagComponent = (Flags as any)[countryCode]
  const countryName = countries.getName(countryCode, 'en') || countryCode

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-2 truncate">
          {FlagComponent ? (
            <div className="w-5 shrink-0">
              <FlagComponent className="w-full rounded-[2px]" />
            </div>
          ) : (
            <span className="text-xs font-bold">{countryCode}</span>
          )}
          <span className="truncate">{regionName}</span>
        </div>
      </TooltipTrigger>
      <TooltipContent>{`${countryName}, ${regionName}`}</TooltipContent>
    </Tooltip>
  )
}

interface ServersListProps {
  placeId: string
  onJoin: (jobId: string) => void
}

type SortKey = 'ping' | 'playing' | 'region' | null
type SortDirection = 'asc' | 'desc'

const ServersList = ({ placeId, onJoin }: ServersListProps) => {
  const [excludeFullGames, setExcludeFullGames] = useState(false)
  const [checkingRegions, setCheckingRegions] = useState<Record<string, boolean>>({})
  const isPreferenceLoaded = useRef(false)
  const ipQueue = useRef<{ id: string; address: string }[]>([])

  const [sortKey, setSortKey] = useState<SortKey>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)

  // Zustand Store
  const { regions, setRegion, setRegions } = useServerStore()

  // TanStack Query hooks
  const {
    data: serversData,
    isLoading: isLoadingServers,
    error: serversError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useGameServers(placeId, excludeFullGames, !!placeId)

  // Flatten pages into a single array
  const servers = useMemo(() => {
    if (!serversData?.pages) return []
    return serversData.pages.flatMap((page) => page.data)
  }, [serversData])

  const error = serversError ? 'Failed to load servers.' : null

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      // Default directions: Players -> Desc, Ping -> Asc, Region -> Asc
      if (key === 'playing') {
        setSortDirection('desc')
      } else {
        setSortDirection('asc')
      }
    }
  }

  // Merge query data with store regions
  const serversWithPreservedRegions = useMemo(() => {
    return servers.map((s) => {
      const storedRegion = regions[s.id]
      if (storedRegion) {
        return { ...s, region: storedRegion }
      }
      return s
    })
  }, [servers, regions])

  const filteredServers = useMemo(() => {
    if (!excludeFullGames) return serversWithPreservedRegions

    return serversWithPreservedRegions.filter((s) => {
      const region = s.region
      const isFullByCount = s.playing >= s.maxPlayers
      const isFullByRegion = region === 'Full' || region === 'Full/Restricted'
      const isQueued = region === 'Queued'

      return !(isFullByCount || isFullByRegion || isQueued)
    })
  }, [serversWithPreservedRegions, excludeFullGames])

  const sortedServers = React.useMemo(() => {
    if (!sortKey) return filteredServers

    return [...filteredServers].sort((a, b) => {
      let aValue = a[sortKey]
      let bValue = b[sortKey]

      // Handle numeric vs string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase()
        bValue = bValue.toLowerCase()
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredServers, sortKey, sortDirection])

  // Load saved excludeFullGames preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const savedPreference = await window.api.getExcludeFullGames()
        setExcludeFullGames(savedPreference)
        isPreferenceLoaded.current = true
      } catch (error) {
        console.error('Failed to load excludeFullGames preference:', error)
        isPreferenceLoaded.current = true
      }
    }
    loadPreference()
  }, [])

  // Save excludeFullGames preference when it changes (but not on initial load)
  useEffect(() => {
    if (!isPreferenceLoaded.current) return

    const savePreference = async () => {
      try {
        await window.api.setExcludeFullGames(excludeFullGames)
      } catch (error) {
        console.error('Failed to save excludeFullGames preference:', error)
      }
    }
    savePreference()
  }, [excludeFullGames])

  const checkRobloxStatus = useCallback(
    async (server: GameServer) => {
      if (checkingRegions[server.id]) return

      setCheckingRegions((prev) => ({ ...prev, [server.id]: true }))

      try {
        const result = await window.api.getJoinScript(server.placeId, server.id)

        if (result.status === 22) {
          setRegion(server.id, 'Queued')
        } else if (result.status === 10 || result.status === 6) {
          setRegion(server.id, 'Full')
        } else if (result.joinScript?.UdmuxEndpoints?.[0]?.Address) {
          const address = result.joinScript.UdmuxEndpoints[0].Address
          ipQueue.current.push({ id: server.id, address })
          setRegion(server.id, 'Locating...')
        } else {
          setRegion(server.id, 'Failed')
        }
      } catch (e) {
        console.error('Roblox check failed', e)
        setRegion(server.id, 'Failed')
      } finally {
        setCheckingRegions((prev) => {
          const next = { ...prev }
          delete next[server.id]
          return next
        })
      }
    },
    [setRegion, checkingRegions]
  )

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const observerRef = useRef<HTMLTableRowElement | null>(null)

  // Loop 1: Dispatch Roblox Checks (High Concurrency)
  useEffect(() => {
    const candidates = filteredServers.filter(
      (s) => s.region === 'Unknown' && !checkingRegions[s.id] && !regions[s.id] // Don't check if we already have it in store
    )

    const currentChecking = Object.keys(checkingRegions).length
    const availableSlots = 8 - currentChecking // Concurrency limit 8

    if (availableSlots > 0 && candidates.length > 0) {
      const toCheck = candidates.slice(0, availableSlots)
      toCheck.forEach((s) => checkRobloxStatus(s))
    }
  }, [filteredServers, checkingRegions, checkRobloxStatus, regions])

  // Loop 2: Process IP Queue (Batch)
  useEffect(() => {
    const interval = setInterval(async () => {
      if (ipQueue.current.length === 0) return

      // Take up to 100 items (ip-api batch limit)
      const items = ipQueue.current.splice(0, 100)
      if (items.length === 0) return

      const addresses = items.map((i) => i.address)

      try {
        const regionMap = await window.api.getRegionsBatch(addresses)

        const updates: Record<string, string> = {}
        items.forEach((item) => {
          if (regionMap[item.address]) {
            updates[item.id] = regionMap[item.address]
          } else {
            updates[item.id] = 'Failed'
          }
        })

        setRegions(updates)
      } catch (e) {
        console.error('Batch region update failed', e)
        // Mark as failed
        const updates: Record<string, string> = {}
        items.forEach((item) => {
          updates[item.id] = 'Failed'
        })
        setRegions(updates)
      }
    }, 2000)

    return () => clearInterval(interval)
  }, [setRegions])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          handleLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerRef.current) {
      observer.observe(observerRef.current)
    }

    return () => observer.disconnect()
  }, [handleLoadMore, hasNextPage, isFetchingNextPage])

  return (
    <div className="flex flex-col h-full bg-neutral-950/50 rounded-lg border border-neutral-800/50 overflow-hidden">
      <div className="shrink-0 h-12 bg-neutral-900/50 border-b border-neutral-800/50 flex items-center justify-between px-4 z-20">
        <div className="text-sm font-medium text-neutral-400">
          {sortedServers.length > 0 ? `${sortedServers.length} Servers` : 'Server List'}
        </div>

        <div className="flex items-center gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2">
                <CustomCheckbox
                  checked={excludeFullGames}
                  onChange={() => setExcludeFullGames(!excludeFullGames)}
                />
                <span
                  className="text-xs text-neutral-400 select-none cursor-pointer hover:text-neutral-300 transition-colors"
                  onClick={() => setExcludeFullGames(!excludeFullGames)}
                >
                  Exclude Full
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>Exclude servers that are full</TooltipContent>
          </Tooltip>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Error Message */}
        {error && (
          <div className="p-4">
            <ErrorMessage message={error} variant="banner" />
          </div>
        )}

        <div className="flex-1 overflow-hidden relative">
          {sortedServers.length === 0 && !isLoadingServers ? (
            <EmptyState
              icon={Server}
              title="No servers found"
              description="Try adjusting your filters or check back later."
              className="h-full"
            />
          ) : (
            <div className="h-full w-full overflow-auto scrollbar-thin">
              <table className="min-w-full table-fixed divide-y divide-neutral-800/50 text-sm">
                <thead className="bg-neutral-900/50 sticky top-0 z-10 backdrop-blur-sm">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-400 text-xs uppercase tracking-wider w-[30%]">
                      Job ID
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-400 text-xs uppercase tracking-wider w-[25%]">
                      <div
                        onClick={() => handleSort('region')}
                        className="flex items-center gap-2 cursor-pointer select-none text-neutral-400 hover:text-white transition-colors"
                      >
                        Region
                        {sortKey === 'region' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          ))}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-400 text-xs uppercase tracking-wider w-[15%]">
                      <div
                        onClick={() => handleSort('playing')}
                        className="flex items-center gap-2 cursor-pointer select-none text-neutral-400 hover:text-white transition-colors"
                      >
                        Players
                        {sortKey === 'playing' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          ))}
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left font-semibold text-neutral-400 text-xs uppercase tracking-wider w-[15%]">
                      <div
                        onClick={() => handleSort('ping')}
                        className="flex items-center gap-2 cursor-pointer select-none text-neutral-400 hover:text-white transition-colors"
                      >
                        Ping
                        {sortKey === 'ping' &&
                          (sortDirection === 'asc' ? (
                            <ArrowUp size={12} />
                          ) : (
                            <ArrowDown size={12} />
                          ))}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {sortedServers.map((server) => (
                    <tr
                      key={server.id}
                      className="group hover:bg-neutral-800/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedServerId(server.id)}
                    >
                      <td className="px-4 py-3 align-middle">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="font-mono text-xs text-neutral-500 truncate select-all">
                              {server.id}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent>{server.id}</TooltipContent>
                        </Tooltip>
                      </td>
                      <td className="px-4 py-3 text-neutral-300">
                        <div className="flex items-center gap-2">
                          {server.region === 'Unknown' ? (
                            <>
                              {server.playing >= server.maxPlayers ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    checkRobloxStatus(server)
                                  }}
                                  disabled={checkingRegions[server.id]}
                                  className="pressable px-2 py-1 bg-neutral-800 hover:bg-neutral-700 rounded text-xs text-neutral-400 transition-colors disabled:opacity-50 flex items-center gap-1"
                                >
                                  {checkingRegions[server.id] ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    'Check'
                                  )}
                                </button>
                              ) : (
                                <span className="text-neutral-500 text-xs flex items-center gap-1">
                                  {checkingRegions[server.id] ? (
                                    <Loader2 size={10} className="animate-spin" />
                                  ) : (
                                    '...'
                                  )}
                                </span>
                              )}
                            </>
                          ) : (
                            <RegionDisplay regionString={server.region} />
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-neutral-300">
                        {server.playing}{' '}
                        <span className="text-neutral-600 text-xs">/ {server.maxPlayers}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Wifi size={14} className={getPingColor(server.ping)} />
                          <span className={`text-xs font-medium ${getPingColor(server.ping)}`}>
                            {server.ping} ms
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {hasNextPage && (
                    <tr ref={observerRef}>
                      <td colSpan={4} className="px-6 py-4 text-center">
                        {isFetchingNextPage ? (
                          <div className="flex items-center justify-center gap-2 text-neutral-500 text-sm">
                            <Loader2 className="animate-spin" size={14} />
                            <span>Loading more servers...</span>
                          </div>
                        ) : (
                          <button
                            onClick={handleLoadMore}
                            className="pressable flex items-center gap-2 text-sm text-neutral-400 hover:text-white transition-colors opacity-70 hover:opacity-100 mx-auto"
                          >
                            <ArrowRight size={14} />
                            Load More
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={selectedServerId !== null}
        onClose={() => setSelectedServerId(null)}
        onConfirm={() => {
          if (selectedServerId) {
            onJoin(selectedServerId)
          }
        }}
        title="Join Server"
        message={`Are you sure you want to join server ${selectedServerId}?`}
        confirmText="Join"
        cancelText="Cancel"
      />
    </div>
  )
}

export default ServersList
