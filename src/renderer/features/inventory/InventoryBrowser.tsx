import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Package, Loader2, Grid2X2, Grid3X3, ArrowUpDown, User, RefreshCw } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { VirtuosoGrid } from 'react-virtuoso'
import { TooltipProvider } from '@renderer/shared/ui/display/Tooltip'
import { PageHeaderPortal } from '@renderer/shared/ui/navigation/PageHeaderPortal'
import { FloatingAction, type FloatingDropdownOption } from '@renderer/shared/ui/navigation/FloatingAction'
import { SkeletonSquareCard } from '@renderer/shared/ui/display/SkeletonCard'
import { EmptyState } from '@renderer/shared/ui/feedback/EmptyState'
import { ItemCard } from '@renderer/shared/ui/display/ItemCard'
import { useInventoryV2, useInventoryThumbnails } from '@renderer/features/inventory/useInventory'
import { Account } from '@renderer/shared/types'
import InventoryItemContextMenu from './InventoryItemContextMenu'
import AccessoryDetailsModal from '@renderer/features/avatar/dialogs/AccessoryDetailsModal'
import { InventoryFilterSidebar } from './InventoryFilterSidebar'
import { INVENTORY_CATEGORIES, useInventoryCategories } from './inventoryCategories'
import {
    createAnchoredOverlayPosition,
    type AnchoredOverlayPosition
} from '@renderer/shared/ui/menus/anchoredPosition'
import {
    useInventorySelectedCategory,
    useSetInventorySelectedCategory,
    useInventorySelectedSubcategory,
    useSetInventorySelectedSubcategory,
    useInventorySortOrder,
    useSetInventorySortOrder,
    useInventorySearchQuery,
    useSetInventorySearchQuery,
    useClearInventoryFilters
} from './useInventoryStore'
import {
    useInventoryViewMode,
    useSetInventoryViewMode
} from '@renderer/shared/stores/useViewPreferencesStore'
import { queryKeys } from '@renderer/shared/query/queryKeys'

const SORT_OPTIONS: FloatingDropdownOption[] = [
    { value: 'Desc', label: 'Newest First' },
    { value: 'Asc', label: 'Oldest First' }
]

const ASSET_TYPE_LABELS: Record<string, string> = {
    Hat: 'Hat',
    TShirt: 'T-Shirt',
    Shirt: 'Shirt',
    Pants: 'Pants',
    Head: 'Head',
    Face: 'Face',
    Gear: 'Gear',
    HairAccessory: 'Hair',
    FaceAccessory: 'Face Accessory',
    NeckAccessory: 'Neck',
    ShoulderAccessory: 'Shoulder',
    FrontAccessory: 'Front',
    BackAccessory: 'Back',
    WaistAccessory: 'Waist',
    EmoteAnimation: 'Emote',
    TShirtAccessory: 'T-Shirt',
    ShirtAccessory: 'Shirt',
    PantsAccessory: 'Pants',
    JacketAccessory: 'Jacket',
    SweaterAccessory: 'Sweater',
    ShortsAccessory: 'Shorts',
    DressSkirtAccessory: 'Dress & Skirt'
}

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
    const displayName = item.name || item.assetName || 'Unknown Item'

    const handleContextMenu = (e: React.MouseEvent) => {
        if (onContextMenu) {
            onContextMenu(e, { assetId: item.assetId, name: displayName, assetType: item.assetType })
        }
    }

    const topLabel =
        !isCompact && item.assetType && typeof item.assetType === 'string'
            ? ASSET_TYPE_LABELS[item.assetType] || item.assetType
            : undefined

    return (
        <ItemCard
            name={displayName}
            thumbnailUrl={thumbnailUrl}
            onClick={onClick}
            onContextMenu={handleContextMenu}
            index={index}
            isCompact={isCompact}
            topLabel={topLabel}
        >
            {!isCompact && item.created && (
                <p className="text-xs text-[var(--color-text-muted)]">
                    {new Date(item.created).toLocaleDateString()}
                </p>
            )}
        </ItemCard>
    )
}

interface InventoryBrowserProps {
    account: Account | null
}

const InventoryBrowser = ({ account }: InventoryBrowserProps) => {
    const queryClient = useQueryClient()
    const viewMode = useInventoryViewMode()
    const setViewMode = useSetInventoryViewMode()

    const [contextMenu, setContextMenu] = useState<({
        assetId: number
        assetName: string
        assetType?: string | number
    } & AnchoredOverlayPosition) | null>(null)
    const [selectedAccessory, setSelectedAccessory] = useState<{
        id: number
        name: string
        imageUrl?: string
    } | null>(null)

    const selectedCategory = useInventorySelectedCategory()
    const setSelectedCategory = useSetInventorySelectedCategory()
    const selectedSubcategory = useInventorySelectedSubcategory()
    const setSelectedSubcategory = useSetInventorySelectedSubcategory()
    const sortOrder = useInventorySortOrder()
    const setSortOrder = useSetInventorySortOrder()
    const searchQuery = useInventorySearchQuery()
    const setSearchQuery = useSetInventorySearchQuery()
    const clearFilters = useClearInventoryFilters()

    const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')

    const { categories } = useInventoryCategories()

    const resolvedSelectedCategory = useMemo(() => {
        if (!selectedCategory) {
            return null
        }

        return (
            categories.find((category) => category.categoryId === selectedCategory.categoryId) ||
            selectedCategory
        )
    }, [categories, selectedCategory])

    const resolvedSelectedSubcategory = useMemo(() => {
        if (!selectedSubcategory) {
            return null
        }

        const matchedSubcategory = categories
            .flatMap((category) => category.subcategories)
            .find((subcategory) => subcategory.subcategoryId === selectedSubcategory.subcategoryId)

        return matchedSubcategory || selectedSubcategory
    }, [categories, selectedSubcategory])

    const cookie = account?.cookie
    const userId = account?.userId ? Number.parseInt(account.userId, 10) : undefined

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchQuery(searchQuery)
        }, 300)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const assetTypes = useMemo(() => {
        if (resolvedSelectedSubcategory) {
            return resolvedSelectedSubcategory.assetTypes
        }

        if (resolvedSelectedCategory) {
            return resolvedSelectedCategory.assetTypes
        }

        const allCategory = categories.find((category) => category.category === 'All')
        return allCategory?.assetTypes || INVENTORY_CATEGORIES[0].assetTypes
    }, [categories, resolvedSelectedCategory, resolvedSelectedSubcategory])

    const hasActiveFilters = useMemo(() => resolvedSelectedCategory !== null, [resolvedSelectedCategory])

    const { data, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage } = useInventoryV2({
        cookie,
        userId,
        assetTypes,
        sortOrder,
        limit: 100,
        enabled: !!cookie && !!userId && assetTypes.length > 0
    })

    const items = useMemo(() => {
        const allItems = data?.pages.flatMap((page) => page.data) || []

        if (debouncedSearchQuery.trim()) {
            const query = debouncedSearchQuery.toLowerCase()
            return allItems.filter((item) => {
                const name = (item.name || item.assetName || '').toLowerCase()
                return name.includes(query)
            })
        }

        return allItems
    }, [data, debouncedSearchQuery])

    const assetIds = useMemo(() => {
        return items.map((item) => item.assetId).filter((id, index, self) => self.indexOf(id) === index)
    }, [items])

    const { thumbnails, isLoading: isThumbnailsLoading } = useInventoryThumbnails(assetIds, items.length > 0)

    const gridStyle: React.CSSProperties = {
        gridTemplateColumns:
            viewMode === 'compact'
                ? 'repeat(auto-fill, minmax(150px, 1fr))'
                : 'repeat(auto-fill, minmax(200px, 1fr))'
    }

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

    const handleContextMenu = useCallback(
        (e: React.MouseEvent, item: { assetId: number; name: string; assetType?: string | number }) => {
            setContextMenu({
                assetId: item.assetId,
                assetName: item.name,
                assetType: item.assetType,
                ...createAnchoredOverlayPosition(e)
            })
        },
        []
    )

    const handleCopyAssetId = useCallback(async (assetId: number) => {
        try {
            await navigator.clipboard.writeText(String(assetId))
        } catch (err) {
            console.error('Failed to copy asset ID:', err)
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
                const result = (await window.api.downloadCatalogTemplate(assetId, assetName, cookie)) as {
                    success: boolean
                    message?: string
                }
                if (!result.success) {
                    console.error('Failed to download template:', result.message)
                }
            } catch (err) {
                console.error('Failed to download template:', err)
            }
        },
        [cookie]
    )

    const handleRefresh = useCallback(async () => {
        await queryClient.invalidateQueries({ queryKey: queryKeys.inventory.all })
    }, [queryClient])

    const isRefreshing = isFetching || isThumbnailsLoading

    const RefreshIcon = ({ size, className }: { size?: number; className?: string }) => (
        <RefreshCw
            size={size}
            className={[className, isRefreshing ? 'animate-spin' : ''].filter(Boolean).join(' ')}
        />
    )

    if (!account || !cookie || !userId) {
        return (
            <div className="flex items-center justify-center h-full">
                <EmptyState
                    icon={User}
                    title="Select an account to view inventory"
                    description="Choose an account with a valid cookie to load its inventory and filters."
                    className="h-full w-full"
                />
            </div>
        )
    }

    return (
        <TooltipProvider>
            <div className="flex h-full bg-[var(--color-surface)]">
                <InventoryFilterSidebar
                    categories={categories}
                    selectedCategory={resolvedSelectedCategory}
                    selectedSubcategory={resolvedSelectedSubcategory}
                    onCategoryChange={setSelectedCategory}
                    onSubcategoryChange={setSelectedSubcategory}
                    onClearAll={clearFilters}
                    hasActiveFilters={hasActiveFilters}
                />

                <div className="flex-1 flex flex-col min-w-0">
                    <PageHeaderPortal>
                        <FloatingAction.Search
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search inventory..."
                            onClear={() => setSearchQuery('')}
                        />

                        <FloatingAction.Separator />

                        <FloatingAction.Dropdown
                            icon={ArrowUpDown}
                            tooltip="Sort"
                            options={SORT_OPTIONS}
                            value={sortOrder}
                            onChange={(value) => setSortOrder(value as 'Asc' | 'Desc')}
                        />

                        <FloatingAction.Separator />

                        <FloatingAction.Button
                            icon={RefreshIcon}
                            tooltip="Refresh inventory"
                            onClick={() => {
                                void handleRefresh()
                            }}
                            disabled={isRefreshing}
                        />

                        <FloatingAction.Separator />

                        <FloatingAction.Toggle
                            icon={Grid2X2}
                            tooltip="Default View"
                            active={viewMode === 'default'}
                            onClick={() => setViewMode('default')}
                        />
                        <FloatingAction.Toggle
                            icon={Grid3X3}
                            tooltip="Compact View"
                            active={viewMode === 'compact'}
                            onClick={() => setViewMode('compact')}
                        />
                    </PageHeaderPortal>

                    <div className="flex-1 overflow-y-auto scrollbar-thin bg-[var(--color-surface)]">
                        <AnimatePresence mode="wait">
                            {isLoading && items.length === 0 ? (
                                <motion.div
                                    key="loading"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    className="grid gap-3.5 px-5 pt-6 pb-6"
                                    style={gridStyle}
                                >
                                    {Array.from({ length: 24 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="bg-[var(--color-surface-muted)] border border-[var(--color-border)] rounded-xl overflow-hidden"
                                        >
                                            <SkeletonSquareCard showBorder={false} />
                                            <div className="px-3 py-2.5 space-y-2">
                                                <div className="h-3.5 bg-[var(--color-border)] rounded-md animate-pulse w-4/5" />
                                                <div className="h-3 bg-[var(--color-border)] rounded-md animate-pulse w-1/2" />
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
                                        listClassName={`grid gap-3.5 px-5 pb-6 ${viewMode === 'compact' ? 'grid-cols-[repeat(auto-fill,minmax(150px,1fr))]' : 'grid-cols-[repeat(auto-fill,minmax(200px,1fr))]'}`}
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
                                            Header: () => <div className="h-6" />,
                                            Footer: () =>
                                                isFetchingNextPage ? (
                                                    <div className="h-16 flex items-center justify-center">
                                                        <div className="flex items-center gap-2 text-[var(--color-text-muted)]">
                                                            <Loader2 size={16} className="animate-spin" />
                                                            <span className="text-xs">Loading more...</span>
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

                <InventoryItemContextMenu
                    activeMenu={contextMenu}
                    onClose={() => setContextMenu(null)}
                    onDownloadTemplate={handleDownloadTemplate}
                    onCopyAssetId={handleCopyAssetId}
                />

                <AccessoryDetailsModal
                    isOpen={!!selectedAccessory}
                    onClose={() => setSelectedAccessory(null)}
                    assetId={selectedAccessory?.id || null}
                    account={account}
                    initialData={
                        selectedAccessory
                            ? {
                                name: selectedAccessory.name,
                                imageUrl: selectedAccessory.imageUrl || ''
                            }
                            : undefined
                    }
                />
            </div>
        </TooltipProvider>
    )
}

export default InventoryBrowser