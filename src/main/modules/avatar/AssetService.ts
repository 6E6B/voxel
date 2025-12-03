import { request, requestWithCsrf, safeRequest, safeFetchBuffer } from '@main/lib/request'
import { z } from 'zod'
import {
  assetDetailsSchema,
  recommendationsSchema,
  batchCatalogDetailsSchema,
  resellersResponseSchema,
  resaleDataSchema,
  CatalogItemDetail,
  ResellersResponse,
  AssetOwnersResponse
} from '@shared/ipc-schemas/avatar'
import { RobloxXMLParser, Instance } from '../../lib/xmlReader'
import { isBinaryRobloxFile, parseBinaryRobloxFile } from '../../lib/rbxmReader'

export class RobloxAssetService {
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
      collectibleLowestResalePrice
    }
  }

  static async getAssetHierarchy(assetId: number) {
    try {
      // Fetch raw binary content
      const buffer = await safeFetchBuffer(
        `https://assetdelivery.roblox.com/v1/asset?id=${assetId}`
      )

      let dataModel: Instance

      // Check if the content is binary (RBXM) or XML
      if (isBinaryRobloxFile(buffer)) {
        // Parse binary RBXM/RBXL format
        dataModel = parseBinaryRobloxFile(buffer)
      } else {
        // Parse XML format
        const content = buffer.toString('utf-8')
        const parser = new RobloxXMLParser()
        try {
          await parser.parse(content)
        } catch (parseError: any) {
          throw new Error(`Failed to parse XML: ${parseError.message}`)
        }
        dataModel = parser.dataModel
      }

      // Helper to serialize Instance for IPC
      const serialize = (inst: Instance): any => ({
        class: inst.class,
        referent: inst.referent,
        properties: inst.properties,
        children: inst.children.map(serialize)
      })

      return serialize(dataModel)
    } catch (error: any) {
      console.error('[RobloxAssetService] Failed to fetch/parse asset hierarchy:', error)

      // Check if it's a 401 authentication error
      if (error.statusCode === 401) {
        throw new Error('This asset must be created by Roblox or yourself to view its hierarchy')
      }

      throw new Error(error.message || 'Failed to load asset hierarchy')
    }
  }

  /**
   * Batch fetch catalog item details for multiple assets at once.
   * Uses POST https://catalog.roblox.com/v1/catalog/items/details
   * Much more efficient than individual requests when fetching multiple items.
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
        console.error('[RobloxAssetService] Failed to fetch batch asset details for chunk:', error)
        // Continue with other chunks even if one fails
      }
    }

    return allResults
  }

  static async getAssetRecommendations(cookie: string, assetId: number) {
    try {
      // Fetch asset details first to get the AssetTypeId
      const details = await RobloxAssetService.getAssetDetails(cookie, assetId)
      const assetTypeId = details.AssetTypeId || details.assetType || 8 // Default to Hat (8) if unknown

      return await request(recommendationsSchema, {
        // Updated to V2 endpoint as per user example
        url: `https://catalog.roblox.com/v2/recommendations/assets?assetId=${assetId}&assetTypeId=${assetTypeId}&details=false&numItems=10`,
        cookie
      })
    } catch (error) {
      console.warn('[RobloxAssetService] Failed to fetch recommendations:', error)
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
      console.warn('[RobloxAssetService] Failed to fetch resellers:', error)
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
      console.error('[RobloxAssetService] Failed to fetch asset owners:', error)
      if (error.issues) {
        console.error(
          '[RobloxAssetService] Zod validation issues:',
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
}
