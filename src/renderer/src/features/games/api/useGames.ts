import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../../../../../shared/queryKeys'
import { Game } from '@renderer/types'

interface GameSort {
  token: string
  name: string
  displayName: string
}

// Fetch game sorts
export function useGameSorts(sessionId?: string) {
  return useQuery({
    queryKey: queryKeys.games.sorts(sessionId),
    queryFn: () => window.api.getGameSorts(sessionId) as Promise<GameSort[]>,
    staleTime: 5 * 60 * 1000 // Sorts don't change often
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
  return useQuery({
    queryKey: queryKeys.games.favorites(),
    queryFn: () => window.api.getFavoriteGames(),
    staleTime: 60 * 1000 // 1 minute
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
