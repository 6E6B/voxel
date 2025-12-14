import React from 'react'
import { Info } from 'lucide-react'
import { Account } from '@renderer/types'
import CustomCheckbox from '@renderer/components/UI/buttons/CustomCheckbox'
import StatusBadge from '@renderer/components/UI/display/StatusBadge'
import { getStatusBorderColor, getStatusColor } from '@renderer/utils/statusUtils'
import { timeAgo } from '@renderer/utils/timeUtils'
import { Card } from '@renderer/components/UI/display/Card'
import { Button } from '@renderer/components/UI/buttons/Button'
import { Avatar, AvatarImage, AvatarFallback } from '@renderer/components/UI/display/Avatar'

interface AccountGridViewProps {
  accounts: Account[]
  selectedIds: Set<string>
  onToggleSelect: (id: string) => void
  onMenuOpen: (e: React.MouseEvent, id: string) => void
  onInfoOpen: (e: React.MouseEvent, account: Account) => void
  onMoveAccount?: (fromId: string, toId: string) => void
  voiceBanInfo?: Record<string, { message: string; endsAt?: number }>
}

const AccountGridView = ({
  accounts,
  selectedIds,
  onToggleSelect,
  onMenuOpen,
  onInfoOpen,
  onMoveAccount,
  voiceBanInfo
}: AccountGridViewProps) => {
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    if (onMoveAccount) {
      e.preventDefault()
      e.dataTransfer.dropEffect = 'move'
    }
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    if (!onMoveAccount) return
    e.preventDefault()
    const sourceId = e.dataTransfer.getData('text/plain')
    if (sourceId && sourceId !== targetId) {
      onMoveAccount(sourceId, targetId)
    }
  }

  return (
    <div className="h-full w-full overflow-y-auto scrollbar-thin p-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-24">
        {accounts.map((account) => {
          const isSelected = selectedIds.has(account.id)
          return (
            <Card
              key={account.id}
              selected={isSelected}
              draggable={!!onMoveAccount}
              onDragStart={(e) => handleDragStart(e, account.id)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, account.id)}
              onClick={() => onToggleSelect(account.id)}
              onContextMenu={(e) => onMenuOpen(e, account.id)}
              className="relative group p-6 cursor-pointer hover:shadow-xl hover:-translate-y-1"
            >
              <div className="absolute top-5 right-5 z-10">
                <CustomCheckbox checked={isSelected} onChange={() => onToggleSelect(account.id)} />
              </div>
              <div className="absolute top-5 left-5 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="iconSm"
                  onClick={(e) => {
                    e.stopPropagation()
                    onInfoOpen(e, account)
                  }}
                  className="rounded"
                >
                  <Info size={18} />
                </Button>
              </div>

              <div className="flex flex-col items-center text-center mt-2">
                <div className="relative">
                  <Avatar className="w-20 h-20 mb-4 ring-4 ring-neutral-950 shadow-lg privacy-blur">
                    <AvatarImage src={account.avatarUrl} alt="" />
                    <AvatarFallback>{account.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div
                    className={`absolute bottom-1 right-1 w-5 h-5 border-4 border-solid rounded-full ${getStatusBorderColor(account.status)} ${getStatusColor(account.status)}`}
                  />
                </div>
                <h3
                  className={`text-lg font-bold mb-1 truncate w-full ${
                    isSelected ? 'text-white' : 'text-neutral-200 group-hover:text-white'
                  } privacy-blur`}
                >
                  {account.displayName}
                </h3>
                <p className="text-sm text-neutral-500 mb-5 truncate w-full privacy-blur">
                  @{account.username}
                </p>
                <div className="flex flex-col items-center gap-1">
                  <StatusBadge status={account.status} />
                  {voiceBanInfo?.[account.id] && (
                    <span className="text-xs text-red-400 text-center">
                      {voiceBanInfo[account.id].message}
                    </span>
                  )}
                </div>

                <div className="w-full mt-6 pt-5 border-t border-neutral-800/50 flex items-center justify-between text-sm">
                  <span className="font-mono text-neutral-500 text-[15px]">{account.userId}</span>
                  <span className="text-neutral-500">{timeAgo(account.lastActive)}</span>
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}

export default AccountGridView
