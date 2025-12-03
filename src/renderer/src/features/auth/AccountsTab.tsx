import React, { useState, useMemo, memo } from 'react'
import { Monitor } from 'lucide-react'
import { Account, AccountStatus } from '@renderer/types'
import AccountsToolbar from './AccountsToolbar'
import AccountListView from './AccountListView'
import AccountGridView from './AccountGridView'
import { useSelectedIds, useSetSelectedIds } from '../../stores/useSelectionStore'
import { useSetActiveMenu, useSetInfoAccount, useOpenModal } from '../../stores/useUIStore'

type ViewMode = 'list' | 'grid'

interface AccountsTabProps {
  accounts: Account[]
  onAccountsChange: (accounts: Account[]) => void
  allowMultipleInstances: boolean
}

const AccountsTab = memo(
  ({ accounts, onAccountsChange, allowMultipleInstances }: AccountsTabProps) => {
    // Using individual selectors for optimized re-renders
    const selectedIds = useSelectedIds()
    const setSelectedIds = useSetSelectedIds()
    const setActiveMenu = useSetActiveMenu()
    const setInfoAccount = useSetInfoAccount()
    const openModal = useOpenModal()

    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('list')
    const [statusFilter, setStatusFilter] = useState<AccountStatus | 'All'>('All')

    // Load view mode
    React.useEffect(() => {
      const loadViewMode = async () => {
        try {
          const savedMode = await window.api.getAccountsViewMode()
          if (savedMode) {
            setViewMode(savedMode)
          }
        } catch (error) {
          console.error('Failed to load view mode:', error)
        }
      }
      loadViewMode()
    }, [])

    const handleViewModeToggle = () => {
      const newMode = viewMode === 'list' ? 'grid' : 'list'
      setViewMode(newMode)
      window.api.setAccountsViewMode(newMode)
    }

    const filteredAccounts = useMemo(() => {
      return accounts.filter((acc) => {
        const matchesSearch =
          acc.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          acc.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
          acc.notes.toLowerCase().includes(searchQuery.toLowerCase())

        const matchesStatus = statusFilter === 'All' || acc.status === statusFilter

        return matchesSearch && matchesStatus
      })
    }, [accounts, searchQuery, statusFilter])

    const allSelected = filteredAccounts.length > 0 && selectedIds.size === filteredAccounts.length
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < filteredAccounts.length

    const toggleSelectAll = () => {
      if (!allowMultipleInstances) return

      if (allSelected) {
        setSelectedIds(new Set())
      } else {
        setSelectedIds(new Set(filteredAccounts.map((a) => a.id)))
      }
    }

    const toggleSelect = (id: string) => {
      const newSelected = new Set(selectedIds)
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        if (!allowMultipleInstances) {
          newSelected.clear()
        }
        newSelected.add(id)
      }
      setSelectedIds(newSelected)
    }

    const handleMenuOpen = (e: React.MouseEvent, id: string) => {
      e.preventDefault()
      e.stopPropagation()
      setActiveMenu({
        id,
        x: e.clientX,
        y: e.clientY
      })
    }

    const handleInfoOpen = (e: React.MouseEvent, account: Account) => {
      e.stopPropagation()
      setInfoAccount(account)
    }

    const isFiltering = searchQuery !== '' || statusFilter !== 'All'

    const handleMoveAccount = (fromId: string, toId: string) => {
      if (isFiltering) return

      const fromIndex = accounts.findIndex((a) => a.id === fromId)
      const toIndex = accounts.findIndex((a) => a.id === toId)

      if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) return

      const newAccounts = [...accounts]
      const [movedAccount] = newAccounts.splice(fromIndex, 1)
      newAccounts.splice(toIndex, 0, movedAccount)

      onAccountsChange(newAccounts)
    }

    return (
      <>
        <AccountsToolbar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filteredAccountsCount={filteredAccounts.length}
          selectedCount={selectedIds.size}
          viewMode={viewMode}
          onViewModeToggle={handleViewModeToggle}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          onDelete={() => {
            if (window.confirm(`Are you sure you want to remove ${selectedIds.size} accounts?`)) {
              onAccountsChange(accounts.filter((acc) => !selectedIds.has(acc.id)))
              setSelectedIds(new Set())
            }
          }}
          onAddAccount={() => openModal('addAccount')}
        />

        <div className="flex-1 overflow-hidden relative bg-neutral-950">
          {filteredAccounts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 text-neutral-600">
              <div className="p-8 bg-neutral-900/50 rounded-full border border-neutral-800">
                <Monitor size={40} className="text-neutral-500" />
              </div>
              <div className="text-center">
                <p className="text-xl font-medium text-neutral-400">No accounts found</p>
                <p className="text-base mt-1">Try adjusting your filters or search query</p>
              </div>
              {statusFilter !== 'All' && (
                <button
                  onClick={() => setStatusFilter('All')}
                  className="pressable text-base text-neutral-400 hover:text-white underline"
                >
                  Clear filters
                </button>
              )}
            </div>
          ) : viewMode === 'list' ? (
            <AccountListView
              accounts={filteredAccounts}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onToggleSelectAll={toggleSelectAll}
              allSelected={allSelected}
              isIndeterminate={isIndeterminate}
              onMenuOpen={handleMenuOpen}
              onInfoOpen={handleInfoOpen}
              onMoveAccount={!isFiltering ? handleMoveAccount : undefined}
              allowMultipleInstances={allowMultipleInstances}
            />
          ) : (
            <AccountGridView
              accounts={filteredAccounts}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onMenuOpen={handleMenuOpen}
              onInfoOpen={handleInfoOpen}
              onMoveAccount={!isFiltering ? handleMoveAccount : undefined}
            />
          )}
        </div>
      </>
    )
  }
)

export default AccountsTab
