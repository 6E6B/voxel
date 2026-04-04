import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

interface SelectionState {
  selectedIds: Set<string>
}

interface SelectionActions {
  setSelectedIds: (ids: Set<string>) => void
  toggleSelection: (id: string) => void
  clearSelection: () => void
  selectAll: (ids: string[]) => void
  addToSelection: (id: string) => void
  removeFromSelection: (id: string) => void
}

type SelectionStore = SelectionState & SelectionActions

export const useSelectionStore = create<SelectionStore>()(
  devtools(
    (set) => ({
      selectedIds: new Set(),

      setSelectedIds: (selectedIds) => set({ selectedIds }, false, 'setSelectedIds'),

      toggleSelection: (id) =>
        set(
          (state) => {
            const newSet = new Set(state.selectedIds)
            if (newSet.has(id)) {
              newSet.delete(id)
            } else {
              newSet.add(id)
            }
            return { selectedIds: newSet }
          },
          false,
          'toggleSelection'
        ),

      clearSelection: () => set({ selectedIds: new Set() }, false, 'clearSelection'),

      selectAll: (ids) => set({ selectedIds: new Set(ids) }, false, 'selectAll'),

      addToSelection: (id) =>
        set(
          (state) => {
            const newSet = new Set(state.selectedIds)
            newSet.add(id)
            return { selectedIds: newSet }
          },
          false,
          'addToSelection'
        ),

      removeFromSelection: (id) =>
        set(
          (state) => {
            const newSet = new Set(state.selectedIds)
            newSet.delete(id)
            return { selectedIds: newSet }
          },
          false,
          'removeFromSelection'
        )
    }),
    { name: 'SelectionStore' }
  )
)

// Selectors
export const useSelectedIds = () => useSelectionStore((state) => state.selectedIds)
export const useSetSelectedIds = () => useSelectionStore((state) => state.setSelectedIds)
export const useToggleSelection = () => useSelectionStore((state) => state.toggleSelection)
export const useClearSelection = () => useSelectionStore((state) => state.clearSelection)
export const useSelectAll = () => useSelectionStore((state) => state.selectAll)
