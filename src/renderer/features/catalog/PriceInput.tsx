import React, { useState, useCallback } from 'react'
import { cn } from '@renderer/shared/lib/utils'

interface PriceInputProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  label: string
  className?: string
}

export const PriceInput = ({ value, onChange, placeholder, label, className }: PriceInputProps) => {
  const [isFocused, setIsFocused] = useState(false)
  const [localValue, setLocalValue] = useState(value)

  // Update local value when prop changes (e.g., when cleared externally)
  React.useEffect(() => {
    setLocalValue(value)
  }, [value])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // Only allow numbers
    if (newValue === '' || /^\d+$/.test(newValue)) {
      setLocalValue(newValue)
    }
  }, [])

  const handleBlur = useCallback(() => {
    setIsFocused(false)
    // Only update parent on blur to reduce re-renders and lag
    onChange(localValue)
  }, [localValue, onChange])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        onChange(localValue)
        e.currentTarget.blur()
      }
    },
    [localValue, onChange]
  )

  const displayValue = localValue || (isFocused ? '' : placeholder)
  const isPlaceholder = !localValue && !isFocused

  return (
    <div className="relative flex-1">
      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] text-[9px] font-semibold uppercase tracking-widest pointer-events-none z-10">
        {label}
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={displayValue}
        onChange={handleChange}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={cn(
          'h-8 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface-muted)]',
          'pl-9 pr-2 py-1.5 font-mono text-xs tracking-tight text-[var(--color-text-primary)] transition-all duration-150',
          'hover:border-[var(--color-border-strong)]',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--accent-color)]/50 focus-visible:border-[var(--accent-color)]',
          'disabled:cursor-not-allowed disabled:opacity-50',
          isFocused && 'border-[var(--accent-color)]',
          isPlaceholder && 'text-[var(--color-text-muted)]',
          className
        )}
      />
    </div>
  )
}
