import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { ChevronDown, Check, Loader2 } from 'lucide-react'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { motion, AnimatePresence } from 'framer-motion'

export interface DropdownOption {
  value: string
  label: string
  subLabel?: string
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
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0, width: 0 })
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useClickOutside(dropdownRef, () => setIsOpen(false))

  // Calculate dropdown position based on button location
  useEffect(() => {
    if (isOpen && dropdownRef.current) {
      const rect = dropdownRef.current.getBoundingClientRect()
      const menuWidth = Math.max(rect.width, 200)
      const viewportWidth = window.innerWidth
      const viewportHeight = window.innerHeight

      let left = rect.left
      let top = rect.bottom + 8

      // Check if dropdown would overflow on the right
      if (left + menuWidth > viewportWidth - 16) {
        left = Math.max(16, rect.right - menuWidth)
      }

      // Check if dropdown would overflow on the bottom
      const menuHeight = 260 // approximate max height
      if (top + menuHeight > viewportHeight - 16) {
        top = rect.top - menuHeight - 8
      }

      setMenuPosition({ top, left, width: rect.width })
    }
  }, [isOpen])

  const selectedOption = options.find((opt) => opt.value === value)

  const defaultButtonClasses = `px-3 py-2.5 bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-lg text-sm transition-all hover:border-[var(--color-border-strong)] focus:outline-none focus:ring-1 focus:ring-[var(--focus-ring)] ${
    isOpen ? 'border-[var(--color-border-strong)] ring-1 ring-[var(--focus-ring)]' : ''
  }`

  const menuElement = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={menuRef}
          initial={{ opacity: 0, y: 8, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 8, scale: 0.95 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="fixed bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-2xl z-[10000] overflow-hidden"
          style={{
            top: menuPosition.top,
            left: menuPosition.left,
            minWidth: menuPosition.width,
            maxWidth: 'min(300px, calc(100vw - 32px))'
          }}
        >
          <div className="p-1.5 max-h-60 overflow-y-auto scrollbar-thin">
            {options.map((option) => (
              <button
                type="button"
                key={option.value}
                onClick={() => {
                  onChange(option.value)
                  setIsOpen(false)
                }}
                className={`pressable w-full text-left px-3 py-2.5 text-sm flex items-center justify-between rounded-lg transition-colors ${
                  value === option.value
                    ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]'
                }`}
              >
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {option.icon && <span className="shrink-0">{option.icon}</span>}
                  <div className="flex flex-col items-start min-w-0 flex-1 overflow-hidden">
                    <span className="font-medium truncate w-full">{option.label}</span>
                    {option.subLabel && (
                      <span
                        className={`text-xs truncate w-full ${value === option.value ? 'text-[var(--color-text-muted)]' : 'text-[var(--color-text-muted)]/80'}`}
                      >
                        {option.subLabel}
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
      >
        <div className="flex items-center gap-2 truncate pr-4">
          {isLoading ? (
            <Loader2 size={14} className="animate-spin text-[var(--color-text-muted)]" />
          ) : selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.icon && <span className="shrink-0">{selectedOption.icon}</span>}
              <span className="text-[var(--color-text-primary)] font-bold truncate">
                {selectedOption.label}
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
