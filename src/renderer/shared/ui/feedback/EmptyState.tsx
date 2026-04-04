import React from 'react'
import { PackageOpen } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'

type EmptyStateVariant = 'default' | 'dashed' | 'minimal'

interface EmptyStateProps {
  icon?: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  variant?: EmptyStateVariant
  className?: string
}

const variantStyles: Record<EmptyStateVariant, string> = {
  default: 'px-6 py-24',
  dashed:
    'px-6 py-10 rounded-2xl border border-dashed border-[var(--color-border)] bg-[var(--color-surface-muted)]/45',
  minimal: 'px-4 py-14'
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  variant = 'default',
  className
}) => {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center text-[var(--color-text-muted)]',
        variantStyles[variant],
        className
      )}
    >
      {Icon && (
        <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--color-surface-hover)]">
          <Icon size={24} className="opacity-40" />
        </div>
      )}
      <div className="max-w-sm">
        <p className="text-sm font-semibold text-[var(--color-text-secondary)]">{title}</p>
        {description && <p className="mt-1 text-xs text-[var(--color-text-muted)]">{description}</p>}
      </div>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

/**
 * Compact empty state for inline use (e.g., within sections)
 */
export const EmptyStateCompact: React.FC<{
  message: string
  className?: string
}> = ({ message, className }) => (
  <EmptyState
    icon={PackageOpen}
    title={message}
    variant="minimal"
    className={cn('py-8', className)}
  />
)

export default EmptyState
