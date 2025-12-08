import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Filter, Check } from 'lucide-react'
import { Button } from '@renderer/components/UI/buttons/Button'
import { InventoryCategory, InventorySubcategory } from './inventoryCategories'

interface InventoryFilterSidebarProps {
  // Categories
  categories: InventoryCategory[]
  selectedCategory: InventoryCategory | null
  selectedSubcategory: InventorySubcategory | null
  onCategoryChange: (category: InventoryCategory | null) => void
  onSubcategoryChange: (subcategory: InventorySubcategory | null) => void

  // Sort
  sortOrder: 'Asc' | 'Desc'
  onSortOrderChange: (sortOrder: 'Asc' | 'Desc') => void

  onClearAll: () => void
  hasActiveFilters: boolean
}

const FilterSection = ({
  title,
  children,
  isOpenDefault = true
}: {
  title: string
  children: React.ReactNode
  isOpenDefault?: boolean
}) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault)

  return (
    <div className="border-b border-[var(--color-border)] py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-between w-full text-sm font-bold text-[var(--color-text-primary)] hover:text-[var(--color-text-primary)] transition-colors group ${isOpen ? 'mb-2' : ''}`}
      >
        <span>{title}</span>
        <ChevronDown
          size={16}
          className={`text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-1 space-y-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export const InventoryFilterSidebar = ({
  categories,
  selectedCategory,
  selectedSubcategory,
  onCategoryChange,
  onSubcategoryChange,
  sortOrder,
  onSortOrderChange,
  onClearAll,
  hasActiveFilters
}: InventoryFilterSidebarProps) => {
  const isAllCategoriesSelected = !selectedCategory && !selectedSubcategory

  const handleSelectAllCategories = () => {
    onCategoryChange(null)
    onSubcategoryChange(null)
  }

  // Category Tree Item
  const CategoryItem = ({ category }: { category: InventoryCategory }) => {
    const isSelected = selectedCategory?.categoryId === category.categoryId && !selectedSubcategory
    const isParentOfSelected = selectedCategory?.categoryId === category.categoryId
    const [isExpanded, setIsExpanded] = useState(isParentOfSelected)

    // Auto-expand if children are selected
    React.useEffect(() => {
      if (isParentOfSelected) setIsExpanded(true)
    }, [isParentOfSelected])

    const handleCategoryClick = () => {
      onCategoryChange(category)
      onSubcategoryChange(null)

      if (category.subcategories.length > 0) {
        // For categories with subcategories, only toggle expansion (dropdown behavior)
        setIsExpanded(!isExpanded)
      }
    }

    return (
      <div className="space-y-1">
        <button
          onClick={handleCategoryClick}
          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors group ${
            isSelected
              ? 'bg-[rgba(var(--accent-color-rgb),0.1)] text-[var(--accent-color)] font-medium'
              : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-transparent hover:border-[var(--color-border-strong)]'
          }`}
        >
          {category.subcategories.length > 0 ? (
            <ChevronRight
              size={14}
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
            />
          ) : (
            <span className="w-3.5" /> // Spacer
          )}
          <span className="truncate text-left flex-1">{category.name}</span>
        </button>

        <AnimatePresence initial={false}>
          {isExpanded && category.subcategories.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-5 pl-2 border-l border-[var(--color-border)] space-y-0.5 py-1">
                {category.subcategories.map((sub) => (
                  <button
                    key={sub.subcategoryId}
                    onClick={() => {
                      onCategoryChange(category)
                      onSubcategoryChange(sub)
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors ${
                      selectedSubcategory?.subcategoryId === sub.subcategoryId
                        ? 'bg-[rgba(var(--accent-color-rgb),0.1)] text-[var(--accent-color)] font-medium'
                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-transparent hover:border-[var(--color-border-strong)]'
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
    <div className="w-[260px] shrink-0 flex flex-col h-full border-r border-[var(--color-border)] bg-[var(--color-surface-strong)]">
      <div className="px-4 flex items-center justify-between border-b border-[var(--color-border)] min-h-[72px]">
        <div className="flex items-center gap-2 text-[var(--color-text-primary)]">
          <Filter size={18} />
          <span className="font-bold">Filters</span>
        </div>
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearAll}
            className="h-7 px-2 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]"
          >
            Reset
          </Button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 scrollbar-thin">
        {/* Categories */}
        <div className="pb-4 border-b border-[var(--color-border)]">
          <div className="text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
            Categories
          </div>
          <div className="space-y-0.5">
            <button
              onClick={handleSelectAllCategories}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-colors group ${
                isAllCategoriesSelected
                  ? 'bg-[rgba(var(--accent-color-rgb),0.1)] text-[var(--accent-color)] font-medium'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] border border-transparent hover:border-[var(--color-border-strong)]'
              }`}
            >
              <span className="w-3.5" /> {/* Spacer to align with chevron */}
              <span className="truncate text-left flex-1">All Categories</span>
              {isAllCategoriesSelected && <Check size={14} className="shrink-0" />}
            </button>
            {categories.map((cat) => (
              <CategoryItem key={cat.categoryId} category={cat} />
            ))}
          </div>
        </div>

        {/* Sort Order */}
        <FilterSection title="Sort Order">
          <div className="space-y-1">
            <button
              onClick={() => onSortOrderChange('Desc')}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-all border ${
                sortOrder === 'Desc'
                  ? 'bg-[var(--color-surface-hover)] border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-medium shadow-[0_10px_30px_rgba(0,0,0,0.22)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              <span>Newest First</span>
            </button>
            <button
              onClick={() => onSortOrderChange('Asc')}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-all border ${
                sortOrder === 'Asc'
                  ? 'bg-[var(--color-surface-hover)] border-[var(--color-border-strong)] text-[var(--color-text-primary)] font-medium shadow-[0_10px_30px_rgba(0,0,0,0.22)]'
                  : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]'
              }`}
            >
              <span>Oldest First</span>
            </button>
          </div>
        </FilterSection>
      </div>
    </div>
  )
}
