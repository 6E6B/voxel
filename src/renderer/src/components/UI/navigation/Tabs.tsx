import React from 'react'
import { motion } from 'framer-motion'
import { LucideIcon } from 'lucide-react'
import { cn } from '@renderer/lib/utils'

export interface Tab {
  id: string
  label: string
  icon?: LucideIcon
  badge?: string | number
  badgeVariant?: 'default' | 'warning' | 'success' | 'error'
  hidden?: boolean
}

interface TabsProps {
  tabs: Tab[]
  activeTab: string
  onTabChange: (tabId: string) => void
  layoutId?: string
  className?: string
  tabClassName?: string
  actions?: React.ReactNode
}

const getBadgeClasses = (variant: Tab['badgeVariant'] = 'default') => {
  switch (variant) {
    case 'warning':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    case 'success':
      return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    case 'error':
      return 'bg-red-500/20 text-red-400 border-red-500/30'
    default:
      return 'bg-neutral-800 text-neutral-400'
  }
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  layoutId = 'tabIndicator',
  className,
  tabClassName,
  actions
}) => {
  const visibleTabs = tabs.filter((tab) => !tab.hidden)
  const tabCount = visibleTabs.length
  const tabWidth = 100 / tabCount
  const activeIndex = visibleTabs.findIndex((tab) => tab.id === activeTab)

  return (
    <div className={cn('flex border-b border-[var(--color-border)] shrink-0', className)}>
      <div className="relative flex flex-1">
        {/* Animated sliding indicator */}
        <motion.div
          className="absolute bottom-0 h-0.5 bg-[var(--accent-color)] z-20"
          layoutId={layoutId}
          initial={false}
          animate={{
            left: `${activeIndex * tabWidth}%`,
            width: `${tabWidth}%`
          }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        />
        {visibleTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id

          return (
            <button
              key={tab.id}
              onMouseDown={() => onTabChange(tab.id)}
              className={cn(
                'flex-1 py-4 text-sm font-medium transition-colors flex items-center justify-center gap-2 relative z-10 hover:bg-[var(--color-surface-hover)] active:bg-[var(--color-surface-muted)]',
                isActive
                  ? 'text-[var(--color-text-primary)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]',
                tabClassName
              )}
            >
              {Icon && <Icon size={14} />}
              {tab.label}
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'text-xs px-1.5 py-0.5 rounded-full border',
                    getBadgeClasses(tab.badgeVariant)
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          )
        })}
      </div>
      {actions && (
        <div className="flex items-center border-l border-neutral-800 shrink-0">{actions}</div>
      )}
    </div>
  )
}

export default Tabs
