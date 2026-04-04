import React from 'react'
import { Download, Plus } from 'lucide-react'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { UnifiedInstallation } from '../types'
import { InstallationCard } from './InstallationCard'

interface InstallationListProps {
  installations: UnifiedInstallation[]
  isVerifying: string | null
  installProgress: { status: string; percent: number; detail: string }
  onLaunch: (install: UnifiedInstallation) => void
  onContextMenu: (e: React.MouseEvent, install: UnifiedInstallation) => void
  onNew: () => void
  isMac: boolean
}

export const InstallationList: React.FC<InstallationListProps> = ({
  installations,
  isVerifying,
  installProgress,
  onLaunch,
  onContextMenu,
  onNew,
  isMac
}) => {
  if (installations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={Download}
          title="No installations found"
          description="Add a new Roblox installation or wait for auto-detection"
          variant="minimal"
          action={
            !isMac ? (
              <button
                onClick={onNew}
                className="pressable inline-flex items-center gap-2 px-4 py-2 rounded-[var(--control-radius)] bg-[var(--accent-color)] text-[var(--accent-color-foreground)] text-sm font-bold hover:bg-[color:color-mix(in_srgb,var(--accent-color)_92%,var(--color-text-primary))] transition-colors shadow-sm shadow-[0_3px_10px_var(--accent-color-shadow)] border border-[color:color-mix(in_srgb,var(--accent-color)_65%,var(--color-text-primary))]"
              >
                <Plus size={16} />
                New Installation
              </button>
            ) : undefined
          }
        />
      </div>
    )
  }

  return (
    <div
      className="grid gap-4"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}
    >
      {installations.map((install, index) => (
        <InstallationCard
          key={install.id}
          install={install}
          index={index}
          isVerifying={isVerifying === install.id}
          installProgress={installProgress}
          onLaunch={onLaunch}
          onContextMenu={onContextMenu}
        />
      ))}
    </div>
  )
}

