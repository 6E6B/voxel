import { useMemo } from 'react'
import { Grid, List, UserPlus, Users, Gamepad2, Wifi, WifiOff, Wrench, User } from 'lucide-react'
import { AccountStatus } from '@renderer/types'
import { Button } from '@renderer/components/UI/buttons/Button'
import CustomDropdown, { DropdownOption } from '@renderer/components/UI/menus/CustomDropdown'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'

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
  [AccountStatus.Online]: <Wifi size={16} className="text-blue-500" />,
  [AccountStatus.InGame]: <Gamepad2 size={16} className="text-emerald-500" />,
  [AccountStatus.InStudio]: <Wrench size={16} className="text-orange-500" />,
  [AccountStatus.Offline]: <WifiOff size={16} className="text-neutral-500" />,
  [AccountStatus.Banned]: <User size={16} className="text-red-500" />
}

const AccountsToolbar = ({
  filteredAccountsCount,
  viewMode,
  onViewModeToggle,
  statusFilter,
  onStatusFilterChange,
  // onDelete, // unused in original snippet?
  onAddAccount
}: AccountsToolbarProps) => {
  const filterOptions: DropdownOption[] = useMemo(() => {
    return [
      {
        value: 'All',
        label: 'All',
        icon: <Users size={16} className="text-[var(--color-text-secondary)]" />
      },
      ...Object.values(AccountStatus).map((status) => ({
        value: status,
        label: status,
        icon: statusIcons[status as AccountStatus]
      }))
    ]
  }, [])
  return (
    <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] flex items-center justify-between px-6 gap-6 z-20">
      {/* Left: Title and Account Count */}
      <div className="flex items-center gap-4 shrink-0">
        <h1 className="text-xl font-bold text-white">Accounts</h1>
        <span className="flex items-center justify-center px-2.5 py-0.5 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-semibold tracking-tight text-neutral-400">
          {filteredAccountsCount}
        </span>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2 shrink-0">
        {/* View Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onViewModeToggle}>
              {viewMode === 'list' ? <Grid size={20} /> : <List size={20} />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {viewMode === 'list' ? 'Switch to Grid View' : 'Switch to List View'}
          </TooltipContent>
        </Tooltip>

        {/* Filter Dropdown */}
        <CustomDropdown
          options={filterOptions}
          value={statusFilter}
          onChange={(value) => onStatusFilterChange(value as AccountStatus | 'All')}
          placeholder="Filter Status"
          className="w-40"
        />

        <Button variant="default" onClick={onAddAccount} className="ml-2 gap-2.5">
          <UserPlus size={18} />
          <span>Add Account</span>
        </Button>
      </div>
    </div>
  )
}

export default AccountsToolbar
