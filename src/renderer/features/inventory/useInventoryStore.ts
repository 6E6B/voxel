import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type {
  InventoryCategory,
  InventorySubcategory
} from '@renderer/features/inventory/inventoryCategories'

interface InventoryState {
  // Filter state
  selectedCategory: InventoryCategory | null
  selectedSubcategory: InventorySubcategory | null
  sortOrder: 'Asc' | 'Desc'
  searchQuery: string

  // Thumbnails cache - shared across all inventory views
  thumbnails: Record<number, string>
  // Track which IDs we've attempted to fetch (to avoid re-fetching failures)
  fetchedIds: Set<number>
}

interface InventoryActions {
  setSelectedCategory: (category: InventoryCategory | null) => void
  setSelectedSubcategory: (subcategory: InventorySubcategory | null) => void
  setSortOrder: (sortOrder: 'Asc' | 'Desc') => void
  setSearchQuery: (query: string) => void
  setThumbnail: (id: number, url: string) => void
  setThumbnails: (thumbnails: Record<number, string>) => void
  markAsFetched: (ids: number[]) => void
  isFetched: (id: number) => boolean
  reset: () => void
  clearFilters: () => void
}

type InventoryStore = InventoryState & InventoryActions

const initialState: InventoryState = {
  selectedCategory: null,
  selectedSubcategory: null,
  sortOrder: 'Desc',
  searchQuery: '',
  thumbnails: {},
  fetchedIds: new Set()
}

export const useInventoryStore = create<InventoryStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      setSelectedCategory: (selectedCategory) =>
        set({ selectedCategory }, false, 'setSelectedCategory'),

      setSelectedSubcategory: (selectedSubcategory) =>
        set({ selectedSubcategory }, false, 'setSelectedSubcategory'),

      setSortOrder: (sortOrder) => set({ sortOrder }, false, 'setSortOrder'),

      setSearchQuery: (searchQuery) => set({ searchQuery }, false, 'setSearchQuery'),

      setThumbnail: (id, url) =>
        set((state) => ({ thumbnails: { ...state.thumbnails, [id]: url } }), false, 'setThumbnail'),

      setThumbnails: (newThumbnails) =>
        set(
          (state) => ({ thumbnails: { ...state.thumbnails, ...newThumbnails } }),
          false,
          'setThumbnails'
        ),

      markAsFetched: (ids) =>
        set(
          (state) => {
            const newFetchedIds = new Set(state.fetchedIds)
            ids.forEach((id) => newFetchedIds.add(id))
            return { fetchedIds: newFetchedIds }
          },
          false,
          'markAsFetched'
        ),

      isFetched: (id) => get().fetchedIds.has(id),

      reset: () => set({ ...initialState, fetchedIds: new Set() }, false, 'reset'),

      clearFilters: () =>
        set(
          {
            selectedCategory: null,
            selectedSubcategory: null,
            sortOrder: 'Desc',
            searchQuery: ''
          },
          false,
          'clearFilters'
        )
    }),
    { name: 'InventoryStore' }
  )
)

// Selectors
export const useInventorySelectedCategory = () =>
  useInventoryStore((state) => state.selectedCategory)
export const useSetInventorySelectedCategory = () =>
  useInventoryStore((state) => state.setSelectedCategory)
export const useInventorySelectedSubcategory = () =>
  useInventoryStore((state) => state.selectedSubcategory)
export const useSetInventorySelectedSubcategory = () =>
  useInventoryStore((state) => state.setSelectedSubcategory)
export const useInventorySortOrder = () => useInventoryStore((state) => state.sortOrder)
export const useSetInventorySortOrder = () => useInventoryStore((state) => state.setSortOrder)
export const useInventorySearchQuery = () => useInventoryStore((state) => state.searchQuery)
export const useSetInventorySearchQuery = () => useInventoryStore((state) => state.setSearchQuery)
export const useInventoryThumbnails = () => useInventoryStore((state) => state.thumbnails)
export const useSetInventoryThumbnails = () => useInventoryStore((state) => state.setThumbnails)
export const useMarkInventoryAsFetched = () => useInventoryStore((state) => state.markAsFetched)
export const useInventoryIsFetched = () => useInventoryStore((state) => state.isFetched)
export const useResetInventoryStore = () => useInventoryStore((state) => state.reset)
export const useClearInventoryFilters = () => useInventoryStore((state) => state.clearFilters)
