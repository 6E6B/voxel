import React, { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  containerClassName?: string
  showClearButton?: boolean
  onClear?: () => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
}

export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  className,
  containerClassName,
  showClearButton = true,
  onClear,
  onKeyDown,
  onFocus
}) => {
  const inputRef = useRef<HTMLInputElement>(null)

  const handleClear = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    onChange('')
    onClear?.()
    inputRef.current?.focus()
  }

  return (
    <div
      className={cn(
        'relative flex h-10 w-full items-center rounded-[var(--control-radius)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] transition-all hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)] focus-within:border-[var(--color-border-strong)] focus-within:bg-[var(--color-surface)] focus-within:shadow-[0_0_0_1px_var(--focus-ring)]',
        containerClassName
      )}
    >
      <Search size={16} className="pointer-events-none absolute left-3 text-[var(--color-text-muted)]" />

      <input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        className={cn(
          'h-full w-full bg-transparent py-2 pl-9 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none',
          showClearButton ? 'pr-10' : 'pr-3',
          className
        )}
      />

      {showClearButton && value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-0 top-0 flex h-full w-10 items-center justify-center text-[var(--color-text-muted)] transition-colors hover:text-[var(--color-text-primary)]"
          aria-label="Clear search"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
