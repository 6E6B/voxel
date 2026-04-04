import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

interface FriendsState {
  // Filter State
  searchQuery: string
  scrollPosition: number
  favorites: string[]
}

interface FriendsActions {
  setSearchQuery: (query: string) => void
  setScrollPosition: (position: number) => void
  toggleFavorite: (userId: string) => void
  reset: () => void
}

type FriendsStore = FriendsState & FriendsActions

const initialState: FriendsState = {
  searchQuery: '',
  scrollPosition: 0,
  favorites: []
}

export const useFriendsStore = create<FriendsStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setSearchQuery: (searchQuery) => set({ searchQuery }, false, 'setSearchQuery'),
        setScrollPosition: (scrollPosition) => set({ scrollPosition }, false, 'setScrollPosition'),
        toggleFavorite: (userId) =>
          set(
            (state) => ({
              favorites: state.favorites.includes(userId)
                ? state.favorites.filter((id) => id !== userId)
                : [...state.favorites, userId]
            }),
            false,
            'toggleFavorite'
          ),

        reset: () => set(initialState, false, 'reset')
      }),
      {
        name: 'friends-storage',
        partialize: (state) => ({ favorites: state.favorites }) // Only persist favorites
      }
    ),
    { name: 'FriendsStore' }
  )
)

// Selectors
export const useFriendsSearchQuery = () => useFriendsStore((state) => state.searchQuery)
export const useSetFriendsSearchQuery = () => useFriendsStore((state) => state.setSearchQuery)
export const useFriendsScrollPosition = () => useFriendsStore((state) => state.scrollPosition)
export const useSetFriendsScrollPosition = () => useFriendsStore((state) => state.setScrollPosition)
export const useFavoriteFriends = () => useFriendsStore((state) => state.favorites)
export const useToggleFavoriteFriend = () => useFriendsStore((state) => state.toggleFavorite)
export const useResetFriendsStore = () => useFriendsStore((state) => state.reset)
