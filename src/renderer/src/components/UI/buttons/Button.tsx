import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../../lib/utils'

const buttonVariants = cva(
  'pressable inline-flex items-center justify-center whitespace-nowrap rounded-lg text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-app-bg)] disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        default:
          'bg-[rgba(var(--accent-color-rgb),0.85)] text-[var(--accent-color-foreground)] hover:bg-[rgba(var(--accent-color-rgb),0.95)] shadow-sm shadow-[0_5px_15px_var(--accent-color-shadow)] border border-[var(--accent-color-border)]',
        destructive:
          'bg-red-500 text-white hover:bg-red-600 border border-red-500/60 focus-visible:ring-red-400/50',
        outline:
          'border border-[var(--color-border-strong)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] shadow-sm',
        secondary:
          'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)] hover:bg-[var(--color-surface-muted)] border border-[var(--color-border-strong)] shadow-sm',
        ghost:
          'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]',
        link: 'text-[var(--accent-color)] underline-offset-4 hover:underline',
        filter:
          'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] data-[state=open]:bg-[var(--color-surface-hover)] data-[state=open]:text-[var(--color-text-primary)]',
        filterItem:
          'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] justify-start !font-medium',
        filterItemActive:
          'bg-[rgba(var(--accent-color-rgb),0.85)] text-[var(--accent-color-foreground)] justify-start !font-bold'
      },
      size: {
        default: 'h-10 px-4 py-2.5',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        icon: 'h-10 w-10 p-2.5',
        iconSm: 'h-8 w-8 p-1.5'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    return (
      <button className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    )
  }
)
Button.displayName = 'Button'

export { Button, buttonVariants }
