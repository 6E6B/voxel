import { request, requestWithCsrf } from '@main/lib/request'
import { z } from 'zod'
import {
  userOutfitCollectionSchema,
  outfitDetailsSchema,
  wearingAssetsResultSchema,
  updateOutfitResultSchema,
  OutfitDetails
} from '@shared/contracts/avatar'
import {
  buildBodyColorsPayload,
  extractBodyColorIds,
  extractBodyColor3s
} from './bodyColorUtils'
import { extractAssetIds, normalizeAssets } from './assetNormalization'
import { RobloxAvatarMutationService } from './AvatarMutationService'

export class RobloxOutfitService {
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

  static async getOutfitDetails(cookie: string, outfitId: number) {
    return request(outfitDetailsSchema, {
      url: `https://avatar.roblox.com/v1/outfits/${outfitId}/details`,
      cookie
    })
  }

  static async wearOutfit(cookie: string, outfitId: number): Promise<{ success: boolean }> {
    const outfit = await RobloxOutfitService.getOutfitDetails(cookie, outfitId)

    if (!outfit) {
      throw new Error(`Unable to load outfit ${outfitId}`)
    }

    if (outfit.playerAvatarType === 'R6' || outfit.playerAvatarType === 'R15') {
      await RobloxAvatarMutationService.setPlayerAvatarType(cookie, outfit.playerAvatarType)
    }

    const bodyColorPayload = buildBodyColorsPayload(outfit.bodyColors)
    if (bodyColorPayload) {
      await RobloxAvatarMutationService.setBodyColors(cookie, bodyColorPayload)
    }

    if (outfit.scale && typeof outfit.scale === 'object') {
      await RobloxAvatarMutationService.setAvatarScales(cookie, outfit.scale as any)
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

  static async updateOutfit(cookie: string, outfitId: number, details: Partial<OutfitDetails>) {
    const payload = RobloxOutfitService.buildOutfitPayload(details)

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
      const bodyColorIds = extractBodyColorIds(details.bodyColors)
      const bodyColor3s = extractBodyColor3s(details.bodyColors)

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
      payload.assetIds = extractAssetIds(rawAssets)
      const assets = normalizeAssets(rawAssets)
      if (assets) {
        payload.assets = assets
      }
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('Outfit update payload was empty. Provide at least one field to change.')
    }

    return payload
  }
}
