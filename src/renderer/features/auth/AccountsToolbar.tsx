import { useMemo } from 'react'
import type { JSX } from 'react'
import { Grid, List, UserPlus, Users, Gamepad2, Wifi, WifiOff, Wrench, User, Filter } from 'lucide-react'
import { AccountStatus } from '@renderer/shared/types'
import { PageHeaderPortal } from '@renderer/shared/ui/navigation/PageHeaderPortal'
import { FloatingAction, type FloatingDropdownOption } from '@renderer/shared/ui/navigation/FloatingAction'

interface AccountsToolbarProps {
  searchQuery: string
  onSearchChange: (query: string) => void
  filteredAccountsCount: number
  selectedCount: number
  viewMode: 'list' | 'grid'
  onViewModeToggle: () => void
  statusFilter: AccountStatus | 'All'
  onStatusFilterChange: (status: AccountStatus | 'All') => void
  onDelete: () => void
  onAddAccount: () => void
}

const statusIcons: Record<AccountStatus, JSX.Element> = {
  [AccountStatus.Online]: <Wifi size={14} className="text-blue-500" />,
  [AccountStatus.InGame]: <Gamepad2 size={14} className="text-emerald-500" />,
  [AccountStatus.InStudio]: <Wrench size={14} className="text-orange-500" />,
  [AccountStatus.Offline]: <WifiOff size={14} className="text-neutral-500" />,
  [AccountStatus.Banned]: <User size={14} className="text-red-500" />
}

const AccountsToolbar = ({
  viewMode,
  onViewModeToggle,
  statusFilter,
  onStatusFilterChange,
  onAddAccount
}: AccountsToolbarProps) => {
  const filterOptions: FloatingDropdownOption[] = useMemo(() => {
    return [
      {
        value: 'All',
        label: 'All',
        icon: <Users size={14} className="text-[var(--color-text-secondary)]" />
      },
      ...Object.values(AccountStatus).map((status) => ({
        value: status,
        label: status,
        icon: statusIcons[status as AccountStatus]
      }))
    ]
  }, [])
  return (
    <PageHeaderPortal>
          <FloatingAction.Toggle
            icon={Grid}
            activeIcon={List}
            tooltip={(a) => a ? 'Switch to Grid View' : 'Switch to List View'}
            active={viewMode === 'list'}
            onClick={onViewModeToggle}
          />

          <FloatingAction.Separator />

          <FloatingAction.Dropdown
            icon={Filter}
            tooltip="Filter Status"
            options={filterOptions}
            value={statusFilter}
            onChange={(value) => onStatusFilterChange(value as AccountStatus | 'All')}
          />

          <FloatingAction.Separator />

          <FloatingAction.Button
            icon={UserPlus}
            tooltip="Add Account"
            onClick={onAddAccount}
            accent
          />
    </PageHeaderPortal>
  )
}

export default AccountsToolbar

