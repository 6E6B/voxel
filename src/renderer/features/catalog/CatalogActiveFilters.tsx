import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CatalogActiveFiltersProps {
  filters: {
    minPrice?: number
    maxPrice?: number
    creatorName?: string
    salesType?: string
    unavailableItems?: string
    categoryName?: string
  }
  onClearFilter: (key: string) => void
  onClearAll: () => void
}

export const CatalogActiveFilters = ({
  filters,
  onClearFilter,
  onClearAll
}: CatalogActiveFiltersProps) => {
  const activeFilters: { key: string; label: string; value: string }[] = []

  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    const min = filters.minPrice !== undefined ? filters.minPrice : '0'
    const max = filters.maxPrice !== undefined ? filters.maxPrice : '∞'
    activeFilters.push({ key: 'price', label: 'Price', value: `${min} – ${max}` })
  }

  if (filters.creatorName) {
    activeFilters.push({ key: 'creator', label: 'Creator', value: filters.creatorName })
  }

  if (filters.salesType && filters.salesType !== '1') {
    const label = filters.salesType === '2' ? 'Collectibles' : 'Limiteds'
    activeFilters.push({ key: 'salesType', label: 'Type', value: label })
  }

  if (filters.unavailableItems === 'show') {
    activeFilters.push({ key: 'unavailable', label: 'Unavailable', value: 'Shown' })
  }

  if (activeFilters.length === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-1.5 px-5 py-2.5 bg-[var(--color-surface)]">
      <AnimatePresence>
        {activeFilters.map((filter) => (
          <motion.button
            key={filter.key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={() => onClearFilter(filter.key)}
            className="group flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md bg-[var(--accent-color)]/10 text-xs text-[var(--accent-color)] hover:bg-[var(--accent-color)]/20 transition-colors"
          >
            <span className="font-medium opacity-60">{filter.label}:</span>
            <span className="font-semibold">{filter.value}</span>
            <X size={12} className="ml-0.5 opacity-50 group-hover:opacity-100 transition-opacity" />
          </motion.button>
        ))}
      </AnimatePresence>

      {activeFilters.length > 1 && (
        <button
          onClick={onClearAll}
          className="text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--accent-color)] transition-colors ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
