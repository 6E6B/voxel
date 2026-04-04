import React from 'react'
import { cn } from '@renderer/shared/lib/utils'

type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
type SpinnerVariant = 'default' | 'emerald' | 'accent' | 'white'

interface LoadingSpinnerProps {
  size?: SpinnerSize
  variant?: SpinnerVariant
  className?: string
  label?: string
}

const sizeStyles: Record<SpinnerSize, string> = {
  xs: 'w-4 h-4 border',
  sm: 'w-5 h-5 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-2',
  xl: 'w-12 h-12 border-[3px]'
}

const variantStyles: Record<SpinnerVariant, string> = {
  default: 'border-neutral-500 border-t-transparent',
  emerald: 'border-emerald-500 border-t-transparent',
  accent: 'border-[var(--accent-color)] border-t-transparent',
  white: 'border-white border-t-transparent'
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'default',
  className,
  label
}) => {
  return (
    <div className={cn('flex flex-col items-center gap-3', className)}>
      <div className={cn('rounded-full animate-spin', sizeStyles[size], variantStyles[variant])} />
      {label && <span className="text-sm text-neutral-500">{label}</span>}
    </div>
  )
}

/**
 * Full-page loading spinner with centered layout
 */
export const LoadingSpinnerFullPage: React.FC<{
  label?: string
  variant?: SpinnerVariant
}> = ({ label = 'Loading...', variant = 'default' }) => (
  <div className="flex h-full w-full items-center justify-center">
    <LoadingSpinner size="lg" variant={variant} label={label} />
  </div>
)

/**
 * Inline loading spinner for buttons or small areas
 */
export const LoadingSpinnerInline: React.FC<{
  size?: SpinnerSize
  variant?: SpinnerVariant
  className?: string
}> = ({ size = 'sm', variant = 'default', className }) => (
  <div
    className={cn('rounded-full animate-spin', sizeStyles[size], variantStyles[variant], className)}
  />
)

export default LoadingSpinner
