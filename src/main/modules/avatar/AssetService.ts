import { request, requestWithCsrf, safeFetchBuffer } from '@main/lib/request'
import { z } from 'zod'
import {
  assetDetailsSchema,
  recommendationsSchema,
  batchCatalogDetailsSchema,
  CatalogItemDetail,
} from '@shared/contracts/avatar'
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

    const collectibleLowestResalePrice =
      economyData.CollectiblesItemDetails?.CollectibleLowestResalePrice ?? null

    return {
      ...catalogData,
      ...economyData,
      name: catalogData.name || economyData.Name,
      description: catalogData.description || economyData.Description,
      price: catalogData.price ?? economyData.PriceInRobux,
      creatorName: catalogData.creatorName || economyData.Creator?.Name,
      creatorType: catalogData.creatorType || economyData.Creator?.CreatorType,
      creatorHasVerifiedBadge:
        catalogData.creatorHasVerifiedBadge || economyData.Creator?.HasVerifiedBadge,
      created: catalogData.itemCreatedUtc || economyData.Created,
      updated: economyData.Updated || catalogData.itemUpdatedUtc,
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
      const buffer = await safeFetchBuffer(
        `https://assetdelivery.roblox.com/v1/asset?id=${assetId}`
      )

      let dataModel: Instance

      if (isBinaryRobloxFile(buffer)) {
        dataModel = parseBinaryRobloxFile(buffer)
      } else {
        const content = buffer.toString('utf-8')
        const parser = new RobloxXMLParser()
        try {
          await parser.parse(content)
        } catch (parseError: any) {
          throw new Error(`Failed to parse XML: ${parseError.message}`)
        }
        dataModel = parser.dataModel
      }

      const serialize = (inst: Instance): any => ({
        class: inst.class,
        referent: inst.referent,
        properties: inst.properties,
        children: inst.children.map(serialize)
      })

      return serialize(dataModel)
    } catch (error: any) {
      console.error('[RobloxAssetService] Failed to fetch/parse asset hierarchy:', error)

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
      }
    }

    return allResults
  }

  static async getAssetRecommendations(cookie: string, assetId: number) {
    try {
      const details = await RobloxAssetService.getAssetDetails(cookie, assetId)
      const assetTypeId = details.AssetTypeId || details.assetType || 8

      return await request(recommendationsSchema, {
        url: `https://catalog.roblox.com/v2/recommendations/assets?assetId=${assetId}&assetTypeId=${assetTypeId}&details=false&numItems=10`,
        cookie
      })
    } catch (error) {
      console.warn('[RobloxAssetService] Failed to fetch recommendations:', error)
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
        expectedCurrency: 1,
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
