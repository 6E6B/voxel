import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { CatalogCategory, CatalogSubcategory } from '@shared/contracts/avatar'

interface CatalogState {
  // Search state
  appliedSearchQuery: string

  // Filter state
  selectedCategory: CatalogCategory | null
  selectedSubcategory: CatalogSubcategory | null
  sortType: string
  salesTypeFilter: string
  unavailableItems: string

  // Price filter (local input values)
  minPrice: string
  maxPrice: string
  creatorName: string

  // Applied filters (debounced/committed values)
  appliedMinPrice: number | undefined
  appliedMaxPrice: number | undefined
  appliedCreatorName: string

  // Thumbnails cache
  thumbnails: Record<number, string>
}

interface CatalogActions {
  setAppliedSearchQuery: (query: string) => void
  setSelectedCategory: (category: CatalogCategory | null) => void
  setSelectedSubcategory: (subcategory: CatalogSubcategory | null) => void
  setSortType: (sortType: string) => void
  setSalesTypeFilter: (filter: string) => void
  setUnavailableItems: (value: string) => void
  setMinPrice: (price: string) => void
  setMaxPrice: (price: string) => void
  setCreatorName: (name: string) => void
  setAppliedMinPrice: (price: number | undefined) => void
  setAppliedMaxPrice: (price: number | undefined) => void
  setAppliedCreatorName: (name: string) => void
  setThumbnail: (id: number, url: string) => void
  setThumbnails: (thumbnails: Record<number, string>) => void
  reset: () => void
  clearFilters: () => void
}

type CatalogStore = CatalogState & CatalogActions

const initialState: CatalogState = {
  appliedSearchQuery: '',
  selectedCategory: null,
  selectedSubcategory: null,
  sortType: '0',
  salesTypeFilter: '1',
  unavailableItems: 'hide',
  minPrice: '',
  maxPrice: '',
  creatorName: '',
  appliedMinPrice: undefined,
  appliedMaxPrice: undefined,
  appliedCreatorName: '',
  thumbnails: {}
}

export const useCatalogStore = create<CatalogStore>()(
  devtools(
    (set) => ({
      ...initialState,

      setAppliedSearchQuery: (appliedSearchQuery) =>
        set({ appliedSearchQuery }, false, 'setAppliedSearchQuery'),
      setSelectedCategory: (selectedCategory) =>
        set({ selectedCategory }, false, 'setSelectedCategory'),
      setSelectedSubcategory: (selectedSubcategory) =>
        set({ selectedSubcategory }, false, 'setSelectedSubcategory'),
      setSortType: (sortType) => set({ sortType }, false, 'setSortType'),
      setSalesTypeFilter: (salesTypeFilter) =>
        set({ salesTypeFilter }, false, 'setSalesTypeFilter'),
      setUnavailableItems: (unavailableItems) =>
        set({ unavailableItems }, false, 'setUnavailableItems'),
      setMinPrice: (minPrice) => set({ minPrice }, false, 'setMinPrice'),
      setMaxPrice: (maxPrice) => set({ maxPrice }, false, 'setMaxPrice'),
      setCreatorName: (creatorName) => set({ creatorName }, false, 'setCreatorName'),
      setAppliedMinPrice: (appliedMinPrice) =>
        set({ appliedMinPrice }, false, 'setAppliedMinPrice'),
      setAppliedMaxPrice: (appliedMaxPrice) =>
        set({ appliedMaxPrice }, false, 'setAppliedMaxPrice'),
      setAppliedCreatorName: (appliedCreatorName) =>
        set({ appliedCreatorName }, false, 'setAppliedCreatorName'),
      setThumbnail: (id, url) =>
        set((state) => ({ thumbnails: { ...state.thumbnails, [id]: url } }), false, 'setThumbnail'),
      setThumbnails: (thumbnails) => set({ thumbnails }, false, 'setThumbnails'),

      reset: () => set(initialState, false, 'reset'),

      clearFilters: () =>
        set(
          {
            selectedCategory: null,
            selectedSubcategory: null,
            sortType: '0',
            salesTypeFilter: '1',
            unavailableItems: 'hide',
            minPrice: '',
            maxPrice: '',
            creatorName: '',
            appliedMinPrice: undefined,
            appliedMaxPrice: undefined,
            appliedCreatorName: ''
          },
          false,
          'clearFilters'
        )
    }),
    { name: 'CatalogStore' }
  )
)

// Selectors
export const useCatalogAppliedSearchQuery = () =>
  useCatalogStore((state) => state.appliedSearchQuery)
export const useSetCatalogAppliedSearchQuery = () =>
  useCatalogStore((state) => state.setAppliedSearchQuery)
export const useCatalogSelectedCategory = () => useCatalogStore((state) => state.selectedCategory)
export const useSetCatalogSelectedCategory = () =>
  useCatalogStore((state) => state.setSelectedCategory)
export const useCatalogSelectedSubcategory = () =>
  useCatalogStore((state) => state.selectedSubcategory)
export const useSetCatalogSelectedSubcategory = () =>
  useCatalogStore((state) => state.setSelectedSubcategory)
export const useCatalogSortType = () => useCatalogStore((state) => state.sortType)
export const useSetCatalogSortType = () => useCatalogStore((state) => state.setSortType)
export const useCatalogSalesTypeFilter = () => useCatalogStore((state) => state.salesTypeFilter)
export const useSetCatalogSalesTypeFilter = () =>
  useCatalogStore((state) => state.setSalesTypeFilter)
export const useCatalogUnavailableItems = () => useCatalogStore((state) => state.unavailableItems)
export const useSetCatalogUnavailableItems = () =>
  useCatalogStore((state) => state.setUnavailableItems)
export const useCatalogMinPrice = () => useCatalogStore((state) => state.minPrice)
export const useSetCatalogMinPrice = () => useCatalogStore((state) => state.setMinPrice)
export const useCatalogMaxPrice = () => useCatalogStore((state) => state.maxPrice)
export const useSetCatalogMaxPrice = () => useCatalogStore((state) => state.setMaxPrice)
export const useCatalogCreatorName = () => useCatalogStore((state) => state.creatorName)
export const useSetCatalogCreatorName = () => useCatalogStore((state) => state.setCreatorName)
export const useCatalogAppliedMinPrice = () => useCatalogStore((state) => state.appliedMinPrice)
export const useSetCatalogAppliedMinPrice = () =>
  useCatalogStore((state) => state.setAppliedMinPrice)
export const useCatalogAppliedMaxPrice = () => useCatalogStore((state) => state.appliedMaxPrice)
export const useSetCatalogAppliedMaxPrice = () =>
  useCatalogStore((state) => state.setAppliedMaxPrice)
export const useCatalogAppliedCreatorName = () =>
  useCatalogStore((state) => state.appliedCreatorName)
export const useSetCatalogAppliedCreatorName = () =>
  useCatalogStore((state) => state.setAppliedCreatorName)
export const useCatalogThumbnails = () => useCatalogStore((state) => state.thumbnails)
export const useSetCatalogThumbnail = () => useCatalogStore((state) => state.setThumbnail)
export const useSetCatalogThumbnails = () => useCatalogStore((state) => state.setThumbnails)
export const useResetCatalogStore = () => useCatalogStore((state) => state.reset)
export const useClearCatalogFilters = () => useCatalogStore((state) => state.clearFilters)
