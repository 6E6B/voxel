import React from 'react'
import { cn } from '@renderer/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from './Tooltip'

export type StatCardVariant = 'default' | 'emerald' | 'cyan' | 'purple' | 'amber' | 'blue'

interface StatCardProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: React.ReactNode
  variant?: StatCardVariant
  tooltip?: React.ReactNode
  className?: string
}

const variantStyles: Record<StatCardVariant, { container: string; icon: string; value: string }> = {
  default: {
    container: 'bg-neutral-900/30 border-neutral-800/50',
    icon: 'text-neutral-500',
    value: 'text-white'
  },
  emerald: {
    container: 'bg-emerald-500/10 border-emerald-500/20',
    icon: 'text-emerald-500',
    value: 'text-emerald-400'
  },
  cyan: {
    container: 'bg-cyan-500/10 border-cyan-500/20',
    icon: 'text-cyan-500',
    value: 'text-cyan-400'
  },
  purple: {
    container: 'bg-purple-500/10 border-purple-500/20',
    icon: 'text-purple-500',
    value: 'text-purple-400'
  },
  amber: {
    container: 'bg-amber-500/10 border-amber-500/20',
    icon: 'text-amber-500',
    value: 'text-amber-400'
  },
  blue: {
    container: 'bg-blue-500/10 border-blue-500/20',
    icon: 'text-blue-500',
    value: 'text-blue-400'
  }
}

export const StatCard: React.FC<StatCardProps> = ({
  icon: Icon,
  label,
  value,
  variant = 'default',
  tooltip,
  className
}) => {
  const styles = variantStyles[variant]

  const content = (
    <div className={cn('p-3 rounded-lg border', styles.container, className)}>
      <div className={cn('flex items-center gap-2 text-xs mb-1', styles.icon)}>
        <Icon size={14} /> {label}
      </div>
      <div className={cn('font-mono text-sm font-semibold', styles.value)}>{value}</div>
    </div>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    )
  }

  return content
}

export default StatCard
