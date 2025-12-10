import React from 'react'
import { RefreshCw, Plus } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { Button } from '@renderer/components/UI/buttons/Button'

interface InstallationsHeaderProps {
  count: number
  onRefresh: () => void
  onNew: () => void
  isMac: boolean
}

export const InstallationsHeader: React.FC<InstallationsHeaderProps> = ({
  count,
  onRefresh,
  onNew,
  isMac
}) => {
  return (
    <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] flex items-center justify-between px-6 z-20">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold text-[var(--color-text-primary)]">Installations</h1>
        <span className="flex items-center justify-center px-2.5 py-0.5 rounded-full bg-[var(--color-surface-muted)] border border-[var(--color-border)] text-xs font-semibold tracking-tight text-[var(--color-text-muted)]">
          {count}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onRefresh}
              className="pressable flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-xs font-medium border bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:border-[var(--color-border-strong)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]"
            >
              <RefreshCw size={14} />
              Refresh
            </button>
          </TooltipTrigger>
          <TooltipContent>Refresh version history and installations</TooltipContent>
        </Tooltip>
        <Button variant="default" onClick={onNew} className="gap-2.5" disabled={isMac}>
          <Plus size={18} />
          <span>New Installation</span>
        </Button>
      </div>
    </div>
  )
}
