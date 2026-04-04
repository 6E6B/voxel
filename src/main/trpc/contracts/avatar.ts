import { z } from 'zod'
import { avatarAssetSchema, outfitDetailsSchema } from '@shared/contracts/avatar'
import { defineProcedure } from '../core'

export const avatarScalesSchema = z.object({
    height: z.number(),
    width: z.number(),
    head: z.number(),
    proportion: z.number(),
    bodyType: z.number()
})

export const catalogSearchParamsSchema = z.object({
    keyword: z.string().optional(),
    taxonomy: z.string().optional(),
    subcategory: z.string().optional(),
    sortType: z.number().optional(),
    sortAggregation: z.number().optional(),
    salesTypeFilter: z.number().optional(),
    minPrice: z.number().optional(),
    maxPrice: z.number().optional(),
    creatorName: z.string().optional(),
    creatorType: z.string().optional(),
    limit: z.number().optional(),
    cursor: z.string().optional(),
    includeNotForSale: z.boolean().optional(),
    cookie: z.string().optional()
})

export const catalogThumbnailItemSchema = z.object({
    id: z.number(),
    itemType: z.string()
})

export const avatarContracts = {
    getAvatarUrl: defineProcedure(z.tuple([z.string()])),
    getBatchUserAvatars: defineProcedure(
        z.tuple([z.array(z.number()), z.string().optional(), z.string().optional()])
    ),
    getCurrentAvatar: defineProcedure(z.tuple([z.string(), z.number().optional()])),
    setWearingAssets: defineProcedure(z.tuple([z.string(), z.array(avatarAssetSchema)])),
    setBodyColors: defineProcedure(z.tuple([z.string(), z.any()])),
    setAvatarScales: defineProcedure(z.tuple([z.string(), avatarScalesSchema])),
    setPlayerAvatarType: defineProcedure(z.tuple([z.string(), z.enum(['R6', 'R15'])])),
    getBatchThumbnails: defineProcedure(
        z.tuple([
            z.array(z.number()),
            z.enum(['Asset', 'Outfit', 'BadgeIcon', 'GroupIcon']).optional()
        ])
    ),
    getUserOutfits: defineProcedure(z.tuple([z.string(), z.number(), z.boolean(), z.number()])),
    wearOutfit: defineProcedure(z.tuple([z.string(), z.number()])),
    updateOutfit: defineProcedure(
        z.tuple([z.string(), z.number(), outfitDetailsSchema.partial().passthrough()])
    ),
    getOutfitDetails: defineProcedure(z.tuple([z.string(), z.number()])),
    deleteOutfit: defineProcedure(z.tuple([z.string(), z.number()])),
    createOutfit: defineProcedure(z.tuple([z.string(), z.string()])),
    getInventory: defineProcedure(z.tuple([z.string(), z.number(), z.number(), z.string().optional()])),
    getInventoryV2: defineProcedure(
        z.tuple([
            z.string(),
            z.number(),
            z.array(z.string()),
            z.string().optional(),
            z.number().optional(),
            z.enum(['Asc', 'Desc']).optional()
        ])
    ),
    getCollectibles: defineProcedure(z.tuple([z.string(), z.number()])),
    getAssetContent: defineProcedure(z.tuple([z.string()])),
    getAssetHierarchy: defineProcedure(z.tuple([z.number()])),
    getAssetDetails: defineProcedure(z.tuple([z.string(), z.number()])),
    getBatchAssetDetails: defineProcedure(
        z.tuple([z.string(), z.array(z.number()), z.enum(['Asset', 'Bundle']).optional()])
    ),
    getAssetRecommendations: defineProcedure(z.tuple([z.string(), z.number()])),
    checkAssetOwnership: defineProcedure(
        z.tuple([z.string(), z.union([z.number(), z.string()]), z.number(), z.string().optional()])
    ),
    purchaseCatalogItem: defineProcedure(
        z.tuple([
            z.string(),
            z.string(),
            z.number(),
            z.number(),
            z.string().optional(),
            z.string().optional(),
            z.string().optional()
        ])
    ),
    searchCatalog: defineProcedure(z.tuple([z.string(), z.number().optional(), z.string().optional()])),
    getRolimonsPlayerProfile: defineProcedure(z.tuple([z.number()])),
    getRolimonsItemPage: defineProcedure(z.tuple([z.number()])),
    getCatalogNavigation: defineProcedure(z.tuple([])),
    searchCatalogItems: defineProcedure(z.tuple([catalogSearchParamsSchema])),
    getCatalogSearchSuggestions: defineProcedure(z.tuple([z.string(), z.number().optional()])),
    getCatalogThumbnails: defineProcedure(z.tuple([z.array(catalogThumbnailItemSchema)])),
    downloadCatalogTemplate: defineProcedure(z.tuple([z.number(), z.string(), z.string().optional()])),
    getCatalogDbStatus: defineProcedure(z.tuple([])),
    downloadCatalogDb: defineProcedure(z.tuple([])),
    getAllCatalogItems: defineProcedure(z.tuple([])),
    getCatalogIndexExport: defineProcedure(z.tuple([])),
    searchCatalogDb: defineProcedure(z.tuple([z.string(), z.number().optional()])),
    getCatalogItemById: defineProcedure(z.tuple([z.number()])),
    getSalesData: defineProcedure(z.tuple([z.number()])),
    getBatchSalesData: defineProcedure(z.tuple([z.array(z.number())])),
    getCatalogItemCount: defineProcedure(z.tuple([]))
} as const