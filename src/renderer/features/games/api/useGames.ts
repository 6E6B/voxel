import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '@renderer/shared/query/queryKeys'
import { Game } from '@renderer/shared/types'

interface GameSort {
  token: string
  name: string
  displayName: string
}

const ONE_MINUTE = 60 * 1000

// Fetch game sorts
export function useGameSorts(sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.games.sorts(sessionId),
    queryFn: () => window.api.getGameSorts(sessionId) as Promise<GameSort[]>,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })
}

// Fetch games in a sort
export function useGamesInSort(sortId: string | null, sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.games.inSort(sortId || '', sessionId),
    queryFn: () => window.api.getGamesInSort(sortId!, sessionId) as Promise<Game[]>,
    enabled: !!sortId,
    staleTime: 2 * 60 * 1000, // keep data for 2 minutes
    gcTime: 5 * 60 * 1000, // drop from cache after 5 minutes unused
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })
}

// Search games
export function useSearchGames(query: string, sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.games.search(query, sessionId),
    queryFn: () => window.api.searchGames(query, sessionId) as Promise<Game[]>,
    enabled: query.trim().length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })
}

export function useGameDetails(universeId: number | null | undefined, enabled: boolean = true) {
  return useQuery({
    queryKey: queryKeys.games.details(universeId || 0),
    queryFn: async () => {
      if (!universeId) return null

      const games = await window.api.getGamesByUniverseIds([universeId])
      return games?.[0] ?? null
    },
    enabled: enabled && !!universeId,
    staleTime: ONE_MINUTE,
    gcTime: 5 * 60 * 1000,
    refetchInterval: ONE_MINUTE,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false
  })
}

// Fetch recently played games for the authenticated user (requires a cookie in main)
export function useRecentlyPlayedGames(sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.games.recentlyPlayed(),
    queryFn: () => window.api.getRecentlyPlayedGames(sessionId) as Promise<Game[]>,
    staleTime: 2 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })
}

// Fetch games by place IDs (for favorites)
export function useGamesByPlaceIds(placeIds: string[]) {
  return useQuery({
    queryKey: queryKeys.games.byPlaceIds(placeIds),
    queryFn: () => window.api.getGamesByPlaceIds(placeIds) as Promise<Game[]>,
    enabled: placeIds.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  })
}

// Fetch favorite game IDs
export function useFavoriteGames() {
  return useQuery<string[]>({
    queryKey: queryKeys.games.favorites(),
    queryFn: () => window.api.getFavoriteGames() as Promise<string[]>,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    refetchOnMount: false,
    refetchOnWindowFocus: false
  })
}

// Add favorite game mutation
export function useAddFavoriteGame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (placeId: string) => window.api.addFavoriteGame(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.favorites() })
    }
  })
}

// Remove favorite game mutation
export function useRemoveFavoriteGame() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (placeId: string) => window.api.removeFavoriteGame(placeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.games.favorites() })
    }
  })
}

