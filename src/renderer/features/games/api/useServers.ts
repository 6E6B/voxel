import { useCallback, useEffect, useMemo, useState } from 'react'
import { useInfiniteQuery, useQueries, useQuery, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import { GameServer, PrivateServer, RecentServerJoin } from '@renderer/shared/types'

interface GameServersResponse {
  data: GameServer[]
  nextPageCursor: string | null
}

const ONE_MINUTE = 60 * 1000
const PLAYER_THUMBNAIL_BATCH_SIZE = 100
const MAX_PLAYER_THUMBNAILS_PER_SERVER = 5

// Fetch game servers with infinite query for pagination
export function useGameServers(
  placeId: string,
  excludeFullGames: boolean,
  enabled: boolean = true
) {
  return useInfiniteQuery({
    queryKey: queryKeys.servers.list(placeId, excludeFullGames),
    queryFn: async ({ pageParam }): Promise<GameServersResponse> => {
      const result = await window.api.getGameServers(
        placeId,
        pageParam as string | undefined,
        10,
        'Desc',
        excludeFullGames
      )

      if (result && result.data) {
        const mappedServers: GameServer[] = result.data.map((s: any) => ({
          id: s.id,
          placeId: placeId,
          playing: s.playing,
          maxPlayers: s.maxPlayers,
          ping: s.ping,
          fps: s.fps,
          playerTokens: s.playerTokens || []
        }))

        return {
          data: mappedServers,
          nextPageCursor: result.nextPageCursor || null
        }
      }

      return { data: [], nextPageCursor: null }
    },
    getNextPageParam: (lastPage) => lastPage.nextPageCursor,
    enabled: enabled && !!placeId.trim(),
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
    staleTime: ONE_MINUTE,
    refetchInterval: ONE_MINUTE,
    initialPageParam: undefined as string | undefined
  })
}

// Fetch game name by place ID
export function useGameName(placeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.servers.gameName(placeId),
    queryFn: async () => {
      const games = await window.api.getGamesByPlaceIds([placeId])
      if (games && games.length > 0 && games[0].name) {
        return games[0].name
      }
      return null
    },
    enabled: enabled && !!placeId.trim(),
    staleTime: 5 * 60 * 1000 // 5 minutes (game names don't change often)
  })
}

export function useRecentServerJoins(placeId: string, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.servers.recent(placeId),
    queryFn: () => window.api.getRecentServerJoins(placeId) as Promise<RecentServerJoin[]>,
    enabled: enabled && !!placeId.trim(),
    staleTime: ONE_MINUTE,
    refetchInterval: ONE_MINUTE,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}

export function useServerQueuePositions(
  placeId: string
) {
  const queryClient = useQueryClient()
  const [queuePositionsByServerId, setQueuePositionsByServerId] = useState<Record<string, number>>({})
  const [loadingServerIds, setLoadingServerIds] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setQueuePositionsByServerId({})
    setLoadingServerIds({})
  }, [placeId])

  const refreshServerQueuePosition = useCallback(
    async (serverId: string) => {
      if (!placeId.trim()) return null

      setLoadingServerIds((current) => ({
        ...current,
        [serverId]: true
      }))

      try {
        const queuePosition = await queryClient.fetchQuery({
          queryKey: queryKeys.servers.queuePosition(placeId, serverId),
          queryFn: () => window.api.getServerQueuePosition(placeId, serverId) as Promise<number | null>,
          staleTime: 0
        })

        setQueuePositionsByServerId((current) => {
          const next = { ...current }

          if (typeof queuePosition === 'number' && queuePosition > 0) {
            next[serverId] = queuePosition
          } else {
            delete next[serverId]
          }

          return next
        })

        return queuePosition
      } finally {
        setLoadingServerIds((current) => {
          const next = { ...current }
          delete next[serverId]
          return next
        })
      }
    },
    [placeId, queryClient]
  )

  return {
    queuePositionsByServerId,
    loadingServerIds,
    refreshServerQueuePosition
  }
}

// Private servers response
interface PrivateServersResponse {
  data: PrivateServer[]
  nextPageCursor: string | null
}

// Fetch private servers with infinite query for pagination
export function usePrivateServers(placeId: string, enabled: boolean = true) {
  return useInfiniteQuery({
    queryKey: queryKeys.servers.privateList(placeId),
    queryFn: async ({ pageParam }): Promise<PrivateServersResponse> => {
      try {
        const result = await window.api.getPrivateServers(
          placeId,
          pageParam as string | undefined,
          100,
          'Desc'
        )

        if (result && result.data) {
          const mappedServers: PrivateServer[] = result.data.map((s: any) => ({
            vipServerId: s.vipServerId,
            accessCode: s.accessCode,
            name: s.name,
            playing: s.playing,
            maxPlayers: s.maxPlayers,
            ping: s.ping,
            fps: s.fps,
            owner: {
              id: s.owner.id,
              name: s.owner.name,
              displayName: s.owner.displayName,
              hasVerifiedBadge: s.owner.hasVerifiedBadge
            }
          }))

          console.info('[usePrivateServers] Loaded private servers', {
            placeId,
            cursor: pageParam ?? null,
            count: mappedServers.length,
            nextPageCursor: result.nextPageCursor || null
          })

          return {
            data: mappedServers,
            nextPageCursor: result.nextPageCursor || null
          }
        }

        console.warn('[usePrivateServers] Empty private server response', {
          placeId,
          cursor: pageParam ?? null,
          result
        })

        return { data: [], nextPageCursor: null }
      } catch (error) {
        console.error('[usePrivateServers] Failed to load private servers', {
          placeId,
          cursor: pageParam ?? null,
          error
        })
        throw error
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextPageCursor,
    enabled: enabled && !!placeId.trim(),
    staleTime: ONE_MINUTE,
    refetchInterval: ONE_MINUTE,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    initialPageParam: undefined as string | undefined
  })
}

/**
 * Fetch avatar headshot thumbnails for all player tokens across servers.
 * Returns a Record<token, imageUrl>.
 */
export function useServerPlayerThumbnails(servers: GameServer[]) {
  const playerTokens = useMemo(() => {
    const seen = new Set<string>()
    const tokens: string[] = []

    for (const server of servers) {
      for (const token of server.playerTokens.slice(0, MAX_PLAYER_THUMBNAILS_PER_SERVER)) {
        if (seen.has(token)) {
          continue
        }

        seen.add(token)
        tokens.push(token)
      }
    }

    return tokens
  }, [servers])

  const playerTokenChunks = useMemo(() => {
    const chunks: string[][] = []

    for (let i = 0; i < playerTokens.length; i += PLAYER_THUMBNAIL_BATCH_SIZE) {
      chunks.push(playerTokens.slice(i, i + PLAYER_THUMBNAIL_BATCH_SIZE))
    }

    return chunks
  }, [playerTokens])

  const thumbnailQueries = useQueries({
    queries: playerTokenChunks.map((chunk) => ({
      queryKey: queryKeys.servers.playerThumbnails(servers[0]?.placeId ?? '', chunk),
      queryFn: async (): Promise<Record<string, string>> => {
        const results = await window.api.getPlayerThumbnailsByTokens(chunk) as {
          token: string
          imageUrl: string | null
        }[]
        const map: Record<string, string> = {}

        for (const entry of results) {
          if (entry.imageUrl) {
            map[entry.token] = entry.imageUrl
          }
        }

        return map
      },
      enabled: chunk.length > 0,
      staleTime: ONE_MINUTE,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false
    }))
  })

  const data = useMemo(() => {
    const map: Record<string, string> = {}

    for (const query of thumbnailQueries) {
      if (!query.data) {
        continue
      }

      Object.assign(map, query.data)
    }

    return map
  }, [thumbnailQueries])

  return {
    data,
    isLoading: thumbnailQueries.some((query) => query.isLoading),
    isFetching: thumbnailQueries.some((query) => query.isFetching)
  }
}