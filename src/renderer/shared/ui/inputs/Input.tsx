import * as React from 'react'
import { cn } from '@renderer/shared/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { }

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full rounded-[var(--control-radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-text-primary)] file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-[var(--color-text-muted)] focus-visible:outline-none focus-visible:border-[var(--color-border-strong)] focus-visible:bg-[var(--color-surface)] focus-visible:shadow-[0_0_0_1px_var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50 transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)]',
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
