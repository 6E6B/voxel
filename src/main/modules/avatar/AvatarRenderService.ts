import { request, requestWithCsrf } from '@main/lib/request'
import { z } from 'zod'
import { avatarStateSchema } from '@shared/ipc-schemas/avatar'
import { brickColorToHex } from './utils/bodyColorUtils'

const avatarRenderResponseSchema = z.object({
  targetId: z.number(),
  state: z.string(),
  imageUrl: z.string(),
  version: z.string().optional()
})

export class RobloxAvatarRenderService {
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
   * Renders a preview of what the user's avatar would look like with an additional asset
   * without actually modifying the avatar. Uses the /v1/avatar/render endpoint.
   */
  static async renderAvatarWithAsset(
    cookie: string,
    userId: number,
    assetIdToTryOn: number
  ): Promise<{ imageUrl: string; renderType: '2d' | '3d' }> {
    const currentAvatar = await this.getCurrentAvatar(cookie, userId)

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

        if (bc[mapping.color3Key]) {
          hexColor = String(bc[mapping.color3Key]).replace('#', '').toUpperCase()
        } else if (bc.bodyColor3s && bc.bodyColor3s[mapping.color3Key]) {
          hexColor = String(bc.bodyColor3s[mapping.color3Key]).replace('#', '').toUpperCase()
        } else if (typeof bc[mapping.colorIdKey] === 'number') {
          hexColor = brickColorToHex(bc[mapping.colorIdKey])
        }

        if (hexColor) {
          bodyColors[mapping.key] = hexColor
        }
      }
    }

    const defaultColor = 'FFFFCC'
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

    const playerAvatarType = currentAvatar.playerAvatarType || 'R6'

    const payload = {
      thumbnailConfig: {
        thumbnailId: userId,
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

    if (finalState === 'Completed' && finalImageUrl) {
      return this.normalizeRenderResult(finalImageUrl)
    }

    const maxAttempts = 20
    const pollInterval = 1000

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
        if (renderPollError.statusCode !== 403) {
          console.warn('[RobloxAvatarRenderService] Render poll error:', renderPollError)
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
