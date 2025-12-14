import React, { forwardRef, useCallback, useMemo, useContext, createContext, useState } from 'react'
import { Copy, Info, Check } from 'lucide-react'
import { Account } from '@renderer/types'
import CustomCheckbox from '@renderer/components/UI/buttons/CustomCheckbox'
import StatusBadge from '@renderer/components/UI/display/StatusBadge'
import { getStatusBorderColor, getStatusColor } from '@renderer/utils/statusUtils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { TableVirtuoso, TableComponents } from 'react-virtuoso'

// Context for row-level handlers
interface AccountRowContext {
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onMenuOpen: (e: React.MouseEvent, id: string) => void
  onMoveAccount?: (fromId: string, toId: string) => void
  handleDragStart: (e: React.DragEvent, id: string) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent, targetId: string) => void
}

const AccountRowContext = createContext<AccountRowContext | null>(null)

interface AccountListViewProps {
  accounts: Account[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onToggleSelectAll: () => void
  allSelected: boolean
  isIndeterminate: boolean
  onMenuOpen: (e: React.MouseEvent, id: string) => void
  onInfoOpen: (e: React.MouseEvent, account: Account) => void
  onMoveAccount?: (fromId: string, toId: string) => void
  allowMultipleInstances: boolean
  voiceBanInfo?: Record<string, { message: string; endsAt?: number }>
}

const CopyUserIdButton = ({ userId }: { userId: string }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation()
    navigator.clipboard.writeText(userId)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleCopy}
      className="pressable ml-2 text-neutral-600 opacity-0 group-hover/id:opacity-100 hover:text-neutral-300 transition-all"
    >
      {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
    </button>
  )
}

const AccountListView = ({
  accounts,
  selectedIds,
  onToggleSelect,
  onToggleSelectAll,
  allSelected,
  isIndeterminate,
  onMenuOpen,
  onInfoOpen,
  onMoveAccount,
  allowMultipleInstances,
  voiceBanInfo
}: AccountListViewProps) => {
  const handleDragStart = useCallback((e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
    // Optional: Set a drag image or style opacity
    // (e.target as HTMLElement).style.opacity = '0.5'
  }, [])

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (onMoveAccount) {
        e.preventDefault()
        e.dataTransfer.dropEffect = 'move'
      }
    },
    [onMoveAccount]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent, targetId: string) => {
      if (!onMoveAccount) return
      e.preventDefault()
      const sourceId = e.dataTransfer.getData('text/plain')
      if (sourceId && sourceId !== targetId) {
        onMoveAccount(sourceId, targetId)
      }
    },
    [onMoveAccount]
  )

  const rowContext = useMemo<AccountRowContext>(
    () => ({
      selectedIds,
      onToggleSelect,
      onMenuOpen,
      onMoveAccount,
      handleDragStart,
      handleDragOver,
      handleDrop
    }),
    [
      selectedIds,
      onToggleSelect,
      onMenuOpen,
      onMoveAccount,
      handleDragStart,
      handleDragOver,
      handleDrop
    ]
  )

  const tableComponents = useMemo<TableComponents<Account, AccountRowContext>>(
    () => ({
      Table: ({ style, ...props }) => (
        <table
          style={style}
          className="min-w-full table-fixed divide-y divide-neutral-900 text-base"
          {...props}
        />
      ),
      TableHead: forwardRef<HTMLTableSectionElement>((props, ref) => (
        <thead ref={ref} className="bg-neutral-950 sticky top-0 z-10" {...props} />
      )),
      TableBody: forwardRef<HTMLTableSectionElement>((props, ref) => (
        <tbody ref={ref} className="divide-y divide-neutral-900" {...props} />
      )),
      TableRow: ({ item: account, ...props }) => {
        const ctx = useContext(AccountRowContext)!
        return (
          <tr
            {...props}
            draggable={!!ctx.onMoveAccount}
            onDragStart={(e) => ctx.handleDragStart(e, account.id)}
            onDragOver={ctx.handleDragOver}
            onDrop={(e) => ctx.handleDrop(e, account.id)}
            className={`group hover:bg-neutral-900/60 transition-colors cursor-pointer ${
              ctx.selectedIds.has(account.id) ? 'bg-neutral-900/80' : ''
            }`}
            onClick={() => ctx.onToggleSelect(account.id)}
            onContextMenu={(e) => ctx.onMenuOpen(e, account.id)}
          />
        )
      }
    }),
    []
  )

  return (
    <AccountRowContext.Provider value={rowContext}>
      <div className="h-full w-full scrollbar-thin">
        <TableVirtuoso
          data={accounts}
          context={rowContext}
          overscan={200}
          components={tableComponents}
          fixedHeaderContent={() => (
            <tr>
              <th
                scope="col"
                className="px-3 md:px-6 py-3 md:py-4 text-left w-12 bg-neutral-950 border-b border-neutral-800"
              >
                {allowMultipleInstances && (
                  <CustomCheckbox
                    checked={allSelected}
                    indeterminate={isIndeterminate}
                    onChange={onToggleSelectAll}
                  />
                )}
              </th>
              <th
                scope="col"
                className="px-3 md:px-6 py-3 md:py-4 text-left font-semibold text-neutral-400 text-xs uppercase tracking-wider bg-neutral-950 border-b border-neutral-800 w-[25%]"
              >
                Account
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-4 text-left font-semibold text-neutral-400 text-xs uppercase tracking-wider bg-neutral-950 border-b border-neutral-800 w-[20%]"
              >
                ID
              </th>
              <th
                scope="col"
                className="px-3 md:px-6 py-3 md:py-4 text-left font-semibold text-neutral-400 text-xs uppercase tracking-wider bg-neutral-950 border-b border-neutral-800 w-[15%]"
              >
                Status
              </th>
              <th
                scope="col"
                className="hidden md:table-cell px-6 py-4 text-left font-semibold text-neutral-400 text-xs uppercase tracking-wider bg-neutral-950 border-b border-neutral-800 w-[30%]"
              >
                Notes
              </th>
              <th
                scope="col"
                className="px-3 md:px-6 py-3 md:py-4 bg-neutral-950 border-b border-neutral-800 w-[10%]"
              >
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          )}
          itemContent={(_index, account) => (
            <>
              <td
                className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap w-12"
                onClick={(e) => e.stopPropagation()}
              >
                <CustomCheckbox
                  checked={selectedIds.has(account.id)}
                  onChange={() => onToggleSelect(account.id)}
                />
              </td>
              <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="h-10 w-10 flex-shrink-0 relative">
                    <img
                      className="h-10 w-10 rounded-full bg-neutral-900 object-cover ring-2 ring-neutral-900 group-hover:ring-neutral-800 transition-all privacy-blur"
                      src={account.avatarUrl}
                      alt=""
                    />
                    <span
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 border-2 border-solid rounded-full ${getStatusBorderColor(account.status)} ${getStatusColor(account.status)}`}
                    ></span>
                  </div>
                  <div className="ml-4">
                    <div
                      className={`text-base font-medium transition-colors ${
                        selectedIds.has(account.id)
                          ? 'text-white'
                          : 'text-neutral-200 group-hover:text-white'
                      } privacy-blur`}
                    >
                      {account.displayName}
                    </div>
                    <div className="text-sm text-neutral-500 privacy-blur">@{account.username}</div>
                  </div>
                </div>
              </td>
              <td className="hidden md:table-cell px-6 py-4 whitespace-nowrap">
                <div className="flex items-center group/id">
                  <span className="text-[15px] text-neutral-500 font-mono">{account.userId}</span>
                  <CopyUserIdButton userId={account.userId} />
                </div>
              </td>
              <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap">
                <div className="flex flex-col items-start gap-1">
                  <StatusBadge status={account.status} />
                  {voiceBanInfo?.[account.id] && (
                    <span className="text-xs text-red-400">{voiceBanInfo[account.id].message}</span>
                  )}
                </div>
              </td>
              <td className="hidden md:table-cell px-6 py-4">
                <div className="text-sm text-neutral-500 min-w-[100px] break-words group-hover:text-neutral-400">
                  {account.notes || <span className="opacity-20 italic">Empty</span>}
                </div>
              </td>
              <td className="px-3 md:px-6 py-3 md:py-4 whitespace-nowrap text-right text-base font-medium">
                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => onInfoOpen(e, account)}
                        className="pressable text-neutral-500 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded"
                      >
                        <Info size={20} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Account Info</TooltipContent>
                  </Tooltip>
                </div>
              </td>
            </>
          )}
        />
      </div>
    </AccountRowContext.Provider>
  )
}

export default AccountListView
