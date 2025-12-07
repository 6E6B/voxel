import { useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'
import { GameServer } from '@renderer/types'

interface GameServersResponse {
  data: GameServer[]
  nextPageCursor: string | null
}

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
          region: 'Unknown' // API doesn't provide region
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
    refetchInterval: 5000, // Auto-refresh every 5 seconds
    staleTime: 4000, // Slightly less than refetch interval
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
