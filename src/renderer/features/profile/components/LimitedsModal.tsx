import React, { useMemo, useState, useEffect } from 'react'
import { AnimatePresence } from 'framer-motion'
import { TrendingUp, Search, X, Package } from 'lucide-react'
import AccessoryDetailsModal from '@renderer/features/avatar/dialogs/AccessoryDetailsModal'
import {
    Sheet,
    SheetContent,
    SheetHandle,
    SheetHeader,
    SheetTitle,
    SheetClose,
    SheetBody
} from '@renderer/shared/ui/dialogs/Sheet'
import { RobuxIcon } from '@renderer/shared/ui/icons/RobuxIcon'
import { ItemCard } from '@renderer/shared/ui/display/ItemCard'
import type { Account } from '@renderer/shared/types'
import { formatNumber } from '@renderer/shared/utils/numberUtils'
import { useUserCollectiblesRap, CollectibleEntry } from '../api/useUserCollectiblesRap'

interface LimitedsModalProps {
    isOpen: boolean
    onClose: () => void
    userId: number
    requestCookie: string
    displayName?: string
}

// Fetch thumbnails for a batch of assetIds
function useLimitedThumbnails(assetIds: number[], enabled: boolean) {
    const [thumbnails, setThumbnails] = React.useState<Record<number, string>>({})
    const [isLoading, setIsLoading] = React.useState(false)

    useEffect(() => {
        if (!enabled || assetIds.length === 0) return

        const uniqueIds = [...new Set(assetIds)]
        setIsLoading(true)

        const BATCH = 50
        const batches: number[][] = []
        for (let i = 0; i < uniqueIds.length; i += BATCH) {
            batches.push(uniqueIds.slice(i, i + BATCH))
        }

        Promise.all(
            batches.map((batch) =>
                window.api
                    .getBatchThumbnails(batch, 'Asset')
                    .then((res: unknown) => {
                        const typed = res as { data: Array<{ targetId: number; imageUrl: string | null }> }
                        return typed.data ?? []
                    })
                    .catch(() => [] as Array<{ targetId: number; imageUrl: string | null }>)
            )
        ).then((results) => {
            const map: Record<number, string> = {}
            for (const batch of results) {
                for (const entry of batch) {
                    if (entry.imageUrl) map[entry.targetId] = entry.imageUrl
                }
            }
            setThumbnails(map)
            setIsLoading(false)
        })
    }, [enabled, assetIds.join(',')])

    return { thumbnails, isLoading }
}

const SkeletonCard: React.FC = () => (
    <div className="flex flex-col rounded-xl overflow-hidden bg-[var(--color-surface-strong)] border border-[var(--color-border)] animate-pulse">
        <div className="aspect-square bg-[var(--color-surface-hover)]" />
        <div className="px-3 py-2.5 space-y-2">
            <div className="h-3 bg-[var(--color-surface-hover)] rounded w-4/5" />
            <div className="h-3 bg-[var(--color-surface-hover)] rounded w-1/2" />
        </div>
    </div>
)

interface LimitedCardProps {
    item: CollectibleEntry
    thumbnailUrl?: string
    isLoading?: boolean
    index?: number
    onClick?: () => void
}

const LimitedCard: React.FC<LimitedCardProps> = ({ item, thumbnailUrl, index = 0, onClick }) => (
    <ItemCard
        name={item.name}
        thumbnailUrl={thumbnailUrl}
        index={index}
        isCompact
        onClick={onClick}
        bottomBadge={
            item.serialNumber !== null ? (
                <div className="absolute bottom-2 left-2 text-[10px] font-bold text-white/90 bg-black/55 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/10 z-10">
                    #{item.serialNumber}
                </div>
            ) : undefined
        }
    >
        <div className="flex items-center gap-1">
            <TrendingUp size={11} className="text-[var(--color-text-muted)] shrink-0" />
            <span className="text-xs text-[var(--color-text-muted)] font-semibold">
                {formatNumber(item.recentAveragePrice)}
            </span>
            <RobuxIcon className="w-3 h-3 text-[var(--color-text-muted)]" />
        </div>
    </ItemCard>
)

export const LimitedsModal: React.FC<LimitedsModalProps> = ({
    isOpen,
    onClose,
    userId,
    requestCookie,
    displayName
}) => {
    const [search, setSearch] = useState('')
    const [selectedAccessory, setSelectedAccessory] = useState<{
        id: number
        name: string
        imageUrl: string
    } | null>(null)
    const { data, isLoading: isLoadingData } = useUserCollectiblesRap(userId, requestCookie, isOpen)

    const allItems = useMemo(
        () => [...(data?.items ?? [])].sort((a, b) => b.recentAveragePrice - a.recentAveragePrice),
        [data]
    )
    const uniqueAssetIds = useMemo(() => [...new Set(allItems.map((i) => i.assetId))], [allItems])
    const { thumbnails, isLoading: isLoadingThumbs } = useLimitedThumbnails(uniqueAssetIds, isOpen && uniqueAssetIds.length > 0)

    const filtered = useMemo(() => {
        if (!search.trim()) return allItems
        const q = search.toLowerCase()
        return allItems.filter((item) => item.name.toLowerCase().includes(q))
    }, [allItems, search])

    const isLoading = isLoadingData || (isLoadingThumbs && !data)

    // Reset search on close
    useEffect(() => {
        if (!isOpen) {
            setSearch('')
            setSelectedAccessory(null)
        }
    }, [isOpen])

    return (
        <Sheet isOpen={isOpen} onClose={onClose}>
            <SheetContent className="h-full">
                <SheetHandle />

                {/* Header */}
                <SheetHeader>
                    <div>
                        <SheetTitle>
                            {displayName ? `${displayName}'s Limiteds` : 'Limiteds'}
                        </SheetTitle>
                        {data && (
                            <p className="text-xs text-[var(--color-text-muted)] mt-0.5 flex items-center gap-1">
                                <span className="flex items-center gap-1 font-semibold text-[var(--color-text-primary)]">
                                    {formatNumber(data.rap)}
                                    <RobuxIcon className="w-3.5 h-3.5" />
                                    RAP
                                </span>
                            </p>
                        )}
                    </div>
                </SheetHeader>

                {/* Search bar */}
                <div className="shrink-0 px-5 py-3 border-b border-[var(--color-border)]">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] pointer-events-none" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search limiteds…"
                            className="w-full bg-[var(--color-surface-strong)] border border-[var(--color-border)] rounded-lg pl-9 pr-9 py-2 text-sm text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:border-[var(--color-border-strong)] transition-colors"
                        />
                        {search && (
                            <button
                                onClick={() => setSearch('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] transition-colors"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Grid */}
                <SheetBody className="flex-1 overflow-y-auto scrollbar-thin p-5">
                    {isLoading ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                            {Array.from({ length: 18 }).map((_, i) => (
                                <SkeletonCard key={i} />
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-4 py-24 text-[var(--color-text-muted)]">
                            <Package size={44} strokeWidth={1.2} />
                            <p className="text-base font-medium">
                                {search ? 'No items match your search' : 'No limiteds found'}
                            </p>
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                                {filtered.map((item) => (
                                    <LimitedCard
                                        key={item.userAssetId}
                                        item={item}
                                        thumbnailUrl={thumbnails[item.assetId]}
                                        isLoading={isLoadingThumbs && !thumbnails[item.assetId]}
                                        onClick={() =>
                                            setSelectedAccessory({
                                                id: item.assetId,
                                                name: item.name,
                                                imageUrl: thumbnails[item.assetId] || ''
                                            })
                                        }
                                    />
                                ))}
                            </div>
                        </AnimatePresence>
                    )}

                    {/* Footer count when filtered */}
                    {search && filtered.length > 0 && (
                        <p className="text-center text-xs text-[var(--color-text-muted)] mt-6">
                            Showing {filtered.length} of {allItems.length}
                        </p>
                    )}
                </SheetBody>
            </SheetContent>

            <AccessoryDetailsModal
                isOpen={!!selectedAccessory}
                onClose={() => setSelectedAccessory(null)}
                assetId={selectedAccessory?.id || null}
                account={{ cookie: requestCookie } as Account}
                initialData={
                    selectedAccessory
                        ? {
                            name: selectedAccessory.name,
                            imageUrl: selectedAccessory.imageUrl
                        }
                        : undefined
                }
            />
        </Sheet>
    )
}
