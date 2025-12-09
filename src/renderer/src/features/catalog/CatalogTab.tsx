import {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
  CSSProperties,
  forwardRef,
  useImperativeHandle
} from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { VirtuosoGrid } from 'react-virtuoso'
import { Package, Loader2, Grid3X3, Grid2X2 } from 'lucide-react'
import { SearchInput } from '@renderer/components/UI/inputs/SearchInput'
import { TooltipProvider } from '@renderer/components/UI/display/Tooltip'
import CustomDropdown, { DropdownOption } from '@renderer/components/UI/menus/CustomDropdown'
import { SkeletonSquareCard } from '@renderer/components/UI/display/SkeletonCard'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import { CatalogItemCard } from '@renderer/components/UI/display/CatalogItemCard'
import {
  useCatalogNavigation,
  useCatalogSearch,
  useCatalogThumbnails as useFetchCatalogThumbnails,
  useCatalogSearchSuggestions
} from '@renderer/hooks/queries'
import { useClickOutside } from '@renderer/hooks/useClickOutside'
import type { CatalogItemsSearchParams, CatalogItemsSearchResponse } from '@renderer/ipc/windowApi'
import {
  useCatalogAppliedSearchQuery,
  useSetCatalogAppliedSearchQuery,
  useCatalogSelectedCategory,
  useSetCatalogSelectedCategory,
  useCatalogSelectedSubcategory,
  useSetCatalogSelectedSubcategory,
  useCatalogSortType,
  useSetCatalogSortType,
  useCatalogSalesTypeFilter,
  useSetCatalogSalesTypeFilter,
  useCatalogUnavailableItems,
  useSetCatalogUnavailableItems,
  useCatalogMinPrice,
  useSetCatalogMinPrice,
  useCatalogMaxPrice,
  useSetCatalogMaxPrice,
  useCatalogCreatorName,
  useSetCatalogCreatorName,
  useCatalogAppliedMinPrice,
  useSetCatalogAppliedMinPrice,
  useCatalogAppliedMaxPrice,
  useSetCatalogAppliedMaxPrice,
  useCatalogAppliedCreatorName,
  useSetCatalogAppliedCreatorName,
  useCatalogThumbnails,
  useClearCatalogFilters
} from '@renderer/stores/useCatalogStore'
import { useCatalogViewMode, useSetCatalogViewMode } from '@renderer/stores/useViewPreferencesStore'
import CatalogItemContextMenu from './CatalogItemContextMenu'
import { CatalogFilterSidebar } from './CatalogFilterSidebar'
import { CatalogActiveFilters } from './CatalogActiveFilters'

const SORT_OPTIONS: DropdownOption[] = [
  { value: '0', label: 'Relevance' },
  { value: '1', label: 'Most Favorited' },
  { value: '2', label: 'Bestselling' },
  { value: '3', label: 'Recently Published' },
  { value: '4', label: 'Price (High to Low)' },
  { value: '5', label: 'Price (Low to High)' }
]

// Search Bar Component
interface CatalogSearchBarRef {
  clear: () => void
  setValue: (value: string) => void
}

interface CatalogSearchBarProps {
  onSearch: (query: string) => void
  className?: string
}

const CatalogSearchBar = forwardRef<CatalogSearchBarRef, CatalogSearchBarProps>(
  ({ onSearch, className }, ref) => {
    const [query, setQuery] = useState('')
    const [showSuggestions, setShowSuggestions] = useState(false)
    const [debouncedQuery, setDebouncedQuery] = useState('')
    const containerRef = useRef<HTMLDivElement>(null)

    useClickOutside(containerRef, () => setShowSuggestions(false))

    useEffect(() => {
      const timer = setTimeout(() => {
        setDebouncedQuery(query)
      }, 150)
      return () => clearTimeout(timer)
    }, [query])

    const { data: suggestions = [] } = useCatalogSearchSuggestions(debouncedQuery)

    useImperativeHandle(ref, () => ({
      clear: () => {
        setQuery('')
        setShowSuggestions(false)
      },
      setValue: (value: string) => {
        setQuery(value)
      }
    }))

    const handleSearch = () => {
      onSearch(query)
      setShowSuggestions(false)
    }

    const handleClear = () => {
      setQuery('')
      onSearch('')
      setShowSuggestions(false)
    }

    return (
      <div className={`relative w-72 ${className || ''}`} ref={containerRef}>
        <SearchInput
          value={query}
          onChange={(value) => {
            setQuery(value)
            setShowSuggestions(true)
          }}
          placeholder="Search catalog"
          onFocus={() => setShowSuggestions(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              handleSearch()
            }
          }}
          onClear={handleClear}
          className="bg-neutral-900 border-neutral-800"
        />

        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute top-full left-0 right-0 mt-2 bg-neutral-900 border border-neutral-800 rounded-xl shadow-2xl z-[80] overflow-hidden max-h-60 overflow-y-auto ring-1 ring-[var(--accent-color-ring)]"
            >
              {suggestions.map((suggestion, index) => (
                <button
                  key={index}
                  className="w-full text-left px-4 py-2 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors truncate"
                  onClick={() => {
                    setQuery(suggestion)
                    onSearch(suggestion)
                    setShowSuggestions(false)
                  }}
                >
                  {suggestion}
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }
)
CatalogSearchBar.displayName = 'CatalogSearchBar'

interface CatalogTabProps {
  onItemSelect?: (item: { id: number; name: string; imageUrl?: string }) => void
  onCreatorSelect?: (creatorId: number, creatorName?: string) => void
  cookie?: string // Optional cookie for authenticated requests (higher rate limits)
}

const CatalogTab = ({ onItemSelect, onCreatorSelect, cookie }: CatalogTabProps) => {
  // View Mode (persisted via Zustand)
  const viewMode = useCatalogViewMode()
  const setViewMode = useSetCatalogViewMode()

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    assetId: number
    assetName: string
    assetType?: number
  } | null>(null)

  // Search state from store
  const appliedSearchQuery = useCatalogAppliedSearchQuery()
  const setAppliedSearchQuery = useSetCatalogAppliedSearchQuery()
  const searchBarRef = useRef<CatalogSearchBarRef>(null)

  // Filter state from store
  const selectedCategory = useCatalogSelectedCategory()
  const setSelectedCategory = useSetCatalogSelectedCategory()
  const selectedSubcategory = useCatalogSelectedSubcategory()
  const setSelectedSubcategory = useSetCatalogSelectedSubcategory()
  const sortType = useCatalogSortType()
  const setSortType = useSetCatalogSortType()
  const salesTypeFilter = useCatalogSalesTypeFilter()
  const setSalesTypeFilter = useSetCatalogSalesTypeFilter()
  const unavailableItems = useCatalogUnavailableItems()
  const setUnavailableItems = useSetCatalogUnavailableItems()
  const minPrice = useCatalogMinPrice()
  const setMinPrice = useSetCatalogMinPrice()
  const maxPrice = useCatalogMaxPrice()
  const setMaxPrice = useSetCatalogMaxPrice()
  const creatorName = useCatalogCreatorName()
  const setCreatorName = useSetCatalogCreatorName()

  // Applied filters from store
  const appliedMinPrice = useCatalogAppliedMinPrice()
  const setAppliedMinPrice = useSetCatalogAppliedMinPrice()
  const appliedMaxPrice = useCatalogAppliedMaxPrice()
  const setAppliedMaxPrice = useSetCatalogAppliedMaxPrice()
  const appliedCreatorName = useCatalogAppliedCreatorName()
  const setAppliedCreatorName = useSetCatalogAppliedCreatorName()

  // Thumbnails cache from store
  const thumbnails = useCatalogThumbnails()

  // Clear filters function
  const clearCatalogFilters = useClearCatalogFilters()

  // Fetch navigation menu
  const { data: categories = [] } = useCatalogNavigation()

  // Build search params
  const searchParams: CatalogItemsSearchParams = useMemo(() => {
    const params: CatalogItemsSearchParams = {
      limit: 120,
      sortType: parseInt(sortType),
      includeNotForSale: unavailableItems === 'show'
    }

    // Only include salesTypeFilter if it's not '1' (All)
    const salesTypeFilterNum = parseInt(salesTypeFilter)
    if (salesTypeFilterNum !== 1) {
      params.salesTypeFilter = salesTypeFilterNum
    }

    if (appliedSearchQuery) {
      params.keyword = appliedSearchQuery
    }

    // Use subcategory taxonomy if selected, otherwise category taxonomy
    if (selectedSubcategory) {
      params.taxonomy = selectedSubcategory.taxonomy
    } else if (selectedCategory) {
      params.taxonomy = selectedCategory.taxonomy
    }

    if (appliedMinPrice !== undefined) {
      params.minPrice = appliedMinPrice
    }
    if (appliedMaxPrice !== undefined) {
      params.maxPrice = appliedMaxPrice
    }
    if (appliedCreatorName) {
      params.creatorName = appliedCreatorName
    }

    // Include cookie for authenticated requests (higher rate limits)
    if (cookie) {
      params.cookie = cookie
    }

    return params
  }, [
    appliedSearchQuery,
    selectedCategory,
    selectedSubcategory,
    sortType,
    salesTypeFilter,
    unavailableItems,
    appliedMinPrice,
    appliedMaxPrice,
    appliedCreatorName,
    cookie
  ])

  // Fetch catalog items
  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } =
    useCatalogSearch(searchParams)

  // Flatten pages into single array
  const items = useMemo(() => {
    if (!data?.pages) return []
    return (data.pages as CatalogItemsSearchResponse[]).flatMap((page) => page.data)
  }, [data])

  // Sync thumbnails using the query hook (replaces manual useEffect)
  useFetchCatalogThumbnails(items)

  // Apply price filter
  const handleApplyPriceFilter = useCallback(() => {
    setAppliedMinPrice(minPrice ? parseInt(minPrice) : undefined)
    setAppliedMaxPrice(maxPrice ? parseInt(maxPrice) : undefined)
  }, [minPrice, maxPrice])

  // Apply creator filter
  const handleApplyCreatorFilter = useCallback(
    (name: string) => {
      setAppliedCreatorName(name)
    },
    [setAppliedCreatorName]
  )

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    clearCatalogFilters()
    setAppliedSearchQuery('')
    searchBarRef.current?.clear()
  }, [clearCatalogFilters, setAppliedSearchQuery])

  // Check if any filters are active
  const hasActiveFilters = useMemo(() => {
    return (
      selectedCategory !== null ||
      sortType !== '0' ||
      salesTypeFilter !== '1' ||
      unavailableItems !== 'show' ||
      appliedMinPrice !== undefined ||
      appliedMaxPrice !== undefined ||
      appliedCreatorName !== ''
    )
  }, [
    selectedCategory,
    sortType,
    salesTypeFilter,
    unavailableItems,
    appliedMinPrice,
    appliedMaxPrice,
    appliedCreatorName
  ])

  // Handle item click
  const handleItemClick = useCallback(
    (item: (typeof items)[0]) => {
      if (onItemSelect) {
        onItemSelect({
          id: item.id,
          name: item.name,
          imageUrl: thumbnails[item.id]
        })
      }
    },
    [onItemSelect, thumbnails]
  )

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: { id: number; name: string; assetType?: number }) => {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        assetId: item.id,
        assetName: item.name,
        assetType: item.assetType
      })
    },
    []
  )

  // Handle download OBJ
  const handleDownloadObj = useCallback(async (assetId: number, assetName: string) => {
    try {
      const result = await (window as any).api.downloadAsset3D(assetId, 'obj', assetName)
      if (result.success) {
      }
    } catch (err) {
      console.error('Failed to download OBJ:', err)
    }
  }, [])

  // Handle download texture
  const handleDownloadTexture = useCallback(async (assetId: number, assetName: string) => {
    try {
      const result = await (window as any).api.downloadAsset3D(assetId, 'texture', assetName)
      if (result.success) {
      }
    } catch (err) {
      console.error('Failed to download texture:', err)
    }
  }, [])

  const handleCopyAssetId = useCallback(async (assetId: number) => {
    try {
      await navigator.clipboard.writeText(String(assetId))
    } catch (err) {
      console.error('Failed to copy asset ID:', err)
      // Fallback for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = String(assetId)
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
    }
  }, [])

  const handleDownloadTemplate = async (assetId: number, assetName: string) => {
    try {
      const result = await window.api.downloadCatalogTemplate(assetId, assetName, cookie)
      if (result.success) {
      } else {
        console.error('Failed to download template:', result.message)
      }
    } catch (err) {}
  }

  const gridStyle: CSSProperties = {
    gridTemplateColumns:
      viewMode === 'compact'
        ? 'repeat(auto-fill, minmax(140px, 1fr))'
        : 'repeat(auto-fill, minmax(200px, 1fr))'
  }

  const gridClassName =
    viewMode === 'compact'
      ? 'grid gap-4 grid-cols-[repeat(auto-fill,minmax(140px,1fr))]'
      : 'grid gap-4 grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'

  return (
    <TooltipProvider>
      <div className="flex h-full bg-neutral-950">
        {/* Left Sidebar Filter */}
        <CatalogFilterSidebar
          categories={categories}
          selectedCategory={selectedCategory}
          selectedSubcategory={selectedSubcategory}
          onCategoryChange={setSelectedCategory}
          onSubcategoryChange={setSelectedSubcategory}
          minPrice={minPrice}
          maxPrice={maxPrice}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onApplyPrice={handleApplyPriceFilter}
          salesType={salesTypeFilter}
          onSalesTypeChange={setSalesTypeFilter}
          unavailableItems={unavailableItems}
          onUnavailableItemsChange={setUnavailableItems}
          creatorName={creatorName}
          onCreatorNameChange={setCreatorName}
          onApplyCreator={handleApplyCreatorFilter}
          onClearAll={handleClearFilters}
          hasActiveFilters={hasActiveFilters}
        />

        <div className="flex-1 flex flex-col min-w-0">
          {/* Toolbar */}
          <div className="shrink-0 h-[72px] bg-[var(--color-surface-strong)] border-b border-[var(--color-border)] z-20 flex items-center justify-between px-6 gap-4">
            <div className="flex items-center gap-4 flex-1">
              <h1 className="text-xl font-bold text-white">Catalog</h1>

              {/* Sort */}
              <CustomDropdown
                options={SORT_OPTIONS}
                value={sortType}
                onChange={setSortType}
                placeholder="Sort By"
                className="w-44"
              />
            </div>

            <div className="flex items-center gap-3">
              <CatalogSearchBar ref={searchBarRef} onSearch={setAppliedSearchQuery} />

              <div className="h-6 w-[1px] bg-neutral-800 mx-1" />

              {/* View Mode Toggle */}
              <div className="flex bg-neutral-900 rounded-lg p-1 border border-neutral-800">
                <button
                  onClick={() => setViewMode('default')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'default' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Default View"
                >
                  <Grid2X2 size={18} />
                </button>
                <button
                  onClick={() => setViewMode('compact')}
                  className={`p-1.5 rounded transition-all ${viewMode === 'compact' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-500 hover:text-neutral-300'}`}
                  title="Compact View"
                >
                  <Grid3X3 size={18} />
                </button>
              </div>
            </div>
          </div>

          {/* Active Filters Chips */}
          <CatalogActiveFilters
            filters={{
              minPrice: appliedMinPrice,
              maxPrice: appliedMaxPrice,
              creatorName: appliedCreatorName,
              salesType: salesTypeFilter,
              unavailableItems: unavailableItems
            }}
            onClearFilter={(key) => {
              if (key === 'price') {
                setAppliedMinPrice(undefined)
                setAppliedMaxPrice(undefined)
                setMinPrice('')
                setMaxPrice('')
              } else if (key === 'creator') {
                setAppliedCreatorName('')
                setCreatorName('')
              } else if (key === 'salesType') {
                setSalesTypeFilter('1')
              } else if (key === 'unavailable') {
                setUnavailableItems('hide')
              }
            }}
            onClearAll={handleClearFilters}
          />

          {/* Content */}
          <div className="flex-1 overflow-y-auto pt-8 pb-6 px-6 scrollbar-thin bg-neutral-950">
            <AnimatePresence mode="wait">
              {isLoading && items.length === 0 ? (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="grid gap-4"
                  style={gridStyle}
                >
                  {Array.from({ length: 20 }).map((_, i) => (
                    <div
                      key={i}
                      className="bg-neutral-900/50 border border-neutral-800 rounded-xl overflow-hidden"
                    >
                      <SkeletonSquareCard showBorder={false} />
                      <div className="p-3 space-y-2">
                        <div className="h-4 bg-neutral-800 rounded animate-pulse w-3/4" />
                        <div className="h-3 bg-neutral-800 rounded animate-pulse w-1/2" />
                      </div>
                    </div>
                  ))}
                </motion.div>
              ) : items.length === 0 ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="flex items-center justify-center h-full"
                >
                  <EmptyState
                    icon={Package}
                    title="No items found"
                    description={
                      appliedSearchQuery
                        ? 'Try adjusting your search or filters'
                        : 'Browse the catalog by selecting a category'
                    }
                    variant="minimal"
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="items"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.3 }}
                  className="h-full"
                >
                  <VirtuosoGrid
                    totalCount={items.length}
                    overscan={200}
                    listClassName={gridClassName}
                    itemContent={(index) => {
                      const item = items[index]
                      return (
                        <CatalogItemCard
                          key={`${item.id}-${index}`}
                          item={item}
                          thumbnailUrl={thumbnails[item.id]}
                          index={index}
                          onClick={() => handleItemClick(item)}
                          onContextMenu={handleContextMenu}
                          onCreatorClick={onCreatorSelect}
                          isCompact={viewMode === 'compact'}
                        />
                      )
                    }}
                    endReached={() => {
                      if (hasNextPage && !isFetchingNextPage) {
                        fetchNextPage()
                      }
                    }}
                    components={{
                      Footer: () =>
                        isFetchingNextPage ? (
                          <div className="h-20 flex items-center justify-center">
                            <div className="flex items-center gap-2 text-neutral-500">
                              <Loader2 size={20} className="animate-spin" />
                              <span>Loading more...</span>
                            </div>
                          </div>
                        ) : null
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Context Menu */}
        <CatalogItemContextMenu
          activeMenu={contextMenu}
          onClose={() => setContextMenu(null)}
          onDownloadObj={handleDownloadObj}
          onDownloadTexture={handleDownloadTexture}
          onDownloadTemplate={handleDownloadTemplate}
          onCopyAssetId={handleCopyAssetId}
        />
      </div>
    </TooltipProvider>
  )
}

export default CatalogTab
