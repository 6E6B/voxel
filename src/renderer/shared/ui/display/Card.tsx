import * as React from 'react'
import { cn } from '@renderer/shared/lib/utils'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    selected?: boolean
    disableHover?: boolean
    disableLift?: boolean
  }
>(({ className, selected, disableHover, disableLift, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] transition-all duration-200',
      selected
        ? 'bg-[var(--color-surface-strong)] border-[var(--color-border-strong)] shadow-lg shadow-[var(--shadow-lg)]'
        : disableHover
          ? ''
          : cn(
            'hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)] hover:shadow-xl',
            !disableLift && 'hover:-translate-y-1'
          ),
      className
    )}
    {...props}
  />
))
Card.displayName = 'Card'

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
  )
)
CardHeader.displayName = 'CardHeader'

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
)
CardTitle.displayName = 'CardTitle'

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
  )
)
CardContent.displayName = 'CardContent'

export { Card, CardHeader, CardTitle, CardContent }
