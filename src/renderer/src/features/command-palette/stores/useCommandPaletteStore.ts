import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export type CommandStep = 'select' | 'input' | 'results'

// Catalog search result item type
export interface CatalogResultItem {
  id: number
  itemType: string
  assetType?: number
  name: string
  description?: string | null
  creatorName?: string
  creatorTargetId?: number
  creatorHasVerifiedBadge?: boolean
  price?: number | null
  lowestPrice?: number | null
  lowestResalePrice?: number | null
  priceStatus?: string
  favoriteCount?: number
  collectibleItemId?: string | null
  totalQuantity?: number
  hasResellers?: boolean
  isOffSale?: boolean
  // Thumbnail URL (loaded after search)
  imageUrl?: string
}

export interface Command {
  id: string
  label: string
  description?: string
  icon: string
  category:
    | 'navigation'
    | 'accounts'
    | 'games'
    | 'profiles'
    | 'social'
    | 'actions'
    | 'values'
    | 'catalog'
  keywords?: string[]
  // For multi-step commands
  requiresInput?: boolean
  inputPlaceholder?: string
  inputLabel?: string
  // For commands that show results (like catalog search)
  showsResults?: boolean
  // Action to execute - can be immediate or return a promise
  action?: () => void | Promise<void>
  // For input commands - receives the input value
  onInputSubmit?: (value: string) => void | Promise<void>
  // For result commands - receives the input and should return results
  onSearch?: (value: string) => Promise<CatalogResultItem[]>
  // Called when a result item is selected
  onResultSelect?: (item: CatalogResultItem) => void
}

interface CommandPaletteState {
  isOpen: boolean
  step: CommandStep
  query: string
  selectedIndex: number
  activeCommand: Command | null
  inputValue: string
  isLoading: boolean
  recentCommands: string[] // Store recent command IDs
  // For results step
  searchResults: CatalogResultItem[]
  resultSelectedIndex: number
}

interface CommandPaletteActions {
  open: () => void
  close: () => void
  setQuery: (query: string) => void
  setSelectedIndex: (index: number) => void
  selectCommand: (command: Command) => void
  setInputValue: (value: string) => void
  submitInput: () => void
  goBack: () => void
  setLoading: (loading: boolean) => void
  addRecentCommand: (commandId: string) => void
  reset: () => void
  // For results step
  setSearchResults: (results: CatalogResultItem[]) => void
  setResultSelectedIndex: (index: number) => void
  selectResult: (item: CatalogResultItem) => void
}

type CommandPaletteStore = CommandPaletteState & CommandPaletteActions

const initialState: CommandPaletteState = {
  isOpen: false,
  step: 'select',
  query: '',
  selectedIndex: 0,
  activeCommand: null,
  inputValue: '',
  isLoading: false,
  recentCommands: [],
  searchResults: [],
  resultSelectedIndex: 0
}

export const useCommandPaletteStore = create<CommandPaletteStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      open: () => set({ isOpen: true, step: 'select', query: '', selectedIndex: 0 }, false, 'open'),

      close: () => set({ ...initialState }, false, 'close'),

      setQuery: (query) => set({ query, selectedIndex: 0 }, false, 'setQuery'),

      setSelectedIndex: (selectedIndex) => set({ selectedIndex }, false, 'setSelectedIndex'),

      selectCommand: (command) => {
        if (command.requiresInput) {
          set(
            {
              step: 'input',
              activeCommand: command,
              inputValue: '',
              query: ''
            },
            false,
            'selectCommand:input'
          )
        } else if (command.action) {
          const { addRecentCommand, close } = get()
          addRecentCommand(command.id)
          close()
          command.action()
        }
      },

      setInputValue: (inputValue) => set({ inputValue }, false, 'setInputValue'),

      submitInput: async () => {
        const { activeCommand, inputValue, addRecentCommand, close, setLoading } = get()

        // Handle search commands that show results
        if (activeCommand?.showsResults && activeCommand.onSearch && inputValue.trim()) {
          setLoading(true)
          try {
            const results = await activeCommand.onSearch(inputValue.trim())
            addRecentCommand(activeCommand.id)
            set(
              {
                step: 'results',
                searchResults: results,
                resultSelectedIndex: 0,
                isLoading: false
              },
              false,
              'submitInput:results'
            )
          } catch (error) {
            console.error('Search failed:', error)
            setLoading(false)
          }
          return
        }

        // Handle regular input commands
        if (activeCommand?.onInputSubmit && inputValue.trim()) {
          setLoading(true)
          try {
            await activeCommand.onInputSubmit(inputValue.trim())
            addRecentCommand(activeCommand.id)
          } catch (error) {
            console.error('Command failed:', error)
          } finally {
            setLoading(false)
            close()
          }
        }
      },

      goBack: () => {
        const { step } = get()
        if (step === 'results') {
          // Go back to input from results
          set(
            {
              step: 'input',
              searchResults: [],
              resultSelectedIndex: 0
            },
            false,
            'goBack:toInput'
          )
        } else {
          // Go back to select from input
          set(
            {
              step: 'select',
              activeCommand: null,
              inputValue: '',
              searchResults: [],
              resultSelectedIndex: 0
            },
            false,
            'goBack:toSelect'
          )
        }
      },

      setLoading: (isLoading) => set({ isLoading }, false, 'setLoading'),

      addRecentCommand: (commandId) => {
        const { recentCommands } = get()
        const filtered = recentCommands.filter((id) => id !== commandId)
        const updated = [commandId, ...filtered].slice(0, 5) // Keep last 5
        set({ recentCommands: updated }, false, 'addRecentCommand')
      },

      reset: () => set({ ...initialState }, false, 'reset'),

      // Results step actions
      setSearchResults: (searchResults) => set({ searchResults }, false, 'setSearchResults'),

      setResultSelectedIndex: (resultSelectedIndex) =>
        set({ resultSelectedIndex }, false, 'setResultSelectedIndex'),

      selectResult: (item) => {
        const { activeCommand, close } = get()
        if (activeCommand?.onResultSelect) {
          activeCommand.onResultSelect(item)
        }
        close()
      }
    }),
    { name: 'CommandPaletteStore' }
  )
)

// Selectors - State
export const useCommandPaletteOpen = () => useCommandPaletteStore((s) => s.isOpen)
export const useCommandPaletteStep = () => useCommandPaletteStore((s) => s.step)
export const useCommandPaletteQuery = () => useCommandPaletteStore((s) => s.query)
export const useCommandPaletteSelectedIndex = () => useCommandPaletteStore((s) => s.selectedIndex)
export const useCommandPaletteActiveCommand = () => useCommandPaletteStore((s) => s.activeCommand)
export const useCommandPaletteInputValue = () => useCommandPaletteStore((s) => s.inputValue)
export const useCommandPaletteLoading = () => useCommandPaletteStore((s) => s.isLoading)
export const useCommandPaletteRecentCommands = () => useCommandPaletteStore((s) => s.recentCommands)
export const useCommandPaletteSearchResults = () => useCommandPaletteStore((s) => s.searchResults)
export const useCommandPaletteResultSelectedIndex = () =>
  useCommandPaletteStore((s) => s.resultSelectedIndex)

// Selectors - Actions (individual to avoid object recreation)
export const useCommandPaletteClose = () => useCommandPaletteStore((s) => s.close)
export const useCommandPaletteSetQuery = () => useCommandPaletteStore((s) => s.setQuery)
export const useCommandPaletteSetSelectedIndex = () =>
  useCommandPaletteStore((s) => s.setSelectedIndex)
export const useCommandPaletteSelectCommand = () => useCommandPaletteStore((s) => s.selectCommand)
export const useCommandPaletteSetInputValue = () => useCommandPaletteStore((s) => s.setInputValue)
export const useCommandPaletteSubmitInput = () => useCommandPaletteStore((s) => s.submitInput)
export const useCommandPaletteGoBack = () => useCommandPaletteStore((s) => s.goBack)
export const useCommandPaletteSetResultSelectedIndex = () =>
  useCommandPaletteStore((s) => s.setResultSelectedIndex)
export const useCommandPaletteSelectResult = () => useCommandPaletteStore((s) => s.selectResult)
