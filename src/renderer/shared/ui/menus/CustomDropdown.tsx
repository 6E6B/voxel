import React, { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { getDropdownMotion } from './dropdownMotion'

const VIEWPORT_PADDING = 16
const MENU_OFFSET = 8
const MIN_MENU_WIDTH = 200
const ESTIMATED_OPTION_HEIGHT = 44
const ESTIMATED_MENU_CHROME = 16

export interface DropdownOption {
  value: string
  label: string
  labelNode?: React.ReactNode
  subLabel?: string
  subLabelNode?: React.ReactNode
  icon?: React.ReactNode
}

interface CustomDropdownProps {
  options: DropdownOption[]
  value: string | null
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  buttonClassName?: string
  isLoading?: boolean
  disabled?: boolean
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select...',
  className = '',
  buttonClassName,
  isLoading = false,
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [menuPosition, setMenuPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 0,
    placement: 'bottom' as 'top' | 'bottom'
  })
  const [menuRadius, setMenuRadius] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(target)
      const isOutsideMenu = menuRef.current && !menuRef.current.contains(target)

      if (isOutsideDropdown && (isOutsideMenu || !menuRef.current)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const updateMenuPosition = useCallback(() => {
    if (!dropdownRef.current) return

    const computed = window.getComputedStyle(dropdownRef.current)
    const menuRadiusValue = computed.getPropertyValue('--menu-radius').trim()
    setMenuRadius((prev) => (prev === (menuRadiusValue || null) ? prev : menuRadiusValue || null))

    const rect = dropdownRef.current.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight
    const estimatedHeight = options.length * ESTIMATED_OPTION_HEIGHT + ESTIMATED_MENU_CHROME
    const measuredWidth = menuRef.current?.offsetWidth ?? Math.max(rect.width, MIN_MENU_WIDTH)
    const measuredHeight = menuRef.current?.offsetHeight ?? estimatedHeight

    const availableBelow = Math.max(0, viewportHeight - rect.bottom - VIEWPORT_PADDING - MENU_OFFSET)
    const availableAbove = Math.max(0, rect.top - VIEWPORT_PADDING - MENU_OFFSET)
    const placement: 'top' | 'bottom' =
      availableBelow >= measuredHeight || availableBelow >= availableAbove ? 'bottom' : 'top'
    const preferredSpace = placement === 'bottom' ? availableBelow : availableAbove
    const maxHeight = Math.max(120, Math.min(preferredSpace, viewportHeight - VIEWPORT_PADDING * 2))
    const renderedHeight = Math.min(measuredHeight, maxHeight)

    let left = rect.left
    if (left + measuredWidth > viewportWidth - VIEWPORT_PADDING) {
      left = Math.max(VIEWPORT_PADDING, rect.right - measuredWidth)
    }

    let top =
      placement === 'bottom'
        ? rect.bottom + MENU_OFFSET
        : rect.top - renderedHeight - MENU_OFFSET

    top = Math.min(
      Math.max(VIEWPORT_PADDING, top),
      Math.max(VIEWPORT_PADDING, viewportHeight - renderedHeight - VIEWPORT_PADDING)
    )

    setMenuPosition((prev) => {
      if (
        prev.top === top &&
        prev.left === left &&
        prev.width === rect.width &&
        prev.maxHeight === maxHeight &&
        prev.placement === placement
      ) {
        return prev
      }

      return {
        top,
        left,
        width: rect.width,
        maxHeight,
        placement
      }
    })
  }, [options.length])

  // Calculate dropdown position based on button location and keep it anchored during layout changes.
  useEffect(() => {
    if (!isOpen || !dropdownRef.current) return

    let rafId = 0
    const scheduleUpdate = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(updateMenuPosition)
    }

    scheduleUpdate()

    window.addEventListener('scroll', scheduleUpdate, true)
    window.addEventListener('resize', scheduleUpdate)

    const resizeObserver = new ResizeObserver(scheduleUpdate)
    resizeObserver.observe(dropdownRef.current)

    if (menuRef.current) {
      resizeObserver.observe(menuRef.current)
    }

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener('scroll', scheduleUpdate, true)
      window.removeEventListener('resize', scheduleUpdate)
      resizeObserver.disconnect()
    }
  }, [isOpen, updateMenuPosition])

  const selectedOption = options.find((opt) => opt.value === value)

  const defaultButtonClasses = `px-3 py-2.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-[var(--control-radius)] text-sm transition-all hover:border-[var(--color-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] ${isOpen ? 'border-[var(--color-border-strong)] ring-1 ring-[var(--focus-ring)]' : ''
    }`

  const menuElement = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          {...getDropdownMotion({
            transformOrigin: menuPosition.placement === 'top' ? 'bottom center' : 'top center',
            direction: menuPosition.placement === 'top' ? 'up' : 'down'
          })}
          className="fixed bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--menu-radius)] shadow-2xl z-[10000] overflow-hidden"
          style={{
            ...getDropdownMotion({
              transformOrigin: menuPosition.placement === 'top' ? 'bottom center' : 'top center',
              direction: menuPosition.placement === 'top' ? 'up' : 'down'
            }).style,
            top: menuPosition.top,
            left: menuPosition.left,
            minWidth: menuPosition.width,
            maxWidth: 'min(300px, calc(100vw - 32px))',
            borderRadius: menuRadius || 'var(--menu-radius)',
            ...(menuRadius ? ({ ['--menu-radius' as any]: menuRadius } as React.CSSProperties) : {})
          }}
        >
          <div
            className="p-1.5 overflow-y-auto scrollbar-thin"
            style={{ maxHeight: `${menuPosition.maxHeight}px` }}
          >
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`pressable w-full text-left px-3 py-2.5 text-sm flex items-center justify-between rounded-[calc(var(--menu-radius)-6px)] transition-colors ${value === option.value
                    ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                  }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
                    <span className="font-medium truncate w-full">
                      {option.labelNode ?? option.label}
                    </span>
                    {(option.subLabelNode || option.subLabel) && (
                      <span
                        className={`text-xs truncate w-full ${value === option.value ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]/80'}`}
                      >
                        {option.subLabelNode ?? option.subLabel}
                      </span>
                    )}
                  </div>
                </div>
                {value === option.value && (
                  <Check size={14} className="shrink-0 ml-2 text-[var(--color-text-muted)]" />
                )}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && !isLoading && setIsOpen(!isOpen)}
        disabled={disabled || isLoading}
        className={`pressable w-full flex items-center justify-between ${buttonClassName || defaultButtonClasses} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        style={{ borderRadius: 'var(--control-radius)' }}
      >
        <div className="flex items-center gap-2 truncate pr-4">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />
          ) : selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="text-[var(--color-text-primary)] font-bold truncate">
                {selectedOption.labelNode ?? selectedOption.label}
              </span>
            </div>
          ) : (
            <span className="text-[var(--color-text-muted)]">{placeholder}</span>
          )}
        </div>
        <ChevronDown
          size={16}
          className={`text-[var(--color-text-muted)] shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {createPortal(menuElement, document.body)}
    </div>
  )
}

export default CustomDropdown
