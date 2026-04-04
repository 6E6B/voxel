import React, { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@renderer/shared/lib/utils'

interface PaginatedListProps<T> {
  items: T[]
  itemsPerPage?: number
  renderItem: (item: T, index: number, globalIndex: number) => React.ReactNode
  keyExtractor: (item: T, index: number) => string | number
  className?: string
  emptyMessage?: string
}

export function PaginatedList<T>({
  items,
  itemsPerPage = 5,
  renderItem,
  keyExtractor,
  className,
  emptyMessage = 'No items found'
}: PaginatedListProps<T>) {
  const [currentPage, setCurrentPage] = useState(0)

  if (items.length === 0) {
    return <div className="text-center py-6 text-neutral-500 text-sm">{emptyMessage}</div>
  }

  const totalPages = Math.ceil(items.length / itemsPerPage)
  const startIndex = currentPage * itemsPerPage
  const visibleItems = items.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className={cn('space-y-3', className)}>
      <div className="space-y-2">
        {visibleItems.map((item, index) => (
          <React.Fragment key={keyExtractor(item, index)}>
            {renderItem(item, index, startIndex + index)}
          </React.Fragment>
        ))}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2 border-t border-neutral-800/50">
          <span className="text-xs text-neutral-500">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, items.length)} of {items.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                currentPage === 0
                  ? 'text-neutral-600 cursor-not-allowed'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              )}
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-xs text-neutral-400 px-2">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
              className={cn(
                'p-1.5 rounded-lg transition-all',
                currentPage >= totalPages - 1
                  ? 'text-neutral-600 cursor-not-allowed'
                  : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
              )}
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
