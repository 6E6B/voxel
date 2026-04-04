import React from 'react'
import { cn } from '@renderer/shared/lib/utils'
import { CATEGORIES, CATEGORY_ICONS, type MainCategory } from '../categoryUtils'
import type { LucideProps } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@renderer/shared/ui/display/Tooltip'

interface CategorySelectorProps {
  mainCategory: MainCategory
  subCategory: string
  onMainCategoryChange: (category: MainCategory) => void
  onSubCategoryChange: (subCategory: string) => void
}

/** Vertical icon rail for main categories */
export const CategorySidebar: React.FC<{
  mainCategory: MainCategory
  onMainCategoryChange: (category: MainCategory) => void
}> = ({ mainCategory, onMainCategoryChange }) => {
  return (
    <div className="flex flex-col items-center w-[60px] shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface-strong)] py-2 gap-1">
      {(Object.keys(CATEGORIES) as MainCategory[]).map((category) => {
        const Icon = CATEGORY_ICONS[category] as React.FC<LucideProps>
        const isActive = mainCategory === category
        return (
          <Tooltip key={category}>
            <TooltipTrigger asChild>
              <button
                onMouseDown={() => onMainCategoryChange(category)}
                className={cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-200 cursor-pointer',
                  isActive
                    ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)] shadow-md shadow-[var(--accent-color-shadow)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
                )}
              >
                <Icon size={17} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" sideOffset={8}>
              {category}
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

/** Horizontal sub-category pill tabs */
export const SubCategoryTabs: React.FC<{
  mainCategory: MainCategory
  subCategory: string
  onSubCategoryChange: (subCategory: string) => void
}> = ({ mainCategory, subCategory, onSubCategoryChange }) => {
  return (
    <div className="flex items-center px-4 py-2.5 overflow-x-auto scrollbar-hide border-b border-[var(--color-border)] bg-[var(--color-surface-inset)]">
      <div className="flex items-center gap-1.5">
        {CATEGORIES[mainCategory].map((sub) => {
          const isActive = subCategory === sub
          return (
            <button
              key={sub}
              onMouseDown={() => onSubCategoryChange(sub)}
              className={cn(
                'px-3 py-1.5 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all duration-200 cursor-pointer',
                isActive
                  ? 'bg-[var(--accent-color)] text-[var(--accent-color-foreground)] shadow-sm shadow-[var(--accent-color-shadow)]'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-surface-hover)]'
              )}
            >
              {sub}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Legacy combined selector (kept for backwards compatibility) */
export const CategorySelector: React.FC<CategorySelectorProps> = ({
  mainCategory,
  subCategory,
  onMainCategoryChange,
  onSubCategoryChange
}) => {
  return (
    <>
      <CategorySidebar
        mainCategory={mainCategory}
        onMainCategoryChange={onMainCategoryChange}
      />
      <SubCategoryTabs
        mainCategory={mainCategory}
        subCategory={subCategory}
        onSubCategoryChange={onSubCategoryChange}
      />
    </>
  )
}


