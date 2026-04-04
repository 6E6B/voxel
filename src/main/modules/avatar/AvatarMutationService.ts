import { requestWithCsrf } from '@main/lib/request'
import { z } from 'zod'
import { wearingAssetsResultSchema } from '@shared/contracts/avatar'
import { BODY_COLOR_BASE_KEYS } from './bodyColorUtils'

export class RobloxAvatarMutationService {
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
}
