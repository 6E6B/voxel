import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface AvatarState {
  // Navigation State
  mainCategory: string
  subCategory: string
  searchQuery: string
  scrollPosition: number
}

interface AvatarActions {
  setMainCategory: (category: string) => void
  setSubCategory: (subCategory: string) => void
  setSearchQuery: (query: string) => void
  setScrollPosition: (position: number) => void
  reset: () => void
}

type AvatarStore = AvatarState & AvatarActions

const initialState: AvatarState = {
  mainCategory: 'Accessories',
  subCategory: 'All',
  searchQuery: '',
  scrollPosition: 0
}

export const useAvatarStore = create<AvatarStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setMainCategory: (mainCategory) => set({ mainCategory }, false, 'setMainCategory'),
      setSubCategory: (subCategory) => set({ subCategory }, false, 'setSubCategory'),
      setSearchQuery: (searchQuery) => set({ searchQuery }, false, 'setSearchQuery'),
      setScrollPosition: (scrollPosition) => set({ scrollPosition }, false, 'setScrollPosition'),

      reset: () => set(initialState, false, 'reset')
    }),
    { name: 'AvatarStore' }
  )
)

// Selectors
export const useAvatarMainCategory = () => useAvatarStore((state) => state.mainCategory)
export const useSetAvatarMainCategory = () => useAvatarStore((state) => state.setMainCategory)
export const useAvatarSubCategory = () => useAvatarStore((state) => state.subCategory)
export const useSetAvatarSubCategory = () => useAvatarStore((state) => state.setSubCategory)
export const useAvatarSearchQuery = () => useAvatarStore((state) => state.searchQuery)
export const useSetAvatarSearchQuery = () => useAvatarStore((state) => state.setSearchQuery)
export const useAvatarScrollPosition = () => useAvatarStore((state) => state.scrollPosition)
export const useSetAvatarScrollPosition = () => useAvatarStore((state) => state.setScrollPosition)
export const useResetAvatarStore = () => useAvatarStore((state) => state.reset)
