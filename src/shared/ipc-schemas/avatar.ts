import { z } from 'zod'
import { successResponseSchema } from './common'

// ============================================================================
// AVATAR & THUMBNAIL SCHEMAS
// ============================================================================

export const thumbnail3DResponseSchema = z.object({
  state: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
  data: z
    .array(
      z.object({
        state: z.string().optional(),
        imageUrl: z.string().nullable().optional()
      })
    )
    .optional()
})

export type Thumbnail3DResponse = z.infer<typeof thumbnail3DResponseSchema>

export const avatarAssetSchema = z.object({
  id: z.number(),
  name: z.string(),
  assetType: z.object({
    id: z.number(),
    name: z.string()
  }),
  currentVersionId: z.number().optional(),
  meta: z
    .object({
      order: z.number().optional(),
      puffiness: z.number().optional(),
      version: z.number().optional()
    })
    .optional()
})

export const avatarStateSchema = z.object({
  scales: z.unknown(),
  bodyColors: z.unknown(),
  assets: z.array(avatarAssetSchema),
  playerAvatarType: z.string()
})
export type AvatarState = z.infer<typeof avatarStateSchema>

export const thumbnailEntrySchema = z.object({
  requestId: z.string().optional(),
  targetId: z.number(),
  state: z.string(),
  imageUrl: z.string().nullable()
})

export const thumbnailBatchSchema = z.object({
  data: z.array(thumbnailEntrySchema)
})

export const avatarHeadshotSchema = z.object({
  targetId: z.number(),
  state: z.string(),
  imageUrl: z.string().nullable()
})

export const userOutfitSummarySchema = z.object({
  id: z.number(),
  name: z.string(),
  isEditable: z.boolean()
})

export const userOutfitCollectionSchema = z.object({
  data: z.array(userOutfitSummarySchema),
  total: z.number()
})

export const outfitDetailsSchema = z.object({
  id: z.number(),
  name: z.string(),
  bodyColors: z.unknown(),
  assets: z.array(avatarAssetSchema),
  scale: z.unknown(),
  playerAvatarType: z.string(),
  outfitType: z.string(),
  isEditable: z.boolean()
})

export const wearingAssetsResultSchema = successResponseSchema.extend({
  invalidAssets: z.array(z.unknown()).optional()
})

export const updateOutfitResultSchema = successResponseSchema.extend({
  id: z.number(),
  name: z.string()
})

export type ThumbnailBatch = z.infer<typeof thumbnailBatchSchema>
export type OutfitCollection = z.infer<typeof userOutfitCollectionSchema>
export type OutfitDetails = z.infer<typeof outfitDetailsSchema>
export type WearingAssetsResult = z.infer<typeof wearingAssetsResultSchema>
export type UpdateOutfitResult = z.infer<typeof updateOutfitResultSchema>

// ============================================================================
// INVENTORY SCHEMAS
// ============================================================================

export const favoriteItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  type: z.string()
})

export const inventoryItemSchema = z.object({
  assetId: z.number(),
  name: z.string().optional(),
  assetName: z.string().optional(),
  assetType: z.union([z.number(), z.string()]).optional(),
  created: z.string().optional()
})

export const inventoryPageSchema = z
  .object({
    previousPageCursor: z.string().nullable(),
    nextPageCursor: z.string().nullable(),
    data: z.array(inventoryItemSchema).optional(),
    date: z.array(inventoryItemSchema).optional()
  })
  .transform((obj) => ({
    previousPageCursor: obj.previousPageCursor,
    nextPageCursor: obj.nextPageCursor,
    data: obj.data || obj.date || []
  }))

export const collectiblesSchema = z.array(
  z
    .object({
      id: z.number(),
      name: z.string().optional(),
      assetType: z.number().optional(),
      recentAveragePrice: z.number().optional(),
      originalPrice: z.number().optional(),
      assetStock: z.number().optional(),
      buildersClubMembershipType: z.number().optional()
    })
    .passthrough()
)

export type FavoriteItem = z.infer<typeof favoriteItemSchema>
export type InventoryItem = z.infer<typeof inventoryItemSchema>
export type InventoryPage = z.infer<typeof inventoryPageSchema>
export type CollectibleItem = z.infer<typeof collectiblesSchema>[number]

// ============================================================================
// CATALOG SCHEMAS
// ============================================================================

export const catalogSubcategorySchema = z.object({
  subcategory: z.string(),
  taxonomy: z.string(),
  assetTypeIds: z.array(z.number()),
  bundleTypeIds: z.array(z.number()),
  subcategoryId: z.number(),
  name: z.string(),
  shortName: z.string().nullable().optional()
})

export const catalogCategorySchema = z.object({
  category: z.string(),
  taxonomy: z.string(),
  assetTypeIds: z.array(z.number()),
  bundleTypeIds: z.array(z.number()),
  categoryId: z.number(),
  name: z.string(),
  orderIndex: z.number(),
  subcategories: z.array(catalogSubcategorySchema),
  isSearchable: z.boolean()
})

export const catalogItemSchema = z.object({
  id: z.number(),
  itemType: z.string(),
  assetType: z.number().optional(),
  bundleType: z.number().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  creatorName: z.string().optional(),
  creatorTargetId: z.number().optional(),
  creatorType: z.string().optional(),
  creatorHasVerifiedBadge: z.boolean().optional(),
  price: z.number().nullable().optional(),
  lowestPrice: z.number().nullable().optional(),
  lowestResalePrice: z.number().nullable().optional(),
  priceStatus: z.string().optional(),
  favoriteCount: z.number().optional(),
  collectibleItemId: z.string().nullable().optional(),
  totalQuantity: z.number().nullable().optional(),
  hasResellers: z.boolean().optional(),
  offSaleDeadline: z.string().nullable().optional(),
  saleLocationType: z.string().optional(),
  itemStatus: z.array(z.string()).optional(),
  itemRestrictions: z.array(z.string()).optional(),
  unitsAvailableForConsumption: z.number().optional(),
  productId: z.number().optional()
})

export const catalogItemsSearchResponseSchema = z.object({
  keyword: z.string().nullable().optional(),
  previousPageCursor: z.string().nullable().optional(),
  nextPageCursor: z.string().nullable().optional(),
  data: z.array(catalogItemSchema)
})

export type CatalogCategory = z.infer<typeof catalogCategorySchema>
export type CatalogSubcategory = z.infer<typeof catalogSubcategorySchema>
export type CatalogItem = z.infer<typeof catalogItemSchema>
export type CatalogItemsSearchResponse = z.infer<typeof catalogItemsSearchResponseSchema>

export enum CatalogSortType {
  Relevance = 0,
  MostFavorited = 1,
  Bestselling = 2,
  RecentlyPublished = 3,
  PriceHighToLow = 4,
  PriceLowToHigh = 5
}

export enum CatalogSalesTypeFilter {
  All = 1,
  Collectibles = 2,
  Limited = 3
}

export interface CatalogSearchParams {
  keyword?: string
  taxonomy?: string
  subcategory?: string
  sortType?: CatalogSortType
  sortAggregation?: number
  salesTypeFilter?: CatalogSalesTypeFilter
  minPrice?: number
  maxPrice?: number
  creatorName?: string
  creatorType?: string
  limit?: number
  cursor?: string
  includeNotForSale?: boolean
  cookie?: string
}

export const assetDetailsSchema = z.object({
  id: z.number().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  productId: z.number().optional(),
  creatorType: z.string().optional(),
  creatorTargetId: z.number().optional(),
  creatorName: z.string().optional(),
  creatorHasVerifiedBadge: z.boolean().optional(),
  price: z.number().nullable().optional(),
  priceStatus: z.string().optional(),
  unitsAvailableForConsumption: z.number().optional(),
  favoriteCount: z.number().optional(),
  offSaleDeadline: z.string().nullable().optional(),
  collectibleItemId: z.string().nullable().optional(),
  collectibleProductId: z.string().nullable().optional(),
  totalQuantity: z.number().optional(),
  saleLocationType: z.string().optional(),
  quantityLimitPerUser: z.number().optional(),
  assetType: z.number().optional(),
  itemType: z.string().optional(),
  created: z.string().optional(),
  updated: z.string().optional(),
  isLimited: z.boolean().optional(),
  isLimitedUnique: z.boolean().optional(),
  itemCreatedUtc: z.string().optional(),
  itemUpdatedUtc: z.string().optional(),
  isPurchasable: z.boolean().optional(),
  itemStatus: z.array(z.string()).optional(),
  lowestPrice: z.number().nullable().optional(),
  isPBR: z.boolean().optional(),
  hasResellers: z.boolean().optional(),
  Sales: z.number().optional(),
  Remaining: z.number().optional(),
  Created: z.string().optional(),
  Updated: z.string().optional(),
  sales: z.number().optional(),
  remaining: z.number().optional(),
  AssetId: z.number().optional(),
  Name: z.string().optional(),
  Description: z.string().nullable().optional(),
  AssetTypeId: z.number().optional(),
  PriceInRobux: z.number().nullable().optional(),
  IsLimited: z.boolean().optional(),
  IsLimitedUnique: z.boolean().optional(),
  IsForSale: z.boolean().optional(),
  Creator: z
    .object({
      Name: z.string().optional(),
      Id: z.number().optional(),
      CreatorType: z.string().optional(),
      CreatorTargetId: z.number().optional(),
      HasVerifiedBadge: z.boolean().optional()
    })
    .optional(),
  CollectiblesItemDetails: z
    .object({
      CollectibleLowestResalePrice: z.number().nullable().optional(),
      CollectibleLowestAvailableResaleProductId: z.string().nullable().optional(),
      CollectibleLowestAvailableResaleItemInstanceId: z.string().nullable().optional(),
      CollectibleQuantityLimitPerUser: z.number().nullable().optional(),
      IsForSale: z.boolean().optional(),
      TotalQuantity: z.number().optional(),
      IsLimited: z.boolean().optional()
    })
    .optional(),
  CollectibleProductId: z.string().nullable().optional(),
  CollectibleItemId: z.string().nullable().optional(),
  collectibleLowestResalePrice: z.number().nullable().optional()
})

export const recommendationItemSchema = z.object({
  id: z.number(),
  name: z.string().optional(),
  creatorName: z.string().optional(),
  price: z.number().nullable().optional(),
  itemType: z.string().optional(),
  assetType: z.string().optional(),
  isLimited: z.boolean().optional(),
  isLimitedUnique: z.boolean().optional(),
  lowestPrice: z.number().nullable().optional(),
  lowestResalePrice: z.number().nullable().optional(),
  collectibleItemId: z.string().nullable().optional(),
  totalQuantity: z.number().nullable().optional(),
  favoriteCount: z.number().optional()
})

export const catalogItemDetailSchema = z.object({
  id: z.number(),
  itemType: z.string(),
  bundledItems: z.array(z.unknown()).optional(),
  assetType: z.number().optional(),
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  productId: z.number().optional(),
  itemStatus: z.array(z.string()).optional(),
  itemRestrictions: z.array(z.string()).optional(),
  creatorHasVerifiedBadge: z.boolean().optional(),
  creatorType: z.string().optional(),
  creatorTargetId: z.number().optional(),
  creatorName: z.string().optional(),
  price: z.number().nullable().optional(),
  lowestPrice: z.number().nullable().optional(),
  lowestResalePrice: z.number().nullable().optional(),
  unitsAvailableForConsumption: z.number().optional(),
  favoriteCount: z.number().optional(),
  offSaleDeadline: z.string().nullable().optional(),
  collectibleItemId: z.string().nullable().optional(),
  totalQuantity: z.number().optional(),
  saleLocationType: z.string().optional(),
  hasResellers: z.boolean().optional(),
  quantityLimitPerUser: z.number().optional(),
  priceStatus: z.string().optional()
})

export const batchCatalogDetailsSchema = z.object({
  data: z.array(catalogItemDetailSchema)
})

export const recommendationsSchema = z.object({
  data: z.array(z.union([z.number(), z.string(), z.object({}).passthrough()]))
})

export type AssetDetails = z.infer<typeof assetDetailsSchema>
export type RecommendationItem = z.infer<typeof recommendationItemSchema>
export type Recommendations = z.infer<typeof recommendationsSchema>
export type CatalogItemDetail = z.infer<typeof catalogItemDetailSchema>
export type BatchCatalogDetails = z.infer<typeof batchCatalogDetailsSchema>

export const catalogSearchItemSchema = z.object({
  bundledItems: z.array(z.unknown()).optional(),
  id: z.number(),
  itemType: z.string(),
  assetType: z.number().optional(),
  name: z.string(),
  description: z.string().nullable().optional(),
  productId: z.number().optional(),
  itemStatus: z.array(z.string()).optional(),
  itemRestrictions: z.array(z.string()).optional(),
  creatorHasVerifiedBadge: z.boolean().optional(),
  creatorType: z.string().optional(),
  creatorTargetId: z.number().optional(),
  creatorName: z.string().optional(),
  price: z.number().nullable().optional(),
  lowestPrice: z.number().nullable().optional(),
  lowestResalePrice: z.number().nullable().optional(),
  priceStatus: z.string().optional(),
  unitsAvailableForConsumption: z.number().optional(),
  favoriteCount: z.number().optional(),
  offSaleDeadline: z.string().nullable().optional(),
  collectibleItemId: z.string().nullable().optional(),
  totalQuantity: z.number().optional(),
  saleLocationType: z.string().optional(),
  hasResellers: z.boolean().optional(),
  isOffSale: z.boolean().optional()
})

export const catalogSearchResponseSchema = z.object({
  keyword: z.string().optional(),
  previousPageCursor: z.string().nullable().optional(),
  nextPageCursor: z.string().nullable().optional(),
  data: z.array(catalogSearchItemSchema)
})

export type CatalogSearchItem = z.infer<typeof catalogSearchItemSchema>
export type CatalogSearchResponse = z.infer<typeof catalogSearchResponseSchema>

export const resellerItemSchema = z.object({
  collectibleProductId: z.string(),
  collectibleItemInstanceId: z.string(),
  seller: z.object({
    hasVerifiedBadge: z.boolean(),
    sellerId: z.number(),
    sellerType: z.string(),
    name: z.string()
  }),
  price: z.number(),
  serialNumber: z.number().nullable().optional(),
  errorMessage: z.string().nullable().optional()
})

export const resellersResponseSchema = z.object({
  data: z.array(resellerItemSchema),
  nextPageCursor: z.string().nullable().optional(),
  previousPageCursor: z.string().nullable().optional()
})

export type ResellerItem = z.infer<typeof resellerItemSchema>
export type ResellersResponse = z.infer<typeof resellersResponseSchema>

export const assetOwnerSchema = z.object({
  id: z.number(),
  collectibleItemInstanceId: z.string().nullable().optional(),
  serialNumber: z.number().nullable().optional(),
  owner: z
    .object({
      id: z.number(),
      type: z.string(),
      name: z.string().nullable().optional()
    })
    .nullable()
    .optional(),
  created: z.string().optional(),
  updated: z.string().optional()
})

export const assetOwnersResponseSchema = z.object({
  data: z.array(assetOwnerSchema),
  nextPageCursor: z.string().nullable().optional(),
  previousPageCursor: z.string().nullable().optional()
})

export type AssetOwner = z.infer<typeof assetOwnerSchema>
export type AssetOwnersResponse = z.infer<typeof assetOwnersResponseSchema>

export const priceDataPointSchema = z.object({
  value: z.number(),
  date: z.string()
})

export const resaleDataSchema = z.object({
  assetStock: z.number().nullable().optional(),
  sales: z.number().nullable().optional(),
  numberRemaining: z.number().nullable().optional(),
  recentAveragePrice: z.number().nullable().optional(),
  originalPrice: z.number().nullable().optional(),
  priceDataPoints: z.array(priceDataPointSchema).nullable().optional()
})

export type ResaleData = z.infer<typeof resaleDataSchema>

// ============================================================================
// PURCHASE SCHEMAS
// ============================================================================

export const purchaseLimitedResultSchema = z
  .object({
    purchased: z.boolean().optional(),
    reason: z.string().optional(),
    productId: z.number().optional(),
    statusCode: z.number().optional(),
    title: z.string().optional(),
    errorMsg: z.string().optional(),
    showDivId: z.string().optional(),
    shortMessage: z.string().optional()
  })
  .passthrough()

export const purchaseCatalogResultSchema = z
  .object({
    purchaseResult: z.string().optional(),
    purchased: z.boolean(),
    pending: z.boolean().optional(),
    errorMessage: z.string().nullable().optional(),
    reason: z.string().optional(),
    statusCode: z.number().optional()
  })
  .passthrough()

export type PurchaseLimitedResult = z.infer<typeof purchaseLimitedResultSchema>
export type PurchaseCatalogResult = z.infer<typeof purchaseCatalogResultSchema>

// ============================================================================
// DOWNLOAD SCHEMAS
// ============================================================================

export const downloadResultSchema = z.object({
  success: z.boolean(),
  canceled: z.boolean().optional(),
  path: z.string().optional()
})

export const templateDownloadResultSchema = z.object({
  success: z.boolean(),
  message: z.string().optional(),
  path: z.string().optional()
})

export type DownloadResult = z.infer<typeof downloadResultSchema>
export type TemplateDownloadResult = z.infer<typeof templateDownloadResultSchema>

// ============================================================================
// CATALOG DATABASE SCHEMAS
// ============================================================================

export const catalogDbItemSchema = z.object({
  AssetId: z.number(),
  ProductId: z.number().nullable(),
  Name: z.string(),
  Description: z.string().nullable(),
  ProductType: z.string().nullable(),
  AssetTypeId: z.number().nullable(),
  Created: z.string().nullable(),
  Updated: z.string().nullable(),
  PriceInRobux: z.number().nullable(),
  Sales: z.number(),
  IsForSale: z.boolean(),
  IsLimited: z.boolean(),
  IsLimitedUnique: z.boolean(),
  CollectiblesItemDetails: z.string().nullable()
})

export const catalogDbSearchResultSchema = z.object({
  AssetId: z.number(),
  Name: z.string(),
  Description: z.string(),
  AssetTypeId: z.number(),
  IsLimited: z.boolean(),
  IsLimitedUnique: z.boolean(),
  PriceInRobux: z.number(),
  IsForSale: z.boolean(),
  Sales: z.number()
})

export const salesDataSchema = z.object({
  id: z.number(),
  sales: z.number()
})

export type CatalogDbItem = z.infer<typeof catalogDbItemSchema>
export type CatalogDbSearchResult = z.infer<typeof catalogDbSearchResultSchema>
