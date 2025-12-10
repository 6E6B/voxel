import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Search, Filter, Check } from 'lucide-react'
import { Input } from '@renderer/components/UI/inputs/Input'
import { Button } from '@renderer/components/UI/buttons/Button'
import { DropdownOption } from '@renderer/components/UI/menus/CustomDropdown'
import { CatalogCategory, CatalogSubcategory } from '@renderer/ipc/windowApi'
import { PriceInput } from './PriceInput'

// Re-use options from parent or define here
const SALES_TYPE_OPTIONS: DropdownOption[] = [
  { value: '1', label: 'All Types' },
  { value: '2', label: 'Collectibles' },
  { value: '3', label: 'Limiteds' }
]

interface CatalogFilterSidebarProps {
  // Categories
  categories: CatalogCategory[]
  selectedCategory: CatalogCategory | null
  selectedSubcategory: CatalogSubcategory | null
  onCategoryChange: (category: CatalogCategory | null) => void
  onSubcategoryChange: (subcategory: CatalogSubcategory | null) => void

  // Filters
  minPrice: string
  maxPrice: string
  onMinPriceChange: (val: string) => void
  onMaxPriceChange: (val: string) => void
  onApplyPrice: () => void

  salesType: string
  onSalesTypeChange: (val: string) => void

  unavailableItems: string
  onUnavailableItemsChange: (val: string) => void

  creatorName: string
  onCreatorNameChange: (val: string) => void
  onApplyCreator: (val: string) => void

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

export const CatalogFilterSidebar = ({
  categories,
  selectedCategory,
  selectedSubcategory,
  onCategoryChange,
  onSubcategoryChange,
  minPrice,
  maxPrice,
  onMinPriceChange,
  onMaxPriceChange,
  onApplyPrice,
  salesType,
  onSalesTypeChange,
  unavailableItems,
  onUnavailableItemsChange,
  creatorName,
  onCreatorNameChange,
  onApplyCreator,
  onClearAll,
  hasActiveFilters
}: CatalogFilterSidebarProps) => {
  // Local state for creator input to avoid lag from store updates on every keystroke
  const [localCreatorName, setLocalCreatorName] = useState(creatorName)
  const isAllCategoriesSelected = !selectedCategory && !selectedSubcategory

  const handleSelectAllCategories = () => {
    onCategoryChange(null)
    onSubcategoryChange(null)
  }

  // Sync local state with store value when it changes externally (e.g., from clear filters)
  useEffect(() => {
    setLocalCreatorName(creatorName)
  }, [creatorName])

  // Category Tree Item
  const CategoryItem = ({ category }: { category: CatalogCategory }) => {
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

        {/* Sales Type */}
        <FilterSection title="Sales Type">
          <div className="space-y-1">
            {SALES_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onSalesTypeChange(option.value)}
                className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition-all border ${
                  salesType === option.value
                    ? 'bg-[rgba(var(--accent-color-rgb),0.1)] border-transparent text-[var(--accent-color)] font-medium'
                    : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)]'
                }`}
              >
                <span>{option.label}</span>
                {salesType === option.value && <Check size={14} />}
              </button>
            ))}
          </div>
        </FilterSection>

        {/* Price */}
        <FilterSection title="Price Range">
          <div className="space-y-3 px-1 pb-1">
            <div className="flex items-center gap-2">
              <PriceInput
                value={minPrice}
                onChange={onMinPriceChange}
                placeholder="0"
                label="Min"
              />
              <div className="w-2 h-[1px] bg-[var(--color-border)]" />
              <PriceInput
                value={maxPrice}
                onChange={onMaxPriceChange}
                placeholder="∞"
                label="Max"
              />
            </div>
            <Button size="sm" variant="secondary" onClick={onApplyPrice} className="w-full h-8">
              Apply Price
            </Button>
          </div>
        </FilterSection>

        {/* Creator */}
        <FilterSection title="Creator" isOpenDefault={!!creatorName}>
          <div className="space-y-3 px-1 pb-1">
            <div className="flex gap-2">
              <Input
                placeholder="Creator name..."
                value={localCreatorName}
                onChange={(e) => setLocalCreatorName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    onCreatorNameChange(localCreatorName)
                    onApplyCreator(localCreatorName)
                  }
                }}
                onBlur={() => {
                  // Sync to store on blur
                  onCreatorNameChange(localCreatorName)
                }}
                className="h-9 text-sm"
              />
              <Button
                size="icon"
                variant="secondary"
                onClick={() => {
                  onCreatorNameChange(localCreatorName)
                  onApplyCreator(localCreatorName)
                }}
                className="h-9 w-9 shrink-0"
              >
                <Search size={14} />
              </Button>
            </div>
            <label
              className="flex items-center gap-2 cursor-pointer group"
              onClick={(e) => {
                e.preventDefault()
                const isCurrentlyRoblox = localCreatorName === 'Roblox'
                const newValue = isCurrentlyRoblox ? '' : 'Roblox'
                setLocalCreatorName(newValue)
                onCreatorNameChange(newValue)
                onApplyCreator(newValue)
              }}
            >
              <div
                className={`
                  relative w-4 h-4 rounded-full border flex items-center justify-center transition-all cursor-pointer flex-shrink-0
                  ${
                    localCreatorName === 'Roblox'
                      ? 'border-[var(--color-border-strong)] bg-[var(--color-surface-hover)]'
                      : 'border-[var(--color-border)] group-hover:border-[var(--color-border-strong)]'
                  }
                `}
              >
                {localCreatorName === 'Roblox' && (
                  <div className="w-2 h-2 rounded-full bg-[var(--accent-color)]" />
                )}
              </div>
              <span
                className={`text-sm transition-colors ${
                  localCreatorName === 'Roblox'
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]'
                }`}
              >
                ROBLOX
              </span>
            </label>
          </div>
        </FilterSection>

        {/* Unavailable */}
        <FilterSection title="Availability" isOpenDefault={true}>
          <button
            onClick={() => onUnavailableItemsChange(unavailableItems === 'show' ? 'hide' : 'show')}
            className="flex items-center justify-between w-full group"
          >
            <span className="text-sm text-neutral-400 group-hover:text-white transition-colors">
              Show Unavailable
            </span>
            <div
              className={`w-9 h-5 rounded-full relative transition-colors duration-200 ${unavailableItems === 'show' ? 'bg-[rgba(var(--accent-color-rgb),0.2)]' : 'bg-neutral-800'}`}
            >
              <div
                className={`absolute top-1 w-3 h-3 rounded-full shadow-sm transition-all duration-200 ${unavailableItems === 'show' ? 'translate-x-5 bg-white' : 'translate-x-1 bg-neutral-500'}`}
              />
            </div>
          </button>
        </FilterSection>
      </div>
    </div>
  )
}
