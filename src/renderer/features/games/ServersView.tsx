import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Server, Wifi, ArrowRight, Loader2, Globe, Users, Crown } from 'lucide-react'
import { getPingColor } from '@renderer/shared/utils/serverUtils'
import CustomCheckbox from '@renderer/shared/ui/buttons/CustomCheckbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import { useGameServers, usePrivateServers } from '@renderer/features/games/api/useServers'
import { ErrorMessage } from '@renderer/shared/ui/feedback/ErrorMessage'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { ConfirmModal } from '@renderer/shared/ui/dialogs/ConfirmModal'
import { PrivateServer } from '@renderer/shared/types'

interface ServersListProps {
  placeId: string
  onJoin: (jobId: string) => void
  onJoinPrivateServer?: (placeId: string, accessCode: string) => void
}

const ServersList = ({ placeId, onJoin, onJoinPrivateServer }: ServersListProps) => {
  const [excludeFullGames, setExcludeFullGames] = useState(false)
  const isPreferenceLoaded = useRef(false)

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [selectedPrivateServer, setSelectedPrivateServer] = useState<PrivateServer | null>(null)

  // Both queries always enabled
  const {
    data: serversData,
    isLoading: isLoadingServers,
    error: serversError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useGameServers(placeId, excludeFullGames, !!placeId)

  const {
    data: privateServersData,
    isLoading: isLoadingPrivateServers,
    error: privateServersError
  } = usePrivateServers(placeId, !!placeId)

  // Flatten pages into a single array, deduplicating by id
  const servers = useMemo(() => {
    if (!serversData?.pages) return []
    const all = serversData.pages.flatMap((page) => page.data)
    const seen = new Set<string>()
    return all.filter((s) => {
      if (seen.has(s.id)) return false
      seen.add(s.id)
      return true
    })
  }, [serversData])

  const privateServers = useMemo(() => {
    if (!privateServersData?.pages) return []
    return privateServersData.pages.flatMap((page) => page.data)
  }, [privateServersData])

  const filteredServers = useMemo(() => {
    if (!excludeFullGames) return servers
    return servers.filter((server) => server.playing < server.maxPlayers)
  }, [servers, excludeFullGames])

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

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const observerRef = useRef<HTMLDivElement | null>(null)

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

  const hasPrivateServers = privateServers.length > 0
  const showPrivateSection = hasPrivateServers || isLoadingPrivateServers

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto scrollbar-thin p-5">
        {/* Errors */}
        {serversError && (
          <div className="mb-4">
            <ErrorMessage message="Failed to load servers." variant="banner" />
          </div>
        )}
        {privateServersError && (
          <div className="mb-4">
            <ErrorMessage message="Failed to load private servers." variant="banner" />
          </div>
        )}

        <div className="space-y-5">
          {/* ─── Private Servers Section ─── */}
          {showPrivateSection && (
            <div>
              <div className="flex items-center gap-2.5 py-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-500">
                  <Crown size={14} />
                  Private Servers
                </div>
                {hasPrivateServers && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">
                    {privateServers.length}
                  </span>
                )}
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>

              <div className="mt-2 space-y-2">
                {isLoadingPrivateServers ? (
                  <div className="flex items-center justify-center gap-2 text-[var(--color-text-muted)] text-sm py-8">
                    <Loader2 className="animate-spin" size={14} />
                    <span>Loading private servers...</span>
                  </div>
                ) : (
                  privateServers.map((server) => (
                    <button
                      key={server.vipServerId}
                      onClick={() => setSelectedPrivateServer(server)}
                      className="w-full text-left rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)] transition-all group cursor-pointer px-4 py-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                            {server.name}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Crown size={10} className="text-[var(--color-text-muted)] shrink-0" />
                            <span className="text-xs text-[var(--color-text-muted)] truncate">
                              {server.owner.displayName}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-[var(--color-text-muted)]" />
                            <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
                              {server.playing}
                              <span className="text-[var(--color-text-muted)]">/{server.maxPlayers}</span>
                            </span>
                          </div>
                          <ArrowRight size={14} className="text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors" />
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}

          {/* ─── Public Servers Section ─── */}
          <div>
            <div className="flex items-center gap-2.5 py-1.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500">
                <Globe size={14} />
                Public Servers
              </div>
              {filteredServers.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 tabular-nums">
                  {filteredServers.length}{hasNextPage ? '+' : ''}
                </span>
              )}
              <div className="flex-1 h-px bg-[var(--color-border)]" />
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-2">
                    <CustomCheckbox
                      checked={excludeFullGames}
                      onChange={() => setExcludeFullGames(!excludeFullGames)}
                    />
                    <span
                      className="text-xs text-[var(--color-text-muted)] select-none cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors"
                      onClick={() => setExcludeFullGames(!excludeFullGames)}
                    >
                      Exclude Full
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Exclude servers that are full</TooltipContent>
              </Tooltip>
            </div>

            <div className="mt-2">
              {isLoadingServers && filteredServers.length === 0 ? (
                <div className="flex items-center justify-center gap-2 text-[var(--color-text-muted)] text-sm py-12">
                  <Loader2 className="animate-spin" size={14} />
                  <span>Loading servers...</span>
                </div>
              ) : filteredServers.length === 0 ? (
                <EmptyState
                  icon={Server}
                  title="No servers found"
                  description="Try adjusting your filters or check back later."
                />
              ) : (
                <div className="space-y-2">
                  {filteredServers.map((server) => (
                    <button
                      key={server.id}
                      className="w-full text-left rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)] transition-all group cursor-pointer px-4 py-3"
                      onClick={() => setSelectedServerId(server.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-mono text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] truncate transition-colors min-w-0 flex-1">
                          {server.id}
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-[var(--color-text-muted)]" />
                            <span className="text-xs text-[var(--color-text-secondary)] tabular-nums">
                              {server.playing}
                              <span className="text-[var(--color-text-muted)]">/{server.maxPlayers}</span>
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Wifi size={12} className={getPingColor(server.ping)} />
                            <span className={`text-xs font-medium tabular-nums ${getPingColor(server.ping)}`}>
                              {server.ping}ms
                            </span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}

                  {/* Load more */}
                  {hasNextPage && (
                    <div ref={observerRef} className="py-3">
                      {isFetchingNextPage ? (
                        <div className="flex items-center justify-center gap-2 text-[var(--color-text-muted)] text-sm">
                          <Loader2 className="animate-spin" size={14} />
                          <span>Loading more...</span>
                        </div>
                      ) : (
                        <button
                          onClick={handleLoadMore}
                          className="pressable flex items-center gap-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors mx-auto"
                        >
                          <ArrowRight size={12} />
                          Load More
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Public server join confirmation */}
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

      {/* Private server join confirmation */}
      <ConfirmModal
        isOpen={selectedPrivateServer !== null}
        onClose={() => setSelectedPrivateServer(null)}
        onConfirm={() => {
          if (selectedPrivateServer && onJoinPrivateServer) {
            onJoinPrivateServer(placeId, selectedPrivateServer.accessCode)
          }
          setSelectedPrivateServer(null)
        }}
        title="Join Private Server"
        message={selectedPrivateServer ? `Join "${selectedPrivateServer.name}" owned by ${selectedPrivateServer.owner.displayName}?` : ''}
        confirmText="Join"
        cancelText="Cancel"
      />
    </div>
  )
}

export default ServersList


