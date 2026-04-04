import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronRight } from 'lucide-react'
import { InventoryCategory, InventorySubcategory } from './inventoryCategories'

interface InventoryFilterSidebarProps {
  categories: InventoryCategory[]
  selectedCategory: InventoryCategory | null
  selectedSubcategory: InventorySubcategory | null
  onCategoryChange: (category: InventoryCategory | null) => void
  onSubcategoryChange: (subcategory: InventorySubcategory | null) => void
  onClearAll: () => void
  hasActiveFilters: boolean
}

export const InventoryFilterSidebar = ({
  categories,
  selectedCategory,
  selectedSubcategory,
  onCategoryChange,
  onSubcategoryChange,
  onClearAll,
  hasActiveFilters
}: InventoryFilterSidebarProps) => {
  const CategoryItem = ({ category }: { category: InventoryCategory }) => {
    const isSelected = selectedCategory?.categoryId === category.categoryId && !selectedSubcategory
    const isParentOfSelected = selectedCategory?.categoryId === category.categoryId
    const [isExpanded, setIsExpanded] = useState(isParentOfSelected)

    React.useEffect(() => {
      if (selectedCategory === null) {
        setIsExpanded(false)
        return
      }

      if (isParentOfSelected) {
        setIsExpanded(true)
      }
    }, [isParentOfSelected, selectedCategory])

    const handleCategoryClick = () => {
      onCategoryChange(category)
      onSubcategoryChange(null)
    }

    return (
      <div>
        <div
          className={`w-full flex items-center gap-0.5 rounded-lg pl-1.5 text-[13px] transition-all duration-150 ${
            isSelected
              ? 'bg-[var(--accent-color)] text-white font-medium shadow-sm shadow-[var(--accent-color)]/25'
              : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-hover)]'
          }`}
        >
          {category.subcategories.length > 0 ? (
            <button
              type="button"
              aria-label={isExpanded ? `Collapse ${category.name}` : `Expand ${category.name}`}
              onClick={(event) => {
                event.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="shrink-0 flex h-7 w-5 items-center justify-center rounded-md"
            >
              <ChevronRight
                size={13}
                className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''} ${isSelected ? 'text-white/70' : 'text-[var(--color-text-muted)]'}`}
              />
            </button>
          ) : (
            <span className="w-5 shrink-0" />
          )}
          <button
            type="button"
            onClick={handleCategoryClick}
            className={`min-w-0 flex-1 px-1.5 py-[7px] text-left rounded-lg transition-colors ${
              isSelected
                ? 'text-white'
                : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
            }`}
          >
            <span className="truncate block">{category.name}</span>
          </button>
        </div>

        <AnimatePresence initial={false}>
          {isExpanded && category.subcategories.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15, ease: 'easeOut' }}
              className="overflow-hidden"
            >
              <div className="ml-3 mr-1 mt-1 border-l-2 border-[var(--color-border)] pl-2.5 pr-1 py-1.5 space-y-1">
                {category.subcategories.map((sub) => (
                  <button
                    key={sub.subcategoryId}
                    onClick={() => {
                      onCategoryChange(category)
                      onSubcategoryChange(sub)
                    }}
                    className={`w-full text-left px-3 py-[7px] rounded-lg text-[12px] transition-all duration-150 ${
                      selectedSubcategory?.subcategoryId === sub.subcategoryId
                        ? 'bg-[var(--accent-color)] text-white font-medium shadow-sm shadow-[var(--accent-color)]/25'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                    }`}
                  >
                    {sub.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="w-[244px] shrink-0 flex flex-col h-full border-r border-[var(--color-border)] bg-[var(--color-surface)]">
      {/* Header */}
      <div className="px-5 flex items-center justify-between min-h-[60px]">
        <span className="font-semibold text-sm text-[var(--color-text-primary)]">Filters</span>
        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--accent-color)] transition-colors"
          >
            Reset all
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 scrollbar-thin">
        {/* Categories */}
        <div className="pb-1">
          <div className="text-[12px] font-semibold text-[var(--color-text-muted)] mb-2 px-1">
            Categories
          </div>
          <div className="space-y-0.5">
            {categories.map((cat) => (
              <CategoryItem key={cat.categoryId} category={cat} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
