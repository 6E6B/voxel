import { useState, useRef, useEffect, useCallback, useMemo, type MouseEvent } from 'react'
import { Server, Wifi, ArrowRight, Loader2, Globe, Users, Crown, RefreshCw, History, Copy } from 'lucide-react'
import { getPingColor } from '@renderer/shared/utils/serverUtils'
import CustomCheckbox from '@renderer/shared/ui/buttons/CustomCheckbox'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import GenericContextMenu, { type ContextMenuSection } from '@renderer/shared/ui/menus/GenericContextMenu'
import {
  createAnchoredOverlayPosition,
  type AnchoredOverlayPosition
} from '@renderer/shared/ui/menus/anchoredPosition'
import {
  useGameServers,
  usePrivateServers,
  useRecentServerJoins,
  useServerQueuePositions,
  useServerPlayerThumbnails
} from '@renderer/features/games/api/useServers'
import { ErrorMessage } from '@renderer/shared/ui/feedback/ErrorMessage'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { ConfirmModal } from '@renderer/shared/ui/dialogs/ConfirmModal'
import { PrivateServer, RecentServerJoin } from '@renderer/shared/types'

const relativeTimeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

function formatRecentJoinTime(joinedAt: number) {
  const diffMs = joinedAt - Date.now()
  const diffMinutes = Math.round(diffMs / 60000)

  if (Math.abs(diffMinutes) < 60) {
    return relativeTimeFormatter.format(diffMinutes, 'minute')
  }

  const diffHours = Math.round(diffMs / 3600000)
  if (Math.abs(diffHours) < 24) {
    return relativeTimeFormatter.format(diffHours, 'hour')
  }

  const diffDays = Math.round(diffMs / 86400000)
  if (Math.abs(diffDays) < 30) {
    return relativeTimeFormatter.format(diffDays, 'day')
  }

  return new Date(joinedAt).toLocaleString()
}

interface ServersListProps {
  placeId: string
  onJoin: (jobId: string) => void
  onJoinPrivateServer?: (placeId: string, accessCode: string) => void
}

type ServerContextMenuState = {
  serverId: string
} & AnchoredOverlayPosition

const ServersList = ({ placeId, onJoin, onJoinPrivateServer }: ServersListProps) => {
  const [excludeFullGames, setExcludeFullGames] = useState(false)
  const isPreferenceLoaded = useRef(false)
  const hasFetchedInitialQueuePositions = useRef(false)

  const [selectedServerId, setSelectedServerId] = useState<string | null>(null)
  const [selectedPrivateServer, setSelectedPrivateServer] = useState<PrivateServer | null>(null)
  const [selectedRecentServer, setSelectedRecentServer] = useState<RecentServerJoin | null>(null)
  const [serverContextMenu, setServerContextMenu] = useState<ServerContextMenuState | null>(null)

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

  const {
    data: recentServerJoins = [],
    isLoading: isLoadingRecentServerJoins
  } = useRecentServerJoins(placeId, !!placeId)

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

  const recentServers = useMemo(
    () =>
      recentServerJoins.filter(
        (server) => server.serverType === 'public' || typeof onJoinPrivateServer === 'function'
      ),
    [onJoinPrivateServer, recentServerJoins]
  )

  const { queuePositionsByServerId, loadingServerIds, refreshServerQueuePosition } = useServerQueuePositions(placeId)

  const { data: playerThumbnails = {} } = useServerPlayerThumbnails(filteredServers)

  // Load saved excludeFullGames preference on mount
  useEffect(() => {
    const loadPreference = async () => {
      try {
        const savedPreference = await window.api.getExcludeFullGames()
        setExcludeFullGames(Boolean(savedPreference))
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

  useEffect(() => {
    hasFetchedInitialQueuePositions.current = false
  }, [placeId])

  useEffect(() => {
    if (hasFetchedInitialQueuePositions.current || isLoadingServers) {
      return
    }

    hasFetchedInitialQueuePositions.current = true

    const fullServerIds = servers.filter((server) => server.playing >= server.maxPlayers).map((server) => server.id)

    if (fullServerIds.length === 0) {
      return
    }

    void Promise.allSettled(fullServerIds.map((serverId) => refreshServerQueuePosition(serverId)))
  }, [isLoadingServers, refreshServerQueuePosition, servers])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleServerContextMenu = useCallback((event: MouseEvent<HTMLElement>, serverId: string) => {
    event.preventDefault()
    setServerContextMenu({
      serverId,
      ...createAnchoredOverlayPosition(event)
    })
  }, [])

  const handleCopyJobId = useCallback(async () => {
    if (!serverContextMenu) {
      return
    }

    try {
      await navigator.clipboard.writeText(serverContextMenu.serverId)
    } catch (error) {
      console.error('Failed to copy job ID:', error)
    } finally {
      setServerContextMenu(null)
    }
  }, [serverContextMenu])

  const serverContextMenuSections = useMemo<ContextMenuSection[]>(
    () =>
      serverContextMenu
        ? [
          {
            items: [
              {
                label: 'Copy Job ID',
                icon: <Copy size={16} />,
                onClick: () => {
                  void handleCopyJobId()
                }
              }
            ]
          }
        ]
        : [],
    [handleCopyJobId, serverContextMenu]
  )

  const hasPrivateServers = privateServers.length > 0
  const hasRecentServers = recentServers.length > 0
  const showPrivateSection = hasPrivateServers || isLoadingPrivateServers
  const showRecentSection = hasRecentServers || isLoadingRecentServerJoins

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
          {showRecentSection && (
            <div>
              <div className="flex items-center gap-2.5 py-1.5">
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-400">
                  <History size={14} />
                  Recent
                </div>
                {hasRecentServers && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-300">
                    {recentServers.length}
                  </span>
                )}
                <div className="flex-1 h-px bg-[var(--color-border)]" />
              </div>

              <div className="mt-2 space-y-2">
                {isLoadingRecentServerJoins ? (
                  <div className="flex items-center justify-center gap-2 text-[var(--color-text-muted)] text-sm py-8">
                    <Loader2 className="animate-spin" size={14} />
                    <span>Loading recent servers...</span>
                  </div>
                ) : (
                  recentServers.map((server) => (
                    <div
                      key={`${server.serverType}:${server.serverId}`}
                      role="button"
                      tabIndex={0}
                      className="w-full text-left rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)] transition-all group cursor-pointer px-4 py-3"
                      onClick={() => setSelectedRecentServer(server)}
                      onContextMenu={
                        server.serverType === 'public'
                          ? (event) => handleServerContextMenu(event, server.serverId)
                          : undefined
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedRecentServer(server)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] truncate transition-colors">
                            {server.serverType === 'private' ? 'Private server' : server.serverId}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="flex items-center gap-1.5">
                            <History size={12} className="text-[var(--color-text-muted)]" />
                            <span className="text-xs text-[var(--color-text-secondary)] tabular-nums" title={new Date(server.joinedAt).toLocaleString()}>
                              {formatRecentJoinTime(server.joinedAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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
                      className="w-full text-left rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)] transition-all group cursor-pointer px-4 py-3"
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
                    <div
                      key={server.id}
                      role="button"
                      tabIndex={0}
                      className="w-full text-left rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-muted)] transition-all group cursor-pointer px-4 py-3"
                      onClick={() => setSelectedServerId(server.id)}
                      onContextMenu={(event) => handleServerContextMenu(event, server.id)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          setSelectedServerId(server.id)
                        }
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          {server.playerTokens && server.playerTokens.length > 0 && (
                            <div className="flex items-center gap-1 mb-2 flex-wrap">
                              {server.playerTokens.slice(0, 5).map((token, idx) => {
                                const url = playerThumbnails[token]
                                return url ? (
                                  <img
                                    key={idx}
                                    src={url}
                                    alt=""
                                    className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] shrink-0"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div
                                    key={idx}
                                    className="w-8 h-8 rounded-full bg-[var(--color-surface-hover)] shrink-0"
                                  />
                                )
                              })}
                              {server.playerTokens.length > 5 && (
                                <span className="text-[10px] text-[var(--color-text-muted)] ml-1">
                                  +{server.playerTokens.length - 5}
                                </span>
                              )}
                            </div>
                          )}
                          <div className="font-mono text-xs text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] truncate transition-colors">
                            {server.id}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <div className="flex items-center gap-1.5">
                            <Users size={12} className="text-[var(--color-text-muted)]" />
                            <div className="inline-flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] tabular-nums">
                              <span>
                                {server.playing}
                                <span className="text-[var(--color-text-muted)]">/{server.maxPlayers}</span>
                              </span>
                              {server.playing >= server.maxPlayers ? (
                                <button
                                  type="button"
                                  aria-label="Refresh queue position"
                                  title="Refresh queue position"
                                  className="inline-flex h-4 w-4 items-center justify-center rounded text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    void refreshServerQueuePosition(server.id)
                                  }}
                                >
                                  {loadingServerIds[server.id] ? (
                                    <Loader2 size={11} className="animate-spin" />
                                  ) : (
                                    <RefreshCw size={11} />
                                  )}
                                </button>
                              ) : null}
                              {queuePositionsByServerId[server.id] ? (
                                <span className="text-amber-400">+{queuePositionsByServerId[server.id]}</span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Wifi size={12} className={getPingColor(server.ping)} />
                            <span className={`text-xs font-medium tabular-nums ${getPingColor(server.ping)}`}>
                              {server.ping}ms
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Load more */}
                  {hasNextPage && (
                    <div className="py-3">
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
      <GenericContextMenu
        position={serverContextMenu}
        sections={serverContextMenuSections}
        onClose={() => setServerContextMenu(null)}
        width={200}
      />

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

      <ConfirmModal
        isOpen={selectedRecentServer !== null}
        onClose={() => setSelectedRecentServer(null)}
        onConfirm={() => {
          if (!selectedRecentServer) {
            return
          }

          if (selectedRecentServer.serverType === 'private') {
            onJoinPrivateServer?.(placeId, selectedRecentServer.serverId)
          } else {
            onJoin(selectedRecentServer.serverId)
          }

          setSelectedRecentServer(null)
        }}
        title={selectedRecentServer?.serverType === 'private' ? 'Join Recent Private Server' : 'Join Recent Server'}
        message={
          selectedRecentServer
            ? selectedRecentServer.serverType === 'private'
              ? `Rejoin the private server you joined ${formatRecentJoinTime(selectedRecentServer.joinedAt)}?`
              : `Rejoin server ${selectedRecentServer.serverId} from ${formatRecentJoinTime(selectedRecentServer.joinedAt)}?`
            : ''
        }
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


