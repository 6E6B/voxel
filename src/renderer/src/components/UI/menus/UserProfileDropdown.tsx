import React, { useState, useRef } from 'react'
import { ChevronDown, LogOut, User } from 'lucide-react'
import { useClickOutside } from '../../../hooks/useClickOutside'
import { motion, AnimatePresence } from 'framer-motion'
import { Avatar, AvatarImage, AvatarFallback } from '../display/Avatar'
import { Account } from '../../../types'

interface UserProfileDropdownProps {
  account: Account | null
  onSignOut: () => void
}

const UserProfileDropdown: React.FC<UserProfileDropdownProps> = ({ account, onSignOut }) => {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useClickOutside(dropdownRef, () => setIsOpen(false))

  if (!account) {
    return (
      <div
        className="flex items-center gap-2 px-3 py-1.5 text-sm text-neutral-500"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <User size={16} />
        <span>No account selected</span>
      </div>
    )
  }

  return (
    <div
      className="relative"
      ref={dropdownRef}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="pressable flex items-center gap-2 px-2 py-1.5 rounded-[var(--control-radius)] hover:bg-[var(--color-surface-hover)] transition-colors border border-transparent"
      >
        <Avatar className="h-7 w-7">
          <AvatarImage src={account.avatarUrl} alt={account.displayName} />
          <AvatarFallback>{account.displayName?.charAt(0).toUpperCase() || 'U'}</AvatarFallback>
        </Avatar>
        <div className="flex flex-col items-start">
          <span className="text-sm font-medium text-neutral-200 leading-tight">
            {account.displayName}
          </span>
          <span className="text-xs text-neutral-500 leading-tight">@{account.username}</span>
        </div>
        <ChevronDown
          size={14}
          className={`text-neutral-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full right-0 mt-1 w-48 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-[var(--menu-radius)] shadow-xl z-[100] py-1 overflow-hidden"
          >
            <div className="px-3 py-2 border-b border-[var(--color-border)]">
              <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                {account.displayName}
              </p>
              <p className="text-xs text-[var(--color-text-muted)] truncate">@{account.username}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsOpen(false)
                onSignOut()
              }}
              className="pressable w-full text-left px-3 py-2 text-sm flex items-center gap-2 text-red-400 hover:bg-neutral-800 hover:text-red-300 transition-colors"
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default UserProfileDropdown
