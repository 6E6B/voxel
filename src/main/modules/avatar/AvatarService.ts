import { request, requestWithCsrf } from '@main/lib/request'
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
  catalogSearchResponseSchema,
  inventoryPageSchema,
  collectiblesSchema,
  OutfitDetails,
  CatalogItemDetail,
  CatalogSearchResponse
} from '@shared/contracts/avatar'

const BODY_COLOR_BASE_KEYS = [
  'headColor',
  'torsoColor',
  'rightArmColor',
  'leftArmColor',
  'rightLegColor',
  'leftLegColor'
] as const


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

  static async getCollectibles(cookie: string, userId: number) {
    try {
      const url = `https://apis.roblox.com/showcases-api/v1/users/profile/robloxcollections-json?userId=${userId}`
      return await request(collectiblesSchema, {
        url,
        method: 'GET',
        cookie
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

  static async createOutfit(
    cookie: string,
    name: string
  ): Promise<{ success: boolean; id: number; name: string }> {
    try {
      const currentAvatar = await RobloxAvatarService.getCurrentAvatar(cookie)
      if (!currentAvatar) {
        throw new Error('Failed to get current avatar state')
      }

      const assetIds = currentAvatar.assets.map((a: any) => a.id)

      const body: Record<string, any> = {
        name,
        bodyColors: currentAvatar.bodyColors,
        assets: currentAvatar.assets.map((a: any) => ({
          id: a.id,
          assetType: a.assetType,
          meta: a.meta || undefined
        })),
        scale: currentAvatar.scales,
        playerAvatarType: currentAvatar.playerAvatarType,
        outfitType: 'Avatar',
        assetIds
      }

      const result = await requestWithCsrf(updateOutfitResultSchema, {
        method: 'POST',
        url: 'https://avatar.roblox.com/v3/outfits/create',
        cookie,
        headers: { 'Content-Type': 'application/json' },
        body
      })

      return { success: true, id: result.id, name: result.name || name }
    } catch (error: any) {
      console.error('Failed to create outfit:', error)
      if (error.body) console.error('Error body:', error.body)
      throw error
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

}
