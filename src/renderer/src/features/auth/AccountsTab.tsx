import React, { useState, useMemo, memo } from 'react'
import { Monitor } from 'lucide-react'
import { Account, AccountStatus } from '@renderer/types'
import AccountsToolbar from './AccountsToolbar'
import AccountListView from './AccountListView'
import AccountGridView from './AccountGridView'
import { useSelectedIds, useSetSelectedIds } from '../../stores/useSelectionStore'
import { useSetActiveMenu, useSetInfoAccount, useOpenModal } from '../../stores/useUIStore'
import { useVoiceSettingsForAccounts } from './api/useVoiceSettings'
import { VoiceSettings } from '@shared/ipc-schemas'
import { useNotification } from '../system/stores/useSnackbarStore'

type ViewMode = 'list' | 'grid'

interface AccountsTabProps {
  accounts: Account[]
  onAccountsChange: (accounts: Account[]) => void
  allowMultipleInstances: boolean
}

type VoiceBanInfo = {
  message: string
  endsAt?: number
}

const formatDurationShort = (ms: number) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const days = Math.floor(totalSeconds / 86400)
  const hours = Math.floor((totalSeconds % 86400) / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)

  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (!days && minutes) parts.push(`${minutes}m`)
  if (parts.length === 0) parts.push('less than 1m')

  return parts.slice(0, 2).join(' ')
}

const getVoiceBanInfo = (status?: VoiceSettings): VoiceBanInfo | null => {
  if (!status || !status.isBanned) return null

  const seconds = status.bannedUntil?.Seconds
  const nanos = status.bannedUntil?.Nanos ?? 0

  const endsAt =
    typeof seconds === 'number' ? seconds * 1000 + Math.floor(nanos / 1_000_000) : undefined

  if (!endsAt) {
    return { message: 'Voice chat banned' }
  }

  const remaining = endsAt - Date.now()
  const message =
    remaining > 0
      ? `Voice chat banned · ${formatDurationShort(remaining)} left`
      : 'Voice chat ban active'

  return { message, endsAt }
}

const AccountsTab = memo(
  ({ accounts, onAccountsChange, allowMultipleInstances }: AccountsTabProps) => {
    // Using individual selectors for optimized re-renders
    const selectedIds = useSelectedIds()
    const setSelectedIds = useSetSelectedIds()
    const setActiveMenu = useSetActiveMenu()
    const setInfoAccount = useSetInfoAccount()
    const openModal = useOpenModal()
    const { showNotification } = useNotification()

    const { statusByAccountId } = useVoiceSettingsForAccounts(accounts)
    const notifiedVoiceBansRef = React.useRef<Set<string>>(new Set())

    const voiceBanInfo = useMemo(() => {
      const map: Record<string, VoiceBanInfo> = {}

      Object.entries(statusByAccountId).forEach(([accountId, status]) => {
        const info = getVoiceBanInfo(status)
        if (info) {
          map[accountId] = info
        }
      })

      return map
    }, [statusByAccountId])

    React.useEffect(() => {
      Object.entries(voiceBanInfo).forEach(([accountId, info]) => {
        if (notifiedVoiceBansRef.current.has(accountId)) return
        const account = accounts.find((a) => a.id === accountId)
        const name = account?.displayName || account?.username || 'Account'
        const remainingText = info.message.replace('Voice chat banned', '').replace(/^·\s*/, '')
        const message =
          remainingText.length > 0
            ? `${name} is voice chat banned — ${remainingText}`
            : `${name} is voice chat banned`

        showNotification(message, 'warning')
        notifiedVoiceBansRef.current.add(accountId)
      })
    }, [voiceBanInfo, accounts, showNotification])

    const [searchQuery, setSearchQuery] = useState('')
    const [viewMode, setViewMode] = useState<ViewMode>('grid')
    const [statusFilter, setStatusFilter] = useState<AccountStatus | 'All'>('All')

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
              voiceBanInfo={voiceBanInfo}
            />
          ) : (
            <AccountGridView
              accounts={filteredAccounts}
              selectedIds={selectedIds}
              onToggleSelect={toggleSelect}
              onMenuOpen={handleMenuOpen}
              onInfoOpen={handleInfoOpen}
              onMoveAccount={!isFiltering ? handleMoveAccount : undefined}
              voiceBanInfo={voiceBanInfo}
            />
          )}
        </div>
      </>
    )
  }
)

export default AccountsTab
