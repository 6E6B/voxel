import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { robloxGet } from '@renderer/shared/lib/robloxApi'
import { queryKeys } from '@renderer/shared/query/queryKeys'

const collectibleRapPageSchema = z.object({
    previousPageCursor: z.string().nullable(),
    nextPageCursor: z.string().nullable(),
    data: z.array(
        z.object({
            userAssetId: z.number(),
            assetId: z.number(),
            name: z.string().optional(),
            serialNumber: z.number().nullable().optional(),
            recentAveragePrice: z.number().nullable().optional(),
            originalPrice: z.number().nullable().optional(),
            assetStock: z.number().nullable().optional()
        }).passthrough()
    )
})

export interface CollectibleEntry {
    userAssetId: number
    assetId: number
    name: string
    serialNumber: number | null
    recentAveragePrice: number
    originalPrice: number | null
}

export interface UserCollectiblesRapData {
    rap: number
    collectibleCount: number
    items: CollectibleEntry[]
}

async function fetchUserCollectiblesRap(userId: number, cookie: string): Promise<UserCollectiblesRapData> {
    let cursor: string | undefined
    let rap = 0
    const items: CollectibleEntry[] = []
    let pageCount = 0

    do {
        const url = new URL(`https://inventory.roblox.com/v1/users/${userId}/assets/collectibles`)
        url.searchParams.set('limit', '100')
        url.searchParams.set('sortOrder', 'Desc')

        if (cursor) {
            url.searchParams.set('cursor', cursor)
        }

        const page = await robloxGet(collectibleRapPageSchema, url.toString(), { cookie })

        for (const item of page.data) {
            const rap_value = Math.max(item.recentAveragePrice ?? 0, 0)
            rap += rap_value
            items.push({
                userAssetId: item.userAssetId,
                assetId: item.assetId,
                name: item.name ?? 'Unknown Item',
                serialNumber: item.serialNumber ?? null,
                recentAveragePrice: rap_value,
                originalPrice: item.originalPrice ?? null
            })
        }

        cursor = page.nextPageCursor ?? undefined
        pageCount += 1

        if (pageCount >= 100) {
            throw new Error('Collectibles RAP pagination exceeded 100 pages')
        }
    } while (cursor)

    return { rap, collectibleCount: items.length, items }
}

export function useUserCollectiblesRap(userId: number, cookie: string, enabled: boolean = true) {
    return useQuery({
        queryKey: queryKeys.userProfile.collectiblesRap(userId, cookie),
        queryFn: () => fetchUserCollectiblesRap(userId, cookie),
        enabled: enabled && !!userId && !!cookie,
        staleTime: 60 * 1000,
        retry: 1
    })
}