import { create } from 'zustand'
import { devtools, persist, createJSONStorage, StateStorage } from 'zustand/middleware'
import { RobloxInstallation, BinaryType } from '@renderer/types'
import { robloxInstallationsSchema } from '@shared/ipc-schemas/system'

// ============================================================================
// Types
// ============================================================================

interface InstallationsState {
  installations: RobloxInstallation[]
  selectedId: string | 'new'
  deployHistory: Record<string, string[]>
}

interface InstallationsActions {
  // Installations CRUD
  addInstallation: (installation: RobloxInstallation) => void
  updateInstallation: (id: string, updates: Partial<RobloxInstallation>) => void
  removeInstallation: (id: string) => void
  setInstallations: (installations: RobloxInstallation[]) => void

  // Selection
  setSelectedId: (id: string | 'new') => void

  // Deploy History
  setDeployHistory: (history: Record<string, string[]>) => void
}

type InstallationsStore = InstallationsState & InstallationsActions

// ============================================================================
// Initial State
// ============================================================================

const initialState: InstallationsState = {
  installations: [],
  selectedId: 'new',
  deployHistory: {}
}

// ============================================================================
// Custom Storage with Zod Validation
// ============================================================================

const validatedStorage: StateStorage = {
  getItem: (name) => {
    const str = localStorage.getItem(name)
    if (!str) return null

    try {
      const parsed = JSON.parse(str)
      // Validate installations array with Zod
      if (parsed.state?.installations) {
        const result = robloxInstallationsSchema.safeParse(parsed.state.installations)
        if (!result.success) {
          console.error('[InstallationsStore] Validation failed:', result.error)
          // Return with empty installations if validation fails
          return JSON.stringify({
            ...parsed,
            state: { ...parsed.state, installations: [] }
          })
        }
        // Use validated data
        parsed.state.installations = result.data
      }
      return JSON.stringify(parsed)
    } catch (e) {
      console.error('[InstallationsStore] Failed to parse storage:', e)
      return null
    }
  },
  setItem: (name, value) => {
    localStorage.setItem(name, value)
  },
  removeItem: (name) => {
    localStorage.removeItem(name)
  }
}

// ============================================================================
// Store
// ============================================================================

export const useInstallationsStore = create<InstallationsStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        // Installations CRUD
        addInstallation: (installation) =>
          set(
            (state) => ({
              installations: [...state.installations, installation],
              selectedId: installation.id
            }),
            false,
            'addInstallation'
          ),

        updateInstallation: (id, updates) =>
          set(
            (state) => ({
              installations: state.installations.map((inst) =>
                inst.id === id ? { ...inst, ...updates } : inst
              )
            }),
            false,
            'updateInstallation'
          ),

        removeInstallation: (id) =>
          set(
            (state) => ({
              installations: state.installations.filter((inst) => inst.id !== id),
              selectedId: state.selectedId === id ? 'new' : state.selectedId
            }),
            false,
            'removeInstallation'
          ),

        setInstallations: (installations) => set({ installations }, false, 'setInstallations'),

        // Selection
        setSelectedId: (selectedId) => set({ selectedId }, false, 'setSelectedId'),

        // Deploy History
        setDeployHistory: (deployHistory) => set({ deployHistory }, false, 'setDeployHistory')
      }),
      {
        name: 'roblox-installations',
        storage: createJSONStorage(() => validatedStorage),
        partialize: (state) => ({
          installations: state.installations,
          selectedId: state.selectedId
          // deployHistory is not persisted - fetched fresh on mount
        })
      }
    ),
    { name: 'InstallationsStore' }
  )
)

// ============================================================================
// Selectors
// ============================================================================

export const useInstallations = () => useInstallationsStore((state) => state.installations)
export const useSelectedInstallationId = () => useInstallationsStore((state) => state.selectedId)
export const useDeployHistory = () => useInstallationsStore((state) => state.deployHistory)

export const useSelectedInstallation = () =>
  useInstallationsStore((state) =>
    state.selectedId === 'new'
      ? null
      : (state.installations.find((i) => i.id === state.selectedId) ?? null)
  )

export const useInstallationById = (id: string) =>
  useInstallationsStore((state) => state.installations.find((i) => i.id === id) ?? null)

// Actions
export const useAddInstallation = () => useInstallationsStore((state) => state.addInstallation)
export const useUpdateInstallation = () =>
  useInstallationsStore((state) => state.updateInstallation)
export const useRemoveInstallation = () =>
  useInstallationsStore((state) => state.removeInstallation)
export const useSetSelectedInstallationId = () =>
  useInstallationsStore((state) => state.setSelectedId)
export const useSetDeployHistory = () => useInstallationsStore((state) => state.setDeployHistory)

// ============================================================================
// Utility: Get API type from BinaryType
// ============================================================================

export const getApiType = (
  t: BinaryType
): 'WindowsStudio64' | 'WindowsPlayer' | 'MacPlayer' | 'MacStudio' => {
  if (t === BinaryType.WindowsStudio) return 'WindowsStudio64'
  if (t === BinaryType.MacPlayer) return 'MacPlayer'
  if (t === BinaryType.MacStudio) return 'MacStudio'
  return 'WindowsPlayer'
}
