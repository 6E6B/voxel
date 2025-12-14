import React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'

interface StatRowProps {
  label: string
  value: string | React.ReactNode
  icon: any
  onClick?: () => void
  title?: string
  ariaLabel?: string
}

export const StatRow: React.FC<StatRowProps> = ({
  label,
  value,
  icon: Icon,
  onClick,
  title,
  ariaLabel
}) => {
  const isInteractive = typeof onClick === 'function'

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!isInteractive) return
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onClick?.()
    }
  }

  const content = (
    <div
      className={`flex items-center justify-between py-2 -mx-4 px-4 ${
        isInteractive
          ? 'cursor-pointer hover:bg-[var(--color-surface-hover)] focus-visible:ring-1 focus-visible:ring-[var(--focus-ring)] focus-visible:bg-[var(--color-surface-muted)] outline-none'
          : 'hover:bg-[var(--color-surface-muted)]'
      }`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={handleKeyDown}
      aria-label={
        isInteractive
          ? ariaLabel || `${label}: ${typeof value === 'string' ? value : 'click to view'}`
          : undefined
      }
    >
      <div className="flex items-center gap-2.5 text-[var(--color-text-muted)]">
        <Icon size={15} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <div className="text-xs text-[var(--color-text-primary)] font-semibold">{value}</div>
    </div>
  )

  if (!title) {
    return content
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}
