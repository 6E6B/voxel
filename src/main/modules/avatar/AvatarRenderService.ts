import { request, requestWithCsrf } from '@main/lib/request'
import { z } from 'zod'
import { avatarStateSchema, thumbnailBatchSchema } from '@shared/ipc-schemas/avatar'
import { brickColorToHex } from './utils/bodyColorUtils'

// Schema for avatar render response
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
  ): Promise<{ imageUrl: string }> {
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

    // If already complete, return immediately
    if (renderResponse.state === 'Completed' && renderResponse.imageUrl) {
      return { imageUrl: renderResponse.imageUrl }
    }

    // Poll for completion using the thumbnails batch API
    // The render creates a thumbnail that can be fetched via the batch endpoint
    const maxAttempts = 20
    const pollInterval = 1000 // ms - give more time between polls

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      await this.sleep(pollInterval)

      // Use the thumbnails batch API to check if the render is complete
      // Request type "AvatarHeadShot" or use the avatar thumbnail endpoint
      try {
        const thumbnailResponse = await request(thumbnailBatchSchema, {
          method: 'POST',
          url: 'https://thumbnails.roblox.com/v1/batch',
          headers: {
            'Content-Type': 'application/json'
          },
          body: [
            {
              requestId: `render_${userId}_${assetIdToTryOn}`,
              targetId: userId,
              type: 'AvatarHeadShot',
              size: '420x420',
              format: 'png',
              isCircular: false
            }
          ]
        })

        if (thumbnailResponse.data && thumbnailResponse.data.length > 0) {
          const entry = thumbnailResponse.data[0]
          if (entry.state === 'Completed' && entry.imageUrl) {
            return { imageUrl: entry.imageUrl }
          }
        }
      } catch (pollError) {
        console.warn('[RobloxAvatarRenderService] Poll error:', pollError)
      }

      // Also try re-posting to the render endpoint to check status (without CSRF retry)
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

        if (statusResponse.state === 'Completed' && statusResponse.imageUrl) {
          return { imageUrl: statusResponse.imageUrl }
        }

        if (statusResponse.state === 'Error') {
          throw new Error('Avatar render failed')
        }
      } catch (renderPollError: any) {
        // 403 is expected without CSRF, ignore it
        if (renderPollError.statusCode !== 403) {
          console.warn('[RobloxAvatarRenderService] Render poll error:', renderPollError)
        }
      }
    }

    throw new Error('Avatar render timed out')
  }

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
