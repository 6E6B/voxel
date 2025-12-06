import * as React from 'react'
import { cn } from '../../../lib/utils'

const Card = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { selected?: boolean; disableHover?: boolean }
>(({ className, selected, disableHover, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'rounded-xl border bg-neutral-900/40 border-neutral-800 text-neutral-200 transition-all duration-200',
      selected
        ? 'bg-neutral-900/80 border-neutral-700 shadow-lg'
        : disableHover
          ? 'bg-neutral-900/40 border-neutral-800'
          : 'hover:border-neutral-700 hover:bg-neutral-900 hover:shadow-xl hover:-translate-y-1',
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
