import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Loader2, Grid2X2, Grid3X3, User } from 'lucide-react'
import { VirtuosoGrid } from 'react-virtuoso'
import { SearchInput } from '@renderer/components/UI/inputs/SearchInput'
import CustomDropdown, { DropdownOption } from '@renderer/components/UI/menus/CustomDropdown'
import { SkeletonSquareCard } from '@renderer/components/UI/display/SkeletonCard'
import { EmptyState } from '@renderer/components/UI/feedback/EmptyState'
import {
  Sheet,
  SheetContent,
  SheetHandle,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetBody
} from '@renderer/components/UI/dialogs/Sheet'
import { useInventoryV2, useInventoryThumbnails } from '@renderer/hooks/queries'
import InventoryItemContextMenu from '../InventoryItemContextMenu'
import AccessoryDetailsModal from '@renderer/features/avatar/Modals/AccessoryDetailsModal'

// Asset type categories based on Roblox inventory API
// These match the AssetType enum values that the inventory API accepts
const ASSET_TYPES: DropdownOption[] = [
  { value: 'All', label: 'All Items' },
  { value: 'Hat', label: 'Hat' },
  { value: 'HairAccessory', label: 'Hair' },
  { value: 'FaceAccessory', label: 'Face Accessory' },
  { value: 'NeckAccessory', label: 'Neck Accessory' },
  { value: 'ShoulderAccessory', label: 'Shoulder Accessory' },
  { value: 'FrontAccessory', label: 'Front Accessory' },
  { value: 'BackAccessory', label: 'Back Accessory' },
  { value: 'WaistAccessory', label: 'Waist Accessory' },
  { value: 'Gear', label: 'Gear' },
  { value: 'Shirt', label: 'Shirt' },
  { value: 'Pants', label: 'Pants' },
  { value: 'TShirt', label: 'T-Shirt' },
  { value: 'Head', label: 'Head' },
  { value: 'Face', label: 'Face' },
  { value: 'EmoteAnimation', label: 'Emote' }
]

const SORT_OPTIONS: DropdownOption[] = [
  { value: 'Desc', label: 'Newest First' },
  { value: 'Asc', label: 'Oldest First' }
]

interface InventoryItemCardProps {
  item: {
    assetId: number
    name?: string
    assetName?: string
    assetType?: string | number
    created?: string
  }
  thumbnailUrl?: string
  index: number
  onClick?: () => void
  onContextMenu?: (
    e: React.MouseEvent,
    item: { assetId: number; name: string; assetType?: string | number }
  ) => void
  isCompact?: boolean
}

const InventoryItemCard = ({
  item,
  thumbnailUrl,
  index,
  onClick,
  onContextMenu,
  isCompact = false
}: InventoryItemCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const displayName = item.name || item.assetName || 'Unknown Item'

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (onContextMenu) {
      onContextMenu(e, { assetId: item.assetId, name: displayName, assetType: item.assetType })
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay: Math.min(index * 0.02, 0.3) }}
      onClick={onClick}
      onContextMenu={handleContextMenu}
      className="group relative flex flex-col bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden cursor-pointer hover:bg-[var(--color-surface-hover)] hover:border-[var(--color-border-strong)] hover:shadow-[0_18px_40px_rgba(0,0,0,0.35)] hover:-translate-y-1 transition-all duration-300"
    >
      {/* Image Container */}
      <div
        className={`w-full relative overflow-hidden bg-[var(--color-surface-muted)] ${isCompact ? 'aspect-square p-0' : 'aspect-square p-2'}`}
      >
        <div
          className={`w-full h-full relative overflow-hidden bg-[var(--color-surface-hover)] ${isCompact ? '' : 'rounded-lg'}`}
        >
          {thumbnailUrl ? (
            <>
              {!imageLoaded && <div className="absolute inset-0 bg-neutral-700/30 animate-pulse" />}
              <img
                src={thumbnailUrl}
                alt={displayName}
                onLoad={() => setImageLoaded(true)}
                className={`w-full h-full object-contain transition-all duration-500 group-hover:scale-110 ${
                  imageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                loading="lazy"
              />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-700">
              <Package size={32} />
            </div>
          )}
        </div>
      </div>

      {/* Item Info */}
      <div
        className={`flex flex-col gap-1.5 border-t border-[var(--color-border)] bg-[var(--color-surface-strong)] ${isCompact ? 'p-2' : 'p-3'}`}
      >
        <h3 className="font-medium text-sm text-[var(--color-text-primary)] truncate">
          {displayName}
        </h3>
        {item.created && (
          <p className="text-xs text-[var(--color-text-muted)]">
            {new Date(item.created).toLocaleDateString()}
          </p>
        )}
      </div>
    </motion.div>
  )
}

interface PlayerInventorySheetProps {
  isOpen: boolean
  onClose: () => void
  userId: number
  username: string
  cookie?: string
}

const PlayerInventorySheet = ({
  isOpen,
  onClose,
  userId,
  username,
  cookie
}: PlayerInventorySheetProps) => {
  const [viewMode, setViewMode] = useState<'default' | 'compact'>('default')
  const [selectedAssetType, setSelectedAssetType] = useState<string>('All')
  const [sortOrder, setSortOrder] = useState<'Asc' | 'Desc'>('Desc')
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    assetId: number
    assetName: string
    assetType?: string | number
  } | null>(null)
  const [selectedAccessory, setSelectedAccessory] = useState<{
    id: number
    name: string
    imageUrl?: string
  } | null>(null)

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const assetTypes = useMemo(() => {
    if (selectedAssetType === 'All') {
      return ['Hat', 'Shirt', 'Pants', 'TShirt', 'HairAccessory', 'FaceAccessory', 'Gear']
    }
    return [selectedAssetType]
  }, [selectedAssetType])

  const { data, isLoading, isFetchingNextPage, hasNextPage, fetchNextPage } = useInventoryV2({
    cookie: cookie || '',
    userId,
    assetTypes,
    sortOrder,
    limit: 100,
    enabled:
      isOpen && !!cookie && userId > 0 && (selectedAssetType === 'All' || assetTypes.length > 0)
  })

  const items = useMemo(() => {
    const allItems = data?.pages.flatMap((page) => page.data) || []

    // Filter by search query
    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase()
      return allItems.filter((item) => {
        const name = (item.name || item.assetName || '').toLowerCase()
        return name.includes(query)
      })
    }

    return allItems
  }, [data, debouncedSearchQuery])

  // Get unique asset IDs for thumbnail fetching
  const assetIds = useMemo(() => {
    return items.map((item) => item.assetId).filter((id, index, self) => self.indexOf(id) === index)
  }, [items])

  // Fetch thumbnails using react-query + zustand
  const { thumbnails } = useInventoryThumbnails(assetIds, isOpen && items.length > 0)

  // Infinite scroll observer
  const loadMoreRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.1 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns:
      viewMode === 'compact'
        ? 'repeat(auto-fill, minmax(140px, 1fr))'
        : 'repeat(auto-fill, minmax(200px, 1fr))'
  }

  // Handle item click
  const handleItemClick = useCallback(
    (item: (typeof items)[0]) => {
      setSelectedAccessory({
        id: item.assetId,
        name: item.name || item.assetName || 'Unknown Item',
        imageUrl: thumbnails[item.assetId]
      })
    },
    [thumbnails]
  )

  // Handle context menu
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, item: { assetId: number; name: string; assetType?: string | number }) => {
      setContextMenu({
        x: e.clientX,
        y: e.clientY,
        assetId: item.assetId,
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

  const handleDownloadTemplate = useCallback(
    async (assetId: number, assetName: string) => {
      try {
        const result = await window.api.downloadCatalogTemplate(assetId, assetName, cookie)
        if (result.success) {
        } else {
          console.error('Failed to download template:', result.message)
        }
      } catch (err) {
        console.error('Failed to download template:', err)
      }
    },
    [cookie]
  )

  return (
    <Sheet isOpen={isOpen} onClose={onClose}>
      <SheetContent className="h-full flex flex-col">
        <SheetHandle />

        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-neutral-900 rounded-lg">
              <User className="text-neutral-300" size={20} />
            </div>
            <SheetTitle>{username}'s Inventory</SheetTitle>
          </div>
          <SheetClose />
        </SheetHeader>

        <SheetBody className="flex-1 overflow-hidden flex flex-col">
          {/* Filters */}
          <div className="shrink-0 border-b border-neutral-800 p-4 space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              {/* Asset Type Filter */}
              <CustomDropdown
                options={ASSET_TYPES}
                value={selectedAssetType}
                onChange={setSelectedAssetType}
                placeholder="Filter by Type"
                className="w-48"
              />

              {/* Sort */}
              <CustomDropdown
                options={SORT_OPTIONS}
                value={sortOrder}
                onChange={(value) => setSortOrder(value as 'Asc' | 'Desc')}
                placeholder="Sort By"
                className="w-40"
              />

              {/* Search */}
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search inventory..."
                containerClassName="flex-1 min-w-[200px]"
              />

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

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 scrollbar-thin">
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
                      searchQuery ? 'Try adjusting your search' : 'No items in this category'
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
                    listClassName={`grid gap-4 ${viewMode === 'compact' ? 'grid-cols-[repeat(auto-fill,minmax(140px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'}`}
                    itemContent={(index) => {
                      const item = items[index]
                      return (
                        <InventoryItemCard
                          key={`${item.assetId}-${index}`}
                          item={item}
                          thumbnailUrl={thumbnails[item.assetId]}
                          index={index}
                          onClick={() => handleItemClick(item)}
                          onContextMenu={handleContextMenu}
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
        </SheetBody>
      </SheetContent>

      {/* Context Menu */}
      <InventoryItemContextMenu
        activeMenu={contextMenu}
        onClose={() => setContextMenu(null)}
        onDownloadObj={handleDownloadObj}
        onDownloadTexture={handleDownloadTexture}
        onDownloadTemplate={handleDownloadTemplate}
        onCopyAssetId={handleCopyAssetId}
      />

      {/* Accessory Details Modal */}
      {selectedAccessory && (
        <AccessoryDetailsModal
          isOpen={!!selectedAccessory}
          onClose={() => setSelectedAccessory(null)}
          assetId={selectedAccessory.id}
          account={cookie ? ({ cookie, userId: String(userId) } as any) : null}
          initialData={{
            name: selectedAccessory.name,
            imageUrl: selectedAccessory.imageUrl || ''
          }}
        />
      )}
    </Sheet>
  )
}

export default PlayerInventorySheet
