import React from 'react'
import { motion } from 'framer-motion'
import { Box, Laptop, MoreHorizontal, Play, Monitor, RefreshCw } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'
import { BinaryType } from '@renderer/types'
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
      transition={{ duration: 0.3, delay: index * 0.05 }}
      className="group bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden shadow-sm transition-all duration-200 hover:bg-[var(--color-surface-strong)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lg)]"
    >
      {/* Card Header */}
      <div className="p-4 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                isStudio ? 'bg-blue-500/10 text-blue-400' : 'bg-emerald-500/10 text-emerald-400'
              }`}
            >
              {isStudio ? <Box size={20} /> : <Laptop size={20} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-white truncate">{install.name}</h3>
                {install.isSystem && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Monitor size={13} />
                        System
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Default Roblox installation</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <p className="text-xs text-neutral-500 mt-0.5">
                {isStudio ? 'Studio' : 'Player'} • {install.channel}
              </p>
            </div>
          </div>

          {/* Action Button */}
          <button
            onClick={(e) => {
              e.stopPropagation()
              onContextMenu(e, install)
            }}
            className="pressable p-1.5 rounded-lg text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>

      {/* Version Info */}
      <div className="px-4 pb-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
              install.status === 'Ready'
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : install.status === 'Updating'
                  ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                  : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}
          >
            {install.status === 'Updating' && <RefreshCw size={8} className="animate-spin" />}
            {install.status}
          </span>
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="text-xs font-mono text-neutral-600 truncate max-w-[140px]">
                {install.version}
              </span>
            </TooltipTrigger>
            <TooltipContent>{install.version}</TooltipContent>
          </Tooltip>
        </div>

        {/* Verify Progress */}
        {isVerifying && (
          <div className="mt-3">
            <div className="flex justify-between text-[10px] text-neutral-500 mb-1">
              <span>{installProgress.status}</span>
              <span>{installProgress.percent}%</span>
            </div>
            <div className="w-full h-1 bg-neutral-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${installProgress.percent}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Launch Button */}
      <div className="px-4 pb-4">
        <button
          onClick={() => onLaunch(install)}
          disabled={isVerifying}
          className="pressable w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-[var(--color-surface-strong)] border border-[var(--color-border)] text-[var(--color-text-primary)] text-sm font-medium transition-all hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-lg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-surface)] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Play size={14} fill="currentColor" />
          Launch
        </button>
      </div>
    </motion.div>
  )
}
