import { useQuery } from '@tanstack/react-query'
import { robloxGet } from '@renderer/shared/lib/robloxApi'
import { z } from 'zod'

const badgeDetailsSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string(),
    displayName: z.string(),
    displayDescription: z.string(),
    enabled: z.boolean(),
    iconImageId: z.number(),
    displayIconImageId: z.number(),
    created: z.string(),
    updated: z.string(),
    statistics: z.object({
        pastDayAwardedCount: z.number(),
        awardedCount: z.number(),
        winRatePercentage: z.number()
    }),
    awardingUniverse: z.object({
        id: z.number(),
        name: z.string(),
        rootPlaceId: z.number()
    })
})

export type BadgeDetails = z.infer<typeof badgeDetailsSchema>

export function useBadgeDetails(badgeId: number | null, cookie: string) {
    return useQuery({
        queryKey: ['badge', 'details', badgeId],
        queryFn: () =>
            robloxGet(badgeDetailsSchema, `https://badges.roblox.com/v1/badges/${badgeId}`, {
                cookie
            }),
        enabled: !!badgeId && !!cookie,
        staleTime: 5 * 60 * 1000
    })
}
