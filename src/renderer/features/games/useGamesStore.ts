import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface GamesState {
  // Search state
  searchQuery: string

  // Filter state
  selectedSortId: string | null
  showFavorites: boolean
}

interface GamesActions {
  setSearchQuery: (query: string) => void
  setSelectedSortId: (sortId: string | null) => void
  setShowFavorites: (show: boolean) => void
  toggleShowFavorites: () => void
  reset: () => void
  clearFilters: () => void
}

type GamesStore = GamesState & GamesActions

const initialState: GamesState = {
  searchQuery: '',
  selectedSortId: null,
  showFavorites: false
}

export const useGamesStore = create<GamesStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setSearchQuery: (searchQuery) => set({ searchQuery }, false, 'setSearchQuery'),
        setSelectedSortId: (selectedSortId) => set({ selectedSortId }, false, 'setSelectedSortId'),
        setShowFavorites: (showFavorites) => set({ showFavorites }, false, 'setShowFavorites'),
        toggleShowFavorites: () =>
          set((state) => ({ showFavorites: !state.showFavorites }), false, 'toggleShowFavorites'),
        reset: () => set(initialState, false, 'reset'),
        clearFilters: () =>
          set(
            {
              searchQuery: '',
              selectedSortId: null
            },
            false,
            'clearFilters'
          )
      }),
      {
        name: 'games-storage',
        // Persist filter/search state so it survives navigation
        partialize: (state) => ({
          searchQuery: state.searchQuery,
          selectedSortId: state.selectedSortId,
          showFavorites: state.showFavorites
        })
      }
    ),
    { name: 'GamesStore' }
  )
)

// Selectors - use these to prevent unnecessary re-renders
export const useGamesSearchQuery = () => useGamesStore((state) => state.searchQuery)
export const useSetGamesSearchQuery = () => useGamesStore((state) => state.setSearchQuery)

export const useGamesSelectedSortId = () => useGamesStore((state) => state.selectedSortId)
export const useSetGamesSelectedSortId = () => useGamesStore((state) => state.setSelectedSortId)

export const useGamesShowFavorites = () => useGamesStore((state) => state.showFavorites)
export const useSetGamesShowFavorites = () => useGamesStore((state) => state.setShowFavorites)
export const useToggleGamesShowFavorites = () => useGamesStore((state) => state.toggleShowFavorites)

export const useResetGamesStore = () => useGamesStore((state) => state.reset)
export const useClearGamesFilters = () => useGamesStore((state) => state.clearFilters)
