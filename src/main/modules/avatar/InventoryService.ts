import { request } from '@main/lib/request'
import { z } from 'zod'
import { inventoryPageSchema, collectiblesSchema } from '@shared/ipc-schemas/avatar'

export class RobloxInventoryService {
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

  static async getInventoryV2(
    cookie: string,
    userId: number,
    assetTypes: string[],
    cursor?: string,
    limit: number = 100,
    sortOrder: 'Asc' | 'Desc' = 'Desc'
  ) {
    let url = `https://inventory.roblox.com/v2/users/${userId}/inventory?limit=${limit}&sortOrder=${sortOrder}`

    // Add assetTypes as query parameters (can be multiple)
    // Only add if we have asset types (empty array means fetch all)
    if (assetTypes.length > 0) {
      assetTypes.forEach((assetType) => {
        url += `&assetTypes=${encodeURIComponent(assetType)}`
      })
    }

    if (cursor) {
      url += `&cursor=${encodeURIComponent(cursor)}`
    }

    try {
      const result = await request(inventoryPageSchema, {
        url,
        cookie
      })

      return result
    } catch (error: any) {
      console.error(`[InventoryV2] Error fetching inventory:`, error)
      if (error.statusCode === 400 && error.body) {
        try {
          const errorBody = JSON.parse(error.body)
          if (errorBody.errors?.[0]?.message === 'Invalid asset type.') {
            console.error(`[InventoryV2] Invalid asset types provided: ${assetTypes.join(', ')}`)
          }
        } catch (e) {
          // Ignore parse errors
        }
      }
      throw error
    }
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

  static async checkAssetOwnership(
    cookie: string,
    userId: number,
    assetId: number,
    itemType: string = 'Asset'
  ) {
    // itemType: 0 = Asset, 1 = GamePass, 2 = Badge, 3 = Bundle
    let itemTypeId = 0
    if (itemType === 'GamePass') itemTypeId = 1
    else if (itemType === 'Badge') itemTypeId = 2
    else if (itemType === 'Bundle') itemTypeId = 3

    try {
      const url = `https://inventory.roblox.com/v1/users/${userId}/items/${itemTypeId}/${assetId}/is-owned`
      const isOwned = await request(z.boolean(), {
        url,
        cookie,
        method: 'GET'
      })
      return isOwned
    } catch (error) {
      console.warn(`Failed to check ownership for asset ${assetId}:`, error)
      return false
    }
  }
}
