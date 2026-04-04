import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'

// ============================================================================
// View Preferences Store
// ============================================================================

export type ViewMode = 'default' | 'compact'

interface ViewPreferencesState {
  // Catalog view mode
  catalogViewMode: ViewMode
  // Inventory view mode
  inventoryViewMode: ViewMode
}

interface ViewPreferencesActions {
  setCatalogViewMode: (mode: ViewMode) => void
  setInventoryViewMode: (mode: ViewMode) => void
  resetViewPreferences: () => void
}

type ViewPreferencesStore = ViewPreferencesState & ViewPreferencesActions

const initialState: ViewPreferencesState = {
  catalogViewMode: 'default',
  inventoryViewMode: 'default'
}

export const useViewPreferencesStore = create<ViewPreferencesStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setCatalogViewMode: (catalogViewMode) =>
          set({ catalogViewMode }, false, 'setCatalogViewMode'),

        setInventoryViewMode: (inventoryViewMode) =>
          set({ inventoryViewMode }, false, 'setInventoryViewMode'),

        resetViewPreferences: () => set(initialState, false, 'resetViewPreferences')
      }),
      {
        name: 'view-preferences-storage',
        // Persist all view preferences
        partialize: (state) => ({
          catalogViewMode: state.catalogViewMode,
          inventoryViewMode: state.inventoryViewMode
        })
      }
    ),
    { name: 'ViewPreferencesStore' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const useCatalogViewMode = () => useViewPreferencesStore((state) => state.catalogViewMode)
export const useSetCatalogViewMode = () =>
  useViewPreferencesStore((state) => state.setCatalogViewMode)

export const useInventoryViewMode = () =>
  useViewPreferencesStore((state) => state.inventoryViewMode)
export const useSetInventoryViewMode = () =>
  useViewPreferencesStore((state) => state.setInventoryViewMode)

export const useResetViewPreferences = () =>
  useViewPreferencesStore((state) => state.resetViewPreferences)
