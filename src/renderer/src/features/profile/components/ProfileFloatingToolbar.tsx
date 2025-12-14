import React from 'react'
import { motion } from 'framer-motion'
import { Shirt, Package, Box, Copy, Check } from 'lucide-react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@renderer/components/UI/display/Tooltip'

interface ProfileFloatingToolbarProps {
  onWearingClick: () => void
  onOutfitsClick: () => void
  onInventoryClick: () => void
  onCopyIdClick: () => void
}

export const ProfileFloatingToolbar: React.FC<ProfileFloatingToolbarProps> = ({
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
    { icon: Shirt, label: 'Currently Wearing', onClick: onWearingClick },
    { icon: Package, label: 'Outfits', onClick: onOutfitsClick },
    { icon: Box, label: 'Inventory', onClick: onInventoryClick },
    { icon: copied ? Check : Copy, label: copied ? 'Copied!' : 'Copy User ID', onClick: handleCopy }
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: 0.08 }}
      className="fixed bottom-6 right-6 z-50"
    >
      <div className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-2xl p-1 backdrop-blur">
        <div className="flex items-center">
          {actions.map((action, index) => (
            <Tooltip key={index}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={action.onClick}
                  className={
                    `pressable w-11 h-11 rounded-xl flex items-center justify-center ` +
                    `text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] ` +
                    `hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-strong)] ` +
                    (action.icon === Check ? 'text-emerald-400' : '')
                  }
                  aria-label={action.label}
                >
                  <action.icon size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" sideOffset={10}>
                {action.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </div>
    </motion.div>
  )
}
