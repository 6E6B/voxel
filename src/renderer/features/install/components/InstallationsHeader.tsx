import React from 'react'
import { RefreshCw, Plus } from 'lucide-react'
import { PageHeaderPortal } from '@renderer/shared/ui/navigation/PageHeaderPortal'
import { FloatingAction } from '@renderer/shared/ui/navigation/FloatingAction'

interface InstallationsHeaderProps {
  count: number
  onRefresh: () => void
  onNew: () => void
  isMac: boolean
}

export const InstallationsHeader: React.FC<InstallationsHeaderProps> = ({
  onRefresh,
  onNew,
  isMac
}) => {
  return (
    <PageHeaderPortal>
          <FloatingAction.Button
            icon={RefreshCw}
            tooltip="Refresh version history and installations"
            onClick={onRefresh}
          />

          <FloatingAction.Separator />

          <FloatingAction.Button
            icon={Plus}
            tooltip={isMac ? 'Cannot manage installations manually on macOS' : 'New Installation'}
            onClick={onNew}
            disabled={isMac}
            accent
          />
    </PageHeaderPortal>
  )
}

