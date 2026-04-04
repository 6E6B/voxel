import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import type { TransactionTypeEnum, TransactionTimeFrame } from '@shared/contracts/transactions'

interface TransactionsState {
  // Filters
  selectedTransactionType: TransactionTypeEnum | 'all'
  timeFrame: TransactionTimeFrame

  // View state
  showSummary: boolean
}

interface TransactionsActions {
  setSelectedTransactionType: (type: TransactionTypeEnum | 'all') => void
  setTimeFrame: (timeFrame: TransactionTimeFrame) => void
  setShowSummary: (show: boolean) => void
  clearFilters: () => void
}

type TransactionsStore = TransactionsState & TransactionsActions

const initialState: TransactionsState = {
  selectedTransactionType: 'all',
  timeFrame: 'Month',
  showSummary: true
}

export const useTransactionsStore = create<TransactionsStore>()(
  devtools(
    persist(
      (set) => ({
        ...initialState,

        setSelectedTransactionType: (type) =>
          set({ selectedTransactionType: type }, false, 'setSelectedTransactionType'),

        setTimeFrame: (timeFrame) => set({ timeFrame }, false, 'setTimeFrame'),

        setShowSummary: (show) => set({ showSummary: show }, false, 'setShowSummary'),

        clearFilters: () =>
          set(
            {
              selectedTransactionType: 'all',
              timeFrame: 'Month'
            },
            false,
            'clearFilters'
          )
      }),
      {
        name: 'transactions-storage',
        partialize: (state) => ({
          showSummary: state.showSummary,
          timeFrame: state.timeFrame
        })
      }
    ),
    { name: 'TransactionsStore' }
  )
)

// Selectors
export const useSelectedTransactionType = () =>
  useTransactionsStore((state) => state.selectedTransactionType)
export const useSetSelectedTransactionType = () =>
  useTransactionsStore((state) => state.setSelectedTransactionType)
export const useTimeFrame = () => useTransactionsStore((state) => state.timeFrame)
export const useSetTimeFrame = () => useTransactionsStore((state) => state.setTimeFrame)
export const useShowSummary = () => useTransactionsStore((state) => state.showSummary)
export const useSetShowSummary = () => useTransactionsStore((state) => state.setShowSummary)
export const useClearTransactionFilters = () => useTransactionsStore((state) => state.clearFilters)
