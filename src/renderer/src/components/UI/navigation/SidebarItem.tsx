import { LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { Tooltip, TooltipTrigger, TooltipContent } from '../display/Tooltip'
import { cn } from '../../../lib/utils'

interface SidebarItemProps {
  icon: LucideIcon
  label: string
  isActive: boolean
  isCollapsed: boolean
  onClick: () => void
  count?: number
  disableLayoutAnimation?: boolean
}

const SidebarItem = ({
  icon: Icon,
  label,
  isActive,
  isCollapsed,
  onClick,
  count,
  disableLayoutAnimation = false
}: SidebarItemProps) => {
  const shouldAnimateLayout = !disableLayoutAnimation && !isCollapsed
  const layoutProp = shouldAnimateLayout ? 'position' : false
  const layoutTransition = shouldAnimateLayout ? { layout: { duration: 0.18 } } : undefined

  const content = (
    <motion.button
      layout={layoutProp}
      transition={layoutTransition}
      onMouseDown={onClick}
      className={cn(
        'w-full flex items-center py-4 mb-1 transition-colors duration-200 relative group',
        isActive
          ? 'bg-[var(--color-surface-hover)] text-[var(--color-text-primary)]'
          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]',
        isCollapsed ? 'justify-center' : 'px-6 gap-3'
      )}
    >
      {isActive && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 w-[3px] bg-[var(--accent-color)]"
          initial={{ opacity: 0, scaleY: 0.8 }}
          animate={{ opacity: 1, scaleY: 1 }}
          exit={{ opacity: 0, scaleY: 0.8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
        />
      )}
      <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className="shrink-0 relative z-10" />
      <span
        className={cn(
          'font-medium text-sm whitespace-nowrap overflow-hidden transition-all duration-200 origin-left relative z-10 flex items-center gap-2',
          isCollapsed ? 'opacity-0 w-0' : 'opacity-100 w-auto'
        )}
      >
        {label}
        {count !== undefined && !isCollapsed && (
          <span className="text-xs font-normal text-[var(--color-text-muted)] bg-[var(--color-surface-muted)] px-1.5 py-0.5 rounded">
            {count}
          </span>
        )}
      </span>
    </motion.button>
  )

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {label}
          {count !== undefined && ` (${count})`}
        </TooltipContent>
      </Tooltip>
    )
  }

  return content
}

export default SidebarItem
