import { request, requestWithCsrf, safeRequest } from '@main/lib/request'
import { z } from 'zod'
import {
  userOutfitCollectionSchema,
  outfitDetailsSchema,
  avatarStateSchema,
  thumbnailBatchSchema,
  thumbnailEntrySchema,
  wearingAssetsResultSchema,
  updateOutfitResultSchema,
  assetDetailsSchema,
  recommendationsSchema,
  batchCatalogDetailsSchema,
  resellersResponseSchema,
  resaleDataSchema,
  catalogSearchResponseSchema,
  inventoryPageSchema,
  collectiblesSchema,
  OutfitDetails,
  CatalogItemDetail,
  CatalogSearchResponse,
  ResellersResponse,
  AssetOwnersResponse
} from '@shared/ipc-schemas/avatar'

// Schema for avatar render response
const avatarRenderResponseSchema = z.object({
  targetId: z.number(),
  state: z.string(),
  imageUrl: z.string(),
  version: z.string().optional()
})

const BODY_COLOR_BASE_KEYS = [
  'headColor',
  'torsoColor',
  'rightArmColor',
  'leftArmColor',
  'rightLegColor',
  'leftLegColor'
] as const

// BrickColor ID to hex color mapping (common skin tones and colors)
// Reference: https://developer.roblox.com/en-us/articles/BrickColor-Codes
const BRICK_COLOR_TO_HEX: Record<number, string> = {
  1: 'F2F3F3', // White
  5: 'D7C59A', // Brick yellow
  9: 'E8BAC8', // Light reddish violet
  18: 'CC8E69', // Nougat
  21: 'C4281C', // Bright red
  23: '0D69AC', // Bright blue
  24: 'F5CD30', // Bright yellow
  26: '1B2A35', // Black
  28: '287F47', // Dark green
  29: 'A1C48C', // Medium green
  37: '4B974B', // Bright green
  38: 'AA5500', // Dark orange
  45: 'B4D2E4', // Light blue
  101: 'DA867A', // Medium red
  102: '6E99CA', // Medium blue
  104: '6B327C', // Bright violet
  105: 'E29B40', // Br. yellowish orange
  106: 'DA8541', // Bright orange
  107: '008F9C', // Bright bluish green
  119: 'A4BD47', // Br. yellowish green
  125: 'EAB892', // Light orange
  135: '74869D', // Sand blue
  141: '27462D', // Earth green
  151: '789082', // Sand green
  153: '957977', // Sand red
  192: '694028', // Reddish brown
  194: 'A3A2A5', // Medium stone grey
  199: '635F62', // Dark stone grey
  208: 'E5E4DF', // Light stone grey
  217: '7C5C46', // Brown
  226: 'FDEA8D', // Cool yellow
  1001: 'F8F8F8', // Institutional white
  1002: 'CDCDCD', // Mid gray
  1003: '111111', // Really black
  1004: 'FF0000', // Really red
  1005: 'FFB000', // Deep orange
  1006: 'B480FF', // Alder
  1007: '9F8660', // Dusty Rose (actually more brown)
  1008: 'C1BE42', // Olive
  1009: 'FFFF00', // New Yeller
  1010: '0000FF', // Really blue
  1011: '002060', // Navy blue
  1012: '2154B9', // Deep blue
  1013: 'A86F99', // Magenta
  1014: 'AA5599', // Pink
  1015: 'AA00AA', // Hot pink
  1016: '993399', // Crimson
  1017: 'FFCC00', // Bright yellow (deep)
  1018: '006400', // Really green
  1019: '00FFFF', // Cyan
  1020: '00FF00', // Lime green
  1021: '3A7D15', // Camo
  1022: '7F8E64', // Grime
  1023: 'E8E8E8', // Lavender (actually light grey)
  1024: 'AFDDFF', // Pastel light blue
  1025: 'FFC9C9', // Pastel orange (actually pink)
  1026: 'B1A7FF', // Pastel violet
  1027: '9FF3E9', // Pastel blue-green
  1028: 'CCFFCC', // Pastel green
  1029: 'FFFFCC', // Pastel yellow (common skin tone)
  1030: 'FFCC99', // Pastel brown
  1031: '6C584C', // Royal purple (actually brown)
  1032: 'FF9494' // Hot pink (lighter)
}

/**
 * Convert a BrickColor ID to a hex color string
 * Used by renderAvatarWithAsset when avatar API returns colors as IDs
 */
function brickColorToHex(brickColorId: number): string | undefined {
  return BRICK_COLOR_TO_HEX[brickColorId]
}

type ThumbnailEntry = z.infer<typeof thumbnailEntrySchema>

export class RobloxAvatarService {
  private static THUMBNAIL_BATCH_LIMIT = 100
  private static thumbnailChunkPromises = new Map<string, Promise<ThumbnailEntry[]>>()

  static async getInventory(
    cookie: string,
    userId: number,
    assetTypeId: number,
    cursor?: string,
    limit: number = 100
  ) {
    let url = `https://inventory.roblox.com/v2/users/${userId}/inventory/${assetTypeId}?limit=${limit}`
    if (cursor) {
      url += `&cursor=${cursor}`
    }

    return request(inventoryPageSchema, {
      url,
      cookie
    })
  }

  static async getCollectibles(_cookie: string, userId: number) {
    try {
      const url = `https://apis.roblox.com/showcases-api/v1/users/profile/robloxcollections-json?userId=${userId}`
      return await request(collectiblesSchema, {
        url,
        method: 'GET'
      })
    } catch (error: any) {
      console.warn(`Failed to fetch collectibles for user ${userId}:`, error.message)
      return []
    }
  }

  static async getOutfits(
    cookie: string,
    userId: number,
    isEditable: boolean = false,
    page: number = 1,
    itemsPerPage: number = 25
  ) {
    return request(userOutfitCollectionSchema, {
      url: `https://avatar.roblox.com/v1/users/${userId}/outfits?isEditable=${isEditable}&itemsPerPage=${itemsPerPage}&page=${page}`,
      cookie
    })
  }

  static async wearOutfit(cookie: string, outfitId: number): Promise<{ success: boolean }> {
    const outfit = await RobloxAvatarService.getOutfitDetails(cookie, outfitId)

    if (!outfit) {
      throw new Error(`Unable to load outfit ${outfitId}`)
    }

    if (outfit.playerAvatarType) {
      await RobloxAvatarService.postAvatarMutation(cookie, '/v1/avatar/set-player-avatar-type', {
        playerAvatarType: outfit.playerAvatarType
      })
    }

    const bodyColorPayload = RobloxAvatarService.buildBodyColorsPayload(outfit.bodyColors)
    if (bodyColorPayload) {
      await RobloxAvatarService.postAvatarMutation(
        cookie,
        '/v1/avatar/set-body-colors',
        bodyColorPayload
      )
    }

    if (outfit.scale && typeof outfit.scale === 'object') {
      await RobloxAvatarService.postAvatarMutation(
        cookie,
        '/v1/avatar/set-scales',
        outfit.scale as Record<string, unknown>
      )
    }

    // Use V2 API with full asset objects for better compatibility
    if (outfit.assets && outfit.assets.length > 0) {
      const assetsPayload = outfit.assets.map((asset: any) => ({
        id: asset.id,
        name: asset.name,
        assetType: {
          id: asset.assetType?.id,
          name: asset.assetType?.name
        },
        ...(asset.currentVersionId ? { currentVersionId: asset.currentVersionId } : {}),
        ...(asset.meta ? { meta: asset.meta } : {})
      }))

      await requestWithCsrf(wearingAssetsResultSchema, {
        method: 'POST',
        url: 'https://avatar.roblox.com/v2/avatar/set-wearing-assets',
        cookie,
        headers: {
          'Content-Type': 'application/json'
        },
        body: {
          assets: assetsPayload
        }
      })
    }

    return { success: true }
  }

  static async getAssetDetails(cookie: string, assetId: number) {
    const [catalogDetails, economyDetails] = await Promise.allSettled([
      request(assetDetailsSchema, {
        url: `https://catalog.roblox.com/v1/catalog/items/${assetId}/details?itemType=Asset`,
        cookie
      }),
      request(assetDetailsSchema, {
        url: `https://economy.roblox.com/v2/assets/${assetId}/details`,
        cookie
      })
    ])

    const catalogData = catalogDetails.status === 'fulfilled' ? catalogDetails.value : {}
    const economyData = economyDetails.status === 'fulfilled' ? economyDetails.value : {}

    // Extract collectible lowest resale price from economy data
    const collectibleLowestResalePrice =
      economyData.CollectiblesItemDetails?.CollectibleLowestResalePrice ?? null

    return {
      ...catalogData,
      ...economyData,
      // Prioritize Catalog V1 for these if available, but Economy has some too
      name: catalogData.name || economyData.Name,
      description: catalogData.description || economyData.Description,
      price: catalogData.price ?? economyData.PriceInRobux,
      creatorName: catalogData.creatorName || economyData.Creator?.Name,
      creatorType: catalogData.creatorType || economyData.Creator?.CreatorType,
      creatorHasVerifiedBadge:
        catalogData.creatorHasVerifiedBadge || economyData.Creator?.HasVerifiedBadge,
      created: catalogData.itemCreatedUtc || economyData.Created,
      updated: economyData.Updated || catalogData.itemUpdatedUtc, // Economy V2 has the correct Updated field
      isLimited:
        catalogData.isLimited ||
        economyData.IsLimited ||
        economyData.CollectiblesItemDetails?.IsLimited,
      isLimitedUnique: catalogData.isLimitedUnique || economyData.IsLimitedUnique,
      isForSale: catalogData.isPurchasable || economyData.IsForSale,
      collectibleLowestResalePrice,
      collectibleProductId: catalogData.collectibleProductId || economyData.CollectibleProductId,
      collectibleItemId: catalogData.collectibleItemId || economyData.CollectibleItemId
    }
  }

  /**
   * Batch fetch catalog item details for multiple assets at once.
   * @param cookie Authentication cookie
   * @param assetIds Array of asset IDs to fetch details for
   * @param itemType Type of items (default: 'Asset')
   * @returns Array of catalog item details
   */
  static async getBatchAssetDetails(
    cookie: string,
    assetIds: number[],
    itemType: 'Asset' | 'Bundle' = 'Asset'
  ): Promise<CatalogItemDetail[]> {
    if (assetIds.length === 0) {
      return []
    }

    // Roblox API has a limit of ~120 items per batch request
    const BATCH_LIMIT = 120
    const chunks = this.chunkArray(assetIds, BATCH_LIMIT)
    const allResults: CatalogItemDetail[] = []

    for (const chunk of chunks) {
      try {
        const items = chunk.map((id) => ({
          itemType,
          id
        }))

        const response = await requestWithCsrf(batchCatalogDetailsSchema, {
          method: 'POST',
          url: 'https://catalog.roblox.com/v1/catalog/items/details',
          cookie,
          headers: {
            'Content-Type': 'application/json'
          },
          body: { items }
        })

        if (response.data) {
          allResults.push(...response.data)
        }
      } catch (error) {
        console.error('[RobloxAvatarService] Failed to fetch batch asset details for chunk:', error)
        // Continue with other chunks even if one fails
      }
    }

    return allResults
  }

  static async getAssetRecommendations(cookie: string, assetId: number) {
    try {
      // Fetch asset details first to get the AssetTypeId
      const details = await RobloxAvatarService.getAssetDetails(cookie, assetId)
      const assetTypeId = details.AssetTypeId || details.assetType || 8 // Default to Hat (8) if unknown

      return await request(recommendationsSchema, {
        // Updated to V2 endpoint as per user example
        url: `https://catalog.roblox.com/v2/recommendations/assets?assetId=${assetId}&assetTypeId=${assetTypeId}&details=false&numItems=10`,
        cookie
      })
    } catch (error) {
      console.warn('[RobloxAvatarService] Failed to fetch recommendations:', error)
      return { data: [] }
    }
  }

  /**
   * Fetch resellers for a limited/collectible item
   * @param collectibleItemId The collectible item ID (UUID) from asset details
   * @param limit Number of resellers to fetch (default 100)
   * @param cursor Pagination cursor
   */
  static async getAssetResellers(
    collectibleItemId: string,
    limit: number = 100,
    cursor?: string
  ): Promise<ResellersResponse> {
    try {
      let url = `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/resellers?limit=${limit}`
      if (cursor) {
        url += `&cursor=${cursor}`
      }

      return await request(resellersResponseSchema, {
        url,
        method: 'GET'
      })
    } catch (error) {
      console.warn('[RobloxAvatarService] Failed to fetch resellers:', error)
      return { data: [] }
    }
  }

  /**
   * Fetch owners for a limited asset
   * @param cookie Authentication cookie (required for owner details)
   * @param assetId The asset ID
   * @param limit Number of owners to fetch (default 100)
   * @param sortOrder Sort order (Asc or Desc)
   * @param cursor Pagination cursor
   */
  static async getAssetOwners(
    cookie: string,
    assetId: number,
    limit: number = 100,
    sortOrder: 'Asc' | 'Desc' = 'Asc',
    cursor?: string
  ): Promise<AssetOwnersResponse> {
    try {
      let url = `https://inventory.roblox.com/v2/assets/${assetId}/owners?limit=${limit}&sortOrder=${sortOrder}`
      if (cursor) {
        url += `&cursor=${cursor}`
      }

      // Use a more lenient schema to avoid validation failures
      const lenientOwnerSchema = z
        .object({
          id: z.number(),
          collectibleItemInstanceId: z.string().nullable().optional(),
          serialNumber: z.union([z.number(), z.null()]).optional(),
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
        .passthrough()

      const lenientResponseSchema = z.object({
        data: z.array(lenientOwnerSchema),
        nextPageCursor: z.string().nullable().optional(),
        previousPageCursor: z.string().nullable().optional()
      })

      // Fetch with authentication - this is required to see owner details
      const rawData = await safeRequest<any>({
        url,
        method: 'GET',
        cookie
      })

      // Parse with schema
      const result = lenientResponseSchema.parse(rawData)

      return result as AssetOwnersResponse
    } catch (error: any) {
      console.error('[RobloxAvatarService] Failed to fetch asset owners:', error)
      if (error.issues) {
        console.error(
          '[RobloxAvatarService] Zod validation issues:',
          JSON.stringify(error.issues, null, 2)
        )
      }
      return { data: [] }
    }
  }

  static async getResaleData(assetId: number) {
    return request(resaleDataSchema, {
      url: `https://economy.roblox.com/v1/assets/${assetId}/resale-data`,
      method: 'GET'
    })
  }

  /**
   * Search the Roblox catalog for items by keyword.
   * Uses the catalog.roblox.com/v2/search/items/details endpoint.
   * @param keyword Search keyword
   * @param limit Number of results (default 30, max 120)
   * @param creatorName Optional creator name filter (e.g., 'Roblox')
   * @returns Catalog search response with items sorted by relevance
   */
  static async searchCatalog(
    keyword: string,
    limit: number = 30,
    creatorName?: string
  ): Promise<CatalogSearchResponse> {
    try {
      // Build URL with query parameters
      const params = new URLSearchParams({
        keyword,
        limit: Math.min(limit, 120).toString(),
        includeNotForSale: 'true',
        salesTypeFilter: '1' // All sales types
      })

      // Filter by creator name if provided
      if (creatorName) {
        params.append('creatorName', creatorName)
      }

      const url = `https://catalog.roblox.com/v2/search/items/details?${params.toString()}`

      return await request(catalogSearchResponseSchema, {
        url,
        method: 'GET'
      })
    } catch (error) {
      console.error('[RobloxAvatarService] Failed to search catalog:', error)
      return { data: [] }
    }
  }

  static async purchaseLimitedItem(
    cookie: string,
    collectibleItemInstanceId: string,
    expectedPrice: number,
    sellerId: number,
    productId: string
  ) {
    // Schema for purchase response
    const purchaseResponseSchema = z
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

    return requestWithCsrf(purchaseResponseSchema, {
      method: 'POST',
      url: `https://economy.roblox.com/v1/purchases/products/${productId}`,
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        expectedCurrency: 1, // 1 = Robux
        expectedPrice,
        expectedSellerId: sellerId,
        userAssetId: collectibleItemInstanceId
      }
    })
  }

  /**
   * Purchase a catalog item using the marketplace-sales API.
   * Used for purchasing regular catalog items (non-limited resales).
   * @param cookie Authentication cookie
   * @param collectibleItemId The collectible item ID (UUID) from asset details
   * @param expectedPrice Expected price of the item
   * @param expectedSellerId Expected seller ID
   * @returns Purchase result with purchased status
   */
  static async purchaseCatalogItem(
    cookie: string,
    collectibleItemId: string,
    expectedPrice: number,
    expectedSellerId: number,
    collectibleProductId?: string,
    expectedPurchaserId?: string,
    idempotencyKey?: string
  ) {
    // Schema for marketplace-sales purchase response
    const purchaseResponseSchema = z
      .object({
        purchaseResult: z.string().optional(),
        purchased: z.boolean(),
        pending: z.boolean().optional(),
        errorMessage: z.string().nullable().optional(),
        reason: z.string().optional(),
        statusCode: z.number().optional()
      })
      .passthrough()

    const body: Record<string, any> = {
      collectibleItemId,
      expectedCurrency: 1,
      expectedPrice,
      expectedSellerId,
      expectedSellerType: 'User'
    }

    if (collectibleProductId) body.collectibleProductId = collectibleProductId
    if (expectedPurchaserId) {
      body.expectedPurchaserId = expectedPurchaserId
      body.expectedPurchaserType = 'User'
    }
    if (idempotencyKey) body.idempotencyKey = idempotencyKey

    // The marketplace-sales API expects these specific fields
    return requestWithCsrf(purchaseResponseSchema, {
      method: 'POST',
      url: `https://apis.roblox.com/marketplace-sales/v1/item/${collectibleItemId}/purchase-item`,
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body
    })
  }

  static async getOutfitDetails(cookie: string, outfitId: number) {
    return request(outfitDetailsSchema, {
      url: `https://avatar.roblox.com/v1/outfits/${outfitId}/details`,
      cookie
    })
  }

  static async updateOutfit(cookie: string, outfitId: number, details: Partial<OutfitDetails>) {
    const payload = RobloxAvatarService.buildOutfitPayload(details)

    const response = await requestWithCsrf(updateOutfitResultSchema, {
      method: 'PATCH',
      url: `https://avatar.roblox.com/v3/outfits/${outfitId}`,
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    })

    return {
      ...response,
      success: response.success // Zod schema ensures success boolean
    }
  }

  static async deleteOutfit(cookie: string, outfitId: number): Promise<{ success: boolean }> {
    try {
      await requestWithCsrf(z.object({ success: z.boolean().optional() }), {
        method: 'POST',
        url: `https://avatar.roblox.com/v1/outfits/${outfitId}/delete`,
        cookie,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      return { success: true }
    } catch (error: any) {
      console.error(`Failed to delete outfit ${outfitId}:`, error)
      if (error.body) {
        console.error('Error body:', error.body)
      }
      return { success: false }
    }
  }

  static async getCurrentAvatar(cookie: string, userId?: number) {
    const url = userId
      ? `https://avatar.roblox.com/v1/users/${userId}/avatar`
      : 'https://avatar.roblox.com/v1/avatar'

    return request(avatarStateSchema, {
      url,
      cookie
    })
  }

  /**
   * Set wearing assets using V2 API with full asset details.
   * This is the preferred method as it properly handles all asset types.
   * @param cookie Authentication cookie
   * @param assets Array of asset objects with id, name, assetType, and optionally currentVersionId
   */
  static async setWearingAssets(
    cookie: string,
    assets: Array<{
      id: number
      name: string
      assetType: { id: number; name: string }
      currentVersionId?: number
      meta?: { order?: number; puffiness?: number; version?: number }
    }>
  ) {
    // Build the V2 payload format
    const assetsPayload = assets.map((asset) => ({
      id: asset.id,
      name: asset.name,
      assetType: {
        id: asset.assetType.id,
        name: asset.assetType.name
      },
      ...(asset.currentVersionId ? { currentVersionId: asset.currentVersionId } : {}),
      ...(asset.meta ? { meta: asset.meta } : {})
    }))

    const requestBody = { assets: assetsPayload }

    const response = await requestWithCsrf(wearingAssetsResultSchema, {
      method: 'POST',
      url: 'https://avatar.roblox.com/v2/avatar/set-wearing-assets',
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: requestBody
    })

    return response
  }

  /**
   * Legacy method using V1 API with just asset IDs.
   * @deprecated Use setWearingAssets with full asset objects instead
   */
  static async setWearingAssetsLegacy(cookie: string, assetIds: number[]) {
    return requestWithCsrf(wearingAssetsResultSchema, {
      method: 'POST',
      url: 'https://avatar.roblox.com/v1/avatar/set-wearing-assets',
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: {
        assetIds
      }
    })
  }

  static async getBatchThumbnails(
    targetIds: number[],
    size: string = '420x420',
    format: string = 'png',
    type: 'Asset' | 'Outfit' | 'BadgeIcon' | 'GroupIcon' = 'Asset'
  ) {
    const resolvedType = type ?? 'Asset'
    const resolvedSize =
      resolvedType === 'BadgeIcon' || resolvedType === 'GroupIcon' ? '150x150' : size
    const resolvedFormat =
      resolvedType === 'BadgeIcon' || resolvedType === 'GroupIcon' ? 'Png' : format
    const sanitizedIds = Array.from(
      new Set(
        (targetIds || []).filter(
          (id): id is number => typeof id === 'number' && Number.isFinite(id)
        )
      )
    )

    if (sanitizedIds.length === 0) {
      return { data: [] }
    }

    const cacheNamespace = `${resolvedType}|${resolvedSize}|${resolvedFormat}`
    const entryMap = new Map<number, ThumbnailEntry>()

    // Fetch all IDs (no caching on main process - TanStack Query handles caching on renderer)
    const chunks = this.chunkArray(sanitizedIds, this.THUMBNAIL_BATCH_LIMIT)
    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        this.fetchThumbnailChunk(cacheNamespace, chunk, resolvedType, resolvedSize, resolvedFormat)
      )
    )

    chunkResults.forEach((entries) => {
      entries.forEach((entry) => {
        entryMap.set(entry.targetId, entry)
      })
    })

    const orderedData = sanitizedIds
      .map((id) => entryMap.get(id))
      .filter((entry): entry is ThumbnailEntry => Boolean(entry))

    return { data: orderedData }
  }

  private static chunkArray<T>(items: T[], size: number): T[][] {
    if (size <= 0 || items.length <= size) {
      return items.length ? [items.slice()] : []
    }

    const chunks: T[][] = []
    for (let i = 0; i < items.length; i += size) {
      chunks.push(items.slice(i, i + size))
    }
    return chunks
  }

  private static async fetchThumbnailChunk(
    namespace: string,
    ids: number[],
    type: 'Asset' | 'Outfit' | 'BadgeIcon' | 'GroupIcon',
    size: string,
    format: string
  ): Promise<ThumbnailEntry[]> {
    if (ids.length === 0) {
      return []
    }

    const chunkKey = `thumbnail-chunk|${namespace}|${ids.join(',')}`
    if (this.thumbnailChunkPromises.has(chunkKey)) {
      return this.thumbnailChunkPromises.get(chunkKey)!
    }

    const promise = (async () => {
      const requests = ids.map((id) => ({
        requestId: `req_${id}`,
        targetId: id,
        type,
        size,
        format,
        isCircular: false
      }))

      const response = await request(thumbnailBatchSchema, {
        method: 'POST',
        url: 'https://thumbnails.roblox.com/v1/batch',
        headers: {
          'Content-Type': 'application/json'
        },
        body: requests
      })

      return response.data || []
    })()

    this.thumbnailChunkPromises.set(chunkKey, promise)

    try {
      return await promise
    } finally {
      this.thumbnailChunkPromises.delete(chunkKey)
    }
  }

  private static buildOutfitPayload(details: Partial<OutfitDetails>): Record<string, any> {
    const payload: Record<string, any> = {}
    if (!details) {
      throw new Error('No outfit details supplied for update')
    }

    if (typeof details.name === 'string') {
      payload.name = details.name
    }

    if (details.playerAvatarType) {
      payload.playerAvatarType = details.playerAvatarType
    }

    if (details.bodyColors) {
      const bodyColorIds = RobloxAvatarService.extractBodyColorIds(details.bodyColors)
      const bodyColor3s = RobloxAvatarService.extractBodyColor3s(details.bodyColors)

      if (bodyColorIds) {
        payload.bodyColors = bodyColorIds
      } else {
        payload.bodyColors = details.bodyColors
      }

      if (bodyColor3s) {
        payload.bodyColor3s = bodyColor3s
      }
    }

    const scale = (details as any).scale || (details as any).scales
    if (scale) {
      payload.scale = scale
    }

    const rawAssets = (details as any).assets
    if (Array.isArray(rawAssets)) {
      payload.assetIds = RobloxAvatarService.extractAssetIds(rawAssets)
      const assets = RobloxAvatarService.normalizeAssets(rawAssets)
      if (assets) {
        payload.assets = assets
      }
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('Outfit update payload was empty. Provide at least one field to change.')
    }

    return payload
  }

  private static normalizeAssets(
    assets?: Array<{
      id?: number
      assetId?: number
      assetTypeId?: number
      assetType?: { id?: number }
    }>
  ): { id: number; assetTypeId: number }[] | undefined {
    if (!assets || !Array.isArray(assets)) {
      return undefined
    }

    const normalized = assets
      .map((asset) => {
        if (!asset) return null
        const id =
          typeof asset.id === 'number'
            ? asset.id
            : typeof asset.assetId === 'number'
              ? asset.assetId
              : undefined

        const assetTypeId =
          typeof asset.assetTypeId === 'number'
            ? asset.assetTypeId
            : typeof asset.assetType?.id === 'number'
              ? asset.assetType.id
              : undefined

        if (id === undefined || assetTypeId === undefined) {
          return null
        }

        return { id, assetTypeId }
      })
      .filter((entry): entry is { id: number; assetTypeId: number } => entry !== null)

    return normalized.length > 0 ? normalized : undefined
  }

  private static extractAssetIds(assets?: { id?: number; assetId?: number }[]): number[] {
    if (!assets || !Array.isArray(assets)) return []

    const ids = assets
      .map((asset) => {
        if (!asset) return undefined
        if (typeof asset.id === 'number') return asset.id
        if (typeof asset.assetId === 'number') return asset.assetId
        return undefined
      })
      .filter((id): id is number => typeof id === 'number')

    // Roblox expects unique asset IDs
    return Array.from(new Set(ids))
  }

  private static buildBodyColorsPayload(
    bodyColors: any
  ): Record<string, number | string> | undefined {
    const ids = RobloxAvatarService.extractBodyColorIds(bodyColors)
    const color3s = RobloxAvatarService.extractBodyColor3s(bodyColors)

    if (!ids && !color3s) {
      return undefined
    }

    return {
      ...(ids || {}),
      ...(color3s || {})
    }
  }

  private static extractBodyColorIds(bodyColors: any): Record<string, number> | undefined {
    if (!bodyColors || typeof bodyColors !== 'object') {
      return undefined
    }

    const payload: Record<string, number> = {}

    BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
      const normalizedKey = `${baseKey}Id`
      const value = RobloxAvatarService.resolveBodyColorId(bodyColors, baseKey)
      if (typeof value === 'number') {
        payload[normalizedKey] = value
      }
    })

    return Object.keys(payload).length > 0 ? payload : undefined
  }

  private static extractBodyColor3s(bodyColors: any): Record<string, string> | undefined {
    if (!bodyColors || typeof bodyColors !== 'object') {
      return undefined
    }

    const payload: Record<string, string> = {}

    BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
      const normalizedKey = `${baseKey}3`
      const value = RobloxAvatarService.resolveBodyColor3(bodyColors, baseKey)
      if (typeof value === 'string') {
        payload[normalizedKey] = value
      }
    })

    const nestedBodyColor3s = bodyColors.bodyColor3s
    if (nestedBodyColor3s && typeof nestedBodyColor3s === 'object') {
      BODY_COLOR_BASE_KEYS.forEach((baseKey) => {
        const normalizedKey = `${baseKey}3`
        const value = nestedBodyColor3s[normalizedKey]
        if (typeof value === 'string') {
          payload[normalizedKey] = RobloxAvatarService.normalizeColor3(value)
        }
      })
    }

    return Object.keys(payload).length > 0 ? payload : undefined
  }

  private static resolveBodyColorId(
    bodyColors: any,
    baseKey: (typeof BODY_COLOR_BASE_KEYS)[number]
  ): number | undefined {
    const directKey = `${baseKey}Id`
    if (typeof bodyColors[directKey] === 'number') {
      return bodyColors[directKey]
    }

    const altKey = `${baseKey}ID`
    if (typeof bodyColors[altKey] === 'number') {
      return bodyColors[altKey]
    }

    const nested = bodyColors[baseKey]
    if (nested && typeof nested === 'object') {
      const idCandidates = [
        nested.id,
        nested.Id,
        nested.brickColorId,
        nested.BrickColorId,
        nested.value,
        nested.Value
      ]

      const match = idCandidates.find((val) => typeof val === 'number')
      if (typeof match === 'number') {
        return match
      }
    }

    return undefined
  }

  private static resolveBodyColor3(
    bodyColors: any,
    baseKey: (typeof BODY_COLOR_BASE_KEYS)[number]
  ): string | undefined {
    const directKey = `${baseKey}3`
    if (typeof bodyColors[directKey] === 'string') {
      return RobloxAvatarService.normalizeColor3(bodyColors[directKey])
    }

    const nested = bodyColors[baseKey]
    if (nested && typeof nested === 'object') {
      const colorCandidates = [
        nested.color3,
        nested.Color3,
        nested.hexColor,
        nested.HexColor,
        nested.hex,
        nested.Hex,
        nested.color,
        nested.Color
      ]

      const match = colorCandidates.find((val) => typeof val === 'string')
      if (typeof match === 'string') {
        return RobloxAvatarService.normalizeColor3(match)
      }
    }

    return undefined
  }

  private static normalizeColor3(color: string): string {
    const trimmed = color.trim()
    if (trimmed.startsWith('#')) {
      return trimmed.slice(1).toUpperCase()
    }
    return trimmed.toUpperCase()
  }

  private static postAvatarMutation(
    cookie: string,
    path: string,
    body: Record<string, unknown>
  ): Promise<any> {
    // Generic success response usually { success: true }
    return requestWithCsrf(z.object({ success: z.boolean() }), {
      method: 'POST',
      url: `https://avatar.roblox.com${path}`,
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body
    })
  }

  static async setBodyColors(cookie: string, bodyColors: any) {
    // Build payload with just Color3 hex values - the API accepts hex codes directly
    const payload: Record<string, string> = {}

    for (const baseKey of BODY_COLOR_BASE_KEYS) {
      const color3Key = `${baseKey}3`

      // Try to get hex color from various possible input formats
      let hexColor: string | undefined

      // Check for Color3 value (hex string)
      if (typeof bodyColors[color3Key] === 'string') {
        hexColor = bodyColors[color3Key]
      } else if (typeof bodyColors[baseKey] === 'string') {
        hexColor = bodyColors[baseKey]
      }

      if (hexColor) {
        // Normalize hex: remove # prefix and lowercase (Roblox v2 API expects lowercase)
        payload[color3Key] = hexColor.replace('#', '').toLowerCase()
      }
    }

    // If payload is empty, fall back to the original bodyColors
    const finalPayload = Object.keys(payload).length > 0 ? payload : bodyColors

    // Use v2 endpoint - v1 returns 500 errors
    return this.postAvatarMutation(cookie, '/v2/avatar/set-body-colors', finalPayload)
  }

  /**
   * Set avatar body scales (height, width, head, proportion, bodyType)
   * @param cookie Authentication cookie
   * @param scales Object containing scale values
   * @returns Success response
   */
  static async setAvatarScales(
    cookie: string,
    scales: {
      height: number
      width: number
      head: number
      proportion: number
      bodyType: number
    }
  ) {
    return this.postAvatarMutation(cookie, '/v1/avatar/set-scales', scales)
  }

  /**
   * Set player avatar type (R6 or R15)
   * @param cookie Authentication cookie
   * @param playerAvatarType 'R6' or 'R15'
   * @returns Success response
   */
  static async setPlayerAvatarType(cookie: string, playerAvatarType: 'R6' | 'R15') {
    return this.postAvatarMutation(cookie, '/v1/avatar/set-player-avatar-type', {
      playerAvatarType
    })
  }

  /**
   * Renders a preview of what the user's avatar would look like with an additional asset
   * without actually modifying the avatar. Uses the /v1/avatar/render endpoint.
   */
  static async renderAvatarWithAsset(
    cookie: string,
    userId: number,
    assetIdToTryOn: number
  ): Promise<{ imageUrl: string; renderType: '2d' | '3d' }> {
    // Get the user's current avatar definition
    const currentAvatar = await this.getCurrentAvatar(cookie, userId)

    // Build the assets array - existing assets + the new one to try on
    const existingAssetIds = currentAvatar.assets?.map((a: any) => a.id) || []
    const allAssetIds = [...new Set([...existingAssetIds, assetIdToTryOn])]
    const assetsPayload = allAssetIds.map((id) => ({ id }))
    const bodyColors: Record<string, string> = {}

    if (currentAvatar.bodyColors) {
      const bc = currentAvatar.bodyColors as any

      const colorMappings = [
        { key: 'headColor', color3Key: 'headColor3', colorIdKey: 'headColorId' },
        { key: 'torsoColor', color3Key: 'torsoColor3', colorIdKey: 'torsoColorId' },
        { key: 'leftArmColor', color3Key: 'leftArmColor3', colorIdKey: 'leftArmColorId' },
        { key: 'rightArmColor', color3Key: 'rightArmColor3', colorIdKey: 'rightArmColorId' },
        { key: 'leftLegColor', color3Key: 'leftLegColor3', colorIdKey: 'leftLegColorId' },
        { key: 'rightLegColor', color3Key: 'rightLegColor3', colorIdKey: 'rightLegColorId' }
      ]

      for (const mapping of colorMappings) {
        let hexColor: string | undefined

        // Try to get from *Color3 key directly (hex string)
        if (bc[mapping.color3Key]) {
          hexColor = String(bc[mapping.color3Key]).replace('#', '').toUpperCase()
        }
        // Try to get from nested bodyColor3s object
        else if (bc.bodyColor3s && bc.bodyColor3s[mapping.color3Key]) {
          hexColor = String(bc.bodyColor3s[mapping.color3Key]).replace('#', '').toUpperCase()
        }
        // Try to convert from BrickColor ID
        else if (typeof bc[mapping.colorIdKey] === 'number') {
          hexColor = brickColorToHex(bc[mapping.colorIdKey])
        }

        if (hexColor) {
          bodyColors[mapping.key] = hexColor
        }
      }
    }

    // If bodyColors is still empty or incomplete, fill with default skin color
    const defaultColor = 'FFFFCC' // Pastel yellow - common default skin tone
    const requiredColors = [
      'headColor',
      'torsoColor',
      'leftArmColor',
      'rightArmColor',
      'leftLegColor',
      'rightLegColor'
    ]
    for (const colorKey of requiredColors) {
      if (!bodyColors[colorKey]) {
        bodyColors[colorKey] = defaultColor
      }
    }

    // Build scales - ensure all required scale properties are present
    const scales: Record<string, number> = {
      height: 1,
      width: 1,
      head: 1,
      depth: 1,
      proportion: 0,
      bodyType: 0
    }
    if (currentAvatar.scales) {
      const s = currentAvatar.scales as any
      if (typeof s.height === 'number') scales.height = s.height
      if (typeof s.width === 'number') scales.width = s.width
      if (typeof s.head === 'number') scales.head = s.head
      if (typeof s.depth === 'number') scales.depth = s.depth
      if (typeof s.proportion === 'number') scales.proportion = s.proportion
      if (typeof s.bodyType === 'number') scales.bodyType = s.bodyType
    }

    // Player avatar type
    const playerAvatarType = currentAvatar.playerAvatarType || 'R6'

    // Build the render request payload matching Roblox's expected format
    const payload = {
      thumbnailConfig: {
        thumbnailId: userId, // Use userId as the thumbnailId (target for the render)
        thumbnailType: '3d',
        size: '420x420'
      },
      avatarDefinition: {
        assets: assetsPayload,
        bodyColors,
        scales,
        playerAvatarType: {
          playerAvatarType
        }
      }
    }

    // POST to render endpoint to initiate the render
    const renderResponse = await requestWithCsrf(avatarRenderResponseSchema, {
      method: 'POST',
      url: 'https://avatar.roblox.com/v1/avatar/render',
      cookie,
      headers: {
        'Content-Type': 'application/json'
      },
      body: payload
    })

    let finalImageUrl = renderResponse.imageUrl
    let finalState = renderResponse.state

    // If already complete, return immediately
    if (finalState === 'Completed' && finalImageUrl) {
      return this.normalizeRenderResult(finalImageUrl)
    }

    // Poll the render endpoint until it completes to avoid returning stale thumbnails
    const maxAttempts = 20
    const pollInterval = 1000 // ms - give more time between polls

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval)

      try {
        const statusResponse = await request(avatarRenderResponseSchema, {
          method: 'POST',
          url: 'https://avatar.roblox.com/v1/avatar/render',
          cookie,
          headers: {
            'Content-Type': 'application/json'
          },
          body: payload
        })

        finalState = statusResponse.state
        if (statusResponse.imageUrl) {
          finalImageUrl = statusResponse.imageUrl
        }

        if (statusResponse.state === 'Completed' && finalImageUrl) {
          break
        }

        if (statusResponse.state === 'Error') {
          throw new Error('Avatar render failed')
        }
      } catch (renderPollError: any) {
        // 403 is expected without CSRF, ignore it
        if (renderPollError.statusCode !== 403) {
          console.warn('[RobloxAvatarService] Render poll error:', renderPollError)
        }
      }
    }

    if (!finalImageUrl) {
      throw new Error('Avatar render timed out')
    }

    return this.normalizeRenderResult(finalImageUrl)
  }

  private static normalizeRenderResult(imageUrl: string): {
    imageUrl: string
    renderType: '2d' | '3d'
  } {
    const is3D = this.is3DManifestUrl(imageUrl)
    return { imageUrl, renderType: is3D ? '3d' : '2d' }
  }

  private static is3DManifestUrl(imageUrl: string) {
    const normalized = imageUrl.toLowerCase()
    return (
      normalized.endsWith('.json') ||
      normalized.includes('avatar-3d') ||
      normalized.includes('thumbnail-3d')
    )
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
