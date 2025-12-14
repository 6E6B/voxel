import React from 'react'
import { motion } from 'framer-motion'
import { Shirt, Package, Box, Copy, Check } from 'lucide-react'

interface QuickActionsBarProps {
  onWearingClick: () => void
  onOutfitsClick: () => void
  onInventoryClick: () => void
  onCopyIdClick: () => void
}

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  onWearingClick,
  onOutfitsClick,
  onInventoryClick,
  onCopyIdClick
}) => {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    onCopyIdClick()
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  const actions = [
    {
      icon: Shirt,
      label: 'Currently Wearing',
      shortLabel: 'Wearing',
      onClick: onWearingClick
    },
    {
      icon: Package,
      label: 'Outfits',
      shortLabel: 'Outfits',
      onClick: onOutfitsClick
    },
    {
      icon: Box,
      label: 'Inventory',
      shortLabel: 'Inventory',
      onClick: onInventoryClick
    },
    {
      icon: copied ? Check : Copy,
      label: copied ? 'Copied!' : 'Copy User ID',
      shortLabel: copied ? 'Copied!' : 'Copy ID',
      onClick: handleCopy
    }
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="grid grid-cols-2 sm:grid-cols-4 gap-3"
    >
      {actions.map((action, index) => {
        const isSuccess = action.icon === Check

        return (
          <button
            key={index}
            onClick={action.onClick}
            className={
              `pressable group w-full text-left ` +
              `bg-[var(--color-surface-strong)] border border-[var(--color-border)] rounded-xl p-4 ` +
              `hover:border-[var(--color-border-strong)] hover:bg-[var(--color-surface-hover)] ` +
              `transition-colors`
            }
            aria-label={action.label}
            title={action.label}
            type="button"
          >
            <div className="flex items-start gap-3">
              <div
                className={
                  `shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ` +
                  `bg-[var(--color-surface-muted)] border border-[var(--color-border-subtle)] ` +
                  `group-hover:bg-[var(--color-surface-strong)] transition-colors ` +
                  (isSuccess ? 'text-emerald-400' : 'text-[var(--color-text-secondary)]')
                }
              >
                <action.icon size={18} />
              </div>

              <div className="min-w-0">
                <div className="text-sm font-bold text-[var(--color-text-primary)] leading-tight">
                  {action.shortLabel}
                </div>
              </div>
            </div>
          </button>
        )
      })}
    </motion.div>
  )
}
