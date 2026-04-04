import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronRight, Search, Check } from 'lucide-react'
import { Input } from '@renderer/shared/ui/inputs/Input'
import { Button } from '@renderer/shared/ui/buttons/Button'
import { DropdownOption } from '@renderer/shared/ui/menus/CustomDropdown'
import type { CatalogCategory, CatalogSubcategory } from '@shared/contracts/avatar'
import { PriceInput } from './PriceInput'

const SALES_TYPE_OPTIONS: DropdownOption[] = [
  { value: '1', label: 'All Types' },
  { value: '2', label: 'Collectibles' },
  { value: '3', label: 'Limiteds' }
]

interface CatalogFilterSidebarProps {
  categories: CatalogCategory[]
  selectedCategory: CatalogCategory | null
  selectedSubcategory: CatalogSubcategory | null
  onCategoryChange: (category: CatalogCategory | null) => void
  onSubcategoryChange: (subcategory: CatalogSubcategory | null) => void
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
  isOpenDefault = true,
  contentClassName
}: {
  title: string
  children: React.ReactNode
  isOpenDefault?: boolean
  contentClassName?: string
}) => {
  const [isOpen, setIsOpen] = useState(isOpenDefault)

  return (
    <div className="pt-3 pb-0.5">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-[12px] font-semibold text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors group mb-1.5"
      >
        <span>{title}</span>
        <ChevronDown
          size={14}
          className={`text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className={`space-y-2 px-1 ${contentClassName ?? ''}`}>{children}</div>
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
  const [localCreatorName, setLocalCreatorName] = useState(creatorName)

  useEffect(() => {
    setLocalCreatorName(creatorName)
  }, [creatorName])

  const CategoryItem = ({ category }: { category: CatalogCategory }) => {
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

        <div className="h-px bg-[var(--color-border)] mx-1" />

        {/* Sales Type */}
        <FilterSection title="Sales Type">
          <div className="space-y-0.5">
            {SALES_TYPE_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => onSalesTypeChange(option.value)}
                className={`w-full flex items-center justify-between px-3 py-[8px] rounded-lg text-[13px] transition-all duration-150 ${
                  salesType === option.value
                    ? 'bg-[var(--accent-color)] text-white font-medium shadow-sm shadow-[var(--accent-color)]/25'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                }`}
              >
                <span>{option.label}</span>
                {salesType === option.value && <Check size={13} className="text-white/70" />}
              </button>
            ))}
          </div>
        </FilterSection>

        <div className="h-px bg-[var(--color-border)] mx-1" />

        {/* Price */}
        <FilterSection title="Price Range" contentClassName="pb-2.5">
          <div className="space-y-2.5">
            <div className="flex items-center gap-2 px-0.5">
              <PriceInput
                value={minPrice}
                onChange={onMinPriceChange}
                placeholder="0"
                label="Min"
                className="bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface)] focus-visible:ring-[var(--accent-color)]/35"
              />
              <span className="text-[var(--color-text-muted)] text-xs">—</span>
              <PriceInput
                value={maxPrice}
                onChange={onMaxPriceChange}
                placeholder="∞"
                label="Max"
                className="bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface)] focus-visible:ring-[var(--accent-color)]/35"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={onApplyPrice}
              className="w-full h-8 text-xs font-medium px-3 bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] shadow-none hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
            >
              Apply Price
            </Button>
          </div>
        </FilterSection>

        <div className="h-px bg-[var(--color-border)] mx-1" />

        {/* Creator */}
        <FilterSection title="Creator" isOpenDefault={!!creatorName} contentClassName="pb-2.5">
          <div className="space-y-2.5">
            <div className="flex gap-1.5 px-0.5">
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
                onBlur={() => onCreatorNameChange(localCreatorName)}
                className="h-8 text-xs bg-[var(--color-surface)] border-[var(--color-border)] hover:bg-[var(--color-surface)] focus-visible:border-[var(--accent-color)] focus-visible:ring-1 focus-visible:ring-[var(--accent-color)]/35 focus-visible:ring-offset-0"
              />
              <Button
                size="icon"
                variant="secondary"
                onClick={() => {
                  onCreatorNameChange(localCreatorName)
                  onApplyCreator(localCreatorName)
                }}
                className="h-8 w-8 shrink-0 bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-secondary)] shadow-none hover:bg-[var(--color-surface-hover)] hover:text-[var(--color-text-primary)]"
              >
                <Search size={13} />
              </Button>
            </div>
            <label
              className="flex items-center gap-2.5 cursor-pointer group px-1"
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
                className={`relative w-[15px] h-[15px] rounded border-[1.5px] flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                  localCreatorName === 'Roblox'
                    ? 'border-[var(--accent-color)] bg-[var(--accent-color)]'
                    : 'border-[var(--color-border-strong)] group-hover:border-[var(--color-text-muted)]'
                }`}
              >
                {localCreatorName === 'Roblox' && (
                  <Check size={10} className="text-white" strokeWidth={3} />
                )}
              </div>
              <span
                className={`text-xs transition-colors ${
                  localCreatorName === 'Roblox'
                    ? 'text-[var(--color-text-primary)] font-medium'
                    : 'text-[var(--color-text-muted)] group-hover:text-[var(--color-text-primary)]'
                }`}
              >
                Roblox Only
              </span>
            </label>
          </div>
        </FilterSection>

        <div className="h-px bg-[var(--color-border)] mx-1" />

        {/* Unavailable */}
        <FilterSection title="Availability" isOpenDefault={true}>
          <button
            onClick={() => onUnavailableItemsChange(unavailableItems === 'show' ? 'hide' : 'show')}
            className="flex items-center justify-between w-full group px-1"
          >
            <span className="text-xs text-[var(--color-text-secondary)] group-hover:text-[var(--color-text-primary)] transition-colors">
              Show Unavailable
            </span>
            <div
              className={`w-8 h-[18px] rounded-full relative transition-all duration-200 ${unavailableItems === 'show' ? 'bg-[var(--accent-color)]' : 'bg-[var(--color-surface-muted)] border border-[var(--color-border)]'}`}
            >
              <div
                className={`absolute top-[3px] w-3 h-3 rounded-full transition-all duration-200 ${unavailableItems === 'show' ? 'translate-x-[18px] bg-white shadow-sm' : 'translate-x-[3px] bg-[var(--color-text-muted)]'}`}
              />
            </div>
          </button>
        </FilterSection>
      </div>
    </div>
  )
}

