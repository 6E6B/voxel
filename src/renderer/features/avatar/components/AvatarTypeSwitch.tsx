import React from 'react'
import { Account } from '@renderer/shared/types'
import { useSetPlayerAvatarType } from '../api/useAvatar'
import { useNotification } from '@renderer/features/system/useSnackbarStore'
import { cn } from '@renderer/shared/lib/utils'

interface AvatarTypeSwitchProps {
  account: Account | null
  currentAvatarType: 'R6' | 'R15' | null
}

export const AvatarTypeSwitch: React.FC<AvatarTypeSwitchProps> = ({
  account,
  currentAvatarType
}) => {
  const { showNotification } = useNotification()
  const setPlayerAvatarType = useSetPlayerAvatarType(account)

  const handleTypeChange = async (newType: 'R6' | 'R15') => {
    if (!account || currentAvatarType === newType) return

    try {
      await setPlayerAvatarType.mutateAsync(newType)
      showNotification(`Avatar type changed to ${newType}`, 'success')
    } catch (error) {
      console.error('Failed to update avatar type:', error)
      showNotification('Failed to update avatar type', 'error')
    }
  }

  if (!account || !currentAvatarType) return null

  const isR15 = currentAvatarType === 'R15'

  return (
    <div className="rounded-full border border-black/10 bg-[var(--color-surface-muted)]/92 p-0.5 shadow-[0_1px_3px_rgba(0,0,0,0.08)] backdrop-blur-sm">
      <div
        className="relative grid h-7 w-[88px] grid-cols-2 rounded-full"
        role="tablist"
        aria-label="Avatar rig type"
      >
        <div
          className={cn(
            'pointer-events-none absolute inset-y-0.5 left-0.5 w-[calc(50%-2px)] rounded-full bg-[var(--accent-color)] shadow-[0_6px_16px_var(--accent-color-shadow)] transition-transform duration-200 ease-out',
            isR15 && 'translate-x-full'
          )}
        />

        {[
          { type: 'R6' as const },
          { type: 'R15' as const }
        ].map(({ type }) => {
          const isActive = currentAvatarType === type

          return (
            <button
              key={type}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => handleTypeChange(type)}
              disabled={setPlayerAvatarType.isPending}
              className={cn(
                'relative z-10 flex items-center justify-center rounded-full px-0.5 text-[11px] font-semibold tracking-wide transition-colors duration-200',
                'disabled:cursor-not-allowed disabled:opacity-60',
                isActive
                  ? 'text-[var(--accent-color-foreground)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
              )}
            >
              {type}
            </button>
          )
        })}
      </div>
    </div>
  )
}
