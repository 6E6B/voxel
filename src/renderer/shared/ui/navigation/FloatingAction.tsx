import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, Check } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/shared/ui/display/Tooltip'
import { getDropdownMotion } from '@renderer/shared/ui/menus/dropdownMotion'

type IconComponent = React.FC<{ size?: number; className?: string }>

const SIZE = 42
const ICON = 18
const BADGE_SIZE = 18
const SEARCH_EXPANDED_WIDTH = 220

// ─── Button ─────────────────────────────────────────────────────────────────────

interface ButtonProps {
  icon: IconComponent
  tooltip: string
  onClick: () => void
  accent?: boolean
  danger?: boolean
  disabled?: boolean
  badge?: number
  className?: string
}

const FloatingButton: React.FC<ButtonProps> = ({
  icon: Icon,
  tooltip,
  onClick,
  accent,
  danger,
  disabled,
  badge,
  className
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        className={cn(
          'pressable relative flex items-center justify-center rounded-full transition-all duration-150',
          accent
            ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)] hover:brightness-110'
            : danger
              ? 'text-[var(--color-text-muted)] hover:text-red-400 hover:bg-red-500/10'
              : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-border-subtle)]',
          disabled && 'opacity-40 cursor-not-allowed',
          className
        )}
        style={{ width: SIZE, height: SIZE }}
        aria-label={tooltip}
      >
        <Icon size={ICON} />
        {badge != null && badge > 0 && (
          <span
            className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full bg-[var(--accent-color)] px-1 text-[10px] font-bold text-[var(--accent-color-foreground)] shadow-sm"
            style={{ minWidth: BADGE_SIZE, height: BADGE_SIZE }}
          >
            {badge}
          </span>
        )}
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" sideOffset={16}>
      {tooltip}
    </TooltipContent>
  </Tooltip>
)

// ─── Toggle ─────────────────────────────────────────────────────────────────────

interface ToggleProps {
  icon: IconComponent
  activeIcon?: IconComponent
  tooltip: string | ((active: boolean) => string)
  active: boolean
  onClick: () => void
  activeClassName?: string
}

const FloatingToggle: React.FC<ToggleProps> = ({
  icon: Icon,
  activeIcon: ActiveIcon,
  tooltip,
  active,
  onClick,
  activeClassName
}) => {
  const DisplayIcon = active && ActiveIcon ? ActiveIcon : Icon
  const label = typeof tooltip === 'function' ? tooltip(active) : tooltip

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'pressable flex items-center justify-center rounded-full transition-all duration-150',
            active
              ? activeClassName || 'text-[var(--accent-color)] bg-[var(--accent-color-faint)]'
              : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-border-subtle)]'
          )}
          style={{ width: SIZE, height: SIZE }}
          aria-label={label}
        >
          <DisplayIcon size={ICON} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={16}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

// ─── Dropdown ───────────────────────────────────────────────────────────────────

interface DropdownOption {
  value: string
  label: string
  icon?: React.ReactNode
}

interface DropdownProps {
  icon: IconComponent
  tooltip: string
  options: DropdownOption[]
  value: string
  onChange: (value: string) => void
}

const FloatingDropdown: React.FC<DropdownProps> = ({
  icon: Icon,
  tooltip,
  options,
  value,
  onChange
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [isOpen])

  const selected = options.find((o) => o.value === value)

  return (
    <div ref={containerRef} className="relative">
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className={cn(
              'pressable flex items-center justify-center rounded-full transition-all duration-150',
              isOpen
                ? 'text-white bg-[var(--color-border-subtle)]'
                : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-border-subtle)]'
            )}
            style={{ width: SIZE, height: SIZE }}
            aria-label={tooltip}
          >
            <Icon size={ICON} />
          </button>
        </TooltipTrigger>
        {!isOpen && (
          <TooltipContent side="top" sideOffset={16}>
            {tooltip}
            {selected ? `: ${selected.label}` : ''}
          </TooltipContent>
        )}
      </Tooltip>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            {...getDropdownMotion({ transformOrigin: 'bottom center', direction: 'up' })}
            className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 min-w-[176px] bg-[var(--color-surface-strong)] border border-[var(--color-border)] rounded-xl shadow-[0_12px_40px_rgba(0,0,0,0.6),inset_0_1px_0_rgba(255,255,255,0.06)] overflow-hidden z-50"
          >
            <div className="p-1.5">
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className={cn(
                    'w-full flex items-center gap-2.5 px-3 py-2 text-[14px] rounded-lg transition-colors',
                    option.value === value
                      ? 'bg-[var(--color-border-subtle)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)] hover:text-white'
                  )}
                >
                  {option.icon && (
                    <span className="shrink-0 flex w-5 justify-center [&>svg]:h-[18px] [&>svg]:w-[18px]">
                      {option.icon}
                    </span>
                  )}
                  <span className="flex-1 text-left truncate">{option.label}</span>
                  {option.value === value && (
                    <Check size={15} className="text-[var(--accent-color)] shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Search ─────────────────────────────────────────────────────────────────────

interface SearchProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onFocus?: (e: React.FocusEvent<HTMLInputElement>) => void
  onClear?: () => void
}

const FloatingSearch: React.FC<SearchProps> = ({
  value,
  onChange,
  placeholder = 'Search...',
  onKeyDown,
  onFocus,
  onClear
}) => {
  const [isExpanded, setIsExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value) setIsExpanded(true)
  }, [value])

  const handleExpand = () => {
    setIsExpanded(true)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  const handleBlur = () => {
    if (!value) setIsExpanded(false)
  }

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
    onClear?.()
    inputRef.current?.focus()
  }

  return (
    <motion.div
      layout
      initial={false}
      animate={{ width: isExpanded ? SEARCH_EXPANDED_WIDTH : SIZE }}
      transition={{ type: 'spring', stiffness: 420, damping: 36, mass: 0.8 }}
      className="relative flex items-center overflow-hidden rounded-full"
      style={{ height: SIZE }}
    >
      {/* Search icon / trigger */}
      <button
        type="button"
        onClick={handleExpand}
        className={cn(
          'absolute left-0 top-0 bottom-0 flex items-center justify-center z-10 rounded-full transition-colors',
          isExpanded
            ? 'text-[var(--color-text-muted)] cursor-default'
            : 'text-[var(--color-text-muted)] hover:text-white hover:bg-[var(--color-border-subtle)] pressable'
        )}
        style={{ width: SIZE }}
      >
        <Search size={ICON} />
      </button>

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={onFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        className={cn(
          'w-full h-full bg-[var(--color-border-subtle)] text-[14px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] focus:outline-none rounded-full transition-opacity',
          isExpanded ? 'opacity-100 pr-11' : 'opacity-0 pointer-events-none pr-0'
        )}
        style={{ paddingLeft: SIZE }}
      />

      {/* Clear button */}
      <AnimatePresence>
        {isExpanded && value && (
          <motion.button
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            type="button"
            onClick={handleClear}
            className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-[var(--color-text-muted)] transition-colors z-10 hover:text-white"
          >
            <X size={15} strokeWidth={2.25} />
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Separator ──────────────────────────────────────────────────────────────────

const FloatingSeparator: React.FC = () => (
  <div className="mx-1 h-5 w-px bg-[var(--color-border)] opacity-50" />
)

// ─── Export ─────────────────────────────────────────────────────────────────────

export const FloatingAction = {
  Button: FloatingButton,
  Toggle: FloatingToggle,
  Dropdown: FloatingDropdown,
  Search: FloatingSearch,
  Separator: FloatingSeparator
}

export type { DropdownOption as FloatingDropdownOption }

