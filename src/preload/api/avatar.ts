import { z } from 'zod'
import { invoke } from './invoke'
import * as S from '../../shared/ipc-schemas'

// ============================================================================
// AVATAR API
// ============================================================================

export const avatarApi = {
  getAvatarUrl: (userId: string) => invoke('get-avatar-url', z.string(), userId),
  getBatchUserAvatars: (userIds: number[], size?: string) =>
    invoke('get-batch-user-avatars', z.record(z.string(), z.string().nullable()), userIds, size),
  getCurrentAvatar: (cookie: string, userId?: number) =>
    invoke('get-current-avatar', S.avatarStateSchema, cookie, userId),
  setWearingAssets: (
    cookie: string,
    assets: Array<{
      id: number
      name: string
      assetType: { id: number; name: string }
      currentVersionId?: number
      meta?: { order?: number; puffiness?: number; version?: number }
    }>
  ) => invoke('set-wearing-assets', S.wearingAssetsResultSchema, cookie, assets),
  setBodyColors: (cookie: string, bodyColors: unknown) =>
    invoke('set-body-colors', S.successResponseSchema, cookie, bodyColors),
  setAvatarScales: (
    cookie: string,
    scales: { height: number; width: number; head: number; proportion: number; bodyType: number }
  ) => invoke('set-avatar-scales', S.successResponseSchema, cookie, scales),
  setPlayerAvatarType: (cookie: string, playerAvatarType: 'R6' | 'R15') =>
    invoke('set-player-avatar-type', S.successResponseSchema, cookie, playerAvatarType),
  renderAvatarPreview: (cookie: string, userId: number, assetId: number) =>
    invoke('render-avatar-preview', z.object({ imageUrl: z.string() }), cookie, userId, assetId),
  getBatchThumbnails: (targetIds: number[], type?: 'Asset' | 'Outfit' | 'BadgeIcon') =>
    invoke('get-batch-thumbnails', S.thumbnailBatchSchema, targetIds, type),
  getUserOutfits: (cookie: string, userId: number, isEditable: boolean, page: number) =>
    invoke('get-user-outfits', S.userOutfitCollectionSchema, cookie, userId, isEditable, page),
  wearOutfit: (cookie: string, outfitId: number) =>
    invoke('wear-outfit', S.successResponseSchema, cookie, outfitId),
  updateOutfit: (cookie: string, outfitId: number, details: unknown) =>
    invoke('update-outfit', S.updateOutfitResultSchema, cookie, outfitId, details),
  getOutfitDetails: (cookie: string, outfitId: number) =>
    invoke('get-outfit-details', S.outfitDetailsSchema, cookie, outfitId),
  deleteOutfit: (cookie: string, outfitId: number) =>
    invoke('delete-outfit', S.successResponseSchema, cookie, outfitId),
  getAvatar3DManifest: (cookie: string, userId: number | string) =>
    invoke('get-avatar-3d-manifest', z.object({ imageUrl: z.string() }), cookie, userId),
  getAsset3DManifest: (cookie: string, assetId: number | string) =>
    invoke('get-asset-3d-manifest', z.object({ imageUrl: z.string() }), cookie, assetId),
  downloadAsset3D: (assetId: number, type: 'obj' | 'texture', assetName: string) =>
    invoke('download-asset-3d', S.downloadResultSchema, assetId, type, assetName)
}

// ============================================================================
// INVENTORY API
// ============================================================================

export const inventoryApi = {
  getInventory: (cookie: string, userId: number, assetTypeId: number, cursor?: string) =>
    invoke('get-inventory', S.inventoryPageSchema, cookie, userId, assetTypeId, cursor),
  getInventoryV2: (
    cookie: string,
    userId: number,
    assetTypes: string[],
    cursor?: string,
    limit?: number,
    sortOrder?: 'Asc' | 'Desc'
  ) =>
    invoke(
      'get-inventory-v2',
      S.inventoryPageSchema,
      cookie,
      userId,
      assetTypes,
      cursor,
      limit,
      sortOrder
    ),
  getCollectibles: (cookie: string, userId: number) =>
    invoke('get-collectibles', z.any(), cookie, userId)
}

// ============================================================================
// CATALOG API
// ============================================================================

export const catalogApi = {
  getAssetContent: (url: string) => invoke('get-asset-content', z.string(), url),
  getAssetDetails: (cookie: string, assetId: number) =>
    invoke('get-asset-details', S.assetDetailsSchema, cookie, assetId),
  getBatchAssetDetails: (cookie: string, assetIds: number[], itemType?: 'Asset' | 'Bundle') =>
    invoke(
      'get-batch-asset-details',
      z.array(S.catalogItemDetailSchema),
      cookie,
      assetIds,
      itemType
    ),
  getAssetRecommendations: (cookie: string, assetId: number) =>
    invoke('get-asset-recommendations', S.recommendationsSchema, cookie, assetId),
  getAssetResellers: (collectibleItemId: string, limit?: number, cursor?: string) =>
    invoke('get-asset-resellers', S.resellersResponseSchema, collectibleItemId, limit, cursor),
  getAssetOwners: (
    cookie: string,
    assetId: number,
    limit?: number,
    sortOrder?: 'Asc' | 'Desc',
    cursor?: string
  ) =>
    invoke(
      'get-asset-owners',
      S.assetOwnersResponseSchema,
      cookie,
      assetId,
      limit,
      sortOrder,
      cursor
    ),
  getResaleData: (assetId: number) => invoke('get-resale-data', S.resaleDataSchema, assetId),
  checkAssetOwnership: (cookie: string, userId: number, assetId: number, itemType?: string) =>
    invoke('check-asset-ownership', z.boolean(), cookie, userId, assetId, itemType),
  purchaseLimitedItem: (
    cookie: string,
    collectibleItemInstanceId: string,
    expectedPrice: number,
    sellerId: number,
    collectibleProductId: string
  ) =>
    invoke(
      'purchase-limited-item',
      S.purchaseLimitedResultSchema,
      cookie,
      collectibleItemInstanceId,
      expectedPrice,
      sellerId,
      collectibleProductId
    ),
  purchaseCatalogItem: (
    cookie: string,
    collectibleItemId: string,
    expectedPrice: number,
    expectedSellerId: number,
    collectibleProductId?: string,
    expectedPurchaserId?: string,
    idempotencyKey?: string
  ) =>
    invoke(
      'purchase-catalog-item',
      S.purchaseCatalogResultSchema,
      cookie,
      collectibleItemId,
      expectedPrice,
      expectedSellerId,
      collectibleProductId,
      expectedPurchaserId,
      idempotencyKey
    ),
  getAssetHierarchy: (assetId: number) => invoke('get-asset-hierarchy', z.any(), assetId),
  searchCatalog: (keyword: string, limit?: number, creatorName?: string) =>
    invoke('search-catalog', S.catalogSearchResponseSchema, keyword, limit, creatorName),
  getCatalogNavigation: () => invoke('get-catalog-navigation', z.array(S.catalogCategorySchema)),
  searchCatalogItems: (params: {
    keyword?: string
    taxonomy?: string
    subcategory?: string
    sortType?: number
    sortAggregation?: number
    salesTypeFilter?: number
    minPrice?: number
    maxPrice?: number
    creatorName?: string
    creatorType?: string
    limit?: number
    cursor?: string
    includeNotForSale?: boolean
  }) => invoke('search-catalog-items', S.catalogItemsSearchResponseSchema, params),
  getCatalogSearchSuggestions: (prefix: string, limit?: number) =>
    invoke('get-catalog-search-suggestions', z.array(z.string()), prefix, limit),
  getCatalogThumbnails: (items: Array<{ id: number; itemType: string }>) =>
    invoke('get-catalog-thumbnails', z.record(z.string(), z.string()), items),
  downloadCatalogTemplate: (assetId: number, assetName: string, cookie?: string) =>
    invoke('download-catalog-template', S.templateDownloadResultSchema, assetId, assetName, cookie)
}

// ============================================================================
// CATALOG DATABASE API
// ============================================================================

export const catalogDatabaseApi = {
  getAllCatalogItems: () => invoke('get-all-catalog-items', z.array(S.catalogDbSearchResultSchema)),
  searchCatalogDb: (query: string, limit?: number) =>
    invoke('search-catalog-db', z.array(S.catalogDbSearchResultSchema), query, limit),
  getCatalogItemById: (assetId: number) =>
    invoke('get-catalog-item-by-id', S.catalogDbItemSchema.nullable(), assetId),
  getSalesData: (assetId: number) =>
    invoke('get-sales-data', S.salesDataSchema.nullable(), assetId),
  getBatchSalesData: (assetIds: number[]) =>
    invoke('get-batch-sales-data', z.record(z.string(), z.number()), assetIds),
  getCatalogItemCount: () => invoke('get-catalog-item-count', z.number()),
  getCatalogDbStatus: () => invoke('get-catalog-db-status', S.catalogDbStatusSchema),
  downloadCatalogDb: () => invoke('download-catalog-db', S.catalogDbDownloadResultSchema)
}
