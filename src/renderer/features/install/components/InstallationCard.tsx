import React from 'react'
import { motion } from 'framer-motion'
import { Box, Laptop, Play, Monitor, RefreshCw } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import { Card } from '@renderer/shared/ui/display/Card'
import { BinaryType } from '@renderer/shared/types'
import { UnifiedInstallation } from '../types'

interface InstallationCardProps {
  install: UnifiedInstallation
  index: number
  isVerifying: boolean
  installProgress: { status: string; percent: number; detail: string }
  onLaunch: (install: UnifiedInstallation) => void
  onContextMenu: (e: React.MouseEvent, install: UnifiedInstallation) => void
}

export const InstallationCard: React.FC<InstallationCardProps> = ({
  install,
  index,
  isVerifying,
  installProgress,
  onLaunch,
  onContextMenu
}) => {
  const isStudio =
    install.binaryType === BinaryType.WindowsStudio || install.binaryType === BinaryType.MacStudio

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <Card
        disableLift
        onContextMenu={(e) => {
          e.preventDefault()
          onContextMenu(e, install)
        }}
        className="flex flex-col p-4 bg-[var(--color-surface-strong)] border-[var(--color-border)] hover:bg-[var(--color-surface-muted)] hover:border-[var(--color-border-strong)] transition-all group cursor-default"
      >
        {/* Top row: icon + info + launch */}
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isStudio ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}
          >
            {isStudio ? <Box size={18} /> : <Laptop size={18} />}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-[var(--color-text-primary)] truncate text-sm">
                {install.name}
              </h3>
              {install.isSystem && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Monitor size={10} />
                      Default
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>Auto-detected Roblox installation</TooltipContent>
                </Tooltip>
              )}
            </div>
            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 truncate">
              {isStudio ? 'Studio' : 'Player'} &middot; {install.channel}
            </p>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onLaunch(install)
            }}
            disabled={isVerifying}
            className="pressable shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[var(--accent-color)] text-[var(--accent-color-foreground)] text-xs font-bold transition-all hover:bg-[color:color-mix(in_srgb,var(--accent-color)_92%,var(--color-text-primary))] disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-[0_3px_10px_var(--accent-color-shadow)] border border-[color:color-mix(in_srgb,var(--accent-color)_65%,var(--color-text-primary))]"
          >
            <Play size={12} fill="currentColor" />
            Launch
          </button>
        </div>

        {/* Bottom row: status + version */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[var(--color-border)]">
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium ${install.status === 'Ready'
                ? 'text-emerald-400'
                : install.status === 'Updating'
                  ? 'text-blue-400'
                  : 'text-red-400'
              }`}
          >
            {install.status === 'Updating' && <RefreshCw size={10} className="animate-spin" />}
            {install.status === 'Ready' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            )}
            {install.status === 'Error' && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
            )}
            {install.status}
          </span>
          <span className="text-[var(--color-text-muted)] text-[11px]">&middot;</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-[11px] font-mono text-[var(--color-text-muted)] truncate">
                {install.version}
              </span>
            </TooltipTrigger>
            <TooltipContent>{install.version}</TooltipContent>
          </Tooltip>
        </div>

        {/* Progress bar (when verifying/updating) */}
        {isVerifying && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-[var(--color-text-muted)] mb-1">
              <span>{installProgress.status}</span>
              <span className="font-mono">{installProgress.percent}%</span>
            </div>
            <div className="w-full h-1 bg-[var(--color-surface)] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--accent-color)] transition-all duration-300"
                style={{ width: `${installProgress.percent}%` }}
              />
            </div>
          </div>
        )}
      </Card>
    </motion.div>
  )
}

