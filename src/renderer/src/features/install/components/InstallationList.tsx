import React from 'react'
import { Download } from 'lucide-react'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import { UnifiedInstallation } from '../types'
import { InstallationCard } from './InstallationCard'

interface InstallationListProps {
  installations: UnifiedInstallation[]
  isVerifying: string | null
  installProgress: { status: string; percent: number; detail: string }
  onLaunch: (install: UnifiedInstallation) => void
  onContextMenu: (e: React.MouseEvent, install: UnifiedInstallation) => void
}

export const InstallationList: React.FC<InstallationListProps> = ({
  installations,
  isVerifying,
  installProgress,
  onLaunch,
  onContextMenu
}) => {
  if (installations.length === 0) {
    return (
      <div className="h-full flex items-center justify-center">
        <EmptyState
          icon={Download}
          title="No installations yet"
          description="Create your first Roblox installation to get started"
          variant="minimal"
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
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
